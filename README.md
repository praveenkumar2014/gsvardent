# Verdent — AI Engineering Workspace

Verdent is a secure workspace for turning product goals into reviewable plans, coordinating bounded agents, and delivering work with human approval and audit history.

## Product planning
- [Master plan](PROJECT/MASTER.md)
- [Product requirements](PROJECT/PRD.md)
- [Progress register](PROJECT/PROGRESS.md)
- [Execution backlog](PROJECT/TASKS.md)
- [Architecture and security](PROJECT/architecture/architecture.md)

## Core application modules in this branch
- **Projects & tasks:** Supabase-backed project create/read/update, task create/read/status management, tenant-scoped API access.
- **Manager:** plan-decomposition API and UI, with a configured server-side chat-completions provider when credentials are set. Without a provider, it explicitly labels its rules-based starter plan.
- **Hivemind:** persisted agent assignment/status board and event timeline. New assignments remain `waiting_approval`; no worker is claimed to be running.
- **Execution terminal:** read-only console preview. Browser-supplied shell commands are not executed; an isolated worker service is not yet configured.
- **Admin & audit:** workspace member/role management and read-only audit log viewer, restricted to Admin/Superuser.

## Supabase setup
Apply these SQL migrations in order to the intended Supabase project:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_core_modules.sql`

The migrations create the five workspace roles, memberships, projects, plans, tasks, agent run/event tables, RLS policies, role-safe grants and append-only audit history. Review and test them in a non-production Supabase project before deploying.

Add these environment variables to the app deployment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Enable Email Auth in Supabase. Configure Google OAuth only if you have its provider credentials. Add the deployed origin and `/auth/callback` to the Auth redirect allowlist.

## Optional AI provider
Manager can use an OpenAI-compatible chat-completions endpoint configured on the server:
- `VERDENT_AI_API_URL` — full HTTPS chat-completions endpoint.
- `VERDENT_AI_API_KEY` — server-only secret.
- `VERDENT_AI_MODEL` — provider model identifier.

Never add the AI key to a `NEXT_PUBLIC_*` variable or commit secrets. When these variables are absent, Manager uses a clearly marked rules-based fallback and still requires human review.

## Build and CI
Node.js 22 is used in GitHub Actions. CI validates the documentation/application structure, runs TypeScript checks and runs the Next.js production build. A lockfile must be committed before treating builds as reproducible release builds.

## Remaining implementation
The live Supabase migration has not been applied or integration-tested in a configured project. No production hosting target or deployment URL is configured. Agent worker isolation, command execution, model provider credentials, approvals for real execution, and end-to-end RLS tests remain release gates.
