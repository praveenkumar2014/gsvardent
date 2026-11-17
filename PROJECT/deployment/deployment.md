# Deployment Runbook

## Preconditions
- Confirm release commit and approved scope.
- Required CI, security and acceptance checks pass.
- Hosting target, domain, environment variables and secret references are documented.
- Protected deployment environment and named approver are configured.
- Database backup and migration/rollback approach are verified.

## Release
Build immutable artifact → deploy to staging → run smoke/security checks → approval → deploy production → run health checks → record version and result.

## Failure
Stop rollout, preserve redacted logs, restore previous artifact or execute documented rollback, validate data integrity and notify stakeholders. Never perform irreversible database rollback without a verified recovery plan.

No production host is currently configured in this repository.
