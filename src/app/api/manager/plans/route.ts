import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { roleHas, rolesFor, type Permission } from "@/lib/server/permissions";
import { PLAN_ACTION_PERMISSIONS, TASK_ACTION_PERMISSIONS } from "@/lib/server/workflow";

const CAPABILITY_PERMISSIONS: Record<string, Permission> = {
  ...PLAN_ACTION_PERMISSIONS,
  ...TASK_ACTION_PERMISSIONS
};

export async function GET(request: NextRequest) {
  const query = z.object({ workspaceId: z.string().uuid(), projectId: z.string().uuid().optional() })
    .safeParse({
      workspaceId: request.nextUrl.searchParams.get("workspaceId"),
      projectId: request.nextUrl.searchParams.get("projectId") ?? undefined
    });
  if (!query.success) return NextResponse.json({ error: "Valid workspaceId is required." }, { status: 400 });

  const context = await getWorkspaceSession(query.data.workspaceId, rolesFor("workspace.read"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  let requestQuery = context.supabase
    .from("manager_plans")
    .select("id, project_id, title, description, source_prompt, status, provider, model, version, supersedes_id, rejection_reason, approved_by, created_at")
    .eq("workspace_id", query.data.workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (query.data.projectId) requestQuery = requestQuery.eq("project_id", query.data.projectId);
  const { data, error } = await requestQuery;
  if (error) return NextResponse.json({ error: "Plans could not be loaded. Apply migration 0002." }, { status: 500 });

  // The client only renders controls the server would authorize; the API
  // routes and database functions remain the actual enforcement boundary.
  const capabilities: Record<string, boolean> = {};
  for (const [action, permission] of Object.entries(CAPABILITY_PERMISSIONS)) {
    capabilities[action] = roleHas(context.membership.role, permission);
  }

  return NextResponse.json({
    plans: data ?? [],
    actorRole: context.membership.role,
    capabilities
  });
}
