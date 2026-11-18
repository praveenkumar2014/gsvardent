"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  canPlanTransition,
  canTaskTransition,
  type PlanAction,
  type PlanStatus,
  type TaskAction,
  type TaskStatus
} from "@/lib/server/workflow";

type Project = { id: string; name: string };
type Capabilities = Record<string, boolean>;
type Plan = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  source_prompt: string;
  status: string;
  provider: string;
  version: number | null;
  supersedes_id: string | null;
  rejection_reason: string | null;
  created_at: string;
};
type PlanTask = {
  id: string;
  plan_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_agent: string;
  attempt: number | null;
  last_error: string | null;
  depends_on: string[];
};

const planActionLabels: Record<PlanAction, string> = {
  approve: "✓ Approve plan",
  reject: "✕ Reject",
  cancel: "⨯ Cancel plan",
  revise: "↻ New version",
  start_execution: "▶ Start execution",
  complete: "■ Mark completed",
  fail: "! Mark failed"
};
const planActionOrder: PlanAction[] = ["approve", "reject", "revise", "start_execution", "complete", "fail", "cancel"];
const taskActionLabels: Record<TaskAction, string> = {
  start: "Start",
  submit_review: "Submit review",
  complete: "Complete",
  request_changes: "Request changes",
  block: "Block",
  unblock: "Unblock",
  fail: "Fail",
  retry: "Retry",
  cancel: "Cancel"
};
const taskActionOrder: TaskAction[] = [
  "start", "submit_review", "complete", "request_changes",
  "block", "unblock", "fail", "retry", "cancel"
];
const reasonRequired: ReadonlySet<TaskAction> = new Set(["request_changes", "block", "fail"]);

function idempotencyKey(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `wf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ManagerPanel({ workspaceId, projects }: { workspaceId: string; projects: Project[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [history, setHistory] = useState<Plan[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities>({});
  const [actorRole, setActorRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

  async function refreshHistory(selectPlanId?: string) {
    try {
      const response = await fetch(`/api/manager/plans?workspaceId=${workspaceId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Saved plans could not be loaded.");
      const plans = (payload.plans ?? []) as Plan[];
      setHistory(plans);
      setCapabilities(payload.capabilities ?? {});
      setActorRole(payload.actorRole ?? "");
      if (selectPlanId) {
        const selected = plans.find((item) => item.id === selectPlanId);
        if (selected) setPlan(selected);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Saved plans could not be loaded.");
    }
  }

  async function loadTasksForPlan(selected: Plan) {
    setError("");
    try {
      const response = await fetch(
        `/api/tasks?workspaceId=${workspaceId}&projectId=${selected.project_id}`,
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Plan tasks could not be loaded.");
      const rows = (payload.tasks ?? []) as PlanTask[];
      setTasks(rows.filter((task) => task.plan_id === selected.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plan tasks could not be loaded.");
    }
  }

  function openPlan(selected: Plan) {
    setPlan(selected);
    setTasks([]);
    setNotice("");
    setRevisionOpen(false);
    void loadTasksForPlan(selected);
  }

  useEffect(() => {
    const pendingPrompt = sessionStorage.getItem("verdent.pendingManagerPrompt");
    if (pendingPrompt) {
      setPrompt(pendingPrompt);
      sessionStorage.removeItem("verdent.pendingManagerPrompt");
    }
    void refreshHistory();
  }, [workspaceId]);

  async function decompose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setPlan(null); setTasks([]); setBusy(true);
    try {
      const response = await fetch("/api/manager/decompose", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, projectId, prompt })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Manager could not create a plan.");
      const created = payload.plan as Plan;
      setPlan(created);
      setTasks(payload.tasks as PlanTask[]);
      setNotice("Draft plan created. Review it and approve explicitly — no agent is executing.");
      await refreshHistory(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plan creation failed.");
    } finally { setBusy(false); }
  }

  async function runPlanAction(action: PlanAction) {
    if (!plan) return;
    if (action === "reject") {
      const reason = window.prompt("Why is this plan being rejected? (recorded in the audit log)");
      if (!reason) return;
      await submitPlanAction(action, { reason });
      return;
    }
    if (action === "revise") {
      setRevisionPrompt(plan.source_prompt);
      setRevisionNote("");
      setRevisionOpen(true);
      return;
    }
    await submitPlanAction(action);
  }

  async function submitPlanAction(action: PlanAction, extra: { reason?: string; prompt?: string; note?: string } = {}) {
    if (!plan) return;
    setActionBusy(action); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/manager/plans/${plan.id}/workflow`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          action,
          ...extra,
          idempotencyKey: idempotencyKey()
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Plan action failed.");
      setNotice(
        payload.alreadyApplied
          ? "This action was already applied (matching idempotency key)."
          : `Plan ${action.replaceAll("_", " ")} recorded in the audit log.`
      );
      setRevisionOpen(false);
      await refreshHistory(plan.id);
      await loadTasksForPlan(plan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plan action failed.");
    } finally { setActionBusy(""); }
  }

  async function runTaskAction(task: PlanTask, action: TaskAction) {
    setActionBusy(`${task.id}:${action}`); setError(""); setNotice("");
    try {
      const extra: { reason?: string } = {};
      if (reasonRequired.has(action)) {
        const reason = window.prompt(action === "block" ? "Why is this task blocked?" : "Add a short note (audit log):");
        if (!reason) { setActionBusy(""); return; }
        extra.reason = reason;
      }
      const response = await fetch(`/api/tasks/${task.id}/lifecycle`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, action, ...extra, idempotencyKey: idempotencyKey() })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Task action failed.");
      setNotice(
        payload.alreadyApplied
          ? "Already applied (matching idempotency key)."
          : `${task.title}: ${taskActionLabels[action]} recorded.`
      );
      if (plan) await loadTasksForPlan(plan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Task action failed.");
    } finally { setActionBusy(""); }
  }

  function planActions(planStatus: string): PlanAction[] {
    return planActionOrder.filter(
      (action) => capabilities[action] && canPlanTransition(planStatus as PlanStatus, action)
    );
  }

  function taskActions(task: PlanTask): TaskAction[] {
    return taskActionOrder.filter(
      (action) => capabilities[action] && canTaskTransition(task.status as TaskStatus, action, {
        attempt: Number(task.attempt) || 1
      })
    );
  }

  return (
    <div className="module-stack">
      <div className="module-heading">
        <div><span className="eyebrow">MANAGER ORCHESTRATION</span><h1>Turn goals into a team plan</h1><p>Manager decomposes your request into ordered tasks. Every transition is approved and audited.</p></div>
        <span className="module-count">{actorRole ? actorRole.toUpperCase() : "PLAN MODE"}</span>
      </div>
      <section className="manager-hero">
        <div className="manager-orbit"><span>V</span><i /><i /><i /></div>
        <div><span className="card-kicker">HUMAN APPROVAL FIRST</span><h2>Describe the outcome.<br /><em>Review every step.</em></h2><p>Manager creates a draft plan only. Approvals, retries and cancellations are recorded; no agent execution or terminal command starts from this screen.</p></div>
      </section>
      <section className="module-card manager-composer">
        <div className="card-heading"><div><span className="card-kicker">NEW INITIATIVE</span><h2>What needs to be built?</h2></div><span className="card-icon">⌘</span></div>
        <form className="module-form" onSubmit={decompose}>
          <label htmlFor="manager-project">Target project</label>
          <select id="manager-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <label htmlFor="manager-prompt">Goal and requirements</label>
          <textarea id="manager-prompt" rows={5} maxLength={12000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the user, problem, expected outcome, constraints and important integrations…" required />
          <div className="composer-footer"><span>Up to 12 validated tasks · Approval required before any execution state change</span><button className="module-primary" disabled={busy || !projectId || prompt.trim().length < 12}>{busy ? "Decomposing…" : "Generate plan"} <span>→</span></button></div>
        </form>
        {projects.length === 0 && <div className="module-notice">Create a project before generating a plan.</div>}
      </section>

      {history.length > 0 && <section className="module-card">
        <div className="card-heading"><div><span className="card-kicker">SAVED MANAGER PLANS</span><h2>Recent initiatives</h2><p>Each revision is an immutable version linked to the plan it superseded.</p></div><span className="card-icon">◷</span></div>
        <div className="manager-history">
          {history.slice(0, 8).map((item) => <div className="manager-history-row" key={item.id}>
            <strong>{item.title}</strong>
            <span className="plan-version">v{item.version ?? 1}</span>
            <span className={`task-status status-${item.status}`}>{item.status}</span>
            <small>{new Date(item.created_at).toLocaleString()}</small>
            <button className="module-secondary" onClick={() => openPlan(item)} disabled={item.id === plan?.id}>Open</button>
          </div>)}
        </div>
      </section>}

      {plan && <section className="module-card plan-result">
        <div className="plan-result-header">
          <div><span className="card-kicker">PLAN v{plan.version ?? 1} · {plan.status.toUpperCase()}</span><h2>{plan.title}</h2><p>{plan.description}</p></div>
          <span className="provider-chip">{plan.provider === "configured-model" ? "MODEL GENERATED" : "RULES-BASED FALLBACK"}</span>
        </div>
        {plan.supersedes_id && <p className="plan-hint">Revision of an earlier plan version. The previous version is retained for audit.</p>}
        {plan.status === "rejected" && plan.rejection_reason && <p className="plan-hint">Rejection reason: {plan.rejection_reason}</p>}

        <div className="plan-action-bar">
          {planActions(plan.status).map((action) => (
            <button
              key={action}
              className={action === "approve" || action === "start_execution" ? "module-primary" : "module-secondary"}
              onClick={() => void runPlanAction(action)}
              disabled={Boolean(actionBusy)}
            >
              {actionBusy === action ? "Working…" : planActionLabels[action]}
            </button>
          ))}
          {planActions(plan.status).length === 0 && <span className="plan-hint">No plan actions available for your role in this state.</span>}
        </div>

        {revisionOpen && <form className="revision-form" onSubmit={(event) => {
          event.preventDefault();
          void submitPlanAction("revise", { prompt: revisionPrompt, note: revisionNote || undefined });
        }}>
          <label htmlFor="revision-goal">Updated goal</label>
          <textarea id="revision-goal" rows={4} minLength={12} maxLength={12000} value={revisionPrompt} onChange={(event) => setRevisionPrompt(event.target.value)} required />
          <label htmlFor="revision-note">Revision note (optional)</label>
          <input id="revision-note" maxLength={1000} value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} placeholder="What changed and why?" />
          <div className="revision-actions">
            <button className="module-primary" type="submit" disabled={Boolean(actionBusy) || revisionPrompt.trim().length < 12}>Create version {(plan.version ?? 1) + 1}</button>
            <button className="module-secondary" type="button" onClick={() => setRevisionOpen(false)}>Discard</button>
          </div>
        </form>}

        <div className="plan-stat-row"><span>{tasks.length} tasks</span><span>Attempts are capped at 3</span><span>Approval + audit required</span></div>
        <div className="plan-task-list">
          {tasks.map((task, index) => <article key={task.id} className="plan-task-row">
            <span className="plan-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="plan-task-copy">
              <strong>{task.title}</strong>
              <p>{task.description}</p>
              <small>
                {task.assigned_agent} · {task.priority} priority · attempt {task.attempt ?? 1}/3
                {task.depends_on.length > 0 ? ` · ${task.depends_on.length} prerequisite${task.depends_on.length === 1 ? "" : "s"}` : ""}
              </small>
              {task.last_error && <small className="task-error">{task.last_error}</small>}
              <div className="task-action-bar">
                {taskActions(task).map((action) => (
                  <button
                    key={action}
                    className="module-secondary"
                    onClick={() => void runTaskAction(task, action)}
                    disabled={Boolean(actionBusy)}
                  >
                    {actionBusy === `${task.id}:${action}` ? "…" : taskActionLabels[action]}
                  </button>
                ))}
              </div>
            </div>
            <span className={`task-status status-${task.status}`}>{task.status.replaceAll("_", " ")}</span>
          </article>)}
          {!tasks.length && <div className="module-empty">Loading plan tasks…</div>}
        </div>
      </section>}

      {notice && <div className="module-notice" role="status">{notice}</div>}
      {error && <div className="module-notice error" role="alert">{error}</div>}
    </div>
  );
}
