# Technical Architecture

## Logical layers
1. Experience layer: responsive web UI, navigation, prompt canvas, project pages and workbench.
2. API/domain layer: authenticated endpoints, Zod contracts, permission checks and business rules.
3. Orchestration layer: manager plans, task graph, approvals, budgets and state machine.
4. Execution layer: isolated agents/workers and MCP tool proxy.
5. Data layer: Supabase Auth/PostgreSQL, versioned migrations, RLS and append-only audit.
6. Delivery/operations: GitHub Actions, artifacts, environment protection, metrics, logs and backup.

## Required interfaces
- UI communicates with domain APIs; it does not call privileged worker functions directly.
- Domain layer authenticates and authorizes every operation before accessing data.
- Orchestrator issues bounded task envelopes with actor, workspace, permissions, limits and correlation ID.
- Worker receives least-privilege credentials scoped to the task.
- Results return as typed, validated artifacts and are subject to review before publication.

## Decisions still required
- Exact web framework and routing approach.
- Backend hosting/runtime and worker isolation technology.
- Supabase project/environment topology and migration ownership.
- File/artifact storage and retention.
- Model providers and cost controls.
- MCP transport, trust verification and connector hosting.
- Production host, domains, DNS and rollback mechanism.

Record decisions as ADRs in `PROJECT/architecture/decisions/`. Avoid locking in dependencies before the current codebase and infrastructure are known.
