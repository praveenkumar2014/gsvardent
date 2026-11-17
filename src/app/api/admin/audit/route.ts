import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";

export async function GET(request: NextRequest) {
  const query = z.object({
    workspaceId: z.string().uuid(),
    action: z.string().trim().max(120).optional()
  }).safeParse({
    workspaceId: request.nextUrl.searchParams.get("workspaceId"),
    action: request.nextUrl.searchParams.get("action") || undefined
  });
  if (!query.success) return NextResponse.json({ error: "A valid workspaceId is required." }, { status: 400 });

  const context = await getWorkspaceSession(query.data.workspaceId, ["superuser", "admin"]);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  let requestQuery = context.supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, outcome, metadata, created_at")
    .eq("workspace_id", query.data.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (query.data.action) requestQuery = requestQuery.ilike("action", `%${query.data.action}%`);
  const { data, error } = await requestQuery;
  if (error) return NextResponse.json({ error: "Audit events could not be loaded." }, { status: 500 });

  return NextResponse.json({ events: data ?? [] });
}
