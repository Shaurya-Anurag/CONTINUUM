# API contract (MVP)

Base URL: `http://localhost:8000`

All responses are JSON. The current API is a local hackathon MVP and has no authentication.

## Project reads

- `GET /health` — process health and API version.
- `GET /api/v1/projects` — projects.
- `GET /api/v1/projects/{project_id}/summary` — counts and verified-claim coverage.
- `GET /api/v1/projects/{project_id}/claims` — claims with evidence excerpts; optional `?status=proposed`.
- `GET /api/v1/projects/{project_id}/sources` — source metadata and evidence counts.
- `GET /api/v1/projects/{project_id}/events` — most recent 100 audit events.

## Source ingestion

### Import public GitHub repository

`POST /api/v1/projects/{project_id}/sources/github`

Request:

```json
{"repository":"octocat/Hello-World"}
```

Accepts either `owner/repository` or an HTTPS GitHub repository URL. Imports README context, up to 15 recent commits and up to 15 open issues. Pull requests are excluded. Private repositories are rejected.

Successful response includes `repository`, `url`, `sources`, `evidence`, `claims`, and a note that the resulting claims require human verification.

Errors:
- `404`: project or public repository not found.
- `403`: private repository is not supported.
- `422`: invalid repository identifier.
- `502`: GitHub API/network failure.

## Human review

`POST /api/v1/claims/{claim_id}/review`

```json
{"status":"verified","reviewer":"Workspace owner","note":"Checked against source evidence."}
```

Allowed target statuses: `verified`, `rejected`, `needs_review`, `conflict`. A claim without linked evidence cannot be verified. Each accepted review writes an audit event.

## Handover draft

`POST /api/v1/projects/{project_id}/handovers`

```json
{"recipient":"Incoming teammate","scope":"project"}
```

The response separates verified claims, claims needing review, conflicts, and excluded rejected claims. The recipient and scope fields are descriptive only in this MVP; they do not enforce authorization.
