"use client";

import { useEffect, useState } from "react";

type Member = { id: string; user_id: string; role: string; display_name: string | null; created_at: string; canChangeRole: boolean };
type AuditEvent = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; outcome: string; metadata: Record<string, unknown>; created_at: string };
const roles = ["user", "investor", "staff", "admin", "superuser"];

export function AdminConsole({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [actorRole, setActorRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true); setNotice("");
    try {
      const [memberResponse, auditResponse] = await Promise.all([
        fetch(`/api/admin/members?workspaceId=${workspaceId}`, { cache: "no-store" }),
        fetch(`/api/admin/audit?workspaceId=${workspaceId}`, { cache: "no-store" })
      ]);
      const memberPayload = await memberResponse.json();
      const auditPayload = await auditResponse.json();
      if (!memberResponse.ok) throw new Error(memberPayload.error ?? "Member list unavailable.");
      if (!auditResponse.ok) throw new Error(auditPayload.error ?? "Audit history unavailable.");
      setMembers(memberPayload.members as Member[]);
      setActorRole(memberPayload.actorRole as string);
      setEvents(auditPayload.events as AuditEvent[]);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Admin data could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [workspaceId]);

  async function changeRole(member: Member, role: string) {
    setNotice("");
    const confirmed = window.confirm(`Change ${member.display_name ?? member.user_id} to the ${role} role?`);
    if (!confirmed) return;
    const response = await fetch("/api/admin/members", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, membershipId: member.id, role })
    });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? "Role change failed."); return; }
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role } : item));
    setNotice("Role updated. The database membership policy and audit trigger handle the change record.");
    await refresh();
  }

  return (
    <div className="module-stack">
      <div className="module-heading">
        <div><span className="eyebrow">GOVERNANCE & SECURITY</span><h1>Admin console</h1><p>Manage workspace roles and review immutable security events.</p></div>
        <div className="admin-actor-chip">{actorRole.toUpperCase() || "ADMIN"}</div>
      </div>
      <section className="module-card">
        <div className="card-heading"><div><span className="card-kicker">ROLE MANAGEMENT</span><h2>Workspace members</h2><p>Superuser grants are restricted to an existing Superuser.</p></div><button className="module-secondary" onClick={() => void refresh()} disabled={loading}>{loading ? "Loading…" : "↻ Refresh"}</button></div>
        <div className="admin-table-wrap">
          <table className="admin-table"><thead><tr><th>Member</th><th>Account ID</th><th>Role</th><th>Membership</th></tr></thead>
            <tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.display_name || "Workspace member"}</strong></td><td><code>{member.user_id.slice(0, 8)}…</code></td><td>
              <select value={member.role} disabled={!member.canChangeRole || (actorRole !== "superuser" && member.role === "superuser")} onChange={(event) => void changeRole(member, event.target.value)}>
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </td><td><span className="member-state"><i /> Active</span></td></tr>)}</tbody>
          </table>
          {!members.length && <div className="module-empty">{loading ? "Loading members…" : "No workspace members returned."}</div>}
        </div>
      </section>
      <section className="module-card">
        <div className="card-heading"><div><span className="card-kicker">APPEND-ONLY SECURITY HISTORY</span><h2>Audit log</h2><p>Latest 100 workspace-scoped events. This console does not expose edit or delete actions.</p></div><span className="card-icon">≋</span></div>
        <div className="audit-list">
          {events.map((event) => <article className="audit-row" key={event.id}><span className={`audit-outcome outcome-${event.outcome}`}>{event.outcome}</span><div><strong>{event.action}</strong><p>{event.entity_type}{event.entity_id ? ` · ${event.entity_id.slice(0, 12)}` : ""}</p><small>Actor {event.actor_id?.slice(0, 8) ?? "system"} · {new Date(event.created_at).toLocaleString()}</small></div><code>#{event.id}</code></article>)}
          {!events.length && <div className="module-empty">{loading ? "Loading audit history…" : "No audit events available for this workspace."}</div>}
        </div>
      </section>
      {notice && <div className="module-notice" role="status">{notice}</div>}
    </div>
  );
}
