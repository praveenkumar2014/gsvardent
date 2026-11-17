import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/server/workspace";

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  prompt: z.string().trim().min(12).max(12000)
});

const taskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedAgent: z.enum(["Product Manager", "UX Researcher", "UI Designer", "Frontend Engineer", "Backend Engineer", "Database Engineer", "AI Engineer", "QA Engineer", "Security Engineer", "DevOps Engineer"])
});

const aiResponseSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(2000).optional(),
  tasks: z.array(taskSchema).min(2).max(12)
});

type PlannedTask = z.infer<typeof taskSchema>;

function rulesBasedPlan(prompt: string): z.infer<typeof aiResponseSchema> {
  const subject = prompt.replace(/\s+/g, " ").trim().slice(0, 120);
  const defaults: PlannedTask[] = [
    { title: "Clarify scope and acceptance criteria", description: "Identify users, outcomes, constraints and measurable acceptance checks.", priority: "high", assignedAgent: "Product Manager" },
    { title: "Map user journeys and interface states", description: "Define information architecture, critical flows and responsive/error states.", priority: "medium", assignedAgent: "UX Researcher" },
    { title: "Define architecture and data boundaries", description: "Confirm API contracts, entities, tenancy and permission boundaries.", priority: "high", assignedAgent: "Database Engineer" },
    { title: "Implement the primary user experience", description: "Build the main interaction flow with typed components and accessible states.", priority: "high", assignedAgent: "Frontend Engineer" },
    { title: "Implement domain services and persistence", description: "Connect validated APIs to the database under server-side authorization and RLS.", priority: "high", assignedAgent: "Backend Engineer" },
    { title: "Verify security and acceptance criteria", description: "Run functional, authorization, negative-path and regression checks.", priority: "high", assignedAgent: "QA Engineer" }
  ];

  return {
    title: subject.length > 92 ? `${subject.slice(0, 89)}…` : subject,
    description: "Rules-based starter plan. Configure VERDENT_AI_API_URL, VERDENT_AI_API_KEY and VERDENT_AI_MODEL to use a model provider.",
    tasks: defaults
  };
}

async function modelPlan(prompt: string) {
  const endpoint = process.env.VERDENT_AI_API_URL;
  const apiKey = process.env.VERDENT_AI_API_KEY;
  const model = process.env.VERDENT_AI_MODEL;
  if (!endpoint || !apiKey || !model) return null;

  const parsedUrl = z.string().url().safeParse(endpoint);
  if (!parsedUrl.success || new URL(endpoint).protocol !== "https:") {
    throw new Error("VERDENT_AI_API_URL must be a valid HTTPS endpoint.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Decompose the user's software goal into 2 to 12 actionable engineering tasks. Return JSON only with title, description, and tasks array. Each task has title, description, priority (low, medium, high, urgent), assignedAgent (Product Manager, UX Researcher, UI Designer, Frontend Engineer, Backend Engineer, Database Engineer, AI Engineer, QA Engineer, Security Engineer, DevOps Engineer). Do not claim tasks are executed. Keep tasks concrete and ordered." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`Configured model endpoint returned HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  const outer = z.object({
    choices: z.array(z.object({
      message: z.object({ content: z.string() })
    })).min(1)
  }).safeParse(payload);
  if (!outer.success) throw new Error("Model response did not match the expected chat-completions shape.");

  let content = outer.data.choices[0].message.content.trim();
  content = content.replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
  const decoded: unknown = JSON.parse(content);
  return aiResponseSchema.parse(decoded);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid workspace, project and goal (at least 12 characters)." }, { status: 400 });

  const context = await getWorkspaceSession(parsed.data.workspaceId, ["superuser", "admin", "staff", "user"]);
  if (!context.ok) return NextResponse.json({ error: context.message }, { status: context.status });

  const { data: project, error: projectError } = await context.supabase
    .from("projects").select("id, workspace_id, name")
    .eq("id", parsed.data.projectId).eq("workspace_id", parsed.data.workspaceId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: "Project not found in this workspace." }, { status: 404 });

  let plan: z.infer<typeof aiResponseSchema> | null = null;
  let provider = "rules";
  try {
    plan = await modelPlan(parsed.data.prompt);
    if (plan) provider = "configured-model";
  } catch (cause) {
    return NextResponse.json({
      error: cause instanceof Error ? cause.message : "The configured model could not create a plan."
    }, { status: 502 });
  }
  if (!plan) plan = rulesBasedPlan(parsed.data.prompt);

  const { data: savedPlan, error: planError } = await context.supabase
    .from("manager_plans")
    .insert({
      workspace_id: parsed.data.workspaceId,
      project_id: parsed.data.projectId,
      title: plan.title ?? "New implementation plan",
      description: plan.description ?? "",
      source_prompt: parsed.data.prompt,
      provider,
      model: provider === "configured-model" ? process.env.VERDENT_AI_MODEL : null,
      created_by: context.userId,
      status: "draft"
    })
    .select("id, title, description, status, provider, created_at")
    .single();

  if (planError || !savedPlan) return NextResponse.json({ error: "Plan storage failed. Apply migration 0002 and verify project access." }, { status: 400 });

  const taskRows = plan.tasks.map((task, index) => ({
    workspace_id: parsed.data.workspaceId,
    project_id: parsed.data.projectId,
    plan_id: savedPlan.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    assigned_agent: task.assignedAgent,
    position: index,
    created_by: context.userId,
    status: "backlog"
  }));

  const { data: savedTasks, error: taskError } = await context.supabase
    .from("tasks").insert(taskRows)
    .select("id, title, description, status, priority, assigned_agent, position");

  if (taskError || !savedTasks) {
    return NextResponse.json({ error: "Plan was saved, but its tasks could not be stored. Review the draft plan before retrying." }, { status: 400 });
  }

  const agentRows = savedTasks.map((task) => ({
    workspace_id: parsed.data.workspaceId,
    project_id: parsed.data.projectId,
    plan_id: savedPlan.id,
    task_id: task.id,
    agent_name: task.assigned_agent,
    agent_role: task.assigned_agent,
    status: "waiting_approval",
    progress: 0,
    summary: "Task assigned in the proposed plan. Execution is paused pending approval and worker configuration.",
    started_by: context.userId
  }));
  const { data: savedRuns, error: agentError } = await context.supabase
    .from("agent_runs").insert(agentRows).select("id, agent_name");
  if (agentError || !savedRuns) {
    return NextResponse.json({ error: "Plan and tasks were saved, but the agent board could not be initialized." }, { status: 400 });
  }

  const { error: eventError } = await context.supabase.from("agent_events").insert(savedRuns.map((run) => ({
    workspace_id: parsed.data.workspaceId,
    agent_run_id: run.id,
    event_type: "plan.assigned",
    level: "info",
    message: `${run.agent_name} is assigned to a proposed task. Human approval is required before execution.`
  })));
  if (eventError) {
    return NextResponse.json({ error: "Plan, tasks and agent assignments were saved, but the event stream could not be initialized." }, { status: 400 });
  }

  return NextResponse.json({
    plan: savedPlan,
    tasks: savedTasks,
    provider,
    executionStarted: false
  }, { status: 201 });
}
