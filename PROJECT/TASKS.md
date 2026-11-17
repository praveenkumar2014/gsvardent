# Execution Backlog

Task statuses: **Backlog**, **In progress**, **Blocked**, **Done**. A task is Done only when implementation and acceptance evidence are verified.

## Phase 0 — Repository baseline
- [x] T-0001 Record framework/runtime/package manager ADR and repository conventions — Next.js 16, React 19, TypeScript and npm selected in the application scaffold.
- [ ] T-0002 Record architecture decisions for tenancy, worker isolation and data boundaries.
- [ ] T-0003 Define environments, hosting target, deployment ownership and rollback.
- [ ] T-0004 Add branch protection and required CI checks after workflow validation.

## Phase 1 — Data and security
- [ ] T-0101 Finalize workspace, membership, project, task, agent-run and artifact schema — **In progress** (workspace/project/task/plan/agent run/event tables drafted; artifact schema and full RLS integration tests pending).
- [ ] T-0102 Create versioned Supabase migrations and test configuration — **In progress** (migrations 0001 and 0002 drafted; not applied/tested in a configured Supabase project).
- [ ] T-0103 Enable RLS on every exposed table with deny-by-default policies — **In progress** (policies and grants drafted; integration tests pending).
- [ ] T-0104 Implement five-tier role and scoped permission model — **In progress** (role-safe Admin/Superuser API and database policies drafted).
- [ ] T-0105 Build RLS and cross-tenant isolation tests for every role/table.
- [ ] T-0106 Implement append-only audit event schema and trigger-based change history — **In progress** (initial workspace/project/plan/task/run audit triggers; full coverage tests pending).
- [ ] T-0107 Test audit immutability, completeness and access logging.
- [ ] T-0108 Define threat model, secrets handling, rate limits and abuse controls.

## Phase 2 — Authentication and workspace
- [x] T-0201 Implement Supabase Auth and secure session lifecycle — magic-link, optional Google OAuth, callback and cookie refresh code; live provider test pending.
- [ ] T-0202 Implement workspace onboarding, invitations and membership changes.
- [ ] T-0203 Implement server-side authorization middleware and Zod contracts — **In progress** (verified JWT claims, workspace API access checks and route schemas).
- [ ] T-0204 Build responsive workspace shell and role-aware navigation — **In progress** (core module routes added; workspace selection and complete capability filtering pending).
- [ ] T-0205 Build project CRUD and authorization tests — **In progress** (project create/read/update; delete and automated authorization tests pending).
- [ ] T-0206 Build Plan/Execute prompt canvas and approval UX — **In progress** (Manager draft plan and saved history; approval workflow/Execute mode pending).

## Phase 3 — Manager orchestration
- [ ] T-0301 Define initiative, plan-version, milestone, task and dependency contracts — **In progress** (initial plan/task schema and API added; versions/dependencies pending).
- [ ] T-0302 Implement decomposition service and deterministic persistence — **In progress** (configured model endpoint plus rules-based fallback; model keys not configured).
- [ ] T-0303 Implement task state machine, cancellation, retries and idempotency — **In progress** (task status transitions; retries/cancel/idempotency pending).
- [ ] T-0304 Add cost, concurrency, timeout and tool-call budgets — **In progress** (model timeout; complete budget accounting pending).
- [ ] T-0305 Build manager progress and approval interface — **In progress** (plan generation and history; approval actions pending).

## Phase 4 — Admin and audit
- [ ] T-0401 Build membership and role administration console — **In progress** (workspace member list and role change UI/API).
- [ ] T-0402 Add safe role-change workflows with re-authentication where needed — **In progress** (role restrictions and confirmation; stronger re-auth pending).
- [ ] T-0403 Build scoped audit log viewer, filtering and safe export — **In progress** (read-only workspace audit list; filters/export pending).
- [ ] T-0404 Verify all privileged admin actions are auditable.

## Phase 5 — Skills and MCP
- [ ] T-0501 Define signed/versioned skill and connector manifest.
- [ ] T-0502 Implement permission display, allowlist and explicit installation consent.
- [ ] T-0503 Implement scoped secret binding and credential revocation.
- [ ] T-0504 Implement connector execution proxy with timeout and audit controls.

## Phase 6 — Execution workbench
- [ ] T-0601 Design isolated worker lifecycle and threat model — **In progress** (terminal remains read-only until worker isolation is designed).
- [ ] T-0602 Implement scoped workspace filesystem and artifact handling.
- [ ] T-0603 Implement terminal sessions with resource/network controls — **In progress** (read-only terminal preview only; command execution not enabled).
- [ ] T-0604 Implement preview runtime and safe browser access.
- [ ] T-0605 Build diff, files, runtime health and execution views — **In progress** (Hivemind status/event board foundation).
- [ ] T-0606 Test escape resistance, quota enforcement and cancellation.

## Phase 7 — Release
- [ ] T-0701 Add unit, integration, browser, accessibility and security test suites.
- [ ] T-0702 Add migration, backup/restore and rollback runbooks.
- [ ] T-0703 Configure production hosting secrets and protected environment.
- [ ] T-0704 Run load, performance and security verification.
- [ ] T-0705 Complete release review and controlled production deployment.
