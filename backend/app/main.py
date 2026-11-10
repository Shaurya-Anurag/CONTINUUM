from datetime import datetime, timezone
import os
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload

from .database import Base, engine, get_db
from .models import (
    Project, Claim, ClaimStatus, AuditEvent, Source, Evidence, ClaimEvidence,
    ClaimVersion, HandoverRecord,
)
from .schemas import ProjectOut, ClaimOut, ReviewIn, HandoverRequest, HandoverOut, GitHubImportIn
from .services import seed_demo, get_claim, claim_payload
from .github_ingestion import ingest_public_repository

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CONTINUUM API",
    version="0.3.0",
    description="Evidence-first project knowledge continuity API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    db = next(get_db())
    try:
        seed_demo(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "continuum-api", "version": "0.3.0"}


@app.get("/api/v1/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()


@app.get("/api/v1/projects/{project_id}/summary")
def project_summary(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    claims = db.query(Claim).filter(Claim.project_id == project_id).all()
    sources = db.query(Source).filter(Source.project_id == project_id).count()
    counts = {status.value: 0 for status in ClaimStatus}
    for claim in claims:
        counts[claim.status.value] += 1
    return {
        "project_id": project_id,
        "claim_count": len(claims),
        "source_count": sources,
        "verified_count": counts["verified"],
        "needs_review_count": counts["needs_review"] + counts["proposed"],
        "conflict_count": counts["conflict"],
        "rejected_count": counts["rejected"],
        "knowledge_coverage": round((counts["verified"] / len(claims)) * 100) if claims else 0,
    }


@app.get("/api/v1/projects/{project_id}/state")
def project_state(project_id: str, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    claims = db.query(Claim).options(
        joinedload(Claim.evidence_links).joinedload(ClaimEvidence.evidence).joinedload(Evidence.source)
    ).filter(Claim.project_id == project_id).order_by(Claim.created_at.desc()).all()
    grouped = {"verified": [], "inferred_or_unverified": [], "conflicting": [], "rejected": []}
    for claim in claims:
        item = claim_payload(claim)
        if claim.status == ClaimStatus.verified and claim.evidence_links:
            grouped["verified"].append(item)
        elif claim.status == ClaimStatus.conflict:
            grouped["conflicting"].append(item)
        elif claim.status == ClaimStatus.rejected:
            grouped["rejected"].append(item)
        else:
            grouped["inferred_or_unverified"].append(item)
    return {
        "project_id": project_id,
        "generated_at": datetime.now(timezone.utc),
        "state_basis": "human-reviewed claims and source-linked proposed claims",
        "known": grouped["verified"],
        "uncertain": grouped["inferred_or_unverified"],
        "conflicting": grouped["conflicting"],
        "rejected": grouped["rejected"],
        "limitations": ["State is an aggregation of stored claims, not autonomous semantic reconstruction.",
                        "No source-level authorization is enforced in this MVP."],
    }


@app.get("/api/v1/projects/{project_id}/claims", response_model=list[ClaimOut])
def list_claims(project_id: str, status: ClaimStatus | None = None, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    q = db.query(Claim).options(
        joinedload(Claim.evidence_links).joinedload(ClaimEvidence.evidence).joinedload(Evidence.source)
    ).filter(Claim.project_id == project_id)
    if status:
        q = q.filter(Claim.status == status)
    return [claim_payload(c) for c in q.order_by(Claim.created_at.desc()).all()]


@app.get("/api/v1/claims/{claim_id}/versions")
def claim_versions(claim_id: str, db: Session = Depends(get_db)):
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    versions = db.query(ClaimVersion).filter(ClaimVersion.claim_id == claim_id).order_by(ClaimVersion.version_number.asc()).all()
    return [{
        "id": v.id, "claim_id": v.claim_id, "version_number": v.version_number,
        "statement": v.statement, "category": v.category, "status": v.status,
        "owner": v.owner, "changed_by": v.changed_by, "change_reason": v.change_reason,
        "created_at": v.created_at,
    } for v in versions]


@app.get("/api/v1/projects/{project_id}/sources")
def list_sources(project_id: str, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    sources = db.query(Source).filter(Source.project_id == project_id).order_by(Source.imported_at.desc()).all()
    return [{
        "id": source.id, "kind": source.kind, "title": source.title, "uri": source.uri,
        "access_scope": source.access_scope, "imported_at": source.imported_at,
        "evidence_count": db.query(Evidence).filter(Evidence.source_id == source.id).count(),
        "is_demo": source.kind == "demo",
    } for source in sources]


@app.get("/api/v1/projects/{project_id}/events")
def list_events(project_id: str, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    events = db.query(AuditEvent).filter(AuditEvent.project_id == project_id).order_by(AuditEvent.created_at.desc()).limit(100).all()
    return [{
        "id": event.id, "actor": event.actor, "action": event.action,
        "entity_type": event.entity_type, "entity_id": event.entity_id,
        "details": event.details, "created_at": event.created_at,
    } for event in events]


@app.get("/api/v1/projects/{project_id}/handovers")
def list_handovers(project_id: str, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    rows = db.query(HandoverRecord).filter(HandoverRecord.project_id == project_id).order_by(HandoverRecord.created_at.desc()).all()
    return [{
        "id": row.id, "project_id": row.project_id, "recipient": row.recipient,
        "scope": row.scope, "status": row.status, "snapshot": row.snapshot,
        "created_by": row.created_by, "created_at": row.created_at,
        "approved_at": row.approved_at,
    } for row in rows]


@app.post("/api/v1/projects/{project_id}/sources/github")
def import_github_repository(project_id: str, payload: GitHubImportIn, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    try:
        return ingest_public_repository(db, project_id, payload.repository)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(403, str(exc)) from exc
    except Exception as exc:
        db.rollback()
        from httpx import HTTPError
        if isinstance(exc, HTTPError):
            raise HTTPException(502, "GitHub could not be reached or returned an invalid response.") from exc
        raise


@app.post("/api/v1/claims/{claim_id}/review", response_model=ClaimOut)
def review_claim(claim_id: str, payload: ReviewIn, db: Session = Depends(get_db)):
    claim = get_claim(db, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    if payload.status not in {ClaimStatus.verified, ClaimStatus.rejected, ClaimStatus.needs_review, ClaimStatus.conflict}:
        raise HTTPException(422, "Unsupported review transition")
    if payload.status == ClaimStatus.verified and not claim.evidence_links:
        raise HTTPException(409, "A claim cannot be verified without supporting evidence.")
    previous = claim.status.value
    claim.status = payload.status
    claim.reviewed_at = datetime.now(timezone.utc)
    claim.reviewed_by = payload.reviewer
    next_version = db.query(ClaimVersion).filter(ClaimVersion.claim_id == claim.id).count() + 1
    db.add(ClaimVersion(
        id=str(uuid4()), claim_id=claim.id, version_number=next_version,
        statement=claim.statement, category=claim.category, status=payload.status.value,
        owner=claim.owner, changed_by=payload.reviewer, change_reason=payload.note,
    ))
    db.add(AuditEvent(
        id=str(uuid4()), project_id=claim.project_id, actor=payload.reviewer,
        action="claim_reviewed", entity_type="claim", entity_id=claim.id,
        details={"from": previous, "to": payload.status.value, "note": payload.note, "version": next_version},
    ))
    db.commit()
    db.refresh(claim)
    return claim_payload(get_claim(db, claim_id))


@app.post("/api/v1/projects/{project_id}/handovers", response_model=HandoverOut)
def create_handover(project_id: str, payload: HandoverRequest, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    claims = db.query(Claim).filter(Claim.project_id == project_id).all()
    verified = [claim_payload(get_claim(db, c.id)) for c in claims if c.status == ClaimStatus.verified and c.evidence_links]
    needs_review = [claim_payload(get_claim(db, c.id)) for c in claims if c.status in {ClaimStatus.needs_review, ClaimStatus.proposed}]
    conflicts = [claim_payload(get_claim(db, c.id)) for c in claims if c.status == ClaimStatus.conflict]
    excluded = sum(1 for c in claims if c.status == ClaimStatus.rejected)
    generated_at = datetime.now(timezone.utc)
    handover_id = str(uuid4())
    snapshot = {
        "verified": verified, "needs_review": needs_review, "conflicts": conflicts,
        "excluded_count": excluded, "limitations": [
            "Recipient-specific authorization is not implemented.",
            "Only explicitly verified, evidence-linked claims are in the verified section."
        ],
    }
    db.add(HandoverRecord(
        id=handover_id, project_id=project_id, recipient=payload.recipient,
        scope=payload.scope, status="draft", snapshot=snapshot,
    ))
    db.add(AuditEvent(
        id=str(uuid4()), project_id=project_id, actor="workspace-owner",
        action="handover_draft_created", entity_type="handover", entity_id=handover_id,
        details={"recipient": payload.recipient, "scope": payload.scope, "verified_claim_count": len(verified)},
    ))
    db.commit()
    return {
        "id": handover_id, "project_id": project_id, "recipient": payload.recipient,
        "scope": payload.scope, "generated_at": generated_at, "verified": verified,
        "needs_review": needs_review, "conflicts": conflicts, "excluded_count": excluded,
    }
