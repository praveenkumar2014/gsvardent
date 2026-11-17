# Execution Backlog

Tasks are intentionally unassigned until a real owner is selected. Status begins as **Backlog**.

## Phase 0 — Repository baseline
- [ ] T-0001 Confirm application framework, runtime, package manager and directory conventions.
- [ ] T-0002 Record ADRs for frontend/backend boundaries, execution isolation and tenancy.
- [ ] T-0003 Define environments, hosting target, deployment ownership and rollback.
- [ ] T-0004 Add branch protection and required CI checks after workflow validation.

## Phase 1 — Data and security
- [ ] T-0101 Design workspace, membership, project, task, agent-run and artifact schema.
- [ ] T-0102 Create versioned Supabase migrations and local test configuration.
- [ ] T-0103 Enable RLS on every exposed table with deny-by-default policies.
- [ ] T-0104 Implement five-tier role and scoped permission model.
- [ ] T-0105 Build RLS and cross-tenant isolation tests for every role/table.
- [ ] T-0106 Implement append-only audit event schema, writer and retention policy.
- [ ] T-0107 Test audit immutability, completeness and access logging.
- [ ] T-0108 Define threat model, secrets handling, rate limits and abuse controls.

## Phase 2 — Authentication and workspace
- [ ] T-0201 Implement Supabase Auth and secure session lifecycle.
- [ ] T-0202 Implement workspace onboarding, invitations and membership changes.
- [ ] T-0203 Implement server-side authorization middleware and Zod contracts.
- [ ] T-0204 Build responsive workspace shell and role-aware navigation.
- [ ] T-0205 Build project CRUD and authorization tests.
- [ ] T-0206 Build Plan/Execute prompt canvas and approval UX.

## Phase 3 — Manager orchestration
- [ ] T-0301 Define initiative, plan-version, milestone, task and dependency contracts.
- [ ] T-0302 Implement decomposition service and deterministic persistence.
- [ ] T-0303 Implement task state machine, cancellation, retries and idempotency.
- [ ] T-0304 Add cost, concurrency, timeout and tool-call budgets.
- [ ] T-0305 Build manager progress and approval interface.

## Phase 4 — Admin and audit
- [ ] T-0401 Build membership and role administration console.
- [ ] T-0402 Add safe role-change workflows with re-authentication where needed.
- [ ] T-0403 Build scoped audit log viewer, filtering and safe export.
- [ ] T-0404 Verify all privileged admin actions are auditable.

## Phase 5 — Skills and MCP
- [ ] T-0501 Define signed/versioned skill and connector manifest.
- [ ] T-0502 Implement permission display, allowlist and explicit installation consent.
- [ ] T-0503 Implement scoped secret binding and credential revocation.
- [ ] T-0504 Implement connector execution proxy with timeout and audit controls.

## Phase 6 — Execution workbench
- [ ] T-0601 Design isolated worker lifecycle and threat model.
- [ ] T-0602 Implement scoped workspace filesystem and artifact handling.
- [ ] T-0603 Implement terminal sessions with resource/network controls.
- [ ] T-0604 Implement preview runtime and safe browser access.
- [ ] T-0605 Build diff, files, runtime health and execution views.
- [ ] T-0606 Test escape resistance, quota enforcement and cancellation.

## Phase 7 — Release
- [ ] T-0701 Add unit, integration, browser, accessibility and security test suites.
- [ ] T-0702 Add migration, backup/restore and rollback runbooks.
- [ ] T-0703 Configure production hosting secrets and protected environment.
- [ ] T-0704 Run load, performance and security verification.
- [ ] T-0705 Complete release review and controlled production deployment.
