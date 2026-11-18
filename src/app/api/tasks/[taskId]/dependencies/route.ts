import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { rolesFor } from "@/lib/server/permissions";
import { taskDependencySchema } from "@/lib/server/workflow";

type RouteContext = { params: Promise<{ taskId: string }> };

/**
 * Dependency edges are written directly under RLS (insert/delete for plan
 * operators only); the migration's guard trigger rejects self-loops,
 * cross-plan edges and cycles. Reads are available to every workspace member.
 */
export async function GET(request: NextRequest, route: RouteContext) {
  const { taskId } = await route.params;
  if (!z.string().uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!z.string().uuid().safeParse(workspaceId).success) {
    return NextResponse.json({ error: "A valid workspaceId is required." }, { status: 400 });
  }

  const context = await getWorkspaceSession(workspaceId!, rolesFor("workspace.read"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("task_dependencies")
    .select("id, task_id, depends_on_task_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "Dependencies could not be loaded. Apply migration 0004 first." }, { status: 500 });
  }
  return NextResponse.json({ dependencies: data ?? [] });
}

export async function POST(request: NextRequest, route: RouteContext) {
  const { taskId } = await route.params;
  if (!z.string().uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }
  const parsed = taskDependencySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid dependency request." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, rolesFor("tasks.plan"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  // Verify both endpoints are visible in this workspace before writing. The
  // database additionally enforces equal plan_id and acyclicity.
  const { data: endpoints, error: lookupError } = await context.supabase
    .from("tasks")
    .select("id, plan_id")
    .eq("workspace_id", parsed.data.workspaceId)
    .in("id", [taskId, parsed.data.dependsOnTaskId]);
  if (lookupError || (endpoints?.length ?? 0) !== 2) {
    return NextResponse.json({ error: "Both tasks must exist in this workspace." }, { status: 404 });
  }
  if (taskId === parsed.data.dependsOnTaskId) {
    return NextResponse.json({ error: "A task cannot depend on itself." }, { status: 400 });
  }
  if (endpoints![0].plan_id !== endpoints![1].plan_id) {
    return NextResponse.json({ error: "Dependencies must belong to the same plan." }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("task_dependencies")
    .insert({
      workspace_id: parsed.data.workspaceId,
      task_id: taskId,
      depends_on_task_id: parsed.data.dependsOnTaskId,
      created_by: context.userId
    })
    .select("id, task_id, depends_on_task_id")
    .single();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("task_dependencies_task_id_depends_on_task_id_key")) {
      return NextResponse.json({ error: "That dependency already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { error: message.includes("cycle") || message.includes("same plan") ? message : "Dependency was rejected by the database guard." },
      { status: 400 }
    );
  }
  return NextResponse.json({ dependency: data }, { status: 201 });
}

export async function DELETE(request: NextRequest, route: RouteContext) {
  const { taskId } = await route.params;
  if (!z.string().uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }
  const parsed = taskDependencySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid dependency request." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, rolesFor("tasks.plan"));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("task_dependencies")
    .delete()
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("task_id", taskId)
    .eq("depends_on_task_id", parsed.data.dependsOnTaskId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Dependency could not be removed." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Dependency not found." }, { status: 404 });
  return NextResponse.json({ removed: true });
}
