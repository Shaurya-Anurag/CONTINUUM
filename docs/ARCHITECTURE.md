# CONTINUUM architecture

## Core pipeline

`Authorised source → connector → immutable source/evidence → proposed claim → human review → verified project knowledge → handover draft`

The LLM is an extractor and analyst, never the source of truth. Connector output is also untrusted: imported records start as proposed claims. Evidence retains a source URL, external identifier, excerpt, and content hash.

## Implemented bounded contexts

- **Project:** project container and knowledge boundary.
- **Source:** imported artifact metadata, external identity, access scope and content hash.
- **Evidence:** excerpt plus locator into the source.
- **Claim:** candidate assertion with category, owner, confidence and review status.
- **ClaimEvidence:** explicit relationship between a claim and supporting evidence.
- **AuditEvent:** append-only record of consequential import and review actions.
- **Handover:** generated view separating verified, unresolved and conflicting material.

## Current GitHub connector

`POST /api/v1/projects/{project_id}/sources/github`

The first connector accepts a GitHub `owner/repository` identifier or HTTPS repository URL. It fetches repository metadata, README content, up to 15 recent commits, and up to 15 open issues. Pull requests are excluded from the issue list. Each imported record becomes a source, evidence excerpt and proposed claim linked through `ClaimEvidence`. Content hashes prevent duplicate evidence records. The connector uses public unauthenticated GitHub REST endpoints and bounded request timeouts.

This is a source-ingestion foundation, not semantic reconstruction. Commit messages and issue text are not sufficient to infer project decisions or current architecture reliably. A future extraction stage must cite precise evidence locators and preserve uncertainty.

## Trust invariants

1. Connector/model output is never verified by default.
2. Every imported claim is linked to evidence.
3. A claim without supporting evidence cannot be marked verified.
4. Human review creates an audit event.
5. Conflicts and unresolved claims remain explicit.
6. Public-only connector scope is explicit; private OAuth is not implemented.
7. Current handover recipient and scope fields are descriptive only. They are not authorization controls.

## Security boundary and limitations

The current scaffold has no authentication, tenant isolation, or recipient-specific authorization. It must not be used with confidential or private source material. The public GitHub connector validates repository identifiers and does not accept arbitrary URLs, reducing SSRF exposure. It does not follow redirects. Production deployment still needs authentication, permission propagation, rate-limit handling, secret management, request throttling, and operational monitoring.

## Not yet implemented

LLM extraction, temporal claim versions/supersession, cross-claim dependency edges, private GitHub OAuth, document upload, asynchronous jobs, retry queues, PostgreSQL migrations, export rendering, and comprehensive end-to-end tests.
