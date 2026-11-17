import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession, type WorkspaceRole } from "@/lib/server/workspace";

const updateSchema = z.object({
  workspaceId: z.string().uuid(),
  membershipId: z.string().uuid(),
  role: z.enum(["admin", "staff", "investor", "user", "superuser"])
});

export async function GET(request: NextRequest) {
  const workspaceId = z.string().uuid().safeParse(request.nextUrl.searchParams.get("workspaceId"));
  if (!workspaceId.success) return NextResponse.json({ error: "A valid workspaceId is required." }, { status: 400 });

  const context = await getWorkspaceSession(workspaceId.data, ["superuser", "admin"]);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data: memberships, error } = await context.supabase
    .from("workspace_memberships")
    .select("id, workspace_id, user_id, role, created_at")
    .eq("workspace_id", workspaceId.data)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Workspace members could not be loaded." }, { status: 500 });

  const userIds = [...new Set((memberships ?? []).map((member) => member.user_id))];
  const { data: profiles } = userIds.length
    ? await context.supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as Array<{ id: string; display_name: string | null }> };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const members = (memberships ?? []).map((member) => ({
    ...member,
    display_name: profileMap.get(member.user_id) ?? null,
    canChangeRole: context.membership.role === "superuser" || member.role !== "superuser"
  }));

  return NextResponse.json({ members, actorRole: context.membership.role });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid membership role update." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, ["superuser", "admin"]);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  if (parsed.data.role === "superuser" && context.membership.role !== "superuser") {
    return NextResponse.json({ error: "Only an existing Superuser can grant the Superuser role." }, { status: 403 });
  }

  const { data: target, error: targetError } = await context.supabase
    .from("workspace_memberships")
    .select("id, user_id, role")
    .eq("id", parsed.data.membershipId)
    .eq("workspace_id", parsed.data.workspaceId)
    .maybeSingle();

  if (targetError || !target) return NextResponse.json({ error: "Membership not found." }, { status: 404 });
  if (target.role === "superuser" && context.membership.role !== "superuser") {
    return NextResponse.json({ error: "Workspace Admins cannot change a Superuser membership." }, { status: 403 });
  }
  if (target.user_id === context.userId && target.role === "superuser" && parsed.data.role !== "superuser") {
    return NextResponse.json({ error: "You cannot remove your own Superuser role here." }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("workspace_memberships")
    .update({ role: parsed.data.role as WorkspaceRole })
    .eq("id", parsed.data.membershipId)
    .eq("workspace_id", parsed.data.workspaceId)
    .select("id, user_id, role")
    .single();

  if (error || !data) return NextResponse.json({ error: "Role change was rejected by the database policy." }, { status: 403 });
  return NextResponse.json({ membership: data });
}
