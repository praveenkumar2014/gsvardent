import { z } from "zod";

/**
 * Invitation contracts and pure helpers for the workspace membership lifecycle.
 * Database rules live in supabase/migrations/0003_workspace_invitations.sql;
 * this module mirrors them so API routes validate identically before touching
 * the database.
 */

/** Invitations may never grant the superuser role. */
export const INVITATION_ROLES = ["admin", "staff", "investor", "user"] as const;
export type InvitationRole = (typeof INVITATION_ROLES)[number];

export const INVITATION_EXPIRY_DAYS = 7;

export const createInvitationSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254),
  role: z.enum(INVITATION_ROLES)
});

export const listInvitationsSchema = z.object({
  workspaceId: z.string().uuid()
});

export const revokeInvitationSchema = z.object({
  workspaceId: z.string().uuid(),
  action: z.literal("revoke")
});

export const acceptInvitationSchema = z.object({
  token: z.string().trim().regex(/^[0-9a-f]{64}$/, "A valid invitation token is required.")
});

export const removeMembershipSchema = z.object({
  workspaceId: z.string().uuid(),
  membershipId: z.string().uuid()
});

/** Human-readable invitation status used by the admin console. */
export function describeInvitationStatus(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}
