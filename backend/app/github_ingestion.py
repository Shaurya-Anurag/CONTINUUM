from urllib.parse import urlparse
import hashlib
import re
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session

from .models import AuditEvent, Claim, ClaimEvidence, ClaimStatus, Evidence, Source


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
    response = client.get(
        "https://api.github.com" + path,
        headers={"Accept": "application/vnd.github.raw" if raw else "application/vnd.github+json"},
    )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.text if raw else response.json()


def classify_claim(statement: str) -> str:
    """Conservative lexical labels; this is triage, not semantic inference."""
    text = statement.lower()
    if any(w in text for w in ("security", "vulnerability", "incident", "failure", "risk", "bug")):
        return "risk"
    if any(w in text for w in ("blocked", "blocker", "depend", "waiting", "migration", "integration")):
        return "dependency"
    if any(w in text for w in ("decided", "decision", "adr", "adopted", "chosen", "will use")):
        return "decision"
    if any(w in text for w in ("owner", "assigned", "maintainer", "responsible")):
        return "ownership"
    if statement.rstrip().endswith("?") or any(w in text for w in ("todo", "open question", "unknown")):
        return "open_question"
    return "context"


def persist(
    db: Session,
    project_id: str,
    kind: str,
    title: str,
    uri: str,
    excerpt: str,
    statement: str,
    external_id: str,
    owner=None,
):
    excerpt = " ".join((excerpt or "").split())[:5000]
    if not excerpt:
        return False

    digest = hashlib.sha256(excerpt.encode()).hexdigest()
    # Identity is source-kind + external-id, scoped to a project. If the same
    # source changes (for example README.md), preserve the new snapshot rather
    # than silently treating it as an unchanged duplicate.
    existing = (
        db.query(Source)
        .filter(
            Source.project_id == project_id,
            Source.kind == kind,
            Source.external_id == external_id,
            Source.content_hash == digest,
        )
        .first()
    )
    if existing:
        return False

    source = Source(
        id=str(uuid4()), project_id=project_id, kind=kind,
        external_id=external_id, title=title[:500], uri=uri,
        access_scope="public_repository", content_hash=digest,
    )
    evidence = Evidence(
        id=str(uuid4()), source_id=source.id, excerpt=excerpt,
        locator={"type": kind, "url": uri, "external_id": external_id},
        content_hash=digest,
    )
    claim = Claim(
        id=str(uuid4()), project_id=project_id,
        statement=statement[:1200], category=classify_claim(statement),
        status=ClaimStatus.proposed, owner=owner,
    )
    db.add_all([
        source, evidence, claim,
        ClaimEvidence(claim_id=claim.id, evidence_id=evidence.id, relation="supports"),
    ])
    return True


def ingest_public_repository(db: Session, project_id: str, repository: str):
    owner, name, full_name = normalize_repository(repository)
    base = "/repos/" + owner + "/" + name
    counts = {"sources": 0, "evidence": 0, "claims": 0}

    def record(*args, **kwargs):
        if persist(db, project_id, *args, **kwargs):
            for key in counts:
                counts[key] += 1

    with httpx.Client(
        timeout=httpx.Timeout(12.0, connect=5.0),
        follow_redirects=False,
        headers={"User-Agent": "CONTINUUM/0.2", "Accept": "application/vnd.github+json"},
    ) as client:
        metadata = fetch(client, base)
        if metadata is None:
            raise LookupError("Repository not found or not public.")
        if metadata.get("private"):
            raise PermissionError("Private repositories are not supported.")

        repo_url = metadata.get("html_url", "https://github.com/" + full_name)
        default_branch = metadata.get("default_branch", "main")
        readme = fetch(client, base + "/readme", raw=True)
        if readme:
            # Keep a useful, bounded excerpt instead of only the first README line.
            excerpt = "\n".join(line.rstrip() for line in readme.splitlines() if line.strip())[:5000]
            record(
                "github_readme", full_name + " README",
                repo_url + "/blob/" + default_branch + "/README.md",
                excerpt, "Repository overview: " + excerpt[:900], "README",
            )

        commits = fetch(client, base + "/commits?per_page=15") or []
        for item in commits:
            commit = item.get("commit", {})
            message = (commit.get("message") or "").strip()
            sha = item.get("sha", "")
            if not message or not sha:
                continue
            first_line = message.splitlines()[0].strip()
            author = (commit.get("author") or {}).get("name") or (item.get("author") or {}).get("login")
            record(
                "github_commit", "Commit: " + first_line[:100],
                item.get("html_url", repo_url + "/commit/" + sha),
                message, "Repository change: " + message, sha, author,
            )

        issues = fetch(client, base + "/issues?state=open&per_page=15") or []
        for item in issues:
            if "pull_request" in item:
                continue
            number = item.get("number")
            title = (item.get("title") or "").strip()
            if not number or not title:
                continue
            assignees = item.get("assignees") or []
            assigned = assignees[0].get("login") if assignees else None
            body = (item.get("body") or "").strip()
            excerpt = title + ("\n" + body if body else "")
            url = item.get("html_url", repo_url + "/issues/" + str(number))
            record(
                "github_issue", "Issue #" + str(number) + ": " + title,
                url, excerpt, "Open issue: " + title + (". " + body[:900] if body else ""),
                str(number), assigned,
            )

    db.add(AuditEvent(
        id=str(uuid4()), project_id=project_id, actor="github-connector",
        action="github_repository_ingested", entity_type="repository",
        entity_id=full_name, details={"repository": full_name, **counts},
    ))
    db.commit()
    return {
        "repository": full_name, "url": repo_url, **counts,
        "note": "Imported records are proposed claims and require human verification. Categories are heuristic triage, not AI conclusions.",
    }
