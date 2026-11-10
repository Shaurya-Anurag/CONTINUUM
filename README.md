# CONTINUUM — The Living Archive

**Project Knowledge Intelligence. Your projects evolve. Their knowledge should survive.**

CONTINUUM reconstructs project knowledge from connected sources and turns it into an evidence-backed, human-reviewed handover. It separates source material, extracted claims and verified project knowledge.

## Current implementation

- Next.js App Router, React, TypeScript and custom CSS workspace.
- FastAPI, Pydantic v2, SQLAlchemy 2 and SQLite local persistence.
- Project, source, evidence, claim, claim/evidence, audit, claim-version and persistent-handover records.
- Public GitHub import for repository metadata, README, up to 15 recent commits and up to 15 open issues.
- Source snapshots retain external identifiers, source URLs and content hashes. Unchanged snapshots are deduplicated; changed snapshots are retained.
- Imported records become proposed claims and are never automatically verified.
- Conservative lexical category triage; this is not LLM semantic extraction.
- Human review with audit events and durable review-version history.
- Project-state aggregation endpoint separates verified, uncertain, conflicting and rejected claims.
- Handover drafts are persisted as immutable content snapshots and can be listed later.
- GitHub Actions CI runs backend tests and frontend typecheck/build.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/projects` | List projects |
| GET | `/api/v1/projects/{id}/summary` | Project metrics |
| GET | `/api/v1/projects/{id}/state` | Deterministic project-state aggregation |
| GET | `/api/v1/projects/{id}/claims` | Claims and linked evidence |
| GET | `/api/v1/claims/{id}/versions` | Claim review history |
| GET | `/api/v1/projects/{id}/sources` | Imported source records |
| GET | `/api/v1/projects/{id}/events` | Audit chronicle |
| GET | `/api/v1/projects/{id}/handovers` | Persisted handover drafts |
| POST | `/api/v1/projects/{id}/sources/github` | Import public GitHub repository |
| POST | `/api/v1/claims/{id}/review` | Review a claim and append a version |
| POST | `/api/v1/projects/{id}/handovers` | Generate and persist a handover draft |

## Trust invariants

1. Connector and model output is not truth by default.
2. Claims retain source-linked evidence and provenance.
3. Imported claims begin as proposed; human review is required for verification.
4. A claim without supporting evidence cannot be marked verified.
5. Project state distinguishes verified, uncertain, conflicting and rejected claims.
6. Handover drafts preserve a point-in-time snapshot; only verified, evidence-linked claims enter the verified section.
7. Uncertainty and conflicts remain explicit.

## Explicit limitations — do not misrepresent these

- GitHub ingestion is public-repository only. OAuth and private repositories are not supported.
- The importer is bounded to README, recent commits and open issues. It is not a complete repository crawler and does not yet ingest PR review threads or arbitrary source files.
- Claim classification is heuristic lexical triage. There is no configured LLM extraction provider, semantic entity resolution or autonomous project reconstruction.
- The project-state endpoint aggregates persisted claims; it does not infer missing facts.
- Claim history currently records review transitions, not automatic semantic revisions or temporal supersession.
- Handover drafts are persisted, but recipient approval, export and recipient-specific access checks are not implemented.
- Authentication, tenant isolation, project membership and source-level permission propagation are not implemented. Do not ingest confidential data or share sensitive handovers.
- SQLAlchemy `create_all` supports the MVP schema bootstrap; production schema evolution requires migrations.
- The app seeds clearly labelled synthetic demo records when the database has no projects.

## Run locally

Backend (Git Bash):

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (second terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. API docs: http://localhost:8000/docs.

## Tests

```bash
cd backend
pytest -q
```

From `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md), [docs/ROUND2_PLAN.md](docs/ROUND2_PLAN.md) and [docs/ROUND2_ENGINEERING_STATUS.md](docs/ROUND2_ENGINEERING_STATUS.md).
