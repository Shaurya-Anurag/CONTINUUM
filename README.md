# CONTINUUM — The Living Archive

Project Knowledge Intelligence. Your projects evolve. Their knowledge should survive.

A clean-slate implementation scaffold for the CodersInPune hackathon. The first slice establishes the product shell, a coherent domain model, evidence-first API contracts, and a working local demo backend.

## Stack
- Frontend: Next.js App Router, TypeScript, CSS design tokens
- Backend: FastAPI, SQLAlchemy 2, SQLite for local development (PostgreSQL-ready)
- Domain: Projects, sources, evidence, claims, relationships, reviews, handovers, audit events

## Run locally

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000. The UI currently ships with a curated demo dataset so it remains useful before the API is connected. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` when wiring live endpoints.

## Product principles
1. A model-generated claim is never treated as truth by default.
2. Every claim should be traceable to one or more evidence records.
3. Uncertainty and conflicts are first-class states, not hidden footnotes.
4. Human review and approval are explicit state transitions.
5. Source permissions must be enforced before evidence is exposed to a recipient.

## Repository map
- `frontend/`: branded product shell and first dashboard experience
- `backend/`: API, persistence models, seed data and service layer
- `docs/`: architecture, domain model, API contract and build plan

## Status
This is the initial product foundation, not a claim of production readiness. Authentication, OAuth source connections, asynchronous ingestion, permission propagation, migrations, and end-to-end tests remain to be implemented and verified.
