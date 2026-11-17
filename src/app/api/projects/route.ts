import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";

const workspaceQuery = z.string().uuid();
const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).default("")
});

export async function GET(request: NextRequest) {
  const parsed = workspaceQuery.safeParse(request.nextUrl.searchParams.get("workspaceId"));
  if (!parsed.success) return NextResponse.json({ error: "A valid workspaceId is required." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("projects")
    .select("id, workspace_id, name, description, status, created_at, updated_at")
    .eq("workspace_id", parsed.data)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Projects could not be loaded." }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the project name, description and workspace." }, { status: 400 });
  }

  const context = await getWorkspaceSession(parsed.data.workspaceId, ["superuser", "admin", "staff", "user"]);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data, error } = await context.supabase
    .from("projects")
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      created_by: context.userId
    })
    .select("id, workspace_id, name, description, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Project could not be created. Check your database migration and permissions." }, { status: 400 });
  return NextResponse.json({ project: data }, { status: 201 });
}
