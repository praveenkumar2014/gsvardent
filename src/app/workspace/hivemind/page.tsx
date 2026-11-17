import { redirect } from "next/navigation";
import { getUserWorkspaces } from "@/lib/server/workspace";
import { TeamBoard } from "@/app/workspace/hivemind/team-board";

export default async function HivemindPage() {
  const context = await getUserWorkspaces();
  if (!context) redirect("/login");
  const workspace = context.workspaces[0];
  if (!workspace) return <main className="module-page"><h1>No workspace found</h1></main>;
  return <main className="module-page"><TeamBoard workspaceId={workspace.id} /></main>;
}
