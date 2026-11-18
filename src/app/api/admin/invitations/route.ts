import { NextRequest, NextResponse } from "next/server";
import { createInvitationSchema, listInvitationsSchema } from "@/lib/server/invitations";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { rolesFor } from "@/lib/server/permissions";

export async function GET(request: NextRequest) {
  const query = listInvitationsSchema.safeParse({
    workspaceId: request.nextUrl.searchParams.get("workspaceId")
  });
  if (!query.success) return NextResponse.json({ error: "A valid workspaceId is required." }, { status: 400 });

  const context = await getWorkspaceSession(query.data.workspaceId, rolesFor("members.read"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("workspace_invitations")
    .select("id, workspace_id, email, role, status, expires_at, created_at")
    .eq("workspace_id", query.data.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Invitations could not be loaded. Apply migration 0003 first." }, { status: 500 });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid email address and a member role." }, { status: 400 });
  }

  const context = await getWorkspaceSession(parsed.data.workspaceId, rolesFor("members.invite"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("workspace_invitations")
    .insert({
      workspace_id: parsed.data.workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
      created_by: context.userId
    })
    .select("id, workspace_id, email, role, status, expires_at, created_at")
    .single();

  if (error) {
    const duplicate = error.message?.includes("workspace_invitations_pending_unique");
    return NextResponse.json(
      { error: duplicate ? "A pending invitation for this email already exists." : "Invitation could not be created. Apply migration 0003 and verify permissions." },
      { status: duplicate ? 409 : 400 }
    );
  }

  return NextResponse.json({ invitation: data }, { status: 201 });
}
