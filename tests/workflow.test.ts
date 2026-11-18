import { describe, expect, it } from "vitest";
import {
  MAX_TASK_ATTEMPTS,
  PLAN_ACTIONS,
  PLAN_STATUSES,
  TASK_ACTIONS,
  TASK_STATUSES,
  WorkflowError,
  canPlanTransition,
  canTaskTransition,
  nextPlanVersion,
  planTransition,
  planWorkflowSchema,
  rolesForPlanAction,
  rolesForTaskAction,
  taskDependencySchema,
  taskLifecycleSchema,
  taskTransition,
  validateTaskGraph
} from "../src/lib/server/workflow";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";

describe("plan lifecycle", () => {
  it("allows every documented draft transition", () => {
    expect(planTransition("draft", "approve").to).toBe("approved");
    expect(planTransition("draft", "reject").to).toBe("rejected");
    expect(planTransition("draft", "cancel").to).toBe("cancelled");
    expect(planTransition("draft", "revise").to).toBe("superseded");
  });

  it("requires approval before execution and only executes once", () => {
    expect(canPlanTransition("draft", "start_execution")).toBe(false);
    expect(planTransition("approved", "start_execution").to).toBe("executing");
    expect(canPlanTransition("executing", "start_execution")).toBe(false);
    expect(planTransition("executing", "complete").to).toBe("completed");
    expect(planTransition("executing", "fail").to).toBe("failed");
  });

  it("keeps completed, cancelled and superseded plans terminal", () => {
    for (const status of ["completed", "cancelled", "superseded"] as const) {
      for (const action of PLAN_ACTIONS) {
        expect(canPlanTransition(status, action), `${status}/${action}`).toBe(false);
      }
    }
  });

  it("rejects illegal transitions with a typed workflow error", () => {
    expect(() => planTransition("approved", "approve")).toThrowError(WorkflowError);
    try {
      planTransition("completed", "cancel");
    } catch (cause) {
      expect(cause).toBeInstanceOf(WorkflowError);
      expect((cause as WorkflowError).code).toBe("PLAN_TRANSITION_NOT_ALLOWED");
    }
  });

  it("allows revision of recoverable states but not of an approved plan", () => {
    expect(canPlanTransition("rejected", "revise")).toBe(true);
    expect(canPlanTransition("failed", "revise")).toBe(true);
    expect(canPlanTransition("approved", "revise")).toBe(false);
  });

  it("keeps the status catalogue and action catalogue stable", () => {
    expect([...PLAN_STATUSES]).toContain("superseded");
    expect(PLAN_ACTIONS).toHaveLength(7);
  });
});

describe("task lifecycle", () => {
  it("walks a task from backlog to done through review", () => {
    expect(taskTransition("backlog", "start", { attempt: 1 }).to).toBe("in_progress");
    expect(taskTransition("in_progress", "submit_review", { attempt: 1 }).to).toBe("review");
    expect(taskTransition("review", "complete", { attempt: 1 }).to).toBe("done");
    expect(canTaskTransition("done", "cancel", { attempt: 1 })).toBe(false);
  });

  it("does not start a task whose prerequisites are incomplete", () => {
    expect(() =>
      taskTransition("ready", "start", {
        attempt: 1,
        dependencies: [
          { id: UUID, status: "done" },
          { id: UUID_2, status: "in_progress" }
        ]
      })
    ).toThrowError("1 prerequisite task is not done yet.");
  });

  it("does start a task once every prerequisite is done", () => {
    const result = taskTransition("ready", "start", {
      attempt: 1,
      dependencies: [{ id: UUID, status: "done" }]
    });
    expect(result.to).toBe("in_progress");
    expect(result.nextAttempt).toBe(1);
  });

  it("supports rework, blocking and unblocking without losing the attempt", () => {
    expect(taskTransition("review", "request_changes", { attempt: 1 }).to).toBe("in_progress");
    expect(taskTransition("in_progress", "block", { attempt: 1 }).to).toBe("blocked");
    expect(taskTransition("blocked", "unblock", { attempt: 1 }).to).toBe("ready");
  });

  it("increments the attempt when retrying a failed or cancelled task", () => {
    expect(taskTransition("failed", "retry", { attempt: 1 }).nextAttempt).toBe(2);
    expect(taskTransition("blocked", "retry", { attempt: 2 }).nextAttempt).toBe(3);
    expect(taskTransition("cancelled", "retry", { attempt: 1 }).to).toBe("ready");
  });

  it("enforces the retry limit and points users at a new plan version", () => {
    expect(() => taskTransition("failed", "retry", { attempt: MAX_TASK_ATTEMPTS })).toThrowError(
      /retry limit/i
    );
    expect(() => taskTransition("done", "retry", { attempt: 1 })).toThrowError(
      /cannot be retried/
    );
  });

  it("allows cancellation from every non-terminal state", () => {
    for (const status of TASK_STATUSES) {
      const allowed = canTaskTransition(status, "cancel", { attempt: 1 });
      expect(allowed, status).toBe(status !== "done" && status !== "cancelled");
    }
  });

  it("rejects unknown actions/statuses rather than silently succeeding", () => {
    expect(() => taskTransition("backlog", "complete" as never, { attempt: 1 })).toThrowError(
      WorkflowError
    );
    expect(TASK_ACTIONS).toContain("retry");
  });
});

describe("plan versions", () => {
  it("starts at version 1 and always increments from the highest known version", () => {
    expect(nextPlanVersion([])).toBe(1);
    expect(nextPlanVersion([1, 1, 2])).toBe(3);
    expect(nextPlanVersion([7])).toBe(8);
  });
});

describe("task dependency graph validation", () => {
  it("accepts a valid acyclic graph", () => {
    const problems = validateTaskGraph([
      { id: "a", planId: "p", workspaceId: "w", dependsOn: [] },
      { id: "b", planId: "p", workspaceId: "w", dependsOn: ["a"] },
      { id: "c", planId: "p", workspaceId: "w", dependsOn: ["a", "b"] }
    ]);
    expect(problems).toEqual([]);
  });

  it("reports self dependencies, unknown tasks and duplicates", () => {
    const problems = validateTaskGraph([
      { id: "a", dependsOn: ["a"] },
      { id: "b", dependsOn: ["c", "c", "missing"] },
      { id: "c", dependsOn: [] }
    ]);
    expect(problems.some((problem) => problem.includes("cannot depend on itself"))).toBe(true);
    expect(problems.some((problem) => problem.includes("unknown task"))).toBe(true);
    expect(problems.some((problem) => problem.includes("more than once"))).toBe(true);
  });

  it("detects a cycle and includes the path in the message", () => {
    const problems = validateTaskGraph([
      { id: "a", dependsOn: ["b"] },
      { id: "b", dependsOn: ["c"] },
      { id: "c", dependsOn: ["a"] }
    ]);
    expect(problems.some((problem) => problem.includes("Dependency cycle detected"))).toBe(true);
  });

  it("rejects cross-plan and cross-workspace edges", () => {
    const problems = validateTaskGraph([
      { id: "a", planId: "plan-1", workspaceId: "w", dependsOn: [] },
      { id: "b", planId: "plan-2", workspaceId: "w", dependsOn: ["a"] },
      { id: "c", planId: "plan-1", workspaceId: "other", dependsOn: ["a"] }
    ]);
    expect(problems.some((problem) => problem.includes("different plan"))).toBe(true);
    expect(problems.some((problem) => problem.includes("different workspace"))).toBe(true);
  });
});

describe("workflow permission mapping", () => {
  it("reserves approval and execution actions for privileged roles", () => {
    expect(rolesForPlanAction("approve")).toEqual(["superuser", "admin"]);
    expect(rolesForTaskAction("start")).toEqual(["superuser", "admin"]);
    expect(rolesForTaskAction("complete")).toEqual(["superuser", "admin"]);
  });

  it("lets plan operators cancel, retry and block tasks", () => {
    for (const action of ["cancel", "retry", "block"] as const) {
      expect(rolesForTaskAction(action)).toContain("staff");
      expect(rolesForTaskAction(action)).toContain("user");
      expect(rolesForTaskAction(action)).not.toContain("investor");
    }
  });
});

describe("workflow request contracts", () => {
  it("requires a reason for rejection and a goal for revision", () => {
    expect(planWorkflowSchema.safeParse({ workspaceId: UUID, action: "reject" }).success).toBe(false);
    expect(planWorkflowSchema.safeParse({ workspaceId: UUID, action: "reject", reason: "not ready" }).success).toBe(true);
    expect(planWorkflowSchema.safeParse({ workspaceId: UUID, action: "revise" }).success).toBe(false);
    expect(planWorkflowSchema.safeParse({ workspaceId: UUID, action: "revise", prompt: "A longer, valid updated goal." }).success).toBe(true);
  });

  it("accepts plain approvals without extra fields", () => {
    expect(planWorkflowSchema.safeParse({ workspaceId: UUID, action: "approve" }).success).toBe(true);
  });

  it("validates task lifecycle, dependency and idempotency keys", () => {
    expect(taskLifecycleSchema.safeParse({ workspaceId: UUID, action: "retry" }).success).toBe(true);
    expect(taskLifecycleSchema.safeParse({ workspaceId: "bad", action: "retry" }).success).toBe(false);
    expect(taskLifecycleSchema.safeParse({ workspaceId: UUID, action: "unknown" }).success).toBe(false);
    expect(taskLifecycleSchema.safeParse({ workspaceId: UUID, action: "retry", idempotencyKey: "a b" }).success).toBe(false);
    expect(taskLifecycleSchema.safeParse({ workspaceId: UUID, action: "retry", idempotencyKey: "retry-2026-11-18" }).success).toBe(true);
  });

  it("requires a uuid prerequisite for dependency requests", () => {
    expect(taskDependencySchema.safeParse({ workspaceId: UUID, dependsOnTaskId: UUID_2 }).success).toBe(true);
    expect(taskDependencySchema.safeParse({ workspaceId: UUID, dependsOnTaskId: "nope" }).success).toBe(false);
    expect(taskDependencySchema.safeParse({ dependsOnTaskId: UUID_2 }).success).toBe(false);
  });
});
