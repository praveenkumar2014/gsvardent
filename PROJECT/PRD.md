# Verdent — Product Requirements Document

## 1. Vision
Provide a secure, inspectable AI engineering environment that converts user intent into planned work, coordinates specialist agents, executes approved tasks in isolated environments, and presents verifiable results.

## 2. Personas
- Founder / executive: priorities, cost visibility, delivery confidence, governance.
- Staff engineer: inspectable diffs, contracts, terminal and environment controls.
- Product operator: convert goals into milestones and track ownership and acceptance.
- Investor: read-only approved portfolio and reporting.
- End user: create projects and guide tasks without needing implementation expertise.

## 3. Functional requirements
### Identity and workspace
- Supabase Auth integration; support configured OAuth providers and passwordless email.
- Workspaces with explicit membership and role assignment.
- Server-side session validation and authorization; no reliance on client role state.
- Secure invite, revoke, recovery, and session termination flows.

### Project workspace
- Project list, create/edit, ownership and membership controls.
- Prompt composer with Plan and Execute modes.
- Plan mode creates a reviewable proposal without executing tools.
- Execution mode requires approvals appropriate to action risk.
- Task feed shows state, agent, timestamps, artifacts, errors and retry history.

### Manager orchestration
- Decompose requests into milestones, tasks, dependencies and acceptance criteria.
- Persist each plan version and explain assumptions.
- Pause for clarification/approval when scope, cost, access, or destructive effects are uncertain.
- Bound retries, execution time, token/compute budget, and parallelism.

### Workbench
- Navigation for projects, managers, skills, connectors, admin and settings.
- Main canvas for prompts, plans, progress and diff review.
- Workbench tabs for preview, files, app health and data inspection.
- Terminal sessions must be sandboxed and scoped to a project and user authorization.

### Skills and MCP registry
- Search and inspect skills/connectors before enabling.
- Display permissions, data access, network access, version, publisher, and trust status.
- Explicit approval before installation or credential binding.
- Disable/revoke and audit all capability grants.

### Administration and audit
- Admin console for members, roles, policies and workspace configuration.
- Audit viewer with filters and export controls.
- Append-only audit records for security-relevant operations.
- Audit access itself is logged; normal users cannot alter or delete audit records.

## 4. Role matrix (initial)
| Capability | Superuser | Admin | Staff | Investor | User |
|---|---:|---:|---:|---:|---:|
| Platform governance | Yes | No | No | No | No |
| Workspace settings | Yes | Yes | No | No | No |
| Manage workspace members | Yes | Yes | Limited by policy | No | No |
| View assigned projects | Policy | Yes | Yes | Approved read-only | Own/member |
| Create projects | Yes | Yes | Policy | No | Yes |
| Execute approved tasks | Policy | Yes | Yes | No | Yes, bounded |
| View audit events | Platform scope | Workspace scope | No by default | Approved reports only | Own activity summary |

All entries are subject to tenant membership, resource ownership, action scope, and policy. This matrix is a product baseline, not a substitute for tested authorization rules.

## 5. Non-functional requirements
- Strict TypeScript; runtime Zod validation at external boundaries.
- RLS enabled for every exposed database table and tested for all roles.
- Append-only security audit history.
- No elevated secrets in browser code.
- Rate limits, quotas, timeouts, CSRF protections where applicable, secure headers, and safe output handling.
- Accessible responsive interface with keyboard support and clear empty/loading/error/denied states.
- Observability without logging secrets or unnecessary personal data.

## 6. Acceptance criteria
1. A user cannot read or mutate another tenant's data by changing IDs or API payloads.
2. Each role has explicit allow/deny tests for every privileged operation.
3. Plans can be inspected and approved before execution.
4. Agent tasks are scoped, bounded, cancellable, and independently auditable.
5. Every privileged mutation produces a durable append-only audit event.
6. Connector and skill permissions are visible and revocable.
7. CI verifies documentation, static checks and application tests as implementation is added.
8. Deployment occurs only to a declared environment after successful required checks and explicit environment protection.

## 7. Out of scope until separately approved
- Unrestricted autonomous shell or network access.
- Automatic production deployment without a declared host, environment, secret contract, and approval policy.
- Claims of compliance certification or guaranteed uptime before operational evidence exists.
