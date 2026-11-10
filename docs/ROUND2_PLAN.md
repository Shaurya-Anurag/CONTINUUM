# Round 2 delivery plan and acceptance criteria

## Implemented in the repository

- [x] API-backed project workspace and overview.
- [x] Claim, evidence, source and audit-event read endpoints.
- [x] Human claim review with audit-event persistence.
- [x] Evidence-free verification guard.
- [x] Public GitHub repository ingestion for README, recent commits and open issues.
- [x] Source URLs, external identifiers, content hashes and unchanged-snapshot deduplication.
- [x] Proposed claim status for imported records; heuristic labels explicitly documented.
- [x] Source Library GitHub import and original source links.
- [x] Environment-driven database URL and CORS origins.
- [x] GitHub Actions CI configuration.
- [x] Claim review version records and claim-version read endpoint.
- [x] Persistent handover draft snapshots and handover history endpoint.
- [x] Deterministic project-state aggregation endpoint.
- [x] Unit tests for claim triage, evidence linking, snapshot deduplication, changed snapshots, claim-version persistence and handover persistence.

## Remaining before a credible submission

### P0 — must verify against a running app
1. Run the complete backend test suite and frontend typecheck/build after pulling latest main.
2. Verify GitHub import against a real public repository, including zero-new-record repeat import.
3. Verify API error handling for 404, 403/rate-limit and network failures.
4. Exercise project-state aggregation, review transitions, claim history and persisted handover history.
5. Verify the frontend consumes the updated handover response without runtime errors.
6. Confirm GitHub Actions passes.
7. Deploy a judge-accessible build and test it from a clean browser/session.
8. Record a truthful demo; label synthetic seed records separately from imported records.

### P1 — high-value work still not implemented
1. Structured semantic extraction with a configured model provider, schema validation and exact evidence attribution.
2. Cross-source entity resolution and evidence conflict candidate detection.
3. Claim supersession and historical project-state reconstruction.
4. Markdown/PDF/DOCX ingestion with strict type/size limits and source locators.
5. Backend API integration tests and mocked GitHub transport tests.
6. Real authentication, project membership and permission enforcement before any confidential source is used.
7. Handover approval, recipient authorization and export.

## Explicit limitations
The MVP currently supports public GitHub ingestion and deterministic aggregation of stored claims. It does not yet provide LLM-based semantic reconstruction, private-source OAuth, tenant isolation, source-level permission inheritance or enterprise security. Do not claim those capabilities in the demo.

## Round 2 demo acceptance path
1. Open workspace and identify synthetic seed records.
2. Import a public repository.
3. Inspect imported source records and evidence excerpts.
4. Open a proposed claim and follow its source reference.
5. Review a claim and show the audit event and claim-version history.
6. Open the project-state endpoint/view and explain verified versus uncertain information.
7. Generate a handover and show the persisted draft/history.
8. Explain public-only ingestion, heuristic extraction, missing auth and the planned semantic/temporal work.

## Round 3 commitments
1. **Temporal knowledge reconstruction:** claim supersession, ownership changes and historical project-state snapshots.
2. **Evidence conflict intelligence:** cross-source contradiction candidates, missing evidence signals and human resolution.
3. **Role-aware handover:** enforce source-level permissions and generate scoped handovers only from authorized evidence.

Do not mark a checkbox complete until the feature has been exercised against the running application and the result is recorded.
