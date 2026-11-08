from app.models import ClaimStatus
from app.github_ingestion import normalize_repository

def test_claim_statuses_are_explicit():
    assert {s.value for s in ClaimStatus} == {"proposed", "needs_review", "verified", "rejected", "conflict"}

def test_normalize_repository_short_form():
    assert normalize_repository("octocat/Hello-World") == ("octocat", "Hello-World", "octocat/Hello-World")

def test_normalize_repository_url():
    assert normalize_repository("https://github.com/octocat/Hello-World.git") == ("octocat", "Hello-World", "octocat/Hello-World")

def test_normalize_repository_rejects_non_github_hosts():
    import pytest
    with pytest.raises(ValueError):
        normalize_repository("https://example.com/octocat/Hello-World")

def test_normalize_repository_rejects_path_traversal():
    import pytest
    with pytest.raises(ValueError):
        normalize_repository("../etc/passwd")
