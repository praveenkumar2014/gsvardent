import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";

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

  const context = await getWorkspaceSession(query.data.workspaceId);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("tasks")
    .select("id, title, description, status, priority, assigned_agent, position, created_at")
    .eq("workspace_id", query.data.workspaceId)
    .eq("project_id", query.data.projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Tasks could not be loaded. Apply migration 0002 first." }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task details." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, ["superuser", "admin", "staff", "user"]);
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
