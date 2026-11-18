# Delivery Progress

**Last updated:** 2026-11-18

## Verified on main
- PR #1 merged the planning/specification suite and documentation CI.
- PR #2 merged the Next.js 16/React 19 app foundation, Supabase SSR login flow, protected workspace shell and initial database migration.
- The most recent recorded PR #2 GitHub Actions run passed the project validator and TypeScript/production build.

## Implemented on PR #3 feature branch
- Supabase-backed project list/create/update APIs and UI.
- Supabase-backed task list/create/status-update APIs and UI.
- Manager plan-decomposition API with schema-validated model response support via server-only configuration and a clearly identified rules-based fallback.
- Persisted Manager plans and generated task records.
- Hivemind-style agent team board and event timeline backed by agent_runs/agent_events.
- Agent assignment records remain in waiting_approval; no real execution is claimed.
- Read-only terminal preview; arbitrary shell execution is disabled until an isolated worker is implemented.
- Workspace Admin console for member roles and read-only audit history.
- Role-scoped APIs and second Supabase migration with composite workspace references, RLS and restricted grants.
- GitHub CI validator expanded to verify all core module files.

## Pending external configuration / verification
- PR #3 GitHub Actions run #44190825551 passed: project/application structure validation, TypeScript check and Next.js production build.
- Supabase migrations have not been applied to a configured Supabase project; live RLS behavior has not been integration-tested.
- Supabase URL and publishable key are not configured in a deployment environment.
- Model API URL/key/model are optional and not configured; until configured, Manager uses rules-based decomposition.
- Isolated agent worker/terminal execution, tool permissions and secure cancellation remain unimplemented.
- Production hosting, domain, secrets, health checks and rollback target are not configured.

## Authorization matrix batch (this branch)
- Added `src/lib/server/permissions.ts`: versioned (`POLICY_VERSION = 1`) role/permission policy implementing the full `PROJECT/architecture/rbac.md` catalogue (25 permissions × 5 roles), with `rolesFor(permission)` / `roleHas(role, permission)`.
- Refactored projects (GET/POST/PATCH), tasks (POST/PATCH), Manager decompose, admin members (GET/PATCH) and admin audit routes to consume the policy module instead of inline role arrays; workspace.ts re-exports the shared role type. Role sets are behavior-preserving (verified against a hand-written expected matrix in tests).
- Added `tests/permissions.test.ts`: every permission×role mapping tested positive and negative (155 tests), investor never holds write permissions, `platform.manage` is superuser-only.
- Committed `package-lock.json` (CI now installs via `npm ci`) and wired `npm test` (vitest), which CI already executes when the script exists.
- Still open: live RLS/migration integration tests (require a configured test Supabase project).

## Evidence policy
A UI or source file is not proof of a deployed or fully working feature. Mark integration work complete only after real environment tests, positive/negative authorization tests and passing workflow evidence exist.
