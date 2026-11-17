"use client";

import { useEffect, useState, type FormEvent } from "react";

type Project = { id: string; name: string };
type PlanTask = { id: string; title: string; description: string; status: string; priority: string; assigned_agent: string };

export function ManagerPanel({ workspaceId, projects }: { workspaceId: string; projects: Project[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<{ id: string; title: string; description: string; provider: string; status: string } | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; title: string; provider: string; status: string; created_at: string }>>([]);

  useEffect(() => {
    fetch(`/api/manager/plans?workspaceId=${workspaceId}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { plans: [] })
      .then((payload) => setHistory(payload.plans ?? []))
      .catch(() => setHistory([]));
  }, [workspaceId]);

  async function decompose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPlan(null); setTasks([]); setBusy(true);
    try {
      const response = await fetch("/api/manager/decompose", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, projectId, prompt })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Manager could not create a plan.");
      setPlan(payload.plan); setTasks(payload.tasks);
      setHistory((current) => [payload.plan, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plan creation failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="module-stack">
      <div className="module-heading">
        <div><span className="eyebrow">MANAGER ORCHESTRATION</span><h1>Turn goals into a team plan</h1><p>Manager decomposes your request into ordered tasks, suggested owners and acceptance work.</p></div>
        <span className="module-count">PLAN MODE</span>
      </div>
      <section className="manager-hero">
        <div className="manager-orbit"><span>V</span><i /><i /><i /></div>
        <div><span className="card-kicker">HUMAN APPROVAL FIRST</span><h2>Describe the outcome.<br /><em>Review every step.</em></h2><p>Manager creates a draft plan only. No agent execution or terminal commands start from this screen.</p></div>
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
          <div className="composer-footer"><span>Up to 12 validated tasks · Budget and execution approval remain separate</span><button className="module-primary" disabled={busy || !projectId || prompt.trim().length < 12}>{busy ? "Decomposing…" : "Generate plan"} <span>→</span></button></div>
        </form>
        {projects.length === 0 && <div className="module-notice">Create a project before generating a plan.</div>}
        {error && <div className="module-notice error" role="alert">{error}</div>}
      </section>

      {history.length > 0 && <section className="module-card">
        <div className="card-heading"><div><span className="card-kicker">SAVED MANAGER PLANS</span><h2>Recent initiatives</h2><p>Draft plans saved in this workspace.</p></div><span className="card-icon">◷</span></div>
        <div className="manager-history">{history.slice(0, 8).map((item) => <div className="manager-history-row" key={item.id}><strong>{item.title}</strong><span>{item.provider}</span><span>{item.status}</span><small>{new Date(item.created_at).toLocaleString()}</small></div>)}</div>
      </section>}
      {plan && <section className="module-card plan-result">
        <div className="plan-result-header"><div><span className="card-kicker">DRAFT PLAN · NOT EXECUTING</span><h2>{plan.title}</h2><p>{plan.description}</p></div><span className="provider-chip">{plan.provider === "configured-model" ? "MODEL GENERATED" : "RULES-BASED FALLBACK"}</span></div>
        <div className="plan-stat-row"><span>{tasks.length} tasks created</span><span>Saved to Supabase</span><span>Approval required</span></div>
        <div className="plan-task-list">{tasks.map((task, index) => <article key={task.id} className="plan-task-row"><span className="plan-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{task.title}</strong><p>{task.description}</p><small>{task.assigned_agent} · {task.priority} priority</small></div><span className="task-status status-backlog">backlog</span></article>)}</div>
      </section>}
    </div>
  );
}
