/**
 * Verdent authorization policy — versioned role/permission matrix.
 *
 * Source of truth for the catalogue: PROJECT/architecture/rbac.md.
 * Concrete token values for the UI live in PROJECT/design/tokens.md; this module
 * is the source of truth for authorization role mapping.
 *
 * Enforcement model (rbac.md): deny-by-default, evaluated server-side, combined
 * with attribute/relationship checks. Route handlers call `rolesFor(permission)`
 * instead of writing inline role arrays so every mapping is centralized here and
 * unit-tested against the expected matrix.
 *
 * Superuser access is exceptional (rbac.md): it is granted in the policy below
 * only where the existing server routes already required it, and member-role
 * changes involving superuser remain additionally gated in
 * `src/app/api/admin/members/route.ts`.
 */

export const POLICY_VERSION = 1;

export const WORKSPACE_ROLES = ["superuser", "admin", "staff", "investor", "user"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PERMISSIONS = [
  "platform.manage",
  "workspace.read",
  "workspace.update",
  "members.read",
  "members.invite",
  "members.update_role",
  "members.revoke",
  "projects.create",
  "projects.read",
  "projects.update",
  "projects.archive",
  "tasks.plan",
  "tasks.approve",
  "tasks.execute",
  "tasks.cancel",
  "artifacts.read",
  "artifacts.export",
  "skills.read",
  "skills.enable",
  "skills.revoke",
  "connectors.read",
  "connectors.configure",
  "connectors.revoke",
  "audit.read",
  "audit.export"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Version 1 mapping. Derived from the server routes as they exist on main
 * (see PROJECT/PROGRESS.md):
 * - Workspace data reads (projects/plans/tasks/agents GET) accept every member role,
 *   including the read-only `investor` role.
 * - Create/update routes previously allowed exactly ["superuser","admin","staff","user"].
 * - Admin surfaces (members, audit) previously required exactly ["superuser","admin"].
 * - `tasks.approve` / `tasks.execute` are reserved for privileged roles until the
 *   approval workflow and isolated worker exist (they are not exercised by routes yet).
 * - `platform.manage`, membership lifecycle writes and registry administration stay
 *   superuser/admin only.
 */
const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly Permission[]> = {
  superuser: PERMISSIONS,
  admin: [
    "workspace.read",
    "workspace.update",
    "members.read",
    "members.invite",
    "members.update_role",
    "members.revoke",
    "projects.create",
    "projects.read",
    "projects.update",
    "projects.archive",
    "tasks.plan",
    "tasks.approve",
    "tasks.execute",
    "tasks.cancel",
    "artifacts.read",
    "artifacts.export",
    "skills.read",
    "skills.enable",
    "skills.revoke",
    "connectors.read",
    "connectors.configure",
    "connectors.revoke",
    "audit.read",
    "audit.export"
  ],
  staff: [
    "workspace.read",
    "projects.create",
    "projects.read",
    "projects.update",
    "tasks.plan",
    "tasks.cancel",
    "artifacts.read",
    "skills.read",
    "connectors.read"
  ],
  investor: ["workspace.read", "projects.read", "artifacts.read", "skills.read", "connectors.read"],
  user: [
    "workspace.read",
    "projects.create",
    "projects.read",
    "projects.update",
    "tasks.plan",
    "tasks.cancel",
    "artifacts.read",
    "skills.read",
    "connectors.read"
  ]
};

/** Roles allowed to perform `permission`, in role precedence order. */
export function rolesFor(permission: Permission): readonly WorkspaceRole[] {
  return WORKSPACE_ROLES.filter((role) => ROLE_PERMISSIONS[role].includes(permission));
}

/** Whether a single role holds `permission`. */
export function roleHas(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
