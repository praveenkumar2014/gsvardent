import { describe, expect, it } from "vitest";
import {
  INVITATION_EXPIRY_DAYS,
  INVITATION_ROLES,
  acceptInvitationSchema,
  createInvitationSchema,
  removeMembershipSchema,
  revokeInvitationSchema
} from "../src/lib/server/invitations";
import { rolesFor } from "../src/lib/server/permissions";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("invitation contracts", () => {
  it("never offers the superuser role for invitations", () => {
    expect([...INVITATION_ROLES]).toEqual(["admin", "staff", "investor", "user"]);
    expect(INVITATION_ROLES as readonly string[]).not.toContain("superuser");
  });

  it("documents the same invite/revoke actors as the policy module", () => {
    // The routes enforce these; the test locks the mapping against regression.
    expect([...rolesFor("members.invite")]).toEqual(["superuser", "admin"]);
    expect([...rolesFor("members.revoke")]).toEqual(["superuser", "admin"]);
  });

  it("expires invitations after 7 days", () => {
    expect(INVITATION_EXPIRY_DAYS).toBe(7);
  });

  describe("createInvitationSchema", () => {
    it("accepts a valid invitation and normalizes the email", () => {
      const parsed = createInvitationSchema.safeParse({
        workspaceId: UUID,
        email: "  Teammate@Example.COM ",
        role: "staff"
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe("teammate@example.com");
        expect(parsed.data.role).toBe("staff");
      }
    });

    it("rejects the superuser role", () => {
      expect(
        createInvitationSchema.safeParse({ workspaceId: UUID, email: "a@b.co", role: "superuser" }).success
      ).toBe(false);
    });

    it("rejects malformed and missing-domain emails", () => {
      for (const email of ["not-an-email", "a@b", "@b.co", "a@", ""]) {
        expect(createInvitationSchema.safeParse({ workspaceId: UUID, email, role: "user" }).success).toBe(false);
      }
    });

    it("rejects emails longer than 254 characters", () => {
      const email = `${"x".repeat(250)}@b.co`;
      expect(createInvitationSchema.safeParse({ workspaceId: UUID, email, role: "user" }).success).toBe(false);
    });

    it("rejects non-uuid workspace ids", () => {
      expect(createInvitationSchema.safeParse({ workspaceId: "abc", email: "a@b.co", role: "user" }).success).toBe(false);
    });
  });

  describe("acceptInvitationSchema", () => {
    it("requires a 64-character hex token (the database-issued format)", () => {
      expect(acceptInvitationSchema.safeParse({ token: "a".repeat(64) }).success).toBe(true);
      expect(acceptInvitationSchema.safeParse({ token: "short" }).success).toBe(false);
      expect(acceptInvitationSchema.safeParse({ token: "z".repeat(64) }).success).toBe(false);
      expect(acceptInvitationSchema.safeParse({ token: "" }).success).toBe(false);
    });
  });

  describe("revokeInvitationSchema", () => {
    it("only accepts the revoke action", () => {
      expect(revokeInvitationSchema.safeParse({ workspaceId: UUID, action: "revoke" }).success).toBe(true);
      expect(revokeInvitationSchema.safeParse({ workspaceId: UUID, action: "delete" }).success).toBe(false);
      expect(revokeInvitationSchema.safeParse({ workspaceId: UUID }).success).toBe(false);
    });
  });

  describe("removeMembershipSchema", () => {
    it("requires uuid workspace and membership ids", () => {
      expect(removeMembershipSchema.safeParse({ workspaceId: UUID, membershipId: UUID }).success).toBe(true);
      expect(removeMembershipSchema.safeParse({ workspaceId: "abc", membershipId: UUID }).success).toBe(false);
      expect(removeMembershipSchema.safeParse({ workspaceId: UUID, membershipId: "" }).success).toBe(false);
    });
  });
});
