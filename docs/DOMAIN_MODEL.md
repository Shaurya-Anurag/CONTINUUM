# Domain model

```mermaid
erDiagram
  PROJECT ||--o{ SOURCE : contains
  PROJECT ||--o{ CLAIM : tracks
  PROJECT ||--o{ AUDIT_EVENT : records
  SOURCE ||--o{ EVIDENCE : yields
  CLAIM ||--o{ CLAIM_EVIDENCE : supported_by
  EVIDENCE ||--o{ CLAIM_EVIDENCE : referenced_by
```

A claim is a time-bounded assertion about the project, not a raw LLM paragraph. Evidence is an immutable excerpt with a locator. `ClaimEvidence.relation` distinguishes support from contradiction. A future `ClaimVersion` and `Relationship` table will represent supersession, ownership, dependency and decision lineage without overwriting prior knowledge.
