# CI/CD and Release Policy

## Current state
The repository has no app manifest, lockfile, source, migrations or deploy target. The initial GitHub Actions workflow therefore validates planning docs and conditionally runs application checks if a package manifest is introduced.

## Required pipeline as implementation lands
1. Pull request: documentation/structure validation, formatting, lint, typecheck, unit/integration tests, RLS policy tests and production build.
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
