import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";

export async function GET(request: NextRequest) {
  const query = z.object({ workspaceId: z.string().uuid(), projectId: z.string().uuid().optional() })
    .safeParse({
      workspaceId: request.nextUrl.searchParams.get("workspaceId"),
      projectId: request.nextUrl.searchParams.get("projectId") ?? undefined
    });
  if (!query.success) return NextResponse.json({ error: "Valid workspaceId is required." }, { status: 400 });

  const context = await getWorkspaceSession(query.data.workspaceId);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  let runQuery = context.supabase
    .from("agent_runs")
    .select("id, project_id, plan_id, task_id, agent_name, agent_role, status, progress, summary, created_at, started_at, finished_at")
    .eq("workspace_id", query.data.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (query.data.projectId) runQuery = runQuery.eq("project_id", query.data.projectId);

  const { data: runs, error } = await runQuery;
  if (error) return NextResponse.json({ error: "Agent activity could not be loaded. Apply migration 0002." }, { status: 500 });

  const runIds = (runs ?? []).map((run) => run.id);
  let events: Array<{ id: number; agent_run_id: string; event_type: string; level: string; message: string; created_at: string }> = [];
  if (runIds.length) {
    const { data: eventRows } = await context.supabase
      .from("agent_events")
      .select("id, agent_run_id, event_type, level, message, created_at")
      .eq("workspace_id", query.data.workspaceId)
      .in("agent_run_id", runIds)
      .order("created_at", { ascending: false })
      .limit(150);
    events = (eventRows ?? []) as typeof events;
  }

  return NextResponse.json({ runs: runs ?? [], events });
}
