import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { rolesFor } from "@/lib/server/permissions";

const createTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedAgent: z.string().trim().min(2).max(80).default("Product Manager")
});

export async function GET(request: NextRequest) {
  const query = z.object({ workspaceId: z.string().uuid(), projectId: z.string().uuid() })
    .safeParse({
      workspaceId: request.nextUrl.searchParams.get("workspaceId"),
      projectId: request.nextUrl.searchParams.get("projectId")
    });
  if (!query.success) return NextResponse.json({ error: "Valid workspaceId and projectId are required." }, { status: 400 });

  // Task listing is a workspace-data read; every member role may read (rbac.md
  // has no tasks.read, so this maps to workspace.read).
  const context = await getWorkspaceSession(query.data.workspaceId, rolesFor("workspace.read"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("tasks")
    .select("id, plan_id, title, description, status, priority, assigned_agent, position, attempt, last_error, cancelled_at, created_at")
    .eq("workspace_id", query.data.workspaceId)
    .eq("project_id", query.data.projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Tasks could not be loaded. Apply migration 0002 first." }, { status: 500 });

  const tasks = data ?? [];
  const taskIds = tasks.map((task) => task.id);
  const dependsOn: Record<string, string[]> = {};
  if (taskIds.length > 0) {
    // Migration 0004 adds dependencies; a workspace still on 0002/0003 simply
    // sees no prerequisite information rather than losing its task list.
    const { data: edges } = await context.supabase
      .from("task_dependencies")
      .select("task_id, depends_on_task_id")
      .eq("workspace_id", query.data.workspaceId)
      .in("task_id", taskIds);
    for (const edge of edges ?? []) {
      const list = dependsOn[edge.task_id] ?? [];
      list.push(edge.depends_on_task_id);
      dependsOn[edge.task_id] = list;
    }
  }

  return NextResponse.json({
    tasks: tasks.map((task) => ({ ...task, depends_on: dependsOn[task.id] ?? [] }))
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task details." }, { status: 400 });

  // Direct task creation/updates are plan-management actions until the approval
  // workflow exists (tasks.approve/execute are reserved); same role set as before.
  const context = await getWorkspaceSession(parsed.data.workspaceId, rolesFor("tasks.plan"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("tasks")
    .insert({
      workspace_id: parsed.data.workspaceId,
      project_id: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      assigned_agent: parsed.data.assignedAgent,
      created_by: context.userId
    })
    .select("id, title, description, status, priority, assigned_agent, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Task could not be created. Confirm project access and migration 0002." }, { status: 400 });
  return NextResponse.json({ task: data }, { status: 201 });
}
