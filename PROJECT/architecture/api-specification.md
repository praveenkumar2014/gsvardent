# API Contract Principles

## Conventions
- Version external APIs where compatibility requires it.
- Use authenticated requests and server-side authorization.
- Validate every request, query, webhook and agent envelope with Zod.
- Return stable error codes, safe messages and correlation IDs.
- Apply pagination, maximum page sizes, rate limits and request size limits.
- Use idempotency keys for retriable writes and execution requests.
- Avoid exposing internal stack traces, secrets or database details.

## Initial resource groups
Authentication/session, workspaces/memberships, projects, plans, milestones/tasks, agent runs, artifacts, skills/connectors, approvals and audit events.

## Contract definition
For each endpoint document method/path, role/scope, request and response schemas, errors, idempotency, rate limits, audit behavior and tests. No endpoint is implemented by this planning document alone.
