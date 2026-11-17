import { redirect } from "next/navigation";
import { getUserWorkspaces } from "@/lib/server/workspace";
import { AdminConsole } from "@/app/workspace/admin/admin-console";

export default async function AdminPage() {
  const context = await getUserWorkspaces();
  if (!context) redirect("/login");
  const workspace = context.workspaces[0];
  if (!workspace) return <main className="module-page"><h1>No workspace found</h1></main>;

  if (workspace.role !== "admin" && workspace.role !== "superuser") {
    return <main className="module-page"><div className="module-stack"><span className="eyebrow">ACCESS CONTROL</span><h1>Admin console</h1><div className="module-notice error">This console requires the Admin or Superuser role. Your current role is {workspace.role}.</div></div></main>;
  }

  return <main className="module-page"><AdminConsole workspaceId={workspace.id} /></main>;
}
