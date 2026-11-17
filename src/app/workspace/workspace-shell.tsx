"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "managers", label: "Managers", icon: "⌘" },
  { id: "skills", label: "Skills & MCP", icon: "◇" },
  { id: "audit", label: "Audit logs", icon: "≋" }
] as const;

type Section = (typeof navigation)[number]["id"];

const sectionCopy: Record<Section, { title: string; description: string }> = {
  overview: { title: "Your workspace", description: "A clear view of the work you create and the agents you direct." },
  projects: { title: "Projects", description: "Keep each build, its plan and its deliverables in one place." },
  managers: { title: "Manager orchestration", description: "Turn initiatives into milestones, tasks and review points." },
  skills: { title: "Skills & MCP", description: "Inspect capabilities and permissions before enabling tools." },
  audit: { title: "Audit history", description: "Review security-relevant actions and execution events." }
};

export function WorkspaceShell({ email }: { email: string }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("overview");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
      setSigningOut(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setMessage("Your prompt is captured in this preview. Connect the planning service to create a persisted plan.");
  }

  const copy = sectionCopy[section];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/workspace">
          <span className="brand-mark">V</span><span>verdent</span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">W</span>
          <span className="workspace-switcher-copy"><strong>My workspace</strong><small>PERSONAL</small></span>
          <span className="switcher-chevron">⌄</span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          {navigation.map((item) => (
            <button key={item.id} className={section === item.id ? "nav-item active" : "nav-item"} onClick={() => { setSection(item.id); setMessage(""); }}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "audit" && <span className="nav-soon">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><span className="help-orb">?</span><div><strong>Need a hand?</strong><small>Explore the workspace guide</small></div></div>
          <div className="profile-row">
            <div className="profile-avatar">{email.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy"><strong>{email}</strong><small>Authenticated account</small></div>
            <button className="signout-button" onClick={signOut} disabled={signingOut} aria-label="Sign out">↗</button>
          </div>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{copy.title}</strong></div>
          <div className="topbar-right"><span className="system-status"><i /> Systems ready for setup</span><span className="topbar-avatar">{email.slice(0, 1).toUpperCase()}</span></div>
        </header>

        <div className="workspace-content">
          <div className="page-intro">
            <div><div className="eyebrow">YOUR CONTROL CENTER</div><h1>{copy.title}</h1><p>{copy.description}</p></div>
            <div className="date-chip">VERDENT · EARLY ACCESS</div>
          </div>

          {section === "overview" ? (
            <>
              <section className="welcome-panel">
                <div className="welcome-copy">
                  <span className="welcome-tag"><span /> PLAN BEFORE YOU BUILD</span>
                  <h2>What are we building<br /><span>today?</span></h2>
                  <p>Describe the outcome. Verdent will help turn it into a structured plan you can inspect and approve.</p>
                </div>
                <div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-core">V<span>✳</span></div><div className="art-node node-one" /><div className="art-node node-two" /><div className="art-node node-three" /></div>
                <div className="welcome-index">01 — PLAN</div>
              </section>

              <form className="prompt-panel" onSubmit={submitPrompt}>
                <label htmlFor="project-prompt">Start with an idea</label>
                <textarea id="project-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the product, workflow or feature you want to create…" rows={3} />
                <div className="prompt-footer"><span><span className="secure-dot" /> Plan mode · No execution until approval</span><button type="submit" disabled={!prompt.trim()}>Create a plan <span>→</span></button></div>
              </form>

              {message && <div className="notice notice-info" role="status">{message}</div>}

              <div className="section-heading"><div><h2>Workspace activity</h2><p>Your projects and runs will appear here.</p></div><span className="subtle-label">LIVE WORKSPACE</span></div>
              <div className="empty-work"><div className="empty-symbol">✳</div><h3>Your workspace is ready for its first project</h3><p>Once the project database and planning service are connected, new projects and activity will show here.</p><button className="text-button" onClick={() => setSection("projects")}>Explore projects <span>→</span></button></div>
            </>
          ) : (
            <div className="module-placeholder">
              <div className="placeholder-icon">{navigation.find((item) => item.id === section)?.icon}</div>
              <span className="eyebrow">MODULE FOUNDATION</span>
              <h2>{copy.title}</h2>
              <p>{copy.description}</p>
              <div className="module-state"><span className="status-dot" /> Authentication is connected. This module needs its service and database layer before it can display live records.</div>
              <button className="text-button" onClick={() => setSection("overview")}>Back to overview <span>→</span></button>
            </div>
          )}

          <footer className="workspace-footer"><span>VERDENT WORKSPACE</span><span>Human direction. Auditable execution.</span></footer>
        </div>
      </section>
    </main>
  );
}
