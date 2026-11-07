from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from .models import ClaimStatus

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; name: str; description: str; created_at: datetime

class EvidenceOut(BaseModel):
    id: str; source_title: str; excerpt: str; locator: dict = Field(default_factory=dict); observed_at: datetime | None = None

class ClaimOut(BaseModel):
    id: str; statement: str; category: str; status: ClaimStatus; confidence: float | None
    owner: str | None; created_at: datetime; evidence: list[EvidenceOut] = []

class ReviewIn(BaseModel):
    status: ClaimStatus
    reviewer: str = Field(min_length=1, max_length=180)
    note: str | None = Field(default=None, max_length=2000)

class HandoverRequest(BaseModel):
    recipient: str = Field(min_length=1, max_length=180)
    scope: str = Field(default="project", pattern="^(project|engineering|operations)$")

class HandoverOut(BaseModel):
    project_id: str; recipient: str; scope: str; generated_at: datetime
    verified: list[ClaimOut]; needs_review: list[ClaimOut]; conflicts: list[ClaimOut]
    excluded_count: int = 0
