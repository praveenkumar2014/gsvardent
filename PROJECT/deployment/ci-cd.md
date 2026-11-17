# CI/CD and Release Policy

## Current state
The repository now contains a Next.js 16/React 19 TypeScript application scaffold, Supabase authentication integration, and an initial schema migration draft. GitHub Actions validates the project specification, installs npm dependencies, runs TypeScript checks and runs the production build. During initial bootstrap it uses npm install if a package-lock is absent; commit the generated package-lock before release use.

## Required pipeline as implementation lands
1. Pull request: documentation/structure validation, install, typecheck, unit/integration tests, RLS policy tests and production build.
2. Main branch: repeat required checks and publish versioned build artifacts.
3. Deployment: only after host, environment, secrets, health check, rollback and approval gates are configured.
4. Post-deploy: smoke tests, health verification and release record.

## Security
- Minimal workflow permissions.
- Pin third-party actions to reviewed immutable SHAs before production use.
- Avoid pull_request_target for untrusted code.
- Never echo secrets; use GitHub environments for protected deployment.
- Do not grant cloud deploy credentials to untrusted fork PRs.
- Keep deployment separate from general CI until a target and secret contract are documented.

A green build is not proof that Supabase authentication or RLS works. Those require a configured test project and integration tests.
