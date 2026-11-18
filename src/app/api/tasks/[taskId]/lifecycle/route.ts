import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { rolesFor } from "@/lib/server/permissions";
import {
  TASK_ACTION_PERMISSIONS,
  WorkflowError,
  taskLifecycleSchema,
  taskTransition,
  type TaskStatus
} from "@/lib/server/workflow";
import { findIdempotentAudit, rpcErrorMessage, taskAuditAction } from "@/lib/server/workflowServer";

type RouteContext = { params: Promise<{ taskId: string }> };

/**
 * Apply a single task lifecycle action (start, review, block, retry, cancel…).
 * Mission-critical guards — prerequisite completion and retry limits — are
 * checked here by the unit-tested state machine and again by the database
 * function that performs the write.
 */
export async function POST(request: NextRequest, route: RouteContext) {
  const { taskId } = await route.params;
  if (!z.string().uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }

  const parsed = taskLifecycleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task lifecycle request." }, { status: 400 });
  }
  const { workspaceId, action, reason, idempotencyKey } = parsed.data;

  const context = await getWorkspaceSession(workspaceId, rolesFor(TASK_ACTION_PERMISSIONS[action]));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data: task, error: taskError } = await context.supabase
    .from("tasks")
    .select("id, workspace_id, status, attempt, plan_id")
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found in this workspace." }, { status: 404 });
  }

  let dependencies: Array<{ id: string; status: TaskStatus }> = [];
  if (action === "start") {
    const { data: edges, error: edgeError } = await context.supabase
      .from("task_dependencies")
      .select("depends_on_task_id")
      .eq("workspace_id", workspaceId)
      .eq("task_id", taskId);
    if (edgeError) {
      return NextResponse.json({ error: "Task dependencies could not be loaded. Apply migration 0004 first." }, { status: 500 });
    }
    const prerequisiteIds = (edges ?? []).map((edge) => edge.depends_on_task_id as string);
    if (prerequisiteIds.length > 0) {
      const { data: prerequisiteRows, error: prerequisiteError } = await context.supabase
        .from("tasks")
        .select("id, status")
        .eq("workspace_id", workspaceId)
        .in("id", prerequisiteIds);
      if (prerequisiteError) return NextResponse.json({ error: "Prerequisite tasks could not be loaded." }, { status: 500 });
      dependencies = (prerequisiteRows ?? []).map((row) => ({ id: row.id, status: row.status as TaskStatus }));
    }
  }

  try {
    taskTransition(task.status as TaskStatus, action, {
      attempt: Number(task.attempt) || 1,
      dependencies
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof WorkflowError ? cause.message : "This task action is not allowed." },
      { status: 409 }
    );
  }

  if (await findIdempotentAudit(context.supabase, workspaceId, taskAuditAction(action), idempotencyKey)) {
    return NextResponse.json({ alreadyApplied: true, taskId, action }, { status: 200 });
  }

  const { data, error } = await context.supabase.rpc("apply_task_action", {
    p_task_id: taskId,
    p_action: action,
    p_reason: reason ?? null,
    p_idempotency_key: idempotencyKey ?? null
  });

  if (error) {
    return NextResponse.json(
      { error: rpcErrorMessage(error, "The task action could not be applied. Apply migration 0004 first.") },
      { status: 400 }
    );
  }
  return NextResponse.json(data ?? { taskId, action });
}
