import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { rolesFor } from "@/lib/server/permissions";

const updateProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["active", "paused", "archived"]).optional()
}).refine((value) => value.name !== undefined || value.description !== undefined || value.status !== undefined);

type RouteContext = { params: Promise<{ projectId: string }> };

export async function PATCH(request: NextRequest, route: RouteContext) {
  const { projectId } = await route.params;
  if (!z.string().uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid project update." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, rolesFor("projects.update"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { workspaceId, ...updates } = parsed.data;
  const { data, error } = await context.supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .select("id, workspace_id, name, description, status, updated_at")
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Project could not be updated." }, { status: 400 });
  return NextResponse.json({ project: data });
}
