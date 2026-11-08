from urllib.parse import urlparse
import re
import httpx
from uuid import uuid4
from sqlalchemy.orm import Session
from .models import Claim, ClaimEvidence, ClaimStatus, Evidence, Source, AuditEvent
import hashlib

def normalize_repository(value: str):
    raw = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", raw):
        owner, name = raw.split("/", 1)
    else:
        parsed = urlparse(raw)
        if parsed.scheme != "https" or parsed.hostname not in {"github.com", "www.github.com"}:
            raise ValueError("Use owner/repository or an https GitHub URL.")
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) < 2:
            raise ValueError("URL must identify a repository.")
        owner, name = parts[0], parts[1].removesuffix(".git")
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", owner) or not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", name):
        raise ValueError("Invalid repository identifier.")
    return owner, name, owner + "/" + name

def fetch(client, path, raw=False):
    response = client.get("https://api.github.com" + path, headers={"Accept": "application/vnd.github.raw" if raw else "application/vnd.github+json"})
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.text if raw else response.json()

def persist(db: Session, project_id: str, kind: str, title: str, uri: str, excerpt: str, statement: str, external_id: str, owner=None):
    excerpt = " ".join((excerpt or "").split())[:1400]
    if not excerpt:
        return False
    digest = hashlib.sha256(excerpt.encode()).hexdigest()
    if db.query(Evidence).filter(Evidence.content_hash == digest).first():
        return False
    source = Source(id=str(uuid4()), project_id=project_id, kind=kind, external_id=external_id, title=title[:500], uri=uri, access_scope="public_repository", content_hash=digest)
    evidence = Evidence(id=str(uuid4()), source_id=source.id, excerpt=excerpt, locator={"type": kind, "url": uri, "external_id": external_id}, content_hash=digest)
    text = statement.lower()
    category = "risk" if any(w in text for w in ("bug", "risk", "security", "failure")) else "dependency" if any(w in text for w in ("block", "depend", "waiting", "integration")) else "decision" if any(w in text for w in ("decision", "adr", "chosen")) else "context"
    claim = Claim(id=str(uuid4()), project_id=project_id, statement=statement[:1200], category=category, status=ClaimStatus.proposed, owner=owner)
    db.add_all([source, evidence, claim, ClaimEvidence(claim_id=claim.id, evidence_id=evidence.id, relation="supports")])
    return True

def ingest_public_repository(db: Session, project_id: str, repository: str):
    owner, name, full_name = normalize_repository(repository)
    base = "/repos/" + owner + "/" + name
    counts = {"sources": 0, "evidence": 0, "claims": 0}
    with httpx.Client(timeout=12.0, follow_redirects=False, headers={"User-Agent": "CONTINUUM/0.1"}) as client:
        metadata = fetch(client, base)
        if metadata is None:
            raise LookupError("Repository not found or not public.")
        if metadata.get("private"):
            raise PermissionError("Private repositories are not supported.")
        repo_url = metadata.get("html_url", "https://github.com/" + full_name)
        readme = fetch(client, base + "/readme", raw=True)
        if readme:
            first = next((line.strip() for line in readme.splitlines() if len(line.strip()) >= 35 and not line.lstrip().startswith("#")), "")
            if first and persist(db, project_id, "github_readme", full_name + " README", repo_url + "/blob/" + metadata.get("default_branch", "main") + "/README.md", first, "Project documentation: " + first, "README"):
                for key in counts: counts[key] += 1
        commits = fetch(client, base + "/commits?per_page=15") or []
        for item in commits:
            commit = item.get("commit", {})
            message = (commit.get("message") or "").splitlines()[0].strip()
            sha = item.get("sha", "")
            if not message or not sha:
                continue
            author = (item.get("author") or {}).get("login")
            if persist(db, project_id, "github_commit", "Commit: " + message[:100], item.get("html_url", repo_url + "/commit/" + sha), commit.get("message", message), "Recent repository change: " + message, sha, author):
                for key in counts: counts[key] += 1
        issues = fetch(client, base + "/issues?state=open&per_page=15") or []
        for item in issues:
            if "pull_request" in item:
                continue
            number, title = item.get("number"), (item.get("title") or "").strip()
            if not number or not title:
                continue
            assignees = item.get("assignees") or []
            assigned = assignees[0].get("login") if assignees else None
            url = item.get("html_url", repo_url + "/issues/" + str(number))
            if persist(db, project_id, "github_issue", "Issue #" + str(number) + ": " + title, url, title + "\n" + (item.get("body") or ""), "Open issue #" + str(number) + ": " + title, str(number), assigned):
                for key in counts: counts[key] += 1
    db.add(AuditEvent(id=str(uuid4()), project_id=project_id, actor="github-connector", action="github_repository_ingested", entity_type="repository", entity_id=full_name, details={"repository": full_name, **counts}))
    db.commit()
    return {"repository": full_name, "url": repo_url, **counts, "note": "Imported records are proposed claims and require human verification."}
