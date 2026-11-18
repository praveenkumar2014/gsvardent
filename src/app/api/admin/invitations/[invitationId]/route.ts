import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revokeInvitationSchema } from "@/lib/server/invitations";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { rolesFor } from "@/lib/server/permissions";

type RouteContext = { params: Promise<{ invitationId: string }> };

export async function PATCH(request: NextRequest, route: RouteContext) {
  const { invitationId } = await route.params;
  if (!z.string().uuid().safeParse(invitationId).success) {
    return NextResponse.json({ error: "Invalid invitation id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = revokeInvitationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Only the revoke action is supported." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, rolesFor("members.revoke"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  // Only a pending invitation can be revoked; accepted/revoked/expired rows are final.
  const { data, error } = await context.supabase
    .from("workspace_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("status", "pending")
    .select("id, workspace_id, email, role, status, expires_at, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Invitation could not be revoked." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Invitation not found or no longer pending." }, { status: 404 });
  return NextResponse.json({ invitation: data });
}
