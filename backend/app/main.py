from datetime import datetime, timezone
from uuid import uuid4
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import Project, Claim, ClaimStatus, AuditEvent
from .schemas import ProjectOut, ClaimOut, ReviewIn, HandoverRequest, HandoverOut
from .services import seed_demo, get_claim, claim_payload

Base.metadata.create_all(bind=engine)
app = FastAPI(title="CONTINUUM API", version="0.1.0", description="Evidence-first project knowledge continuity API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    with next(get_db()) as db: seed_demo(db)

@app.get("/health")
def health(): return {"status":"ok", "service":"continuum-api", "version":"0.1.0"}

@app.get("/api/v1/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@app.get("/api/v1/projects/{project_id}/claims", response_model=list[ClaimOut])
def list_claims(project_id: str, status: ClaimStatus | None = None, db: Session = Depends(get_db)):
    if not db.get(Project, project_id): raise HTTPException(404, "Project not found")
    q = db.query(Claim).filter(Claim.project_id == project_id)
    if status: q = q.filter(Claim.status == status)
    return [claim_payload(c) for c in q.order_by(Claim.created_at.desc()).all()]

@app.post("/api/v1/claims/{claim_id}/review", response_model=ClaimOut)
def review_claim(claim_id: str, payload: ReviewIn, db: Session = Depends(get_db)):
    claim = get_claim(db, claim_id)
    if not claim: raise HTTPException(404, "Claim not found")
    if payload.status not in {ClaimStatus.verified, ClaimStatus.rejected, ClaimStatus.needs_review, ClaimStatus.conflict}:
        raise HTTPException(422, "Unsupported review transition")
    previous = claim.status.value
    claim.status = payload.status
    claim.reviewed_at = datetime.now(timezone.utc)
    claim.reviewed_by = payload.reviewer
    db.add(AuditEvent(id=str(uuid4()), project_id=claim.project_id, actor=payload.reviewer, action="claim_reviewed", entity_type="claim", entity_id=claim.id, details={"from":previous,"to":payload.status.value,"note":payload.note}))
    db.commit(); db.refresh(claim)
    return claim_payload(get_claim(db, claim_id))

@app.post("/api/v1/projects/{project_id}/handovers", response_model=HandoverOut)
def create_handover(project_id: str, payload: HandoverRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project: raise HTTPException(404, "Project not found")
    claims = db.query(Claim).filter(Claim.project_id == project_id).all()
    # Safe default: only verified claims enter the recipient-facing handover.
    verified = [claim_payload(get_claim(db, c.id)) for c in claims if c.status == ClaimStatus.verified]
    needs_review = [claim_payload(get_claim(db, c.id)) for c in claims if c.status == ClaimStatus.needs_review]
    conflicts = [claim_payload(get_claim(db, c.id)) for c in claims if c.status == ClaimStatus.conflict]
    db.add(AuditEvent(id=str(uuid4()), project_id=project_id, actor="workspace-owner", action="handover_draft_created", entity_type="handover", entity_id=str(uuid4()), details={"recipient":payload.recipient,"scope":payload.scope,"verified_claim_count":len(verified)}))
    db.commit()
    return {"project_id":project_id,"recipient":payload.recipient,"scope":payload.scope,"generated_at":datetime.now(timezone.utc),"verified":verified,"needs_review":needs_review,"conflicts":conflicts,"excluded_count":sum(1 for c in claims if c.status != ClaimStatus.verified)}
