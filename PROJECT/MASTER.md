# VERDENT — Master Project Plan

**Product:** Verdent  
**Repository:** https://github.com/praveenkumar2014/gsvardent  
**Status:** Planning baseline; application implementation not yet present  
**Source of truth:** This repository and the linked planning workspace. Amend this document through reviewed pull requests.

## Mission
Verdent is a multi-agent AI engineering workspace that turns natural-language goals into inspectable plans, controlled execution, reviewable changes, and auditable delivery.

## Non-negotiable engineering principles
1. Zero trust: every request is authenticated and authorized on the server.
2. Strict TypeScript: enable strict compiler checks; avoid implicit `any`; validate external input at boundaries with Zod.
3. Supabase PostgreSQL: enable Row-Level Security on every exposed table; policies must be tested for every role and tenant boundary.
4. Immutable audit history: append-only audit events for authentication, privilege changes, sensitive data access, exports, and agent actions.
5. Separation of concerns: UI, API/domain services, orchestration, and agent execution run in distinct modules and trust boundaries.
6. Human control: planning and approval gates precede privileged, destructive, externally visible, or cost-incurring actions.
7. Least privilege: secrets never enter browser bundles, prompts, logs, or repository files.

## Product capabilities
- Authentication and workspace onboarding.
- Project and manager workspaces.
- Prompt-driven plan creation and task decomposition.
- Three-pane workbench: navigation, execution canvas, and browser/files/app inspection.
- Sandboxed execution terminal and preview.
- Skills and MCP connector registry with explicit permissions.
- Role-aware administration and audit log viewer.
- Reviewable changes, status, and delivery history.

## Roles and authority
| Role | Intended scope |
|---|---|
| Superuser | Platform governance and emergency controls; tightly audited |
| Admin | Workspace configuration, membership and policy management |
| Staff | Operate assigned projects and approved workflows |
| Investor | Read-only approved portfolio, metrics and reports |
| User | Create and manage own permitted projects and resources |

Role names alone do not grant access. Enforce membership, tenant ownership, resource scope, and action permission on the server and in RLS. Never trust client-supplied role claims.

## Target architecture
- Web UI: React/Next.js and strict TypeScript (exact framework decision pending repository implementation).
- Validation/contracts: Zod schemas shared only where safe; server remains authoritative.
- Data/auth: Supabase Auth and PostgreSQL with migrations and RLS.
- Audit: append-only audit event model with restricted writer path.
- Orchestration: manager/decomposition service creates plans and bounded tasks.
- Execution: isolated worker/runtime with scoped credentials, quotas, timeout, network policy, and artifact boundaries.
- Integrations: MCP/skills registry stores metadata, permission declarations, and versions; credentials stored in secret management, never in registry plaintext.
- Delivery: GitHub pull requests, CI checks, and an explicitly configured deployment target.

## Core delivery sequence
1. Verify repository baseline, app framework, and deployment target.
2. Establish architecture decisions, coding standards, environment separation, and threat model.
3. Implement database migrations, role model, RLS policies, and policy tests.
4. Implement authentication, workspace membership, and secure session lifecycle.
5. Build shell, navigation, workspace, prompt canvas, and status surfaces.
6. Implement manager decomposition and task lifecycle.
7. Build admin/RBAC console and append-only audit viewer.
8. Add skills/MCP registry with capability permissions and safe installation.
9. Implement isolated execution workers, terminal, preview, and artifacts.
10. Complete test, security, accessibility, performance, backup, and deployment gates.

## Definition of done
- Acceptance criteria are met and linked to a task.
- Type checks, lint, unit/integration tests and build pass where configured.
- RLS tests prove positive and negative access cases for all roles and tenant boundaries.
- Privileged mutations have audit coverage and append-only guarantees.
- Secrets and elevated service keys are not exposed to clients.
- UX states include loading, empty, error, denied, and success; keyboard accessibility is covered.
- Operational instructions, rollback, monitoring, and owner are documented.
- Pull request has review evidence; no production deploy occurs without an approved target and credentials.

## Current repository baseline
At plan creation, the repository contained only README.md, the existing Master Architecture, PRD, and agent.md. No application source, package manifest, migrations, tests, or deploy configuration was present. Therefore CI initially validates project documentation and repository structure; app build/type/security jobs activate only once the corresponding project files exist.

## Governance
All new implementation work is isolated in feature branches and reviewed through pull requests. Do not rewrite the existing default branch planning artifacts in-place without a review. Keep secrets in GitHub Actions secrets/environments or a dedicated secret manager. Never commit .env files, keys, tokens, database dumps, or user data.
