from uuid import uuid4
from sqlalchemy.orm import Session, joinedload
from .models import Project, Claim, Source, Evidence, ClaimEvidence, ClaimStatus, AuditEvent, utcnow

def get_claim(db: Session, claim_id: str):
    return db.query(Claim).options(joinedload(Claim.evidence_links).joinedload(ClaimEvidence.evidence).joinedload(Evidence.source)).filter(Claim.id == claim_id).first()

def claim_payload(claim: Claim):
    return {"id": claim.id, "statement": claim.statement, "category": claim.category, "status": claim.status,
            "confidence": claim.confidence, "owner": claim.owner, "created_at": claim.created_at,
            "evidence": [{"id": link.evidence.id, "source_title": link.evidence.source.title,
                          "excerpt": link.evidence.excerpt, "locator": link.evidence.locator,
                          "observed_at": link.evidence.observed_at} for link in claim.evidence_links]}

def seed_demo(db: Session):
    if db.query(Project).first(): return
    project_id = str(uuid4())
    project = Project(id=project_id, name="Northstar Platform", description="A multi-service platform modernising internal operations.")
    db.add(project)
    records = [
      ("PostgreSQL remains the system of record", "decision", ClaimStatus.verified, "Arjun Rao", .98, "ADR-008 · Decision record", "The team rejected a document-store migration for this release because transactional integrity is required."),
      ("API migration is blocked by legacy webhook consumers", "dependency", ClaimStatus.needs_review, "Maya Chen", .84, "Architecture sync · 14:32", "The v2 rollout is waiting on two downstream services to stop consuming the v1 payload."),
      ("Search indexing has no confirmed operational owner", "ownership", ClaimStatus.conflict, None, .67, "Runbook + incident #142", "The runbook names the platform team, while the latest incident thread assigns follow-up to infrastructure."),
    ]
    for i, (statement, category, status, owner, confidence, source_title, excerpt) in enumerate(records, 1):
        sid, eid, cid = str(uuid4()), str(uuid4()), f"demo-claim-{i}"
        source = Source(id=sid, project_id=project_id, kind="demo", title=source_title, access_scope="project")
        evidence = Evidence(id=eid, source_id=sid, excerpt=excerpt, locator={"type":"demo_excerpt","position":i})
        claim = Claim(id=cid, project_id=project_id, statement=statement, category=category, status=status, owner=owner, confidence=confidence)
        db.add_all([source, evidence, claim, ClaimEvidence(claim_id=cid, evidence_id=eid, relation="supports")])
    db.add(AuditEvent(id=str(uuid4()), project_id=project_id, actor="system", action="demo_seeded", entity_type="project", entity_id=project_id, details={"synthetic": True}))
    db.commit()
