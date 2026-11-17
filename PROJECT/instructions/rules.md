# Project Rules

1. The master plan, PRD, requirements and ADRs govern product implementation.
2. Inspect current files and existing conventions before changing anything.
3. Use strict TypeScript and Zod validation at all untrusted boundaries.
4. Enforce server authorization and database RLS independently.
5. Keep UI, domain services, orchestration and worker execution separated.
6. Make privileged, destructive, externally visible and costly operations approval-gated.
7. Keep audit events append-only and redact secrets from all logs.
8. Use migrations for schema changes; never rely on undocumented dashboard drift.
9. Use feature branches and pull requests; preserve unrelated changes.
10. Do not mark tasks complete without linked evidence and passing checks.
11. Never claim build, deployment, compliance or security success without evidence.
