import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const WORKSPACE_ROLES = ["superuser", "admin", "staff", "investor", "user"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export type WorkspaceMembership = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at?: string;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

export async function getAuthenticatedClient() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 503, message: "Supabase authentication is not configured." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    return { ok: false as const, status: 401, message: "Authentication required." };
  }

  return { ok: true as const, supabase, userId };
}

export async function getWorkspaceSession(
  workspaceId: string,
  allowedRoles?: readonly WorkspaceRole[]
) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("workspace_memberships")
    .select("id, workspace_id, user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, status: 403, message: "You do not have access to this workspace." };
  }

  const membership = data as WorkspaceMembership;
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    return { ok: false as const, status: 403, message: "Your workspace role cannot perform this action." };
  }

  return { ...auth, ok: true as const, membership };
}

export async function getUserWorkspaces(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  workspaces: WorkspaceRecord[];
} | null> {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return null;

  const { data, error } = await auth.supabase
    .from("workspace_memberships")
    .select("id, workspace_id, user_id, role, created_at, workspaces(id, name)")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: true });

  if (error || !data) return null;

  const workspaces: WorkspaceRecord[] = data.flatMap((entry) => {
    const row = entry as unknown as WorkspaceMembership & {
      workspaces: { id: string; name: string } | null;
    };
    return row.workspaces
      ? [{ id: row.workspaces.id, name: row.workspaces.name, role: row.role }]
      : [];
  });

  return { supabase: auth.supabase, userId: auth.userId, workspaces };
}
