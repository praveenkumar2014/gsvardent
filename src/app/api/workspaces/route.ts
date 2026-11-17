import { NextResponse } from "next/server";
import { getUserWorkspaces } from "@/lib/server/workspace";

export async function GET() {
  const context = await getUserWorkspaces();
  if (!context) {
    return NextResponse.json({ error: "Unable to load workspaces. Sign in again." }, { status: 401 });
  }

  return NextResponse.json({ workspaces: context.workspaces });
}
