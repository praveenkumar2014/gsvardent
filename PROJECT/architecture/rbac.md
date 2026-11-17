# RBAC and Permission Model

## Roles
`superuser`, `admin`, `staff`, `investor`, `user`.

## Enforcement model
RBAC is combined with attribute and relationship checks: actor identity, active membership, workspace, resource ownership, assignment, sensitivity and action. Authorization is deny-by-default and evaluated server-side. RLS independently enforces row visibility/mutation boundaries.

## Required permissions (initial catalogue)
- platform.manage
- workspace.read / workspace.update
- members.read / members.invite / members.update_role / members.revoke
- projects.create / projects.read / projects.update / projects.archive
- tasks.plan / tasks.approve / tasks.execute / tasks.cancel
- artifacts.read / artifacts.export
- skills.read / skills.enable / skills.revoke
- connectors.read / connectors.configure / connectors.revoke
- audit.read / audit.export

Map roles to permissions in a versioned policy module and test every mapping. Superuser access is exceptional, strongly authenticated and audited. Investor access is restricted to explicitly approved read-only portfolio/report resources. Staff access follows assigned scope. Never infer access merely from a role label.
