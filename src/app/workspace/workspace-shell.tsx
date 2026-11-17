"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/workspace", label: "Overview", icon: "◫" },
  { href: "/workspace/projects", label: "Projects & tasks", icon: "▦" },
  { href: "/workspace/managers", label: "Manager", icon: "⌘" },
  { href: "/workspace/hivemind", label: "Hivemind team", icon: "✳" },
  { href: "/workspace/admin", label: "Admin & audit", icon: "≋" },
  { href: "/workspace/skills", label: "Skills & MCP", icon: "◇" }
] as const;

export function WorkspaceShell({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();
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
    router.push("/workspace/managers");
  }

  async function logout() {
    await signOut();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/workspace"><span className="brand-mark">V</span><span>verdent</span></a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">W</span>
          <span className="workspace-switcher-copy"><strong>My workspace</strong><small>PERSONAL</small></span>
          <span className="switcher-chevron">⌄</span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          {navigation.map((item) => (
            <a key={item.href} className={pathname === item.href || (item.href !== "/workspace" && pathname.startsWith(item.href + "/")) ? "nav-item active" : "nav-item"} href={item.href}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><span className="help-orb">?</span><div><strong>Need a hand?</strong><small>Explore the workspace guide</small></div></div>
          <div className="profile-row">
            <div className="profile-avatar">{email.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy"><strong>{email}</strong><small>Authenticated account</small></div>
            <button className="signout-button" onClick={logout} disabled={signingOut} aria-label="Sign out">↗</button>
          </div>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{navigation.find((item) => item.href === pathname)?.label ?? "Workspace"}</strong></div>
          <div className="topbar-right"><span className="system-status"><i /> Secure session</span><span className="topbar-avatar">{email.slice(0, 1).toUpperCase()}</span></div>
        </header>
        <div className="workspace-content">
          <div className="page-intro">
            <div><div className="eyebrow">YOUR CONTROL CENTER</div><h1>Your workspace</h1><p>A clear view of the work you create and the agents you direct.</p></div>
            <div className="date-chip">VERDENT · EARLY ACCESS</div>
          </div>
          <section className="welcome-panel">
            <div className="welcome-copy">
              <span className="welcome-tag"><span /> PLAN BEFORE YOU BUILD</span>
              <h2>What are we building<br /><span>today?</span></h2>
              <p>Describe the outcome. Verdent helps turn it into an actionable plan you can inspect and approve.</p>
            </div>
            <div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-core">V<span>✳</span></div><div className="art-node node-one" /><div className="art-node node-two" /><div className="art-node node-three" /></div>
            <div className="welcome-index">01 — PLAN</div>
          </section>
          <form className="prompt-panel" onSubmit={submitPrompt}>
            <label htmlFor="project-prompt">Start with an idea</label>
            <textarea id="project-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the product, workflow or feature you want to create…" rows={3} />
            <div className="prompt-footer"><span><span className="secure-dot" /> Plan mode · No execution until approval</span><button type="submit" disabled={!prompt.trim()}>Open Manager <span>→</span></button></div>
          </form>
          {message && <div className="notice notice-info" role="status">{message}</div>}
          <div className="section-heading"><div><h2>Build workspace</h2><p>Open a module to work with your projects, plans and team.</p></div><span className="subtle-label">SECURE WORKSPACE</span></div>
          <div className="workspace-module-grid">
            {navigation.slice(1, 5).map((item) => <a className="workspace-module-tile" key={item.href} href={item.href}><span>{item.icon}</span><strong>{item.label}</strong><small>Open module <b>↗</b></small></a>)}
          </div>
          <footer className="workspace-footer"><span>VERDENT WORKSPACE</span><span>Human direction. Auditable execution.</span></footer>
        </div>
      </section>
    </main>
  );
}
