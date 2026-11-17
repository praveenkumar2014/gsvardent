# VERDENT — Master Project Plan

**Product:** Verdent  
**Repository:** https://github.com/praveenkumar2014/gsvardent  
**Status:** Application foundation in progress; production deployment not configured  
**Source of truth:** This repository and the linked planning workspace.

## Mission
Verdent is a multi-agent AI engineering workspace that turns natural-language goals into inspectable plans, controlled execution, reviewable changes, and auditable delivery.

## Non-negotiable engineering principles
1. Zero trust: every request is authenticated and authorized on the server.
2. Strict TypeScript: enable strict compiler checks; validate external input at boundaries with Zod.
3. Supabase PostgreSQL: enable Row-Level Security on every exposed table; policies must be tested for every role and tenant boundary.
4. Immutable auditing: privileged changes, sensitive data actions and agent execution leave append-only audit evidence.
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

## Roles
| Role | Intended scope |
|---|---|
| Superuser | Platform governance and emergency controls; tightly audited |
| Admin | Workspace configuration, membership and policy management |
| Staff | Operate assigned projects and approved workflows |
| Investor | Read-only approved portfolio, metrics and reports |
| User | Create and manage own permitted projects and resources |

Role names alone do not grant access. Enforce membership, tenant ownership, resource scope, and action permission on the server and in RLS.

## Selected application foundation
- Next.js 16 App Router, React 19 and strict TypeScript.
- Zod runtime validation at trust boundaries.
- Supabase Auth/PostgreSQL with cookie-based SSR sessions and versioned migrations.
- GitHub Actions for TypeScript validation and production builds.
- npm lockfile is required before release reproducibility is accepted.

## Target architecture
- UI communicates with authenticated domain APIs.
- Domain services authorize requests and persist typed records.
- Manager orchestration creates reviewable plans and bounded tasks.
- Execution uses isolated workers with scoped credentials, quotas, timeout and network policy.
- Skills/MCP registry stores manifests and permissions; secrets remain in a secret manager.
- Delivery uses pull requests, CI checks and an explicitly configured deployment target.

## Delivery sequence
1. Verify repository baseline and implement the app foundation.
2. Complete auth, workspace membership, database migrations and RLS tests.
3. Build workspace/project UI and persistent CRUD.
4. Implement Manager decomposition, plans, tasks and approvals.
5. Build admin/RBAC console and append-only audit viewer.
6. Add skills/MCP registry with safe permission grants and revocation.
7. Implement isolated workers, terminal, preview and artifacts.
8. Complete security, accessibility, performance, backup and deployment gates.

## Definition of done
- Acceptance criteria are met and linked to a task.
- Type checks, lint, tests and build pass where configured.
- RLS tests prove positive and negative access cases for all roles and tenant boundaries.
- Privileged mutations have audit coverage and append-only guarantees.
- Secrets and elevated service keys are not exposed to clients.
- UX states include loading, empty, error, denied and success; keyboard accessibility is covered.
- Operational instructions, rollback, monitoring and ownership are documented.
- No production deploy occurs without an approved target and credentials.

## Current repository status
The planning suite is on main. The app foundation is being built on a feature branch. There is not yet a live Supabase configuration, complete application backend, or production deployment.
