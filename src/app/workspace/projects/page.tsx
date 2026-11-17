import { redirect } from "next/navigation";
import { getUserWorkspaces } from "@/lib/server/workspace";
import { ProjectsPanel } from "@/app/workspace/projects/projects-panel";

export default async function ProjectsPage() {
  const context = await getUserWorkspaces();
  if (!context) redirect("/login");
  const workspace = context.workspaces[0];
  if (!workspace) return <main className="module-page"><h1>No workspace found</h1><p>Create a workspace before managing projects.</p></main>;

  const { data: projects } = await context.supabase
    .from("projects")
    .select("id, name, description, status, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  return <main className="module-page"><ProjectsPanel workspaceId={workspace.id} initialProjects={projects ?? []} /></main>;
}
