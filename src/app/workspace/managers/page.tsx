import { redirect } from "next/navigation";
import { getUserWorkspaces } from "@/lib/server/workspace";
import { ManagerPanel } from "@/app/workspace/managers/manager-panel";

export default async function ManagersPage() {
  const context = await getUserWorkspaces();
  if (!context) redirect("/login");
  const workspace = context.workspaces[0];
  if (!workspace) return <main className="module-page"><h1>No workspace found</h1></main>;
  const { data: projects } = await context.supabase.from("projects")
    .select("id, name").eq("workspace_id", workspace.id).order("created_at", { ascending: false });
  return <main className="module-page"><ManagerPanel workspaceId={workspace.id} projects={projects ?? []} /></main>;
}
