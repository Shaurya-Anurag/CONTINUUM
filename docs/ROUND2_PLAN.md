# Round 2 implementation sequence

1. Stabilise the product shell and responsive layout.
2. Add PostgreSQL configuration and Alembic migrations.
3. Implement source registration and safe file ingestion (Markdown, text, PDF, DOCX) with size/type limits and content hashes.
4. Add extraction jobs with structured output schemas and mandatory evidence locators.
5. Persist candidate claims and evidence links transactionally.
6. Add claim review UI, conflict handling, audit history and tests.
7. Generate a recipient-scoped handover from verified claims only; explicitly mark open questions and conflicts separately for reviewer use.
8. Add GitHub connector with least-privilege OAuth and repository permission checks.
9. Add integration/e2e tests, deployment, demo dataset disclosure and operator documentation.

Do not claim a feature is complete until its API, UI, persistence, error path and test exist.
