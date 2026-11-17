import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/app/workspace/workspace-shell";

export default async function WorkspacePage() {
  if (!isSupabaseConfigured()) redirect("/login?setup=required");

  const supabase = await createClient();
  const { data: { claims } } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const email = typeof claims.email === "string" ? claims.email : "Signed-in user";
  return <WorkspaceShell email={email} />;
}
