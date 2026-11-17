# Database Design Baseline

## Expected entities
- profiles (identity metadata; Supabase Auth remains identity authority)
- workspaces
- workspace_memberships
- projects
- project_memberships (only if distinct project-level scopes are required)
- initiatives
- plan_versions
- milestones
- tasks
- task_dependencies
- agent_runs
- agent_tool_calls
- artifacts
- skills
- connectors
- capability_grants
- audit_logs

## Mandatory controls
- UUID primary keys; created_at/updated_at where applicable.
- Explicit workspace_id on tenant-owned rows and composite constraints where needed.
- Foreign keys and indexes aligned to query and RLS predicates.
- RLS enabled and policies deny by default.
- No broad authenticated-role policies without explicit scope.
- Audit logs append-only, with restricted insert path and no end-user update/delete.
- Versioned SQL migrations; avoid production schema drift through dashboard-only changes.
- Test policies with realistic JWT claims and multiple workspaces.

This is a conceptual schema; exact columns, constraints and indexes must be confirmed during the database design task before migration authoring.
