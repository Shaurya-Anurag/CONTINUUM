from app.models import ClaimStatus

def test_claim_statuses_are_explicit():
    assert {s.value for s in ClaimStatus} == {"proposed", "needs_review", "verified", "rejected", "conflict"}
