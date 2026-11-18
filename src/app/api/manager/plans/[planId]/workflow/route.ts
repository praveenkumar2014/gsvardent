import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";
import { rolesFor } from "@/lib/server/permissions";
import {
  PLAN_ACTION_PERMISSIONS,
  WorkflowError,
  planTransition,
  planWorkflowSchema,
  validateTaskGraph,
  type GraphTask,
  type PlanStatus
} from "@/lib/server/workflow";
import { findIdempotentAudit, planAuditAction, rpcErrorMessage } from "@/lib/server/workflowServer";

type RouteContext = { params: Promise<{ planId: string }> };

/**
 * Apply an approval, rejection, cancellation, revision or execution-state
 * action to one plan. The pure state machine rejects illegal requests with a
 * 409 before the atomic database function runs; both layers enforce the same
 * transition rules.
 */
export async function POST(request: NextRequest, route: RouteContext) {
  const { planId } = await route.params;
  if (!z.string().uuid().safeParse(planId).success) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const parsed = planWorkflowSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan action. Rejections need a reason and revisions need an updated goal." },
      { status: 400 }
    );
  }
  const { workspaceId, action, idempotencyKey } = parsed.data;

  const context = await getWorkspaceSession(workspaceId, rolesFor(PLAN_ACTION_PERMISSIONS[action]));
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data: plan, error: planError } = await context.supabase
    .from("manager_plans")
    .select("id, workspace_id, project_id, status, version, title, supersedes_id")
    .eq("id", planId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (planError || !plan) {
    return NextResponse.json({ error: "Plan not found in this workspace. Apply migration 0004 first." }, { status: 404 });
  }

  try {
    planTransition(plan.status as PlanStatus, action);
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof WorkflowError ? cause.message : "This plan action is not allowed." },
      { status: 409 }
    );
  }

  // Approving and revising both persist the whole task graph, so verify it
  // before any write: unknown, duplicate, cross-plan or cyclic edges are rejected.
  if (action === "approve" || action === "revise") {
    const { data: tasks, error: taskError } = await context.supabase
      .from("tasks")
      .select("id, plan_id, workspace_id")
      .eq("plan_id", planId)
      .eq("workspace_id", workspaceId);
    if (taskError) return NextResponse.json({ error: "Plan tasks could not be validated." }, { status: 500 });

    const taskIds = (tasks ?? []).map((task) => task.id);
    let dependencies: Array<{ task_id: string; depends_on_task_id: string }> = [];
    if (taskIds.length > 0) {
      const { data: dependencyRows, error: dependencyError } = await context.supabase
        .from("task_dependencies")
        .select("task_id, depends_on_task_id")
        .eq("workspace_id", workspaceId)
        .in("task_id", taskIds);
      if (dependencyError) {
        return NextResponse.json({ error: "Task dependencies could not be validated. Apply migration 0004 first." }, { status: 500 });
      }
      dependencies = (dependencyRows ?? []) as Array<{ task_id: string; depends_on_task_id: string }>;
    }

    const graph: GraphTask[] = (tasks ?? []).map((task) => ({
      id: task.id,
      planId: task.plan_id,
      workspaceId: task.workspace_id,
      dependsOn: dependencies
        .filter((dependency) => dependency.task_id === task.id)
        .map((dependency) => dependency.depends_on_task_id)
    }));
    const problems = validateTaskGraph(graph);
    if (problems.length > 0) {
      return NextResponse.json({ error: "Plan dependencies are invalid.", problems }, { status: 409 });
    }
  }

  if (await findIdempotentAudit(context.supabase, workspaceId, planAuditAction(action), idempotencyKey)) {
    return NextResponse.json({ alreadyApplied: true, planId, action }, { status: 200 });
  }

  const { data, error } = await context.supabase.rpc("apply_manager_plan_action", {
    p_plan_id: planId,
    p_action: action,
    p_reason: parsed.data.reason ?? null,
    p_prompt: parsed.data.prompt ?? null,
    p_note: parsed.data.note ?? null,
    p_idempotency_key: idempotencyKey ?? null
  });

  if (error) {
    return NextResponse.json(
      { error: rpcErrorMessage(error, "The plan action could not be applied. Apply migration 0004 first.") },
      { status: 400 }
    );
  }
  return NextResponse.json(data ?? { planId, action });
}
