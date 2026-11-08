import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.github_ingestion import classify_claim, normalize_repository, persist
from app.models import Claim, ClaimEvidence, Evidence, Project, Source


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Project(id="project-test", name="Test project", description=""))
        session.commit()
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_claim_categories_are_conservative_triage():
    assert classify_claim("Security vulnerability reported in auth") == "risk"
    assert classify_claim("Migration is blocked by webhook consumers") == "dependency"
    assert classify_claim("ADR-008: decision to use PostgreSQL") == "decision"
    assert classify_claim("The owner is assigned to Maya") == "ownership"
    assert classify_claim("Who will maintain this service?") == "open_question"
    assert classify_claim("A general project update") == "context"


def test_persist_links_source_evidence_and_proposed_claim(db):
    created = persist(
        db, "project-test", "github_issue", "Issue #7: Migration",
        "https://github.com/acme/app/issues/7", "Migration is blocked by service B",
        "Open issue: migration blocked by service B", "7",
    )
    assert created is True
    db.commit()

    assert db.query(Source).count() == 1
    assert db.query(Evidence).count() == 1
    claim = db.query(Claim).one()
    assert claim.status.value == "proposed"
    assert claim.category == "dependency"
    link = db.query(ClaimEvidence).one()
    assert link.claim_id == claim.id
    assert link.evidence_id == db.query(Evidence).one().id


def test_persist_deduplicates_unchanged_source_snapshot(db):
    args = (
        db, "project-test", "github_commit", "Commit: update",
        "https://github.com/acme/app/commit/abc", "Update dependency",
        "Repository change: update dependency", "abc",
    )
    assert persist(*args) is True
    assert persist(*args) is False
    assert db.query(Source).count() == 1
    assert db.query(Claim).count() == 1


def test_persist_preserves_changed_snapshot_for_same_external_source(db):
    base = (
        db, "project-test", "github_readme", "acme/app README",
        "https://github.com/acme/app/blob/main/README.md",
    )
    assert persist(*base, "Version one", "Repository overview: version one", "README") is True
    assert persist(*base, "Version two", "Repository overview: version two", "README") is True
    assert db.query(Source).count() == 2
    assert db.query(Claim).count() == 2


def test_normalize_repository_rejects_non_github_hosts():
    with pytest.raises(ValueError):
        normalize_repository("https://example.com/acme/app")
