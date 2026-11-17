# Verdent

A secure, inspectable AI engineering workspace: plan work, coordinate bounded agents, review changes, and deliver with auditable controls.

## Project documentation
The maintained planning and implementation source of truth is in [PROJECT/](PROJECT/MASTER.md).

- [Master project plan](PROJECT/MASTER.md)
- [Product requirements](PROJECT/PRD.md)
- [Requirements and acceptance catalogue](PROJECT/REQUIREMENTS.md)
- [Roadmap](PROJECT/ROADMAP.md)
- [Execution backlog](PROJECT/TASKS.md)
- [Progress and verified repository status](PROJECT/PROGRESS.md)
- [Architecture](PROJECT/architecture/architecture.md)
- [Security baseline](PROJECT/architecture/security.md)
- [RBAC model](PROJECT/architecture/rbac.md)
- [Database baseline](PROJECT/architecture/database.md)
- [Screen inventory](PROJECT/design/screen-inventory.md)
- [Testing strategy](PROJECT/testing/testing-strategy.md)
- [CI/CD policy](PROJECT/deployment/ci-cd.md)
- [Release readiness](PROJECT/reports/release-readiness.md)

## Security principles
Strict TypeScript and Zod validation at trust boundaries; deny-by-default Supabase Row-Level Security across exposed tables; five-tier scoped authorization; append-only audit logs; and a hard boundary between UI, orchestration, and agent execution.

## Current implementation status
This repository currently contains the planning baseline and GitHub Actions validation. It does **not** yet contain a web application, package manifest, Supabase migrations, tests, or a configured deployment target. See [progress](PROJECT/PROGRESS.md). CI runs documentation validation now and activates application install, quality and build checks once a package manifest and supported lockfile are added.

## Development
When the application scaffold is introduced, commit its lockfile and define at least a `build` script in `package.json`. Optional scripts recognized by CI are `lint`, `typecheck`, and `test`.

Production deployment remains intentionally unconfigured until a hosting provider, protected environment, secrets, health check and rollback plan are documented.
