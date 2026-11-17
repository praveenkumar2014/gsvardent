# Verdent — AI Engineering Workspace

Verdent is being built as a secure workspace for turning product ideas into reviewable plans, coordinating bounded agents, and delivering work with human approval and audit history.

## Project direction
- [Master plan](PROJECT/MASTER.md)
- [Product requirements](PROJECT/PRD.md)
- [Progress register](PROJECT/PROGRESS.md)
- [Execution backlog](PROJECT/TASKS.md)
- [Architecture and security](PROJECT/architecture/architecture.md)

## Application foundation
This branch introduces a Next.js App Router application with:
- Email magic-link sign-in and optional Google OAuth via Supabase Auth.
- Cookie-based Supabase SSR session handling and JWT claim verification.
- A protected Verdent workspace shell and early dashboard interface.
- Strict TypeScript and Zod email validation.
- Initial workspace, membership, project and append-only audit schema with RLS policies.

## Authentication setup
1. Create or select the Supabase project for Verdent.
2. Apply `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor or through the migration workflow you use.
3. Enable Email authentication. Enable Google OAuth only if you have configured its OAuth credentials in Supabase.
4. Add these environment variables to the deployment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Add the deployed origin and `/auth/callback` to the Supabase Auth redirect allowlist.

Copy `.env.example` as the environment variable reference. Never add a service-role key to a `NEXT_PUBLIC_*` variable or commit secrets.

## Build
Node.js 22 is used in CI. GitHub Actions runs TypeScript checks and the Next.js production build. During initial setup it can install from the pinned direct dependencies when no lockfile exists; commit the generated `package-lock.json` before treating builds as reproducible release builds.

## Not yet implemented
The authenticated shell is an initial UI foundation. Persisted project CRUD, Manager task decomposition, skill/MCP execution, full RBAC administration, audit viewer APIs, isolated agents/terminal, and production deployment are staged work. Real login needs a configured Supabase project and enabled Auth provider. No production hosting target is configured.
