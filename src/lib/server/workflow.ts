import { z } from "zod";
import { type Permission, rolesFor } from "./permissions";

/**
 * Manager workflow contracts and pure transition logic.
 *
 * This module is the single source of truth for *which* plan/task transitions
 * are legal. It is intentionally side-effect free so the complete matrix can be
 * unit-tested without a database. API routes validate requests here first, then
 * call the matching security-definer RPC in migration 0004, which re-checks the
 * same rules inside the database (defence in depth).
 *
 * No transition in this module starts an agent or a terminal command. Execution
 * remains a separate, explicitly gated action — the isolated worker is not part
 * of this batch.
 */

export const PLAN_STATUSES = [
  "draft",
  "approved",
  "executing",
  "completed",
  "failed",
  "rejected",
  "cancelled",
  "superseded"
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const TASK_STATUSES = [
  "backlog",
  "ready",
  "in_progress",
  "review",
  "done",
  "blocked",
  "failed",
  "cancelled"
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PLAN_ACTIONS = [
  "approve",
  "reject",
  "cancel",
  "revise",
  "start_execution",
  "complete",
  "fail"
] as const;
export type PlanAction = (typeof PLAN_ACTIONS)[number];

export const TASK_ACTIONS = [
  "start",
  "submit_review",
  "complete",
  "request_changes",
  "block",
  "unblock",
  "fail",
  "retry",
  "cancel"
] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];

/** A failed/blocked task can be retried at most this many times (attempt 1..3). */
export const MAX_TASK_ATTEMPTS = 3;

const ACTION_LABELS: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
  revise: "revised",
  start_execution: "started",
  complete: "completed",
  fail: "failed",
  start: "started",
  submit_review: "submitted for review",
  request_changes: "sent back for changes",
  block: "blocked",
  unblock: "unblocked",
  retry: "retried",
  done: "completed"
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ");
}

export class WorkflowError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

// ---------------------------------------------------------------------------
// Plan lifecycle
// ---------------------------------------------------------------------------

const PLAN_TRANSITIONS: Record<PlanStatus, Partial<Record<PlanAction, PlanStatus>>> = {
  draft: { approve: "approved", reject: "rejected", cancel: "cancelled", revise: "superseded" },
  approved: { cancel: "cancelled", start_execution: "executing" },
  executing: { complete: "completed", fail: "failed", cancel: "cancelled" },
  failed: { cancel: "cancelled", revise: "superseded" },
  rejected: { revise: "superseded" },
  completed: {},
  cancelled: {},
  superseded: {}
};

export type PlanTransition = {
  from: PlanStatus;
  to: PlanStatus;
  action: PlanAction;
};

/** Assert that `action` is legal for a plan in `from` and return the transition. */
export function planTransition(from: PlanStatus, action: PlanAction): PlanTransition {
  const to = PLAN_TRANSITIONS[from][action];
  if (!to) {
    throw new WorkflowError(
      "PLAN_TRANSITION_NOT_ALLOWED",
      `A ${from} plan cannot be ${actionLabel(action)}.`
    );
  }
  return { from, to, action };
}

export function canPlanTransition(from: PlanStatus, action: PlanAction): boolean {
  return Boolean(PLAN_TRANSITIONS[from][action]);
}

// ---------------------------------------------------------------------------
// Task lifecycle
// ---------------------------------------------------------------------------

const TASK_TRANSITIONS: Record<TaskStatus, Partial<Record<TaskAction, TaskStatus>>> = {
  backlog: { start: "in_progress", cancel: "cancelled" },
  ready: { start: "in_progress", block: "blocked", cancel: "cancelled" },
  in_progress: {
    submit_review: "review",
    block: "blocked",
    fail: "failed",
    cancel: "cancelled"
  },
  review: {
    complete: "done",
    request_changes: "in_progress",
    fail: "failed",
    cancel: "cancelled"
  },
  blocked: { unblock: "ready", retry: "ready", cancel: "cancelled" },
  failed: { retry: "ready", cancel: "cancelled" },
  cancelled: { retry: "ready" },
  done: {}
};

/** Statuses that may still be changed by a workflow action. */
export const TASK_TERMINAL_STATUSES: readonly TaskStatus[] = ["done"];

export type TaskDependencyState = {
  id: string;
  status: TaskStatus;
};

export type TaskTransitionContext = {
  /** 1-based attempt number stored on the task. */
  attempt: number;
  /** Current state of every task this task depends on. */
  dependencies?: readonly TaskDependencyState[];
  maxAttempts?: number;
};

export type TaskTransition = {
  from: TaskStatus;
  to: TaskStatus;
  action: TaskAction;
  /** Attempt number the task should have after the transition. */
  nextAttempt: number;
};

/**
 * Assert that `action` is legal for a task, honouring dependency and retry
 * guards. `start` requires every dependency to be `done`; `retry` is only
 * available from a non-success state while attempts remain.
 */
export function taskTransition(
  from: TaskStatus,
  action: TaskAction,
  context: TaskTransitionContext
): TaskTransition {
  const to = TASK_TRANSITIONS[from][action];
  if (!to) {
    throw new WorkflowError(
      "TASK_TRANSITION_NOT_ALLOWED",
      `A ${from} task cannot be ${actionLabel(action)}.`
    );
  }

  const maxAttempts = context.maxAttempts ?? MAX_TASK_ATTEMPTS;
  const attempt = Number.isInteger(context.attempt) && context.attempt > 0 ? context.attempt : 1;

  if (action === "start") {
    const unmet = (context.dependencies ?? []).filter((dependency) => dependency.status !== "done");
    if (unmet.length > 0) {
      throw new WorkflowError(
        "DEPENDENCIES_NOT_COMPLETE",
        `${unmet.length} prerequisite task${unmet.length === 1 ? " is" : "s are"} not done yet.`
      );
    }
  }

  if (action === "retry") {
    if (to !== "ready" || attempt >= maxAttempts) {
      throw new WorkflowError(
        "RETRY_LIMIT_REACHED",
        `This task has reached its retry limit (${maxAttempts} attempts). Create a new plan version instead.`
      );
    }
  }

  return { from, to, action, nextAttempt: action === "retry" ? attempt + 1 : attempt };
}

export function canTaskTransition(
  from: TaskStatus,
  action: TaskAction,
  context: TaskTransitionContext
): boolean {
  try {
    taskTransition(from, action, context);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Plan versions and task dependency graphs
// ---------------------------------------------------------------------------

/** Next version number for a project's plan lineage (1 when there are none). */
export function nextPlanVersion(existingVersions: readonly number[]): number {
  const highest = existingVersions.reduce((max, value) => (value > max ? value : max), 0);
  return highest + 1;
}

export type GraphTask = {
  id: string;
  /** Tasks in different plans/workspaces must not depend on each other. */
  planId?: string | null;
  workspaceId?: string | null;
  dependsOn: readonly string[];
};

/**
 * Validate a task dependency graph: unknown references, self-loops, duplicate
 * edges, cross-plan references and cycles all produce human-readable errors.
 */
export function validateTaskGraph(tasks: readonly GraphTask[]): string[] {
  const errors: string[] = [];
  const byId = new Map(tasks.map((task) => [task.id, task]));

  for (const task of tasks) {
    const seen = new Set<string>();
    for (const dependencyId of task.dependsOn) {
      if (!byId.has(dependencyId)) {
        errors.push(`Task ${task.id} depends on unknown task ${dependencyId}.`);
        continue;
      }
      if (dependencyId === task.id) {
        errors.push(`Task ${task.id} cannot depend on itself.`);
        continue;
      }
      if (seen.has(dependencyId)) {
        errors.push(`Task ${task.id} lists dependency ${dependencyId} more than once.`);
        continue;
      }
      seen.add(dependencyId);
      if (task.planId && byId.get(dependencyId)?.planId && task.planId !== byId.get(dependencyId)?.planId) {
        errors.push(`Task ${task.id} depends on a task in a different plan.`);
      }
      if (task.workspaceId && byId.get(dependencyId)?.workspaceId && task.workspaceId !== byId.get(dependencyId)?.workspaceId) {
        errors.push(`Task ${task.id} depends on a task in a different workspace.`);
      }
    }
  }

  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string, trail: string[]): void => {
    const current = state.get(id) ?? 0;
    if (current === 2) return;
    if (current === 1) {
      const from = trail.indexOf(id);
      errors.push(`Dependency cycle detected: ${[...trail.slice(from), id].join(" → ")}.`);
      return;
    }
    state.set(id, 1);
    for (const dependency of byId.get(id)?.dependsOn ?? []) {
      if (byId.has(dependency)) visit(dependency, [...trail, id]);
    }
    state.set(id, 2);
  };
  for (const task of tasks) visit(task.id, []);

  return errors;
}

// ---------------------------------------------------------------------------
// Permission mapping and request contracts
// ---------------------------------------------------------------------------

export const PLAN_ACTION_PERMISSIONS: Record<PlanAction, Permission> = {
  approve: "tasks.approve",
  reject: "tasks.approve",
  cancel: "tasks.cancel",
  revise: "tasks.plan",
  start_execution: "tasks.execute",
  complete: "tasks.execute",
  fail: "tasks.execute"
};

export const TASK_ACTION_PERMISSIONS: Record<TaskAction, Permission> = {
  start: "tasks.execute",
  submit_review: "tasks.execute",
  complete: "tasks.execute",
  request_changes: "tasks.approve",
  block: "tasks.plan",
  unblock: "tasks.plan",
  fail: "tasks.execute",
  retry: "tasks.plan",
  cancel: "tasks.cancel"
};

/** Roles allowed to perform a workflow action, resolved from the versioned policy. */
export function rolesForPlanAction(action: PlanAction): readonly string[] {
  return rolesFor(PLAN_ACTION_PERMISSIONS[action]);
}

export function rolesForTaskAction(action: TaskAction): readonly string[] {
  return rolesFor(TASK_ACTION_PERMISSIONS[action]);
}

const uuid = z.string().uuid();
const idempotencyKey = z
  .string()
  .trim()
  .min(8)
  .max(120)
  .regex(/^[A-Za-z0-9._:-]+$/, "Invalid idempotency key.")
  .optional();

export const planWorkflowSchema = z
  .object({
    workspaceId: uuid,
    action: z.enum(PLAN_ACTIONS),
    reason: z.string().trim().min(3).max(1000).optional(),
    prompt: z.string().trim().min(12).max(12000).optional(),
    note: z.string().trim().max(1000).optional(),
    idempotencyKey
  })
  .superRefine((value, ctx) => {
    if (value.action === "revise" && !value.prompt) {
      ctx.addIssue({ code: "custom", path: ["prompt"], message: "A revised plan requires an updated goal." });
    }
    if (value.action === "reject" && !value.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Rejection requires a reason." });
    }
  });

export const taskLifecycleSchema = z.object({
  workspaceId: uuid,
  action: z.enum(TASK_ACTIONS),
  reason: z.string().trim().min(3).max(1000).optional(),
  idempotencyKey
});

export const taskDependencySchema = z.object({
  workspaceId: uuid,
  dependsOnTaskId: uuid,
  idempotencyKey
});

export type PlanWorkflowRequest = z.infer<typeof planWorkflowSchema>;
export type TaskLifecycleRequest = z.infer<typeof taskLifecycleSchema>;
