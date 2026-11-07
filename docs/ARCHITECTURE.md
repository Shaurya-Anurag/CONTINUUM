# CONTINUUM architecture — initial foundation

## Core pipeline

`Authorised sources → ingestion adapters → immutable source/evidence records → candidate claims → temporal project model → human verification → recipient-scoped handover`

The LLM is an extractor and analyst, never the source of truth. The source record remains immutable; claim status and review history are separate records/events.

## Initial bounded context
- **Workspace/project:** organisational boundary and project container.
- **Source:** connected/imported artifact metadata, external identity, access scope and content hash.
- **Evidence:** immutable excerpt plus locator into the source.
- **Claim:** a candidate statement about project state, with category, owner, confidence and validity interval.
- **ClaimEvidence:** explicit support/contradiction relationship between a claim and evidence.
- **AuditEvent:** append-only record of consequential human/system actions.
- **Handover:** generated view over approved claims, with uncertain/conflicting material clearly separated.

## Trust invariants
1. No claim should be generated without evidence references.
2. `verified` means a human reviewer accepted it; model confidence alone cannot verify.
3. Handover recipient views default to verified claims only.
4. Access checks must happen at source/evidence level before returning excerpts. Current scaffold uses a project-level placeholder and is not multi-tenant production security.
5. Conflicts are preserved; do not silently choose a winning source.
6. Corrections should create new claim versions/events rather than erase history.

## Current implementation boundary
Implemented: initial SQLAlchemy entities, local SQLite, demo seed, project/claim reads, explicit claim review endpoint, safe-default handover draft endpoint.
Not implemented: authentication, tenant isolation, real permission propagation, OAuth, source ingestion, LLM extraction, temporal supersession logic, migrations, job queue, rate limiting, production logging/metrics, export rendering, or full test coverage.
