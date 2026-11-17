import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!isSupabaseConfigured()) redirect("/login?setup=required");

  const supabase = await createClient();
  const { data: { claims } } = await supabase.auth.getClaims();

  redirect(claims ? "/workspace" : "/login");
}
