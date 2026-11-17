"use client";

import { useEffect, useState } from "react";

type AgentRun = {
  id: string; project_id: string; task_id: string | null; agent_name: string;
  agent_role: string; status: string; progress: number; summary: string; created_at: string;
};
type AgentEvent = { id: number; agent_run_id: string; event_type: string; level: string; message: string; created_at: string };

const lanes = [
  { id: "queued", label: "Queued" },
  { id: "running", label: "Working" },
  { id: "waiting_approval", label: "Awaiting approval" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Needs attention" }
];

export function TeamBoard({ workspaceId }: { workspaceId: string }) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents?workspaceId=${workspaceId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Agent activity could not be loaded.");
      setRuns(payload.runs as AgentRun[]);
      setEvents(payload.events as AgentEvent[]);
      setNotice("");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Agent board unavailable. Apply migration 0002.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [workspaceId]);

  const active = runs.filter((run) => run.status === "running").length;
  const awaiting = runs.filter((run) => run.status === "waiting_approval").length;
  const completed = runs.filter((run) => run.status === "completed").length;

  return (
    <div className="module-stack">
      <div className="module-heading">
        <div><span className="eyebrow">HIVEMIND · AGENT COORDINATION</span><h1>Team command center</h1><p>Track specialist assignments, task states and the review queue across your workspace.</p></div>
        <button className="module-secondary" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh board"}</button>
      </div>
      <div className="hive-stats">
        <div><span className="stat-label">ACTIVE WORKERS</span><strong>{active}</strong><small>Runtime connected only when configured</small></div>
        <div><span className="stat-label">AWAITING APPROVAL</span><strong>{awaiting}</strong><small>Proposed assignments, not executing</small></div>
        <div><span className="stat-label">COMPLETED</span><strong>{completed}</strong><small>Verified terminal states</small></div>
        <div><span className="stat-label">TOTAL RUN RECORDS</span><strong>{runs.length}</strong><small>Stored in Supabase</small></div>
      </div>
      <section className="hive-board">
        {lanes.map((lane) => {
          const items = runs.filter((run) => run.status === lane.id);
          return <div className="hive-lane" key={lane.id}>
            <div className="hive-lane-heading"><span>{lane.label}</span><b>{items.length}</b></div>
            <div className="hive-lane-content">
              {items.map((run) => <article className="agent-card" key={run.id}>
                <div className="agent-card-top"><span className="agent-avatar">{run.agent_name.slice(0,1)}</span><span className={`agent-presence presence-${run.status}`} /></div>
                <strong>{run.agent_name}</strong><small>{run.agent_role}</small>
                <p>{run.summary}</p>
                <div className="agent-progress"><span style={{ width: `${run.progress}%` }} /></div>
                <div className="agent-card-foot"><span>{run.progress}%</span><span>{new Date(run.created_at).toLocaleString()}</span></div>
              </article>)}
              {items.length === 0 && <div className="lane-empty">No agents in this lane</div>}
            </div>
          </div>;
        })}
      </section>
      {notice && <div className="module-notice error" role="alert">{notice}</div>}

      <div className="hive-lower-grid">
        <section className="module-card">
          <div className="card-heading"><div><span className="card-kicker">TEAM ACTIVITY</span><h2>Agent event stream</h2></div><span className="card-icon">≋</span></div>
          <div className="event-stream">
            {events.map((event) => <div className="event-row" key={event.id}><span className={`event-level level-${event.level}`} /><div><strong>{event.event_type.replaceAll(".", " ")}</strong><p>{event.message}</p><small>{new Date(event.created_at).toLocaleString()}</small></div></div>)}
            {!events.length && <div className="module-empty">No agent events recorded yet. Manager-created task assignments will appear here after migration 0002 is applied.</div>}
          </div>
        </section>
        <section className="module-card terminal-card">
          <div className="card-heading"><div><span className="card-kicker">EXECUTION WORKBENCH</span><h2>Agent terminal</h2></div><span className="terminal-state">SANDBOX OFFLINE</span></div>
          <div className="terminal-window">
            <div className="terminal-bar"><span /><span /><span /><small>verdent · isolated worker</small></div>
            <div className="terminal-content">
              <p><span className="terminal-green">verdent@workspace</span>:~$ status</p>
              <p className="terminal-muted">Execution adapter: not configured</p>
              <p className="terminal-muted">Workspace data: connected through Supabase APIs</p>
              <p className="terminal-muted">Shell commands: disabled until an isolated worker is provisioned</p>
              <p><span className="terminal-green">verdent@workspace</span>:~$ <span className="terminal-cursor" /></p>
            </div>
          </div>
          <div className="terminal-disclaimer">Read-only console preview. No shell command is accepted or executed from the browser. Connect a scoped sandbox worker before enabling terminal actions.</div>
        </section>
      </div>
    </div>
  );
}
