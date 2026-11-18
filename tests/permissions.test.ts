import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  POLICY_VERSION,
  WORKSPACE_ROLES,
  roleHas,
  rolesFor,
  type Permission,
  type WorkspaceRole
} from "../src/lib/server/permissions";

/**
 * Expected role→permission matrix, hand-written independently of the
 * implementation in src/lib/server/permissions.ts (rbac.md requires that every
 * mapping is tested). Roles are listed in WORKSPACE_ROLES precedence order.
 */
const EXPECTED: Record<Permission, readonly WorkspaceRole[]> = {
  "platform.manage": ["superuser"],

  "workspace.read": ["superuser", "admin", "staff", "investor", "user"],
  "workspace.update": ["superuser", "admin"],

  "members.read": ["superuser", "admin"],
  "members.invite": ["superuser", "admin"],
  "members.update_role": ["superuser", "admin"],
  "members.revoke": ["superuser", "admin"],

  "projects.create": ["superuser", "admin", "staff", "user"],
  "projects.read": ["superuser", "admin", "staff", "investor", "user"],
  "projects.update": ["superuser", "admin", "staff", "user"],
  "projects.archive": ["superuser", "admin"],

  "tasks.plan": ["superuser", "admin", "staff", "user"],
  "tasks.approve": ["superuser", "admin"],
  "tasks.execute": ["superuser", "admin"],
  "tasks.cancel": ["superuser", "admin", "staff", "user"],

  "artifacts.read": ["superuser", "admin", "staff", "investor", "user"],
  "artifacts.export": ["superuser", "admin"],

  "skills.read": ["superuser", "admin", "staff", "investor", "user"],
  "skills.enable": ["superuser", "admin"],
  "skills.revoke": ["superuser", "admin"],

  "connectors.read": ["superuser", "admin", "staff", "investor", "user"],
  "connectors.configure": ["superuser", "admin"],
  "connectors.revoke": ["superuser", "admin"],

  "audit.read": ["superuser", "admin"],
  "audit.export": ["superuser", "admin"]
};

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  superuser: "Superuser",
  admin: "Admin",
  staff: "Staff",
  investor: "Investor",
  user: "User"
};

describe("authorization policy matrix", () => {
  it("is versioned", () => {
    expect(POLICY_VERSION).toBe(1);
  });

  it("defines exactly the five rbac.md roles", () => {
    expect([...WORKSPACE_ROLES]).toEqual([
      "superuser",
      "admin",
      "staff",
      "investor",
      "user"
    ]);
  });

  it("covers every permission in the rbac.md catalogue", () => {
    // rbac.md initial catalogue, flattened into route-oriented permission names.
    expect([...PERMISSIONS]).toEqual([
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
    ]);
  });

  for (const permission of PERMISSIONS) {
    it(`${permission}: rolesFor returns exactly the expected role set`, () => {
      expect([...rolesFor(permission)]).toEqual([...EXPECTED[permission]]);
    });
  }

  for (const permission of PERMISSIONS) {
    for (const role of WORKSPACE_ROLES) {
      const granted = EXPECTED[permission].includes(role);
      const verb = granted ? "grants" : "denies";
      it(`${ROLE_LABELS[role]} ${verb} ${permission}`, () => {
        expect(roleHas(role, permission)).toBe(granted);
        // roleHas must always agree with rolesFor (single source of truth).
        expect(rolesFor(permission).includes(role)).toBe(granted);
      });
    }
  }

  it("never grants write permissions to the investor role", () => {
    for (const permission of PERMISSIONS) {
      const readOnly =
        permission === "workspace.read" ||
        permission === "projects.read" ||
        permission === "artifacts.read" ||
        permission === "skills.read" ||
        permission === "connectors.read";
      if (!readOnly) {
        expect(rolesFor(permission), `${permission} must not include investor`).not.toContain(
          "investor"
        );
      }
    }
  });

  it("reserves platform.manage exclusively for the superuser role", () => {
    expect([...rolesFor("platform.manage")]).toEqual(["superuser"]);
  });
});
