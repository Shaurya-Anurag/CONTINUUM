# CONTINUUM — The Living Archive

**Project Knowledge Intelligence. Your projects evolve. Their knowledge should survive.**

CONTINUUM reconstructs project knowledge from authorised sources and turns it into an evidence-backed, human-reviewed handover. It is designed around a strict distinction between source material, extracted claims, and verified project knowledge.

## Current MVP

- Project workspace with overview, evidence room, source library, chronicle, ownership signals, claim/evidence relationship view, and handover draft.
- FastAPI + SQLAlchemy persistence for projects, sources, evidence, claims, claim/evidence relationships, and audit events.
- Human claim review with an audit event for every review decision.
- Public GitHub repository import: README context, up to 15 recent commits, and up to 15 open issues.
- Imported GitHub records are stored with source URLs and evidence excerpts, deduplicated by content hash, and created as **proposed** claims. They are never automatically verified.
- Handover drafts separate verified claims, claims needing review, and conflicts.

## Important limitations (read before demo or use)

- GitHub connector currently supports **public repositories only**. It does not use OAuth or access private repositories.
- The current importer is a bounded first-pass evidence collector, not semantic project-state reconstruction. Commit messages and issue text become proposed claims; no LLM extraction is currently enabled.
- Authentication, tenant isolation, recipient-specific authorization, and source permission propagation are not implemented. Do not ingest confidential material or share handovers containing sensitive data.
- Handover scope is currently a declared label, not an enforced authorization boundary.
- Temporal claim versioning/supersession, background jobs, retries, rate-limit scheduling, PostgreSQL migrations, and production observability remain future work.
- Demo seed records are synthetic and are clearly marked as demo sources in the UI.

## Stack

- Frontend: Next.js App Router, React, TypeScript, custom CSS design system.
- Backend: FastAPI, Pydantic v2, SQLAlchemy 2, SQLite for local development.
- Integration: GitHub REST API through HTTPX.

## Run locally

### Backend (Git Bash)

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend (second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The frontend defaults to http://localhost:8000. To override, set `NEXT_PUBLIC_API_URL`.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/projects` | List projects |
| GET | `/api/v1/projects/{id}/summary` | Project metrics |
| GET | `/api/v1/projects/{id}/claims` | Claims and evidence |
| GET | `/api/v1/projects/{id}/sources` | Imported source records |
| GET | `/api/v1/projects/{id}/events` | Audit chronicle |
| POST | `/api/v1/projects/{id}/sources/github` | Import a public GitHub repository |
| POST | `/api/v1/claims/{id}/review` | Review a claim |
| POST | `/api/v1/projects/{id}/handovers` | Generate a handover draft |

### Import a public GitHub repository

```bash
curl -X POST http://localhost:8000/api/v1/projects/PROJECT_ID/sources/github \
  -H "Content-Type: application/json" \
  -d '{"repository":"owner/repository"}'
```

The response reports imported source, evidence, and proposed-claim counts. Review imported claims in the Evidence Room before treating them as accepted project knowledge.

## Tests

```bash
cd backend
pytest -q
```

Run frontend type checking/build from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

## Trust invariants

1. Model or connector output is not truth by default.
2. Claims retain source-linked evidence and provenance.
3. Imported claims begin as proposed; human review is required for verification.
4. A claim without supporting evidence cannot be marked verified.
5. Uncertainty and conflicts remain explicit.
6. Do not use this MVP with private or confidential data until authentication and permission propagation exist.

## Repository map

- `frontend/`: CONTINUUM web workspace.
- `backend/app/`: API, persistence models, GitHub ingestion adapter and services.
- `backend/tests/`: domain and input-validation tests.
- `docs/`: architecture, domain model, Round 2 plan and limitations.
