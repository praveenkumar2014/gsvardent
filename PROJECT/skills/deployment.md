# Skill: Deployment

**Purpose:** Prepare and execute approved deployments through controlled CI/CD.

**Inputs:** Release candidate, host configuration, protected environment and rollback runbook.

**Outputs:** Build artifacts, deployment record, smoke-test results and rollback evidence.

**Permissions:** CI and staging by default. Production deploy requires explicit user approval, protected environment and scoped credentials.

**Checks:** Lockfile, successful tests/build, secrets isolation, health checks, observability, backup and rollback. Never infer a provider or target from a domain name.
