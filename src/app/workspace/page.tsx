import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/app/workspace/workspace-shell";

export default async function WorkspacePage() {
  if (!isSupabaseConfigured()) redirect("/login?setup=required");

  const supabase = await createClient();
  const { data: verified } = await supabase.auth.getClaims();
  const claims = verified?.claims;
  if (!claims) redirect("/login");

  const email = typeof claims.email === "string" ? claims.email : "Signed-in user";
  return <WorkspaceShell email={email} />;
}
