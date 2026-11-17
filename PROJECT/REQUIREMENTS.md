# Requirements and Acceptance Catalogue

## Security
- SEC-01: Validate identity and session server-side on every protected request.
- SEC-02: Authorize resource access using workspace membership and resource scope.
- SEC-03: Enable RLS on every exposed table; deny by default.
- SEC-04: Test cross-tenant read/write denial for every table and role.
- SEC-05: Store secrets in approved secret storage; redact them from logs and outputs.
- SEC-06: Audit authentication, role/membership changes, privileged reads/writes, exports and agent tool calls.
- SEC-07: Audit storage is append-only; application roles cannot update/delete events.
- SEC-08: Apply least privilege, rate limits, request size limits and execution quotas.

## Application
- APP-01: User can create and access authorized workspaces/projects.
- APP-02: Plan mode produces a persisted plan without tool execution.
- APP-03: Execute mode requires policy-compliant approval.
- APP-04: Manager decomposes an initiative into ordered tasks with dependencies and acceptance checks.
- APP-05: Workbench exposes execution progress, artifacts, diffs and failures.
- APP-06: Terminal and preview run in isolated, resource-bounded environments.
- APP-07: Skills/MCP tools disclose permissions and require explicit enablement.
- APP-08: Admin functions and audit viewer enforce role and tenant scope.

## Quality gates
- QG-01: TypeScript strict mode and no unreviewed unsafe casts.
- QG-02: Zod validates API, form, webhook and agent boundary payloads.
- QG-03: Unit, integration, RLS, authorization and end-to-end tests.
- QG-04: Accessibility checks for critical flows.
- QG-05: Build and deploy are reproducible from committed lockfiles and documented configuration.
- QG-06: Migration and rollback strategy documented and tested.
- QG-07: No deployment runs without configured environment protection and secrets.
