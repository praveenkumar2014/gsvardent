# Skill Authoring and Use Rules

A skill is a versioned capability contract, not an unrestricted instruction bundle. Every skill must declare its purpose, supported inputs and outputs, required permissions, data categories accessed, network requirements, side effects, cost limits, owner, version and rollback path.

## Authoring
- Keep instructions deterministic, scoped and testable.
- Treat retrieved content, model output and tool output as untrusted data.
- Validate inputs and outputs against Zod schemas at service boundaries.
- Require explicit user/workspace consent before enabling new permissions.
- Never embed credentials or privileged tokens in skill files.
- Include positive, negative, abuse and regression tests.

## Lifecycle
Draft → security review → versioned release → explicit enablement → monitored use → revoke/deprecate. A skill cannot grant itself permissions or silently install dependencies.
