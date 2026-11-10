from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Project, Claim, ClaimStatus, ClaimVersion, HandoverRecord


def test_claim_versions_preserve_review_state_history():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Project(id="p1", name="Project", description=""))
        db.add(Claim(id="c1", project_id="p1", statement="Use PostgreSQL", category="decision", status=ClaimStatus.proposed))
        db.flush()
        db.add_all([
            ClaimVersion(id="v1", claim_id="c1", version_number=1, statement="Use PostgreSQL", category="decision", status="verified", changed_by="reviewer", change_reason="ADR evidence"),
            ClaimVersion(id="v2", claim_id="c1", version_number=2, statement="Use PostgreSQL", category="decision", status="conflict", changed_by="reviewer-2", change_reason="New contradictory evidence"),
        ])
        db.commit()
        versions = db.query(ClaimVersion).filter_by(claim_id="c1").order_by(ClaimVersion.version_number).all()
        assert [v.status for v in versions] == ["verified", "conflict"]
        assert [v.version_number for v in versions] == [1, 2]
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_handover_snapshot_is_persisted_independently():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Project(id="p1", name="Project", description=""))
        db.flush()
        record = HandoverRecord(
            id="h1", project_id="p1", recipient="Incoming engineer",
            scope="engineering", status="draft",
            snapshot={"verified": [{"statement": "Use PostgreSQL"}], "conflicts": []},
        )
        db.add(record)
        db.commit()
        loaded = db.get(HandoverRecord, "h1")
        assert loaded.snapshot["verified"][0]["statement"] == "Use PostgreSQL"
        assert loaded.status == "draft"
    Base.metadata.drop_all(engine)
    engine.dispose()
