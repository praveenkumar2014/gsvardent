import { NextRequest, NextResponse } from "next/server";
import { acceptInvitationSchema } from "@/lib/server/invitations";
import { getAuthenticatedClient } from "@/lib/server/workspace";

/**
 * Any authenticated user may present an invitation token. Validation (pending,
 * unexpired, addressed to the caller's account email) happens inside the
 * `accept_workspace_invitation` security-definer RPC — the browser never
 * performs the membership insert itself.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = acceptInvitationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "A valid invitation token is required." }, { status: 400 });

  const auth = await getAuthenticatedClient();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { data, error } = await auth.supabase.rpc("accept_workspace_invitation", {
    p_token: parsed.data.token
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Invitation could not be accepted." }, { status: 400 });
  }

  return NextResponse.json({ workspaceId: data, accepted: true }, { status: 200 });
}
