# Round 2 delivery plan and acceptance criteria

## Implemented in the current repository

- [x] Product workspace and API-backed project overview.
- [x] Claim/evidence/source/event read endpoints.
- [x] Human claim review with audit-event persistence.
- [x] Evidence-free verification guard.
- [x] Handover draft that separates verified, needs-review and conflicting claims.
- [x] Public GitHub repository ingestion for README, recent commits and open issues.
- [x] Imported evidence has source URLs, external identifiers, content hashes and proposed claim status.
- [x] Source Library UI exposes the public repository import flow.
- [x] Input-validation tests for GitHub repository identifiers.
- [x] Unit tests for claim triage, source/evidence/claim linking, unchanged snapshot deduplication and changed snapshot retention.
- [x] Environment-driven database URL and CORS origin configuration.
- [x] Original source links in the Source Library.
- [x] GitHub Actions CI for backend tests and frontend typecheck/build.
- [x] Architecture and limitation documentation.

## Remaining before submission

### P0 — must complete and verify
1. Pull the latest main branch and install the new backend dependency.
2. Run backend tests and frontend typecheck/build; fix every failure.
3. Import a real public repository and verify source, evidence, claim and audit-event persistence.
4. Test duplicate import behaviour and GitHub 404/rate-limit/network failures.
5. Verify review transitions and ensure evidence-free claims cannot be verified.
6. Verify generated handovers separate verified, unresolved and conflicting records.
7. Deploy a judge-accessible build and test from a clean browser/session.
8. Record a truthful demo and document exactly which records are synthetic versus imported.

### P1 — high-value improvements
1. Add structured semantic extraction for decisions, ownership, dependencies, risks and open questions. Every extracted claim must cite exact source evidence and begin as proposed. Current lexical labels are only triage.
2. Add a temporal claim history/version table so changed claims do not overwrite previous state.
3. Add conflict detection across evidence records and a reviewer resolution workflow.
4. Add file ingestion for Markdown and PDF with type/size limits and source locators.
5. Add robust automated API integration tests.

### Explicitly out of scope for the first Round 2 cut
- Private GitHub OAuth and organization permission sync.
- Multi-tenant authentication/authorization.
- Enterprise-grade deployment and observability.
- A sophisticated force-directed knowledge graph.

## Round 2 demo acceptance path

1. Open the workspace and show the synthetic seed records are labelled.
2. Import a public repository through Source Library.
3. Show imported README/commit/issue sources and their evidence excerpts.
4. Open a proposed claim and inspect its source link.
5. Review a claim and show the audit event in Chronicle.
6. Generate a handover and demonstrate that only verified claims enter the verified section while unresolved and conflicting claims remain separated.
7. Explain limitations: public-only GitHub, heuristic first-pass claim creation, no LLM reconstruction, no authentication/permission propagation.

## Round 3 commitments

1. **Temporal knowledge reconstruction:** claim versions, supersession, ownership changes and project-state timeline.
2. **Evidence conflict intelligence:** cross-source contradiction candidates, missing evidence signals and human resolution.
3. **Role-aware handover:** enforce source-level permissions and generate scoped handovers only from authorised evidence.

Do not mark a checkbox complete until the feature has been exercised against the running application and the result is recorded.
