import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";

const updateSchema = z.object({
  workspaceId: z.string().uuid(),
  status: z.enum(["backlog", "ready", "in_progress", "review", "done", "blocked"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedAgent: z.string().trim().min(2).max(80).optional()
}).refine((value) => value.status !== undefined || value.priority !== undefined || value.assignedAgent !== undefined);

export async function PATCH(request: NextRequest, route: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await route.params;
  if (!z.string().uuid().safeParse(taskId).success) return NextResponse.json({ error: "Invalid task id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task update." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, ["superuser", "admin", "staff", "user"]);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const updates = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
    ...(parsed.data.assignedAgent ? { assigned_agent: parsed.data.assignedAgent } : {})
  };
  const { data, error } = await context.supabase
    .from("tasks").update(updates).eq("id", taskId).eq("workspace_id", parsed.data.workspaceId)
    .select("id, title, description, status, priority, assigned_agent, updated_at").maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Task could not be updated." }, { status: 400 });
  return NextResponse.json({ task: data });
}
