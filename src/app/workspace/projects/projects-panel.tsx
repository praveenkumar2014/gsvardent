"use client";

import { useEffect, useState, type FormEvent } from "react";

type Project = { id: string; name: string; description: string; status: string; created_at: string };
type Task = { id: string; title: string; description: string; status: string; priority: string; assigned_agent: string };

const taskStates = ["backlog", "ready", "in_progress", "review", "done", "blocked"];

export function ProjectsPanel({ workspaceId, initialProjects }: { workspaceId: string; initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState(initialProjects[0]?.id ?? "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [editName, setEditName] = useState(initialProjects[0]?.name ?? "");
  const [editDescription, setEditDescription] = useState(initialProjects[0]?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const selected = projects.find((project) => project.id === selectedId);

  useEffect(() => {
    setEditName(selected?.name ?? "");
    setEditDescription(selected?.description ?? "");
  }, [selectedId]);

  async function loadTasks(projectId: string) {
    if (!projectId) { setTasks([]); return; }
    const response = await fetch(`/api/tasks?workspaceId=${workspaceId}&projectId=${projectId}`);
    const payload = await response.json();
    if (response.ok) setTasks(payload.tasks as Task[]);
    else setNotice(payload.error ?? "Tasks could not be loaded. Apply migration 0002.");
  }

  useEffect(() => { void loadTasks(selectedId); }, [selectedId]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, name, description })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Project creation failed.");
      const project = payload.project as Project;
      setProjects((current) => [project, ...current]);
      setSelectedId(project.id);
      setName(""); setDescription("");
      setNotice("Project created and saved to Supabase.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Project creation failed.");
    } finally { setBusy(false); }
  }

  async function updateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/projects/${selectedId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, name: editName, description: editDescription })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Project update failed.");
      setProjects((current) => current.map((item) => item.id === selectedId ? { ...item, ...payload.project } : item));
      setNotice("Project details updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Project update failed.");
    } finally { setBusy(false); }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, projectId: selectedId, title: taskTitle })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Task creation failed.");
      setTasks((current) => [...current, payload.task as Task]);
      setTaskTitle("");
      setNotice("Task created and saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Task creation failed.");
    } finally { setBusy(false); }
  }

  async function advanceTask(task: Task) {
    const index = taskStates.indexOf(task.status);
    const next = taskStates[(index + 1) % taskStates.length];
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, status: next })
    });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? "Task update failed."); return; }
    setTasks((current) => current.map((item) => item.id === task.id ? payload.task as Task : item));
    setNotice(`Task moved to ${next.replaceAll("_", " ")}.`);
  }

  return (
    <div className="module-stack">
      <div className="module-heading">
        <div><span className="eyebrow">PROJECT CONTROL</span><h1>Projects & tasks</h1><p>Create real workspace projects and manage their delivery backlog.</p></div>
        <span className="module-count">{projects.length} PROJECTS</span>
      </div>

      <div className="module-grid projects-layout">
        <section className="module-card">
          <div className="card-heading"><div><span className="card-kicker">WORKSPACE</span><h2>Create a project</h2></div><span className="card-icon">▦</span></div>
          <form className="module-form" onSubmit={createProject}>
            <label htmlFor="project-name">Project name</label>
            <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} minLength={2} required placeholder="e.g. Customer Portal" />
            <label htmlFor="project-description">Description</label>
            <textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What should this project deliver?" />
            <button className="module-primary" disabled={busy || name.trim().length < 2}>{busy ? "Saving…" : "Create project"} <span>→</span></button>
          </form>
          <div className="project-list-title">PROJECT LIST <span>{projects.length}</span></div>
          <div className="project-list">
            {projects.map((project) => (
              <button key={project.id} className={selectedId === project.id ? "project-row selected" : "project-row"} onClick={() => { setSelectedId(project.id); setNotice(""); }}>
                <span className="project-icon">P</span><span className="project-row-copy"><strong>{project.name}</strong><small>{project.status}</small></span><span className="row-arrow">↗</span>
              </button>
            ))}
            {projects.length === 0 && <div className="module-empty">No projects yet. Create the first project above.</div>}
          </div>
        </section>

        <section className="module-card task-card">
          <div className="card-heading"><div><span className="card-kicker">DELIVERY BACKLOG</span><h2>{selected?.name ?? "Select a project"}</h2><p>{selected?.description || "Tasks are stored in Supabase and scoped to this project."}</p></div><span className="card-icon">☷</span></div>
          {selected && <form className="project-edit-form" onSubmit={updateProject}>
            <input aria-label="Project name" value={editName} onChange={(event) => setEditName(event.target.value)} minLength={2} maxLength={120} required />
            <input aria-label="Project description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={4000} placeholder="Project description" />
            <button className="module-secondary" disabled={busy || editName.trim().length < 2}>Save details</button>
          </form>}
          {selected && <form className="inline-create" onSubmit={createTask}>
            <input aria-label="New task title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Add a task to this project…" minLength={2} required />
            <button className="module-primary" type="submit" disabled={busy || taskTitle.trim().length < 2}>Add task</button>
          </form>}
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-row" key={task.id}>
                <div className="task-dot" />
                <div className="task-copy"><strong>{task.title}</strong><small>{task.assigned_agent} · {task.priority}</small></div>
                <button className={`task-status status-${task.status}`} onClick={() => void advanceTask(task)} title="Move task to next status">{task.status.replaceAll("_", " ")}</button>
              </article>
            ))}
            {selected && tasks.length === 0 && <div className="module-empty">No tasks in this project. Add a task or create a plan in Manager.</div>}
            {!selected && <div className="module-empty">Create or select a project to manage tasks.</div>}
          </div>
          <div className="task-hint">Select a task status to move it through the workflow. Every update is authorized server-side and recorded in audit history.</div>
        </section>
      </div>
      {notice && <div className="module-notice" role="status">{notice}</div>}
    </div>
  );
}
