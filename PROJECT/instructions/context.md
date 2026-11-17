# Agent Context and Product Constraints

Verdent is a multi-agent engineering workspace. The product should help a non-specialist express an outcome while keeping execution inspectable and controlled.

Core context:
- Five roles: Superuser, Admin, Staff, Investor and User.
- Strong tenant boundaries and resource-scoped authorization.
- Supabase Auth and PostgreSQL are the intended data/auth platform.
- RLS is required for every exposed table.
- Audit history is append-only.
- Manager decomposition creates reviewable plans and task graphs.
- Agent execution is isolated from the UI and bounded by permissions, time, compute and network policy.
- Skills and MCP connectors disclose permissions and require explicit activation.
- The current repository is a planning baseline, not a completed application.

Do not invent existing functionality, credentials, domains, environments or deployment targets.
