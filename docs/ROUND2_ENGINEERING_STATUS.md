# Round 2 engineering status

This document distinguishes implemented backend foundations from capabilities that are not yet implemented or verified.

## Implemented in this engineering pass

- Durable claim review snapshots in `claim_versions`, recording status, statement, category, owner, reviewer and reason.
- Persistent handover snapshots in `handover_records`, preserving the exact generated content independently of later claim changes.
- Project-state aggregation endpoint: `GET /api/v1/projects/{project_id}/state`. It separates evidence-linked verified claims, unverified claims, conflicts and rejected claims. This is deterministic aggregation, not autonomous semantic reconstruction.
- Claim history endpoint: `GET /api/v1/claims/{claim_id}/versions`.
- Handover history endpoint: `GET /api/v1/projects/{project_id}/handovers`.
- Handover generation now persists a draft and returns its identifier.
- Verified handover entries require both verified status and linked evidence.

## Important implementation boundaries

- The current GitHub connector is public-repository only.
- Claim classification remains lexical heuristic triage. No LLM extraction provider is configured.
- The project-state endpoint aggregates stored claims; it does not infer missing project facts.
- Claim versions currently record review transitions. Automated semantic claim revision and supersession are not implemented.
- Handover snapshots are persistent drafts, but recipient approval workflow and export are not implemented.
- Authentication, project membership, tenant isolation and source-level permission inheritance are not implemented. Do not use confidential sources or treat a handover as access-controlled.
- Database schema changes use SQLAlchemy `create_all` for this MVP. Existing deployments need a deliberate migration strategy before production use.

## Verification required

Run from `backend/`:

```bash
pytest -q
```

Then exercise these API paths against a fresh local database:

1. `GET /health`
2. `POST /api/v1/projects/{id}/sources/github`
3. `GET /api/v1/projects/{id}/state`
4. `POST /api/v1/claims/{claim_id}/review`
5. `GET /api/v1/claims/{claim_id}/versions`
6. `POST /api/v1/projects/{id}/handovers`
7. `GET /api/v1/projects/{id}/handovers`

Do not mark these paths verified until they have been exercised against the running application.
