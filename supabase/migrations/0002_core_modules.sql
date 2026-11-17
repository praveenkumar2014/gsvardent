-- Verdent core modules: planning, tasks and multi-agent visibility.
-- Requires 0001_initial_schema.sql.

alter table public.projects
  add constraint projects_id_workspace_unique unique (id, workspace_id);

create or replace function public.is_profile_workspace_member(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.workspace_memberships actor_membership
    join public.workspace_memberships target_membership
      on target_membership.workspace_id = actor_membership.workspace_id
    where actor_membership.user_id = (select auth.uid())
      and target_membership.user_id = target_user
  );
$;

revoke all on function public.is_profile_workspace_member(uuid) from public;
grant execute on function public.is_profile_workspace_member(uuid) to authenticated;

create policy "profiles_select_workspace_peers"
  on public.profiles for select to authenticated
  using (public.is_profile_workspace_member(id));

create table public.manager_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(title) between 1 and 180),
  source_prompt text not null check (char_length(source_prompt) between 1 and 12000),
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft','approved','executing','completed','failed','cancelled')),
  provider text not null default 'rules',
  model text,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade
);

create index manager_plans_workspace_created_idx
  on public.manager_plans (workspace_id, created_at desc);
create index manager_plans_project_created_idx
  on public.manager_plans (project_id, created_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  plan_id uuid,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  status text not null default 'backlog'
    check (status in ('backlog','ready','in_progress','review','done','blocked')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assigned_agent text not null default 'Product Manager',
  assigned_to uuid references auth.users(id),
  position integer not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  foreign key (plan_id, workspace_id)
    references public.manager_plans(id, workspace_id) on delete cascade
);

create index tasks_workspace_project_idx on public.tasks (workspace_id, project_id, position, created_at);
create index tasks_plan_idx on public.tasks (plan_id);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  plan_id uuid,
  task_id uuid,
  agent_name text not null,
  agent_role text not null,
  status text not null default 'waiting_approval'
    check (status in ('queued','running','waiting_approval','completed','failed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  summary text not null default '',
  started_by uuid not null references auth.users(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  foreign key (plan_id, workspace_id)
    references public.manager_plans(id, workspace_id) on delete set null (plan_id),
  foreign key (task_id, workspace_id)
    references public.tasks(id, workspace_id) on delete set null (task_id)
);

create index agent_runs_workspace_created_idx on public.agent_runs (workspace_id, created_at desc);
create index agent_runs_project_status_idx on public.agent_runs (project_id, status);

create table public.agent_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_run_id uuid not null,
  event_type text not null,
  level text not null default 'info' check (level in ('info','success','warning','error')),
  message text not null check (char_length(message) between 1 and 4000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (agent_run_id, workspace_id)
    references public.agent_runs(id, workspace_id) on delete cascade
);

create index agent_events_run_created_idx on public.agent_events (agent_run_id, created_at);

create trigger manager_plans_set_updated_at
  before update on public.manager_plans
  for each row execute procedure public.set_updated_at();
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();
create trigger agent_runs_set_updated_at
  before update on public.agent_runs
  for each row execute procedure public.set_updated_at();

-- Append audit snapshots for domain mutations, not event stream updates.
create or replace function public.audit_module_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_key uuid;
  actor_key uuid;
  entity_key text;
begin
  if tg_op = 'DELETE' then
    workspace_key := old.workspace_id;
    actor_key := case
      when tg_table_name = 'agent_runs' then coalesce((select auth.uid()), old.started_by)
      else coalesce((select auth.uid()), old.created_by)
    end;
    entity_key := old.id::text;
  else
    workspace_key := new.workspace_id;
    actor_key := case
      when tg_table_name = 'agent_runs' then coalesce((select auth.uid()), new.started_by)
      else coalesce((select auth.uid()), new.created_by)
    end;
    entity_key := new.id::text;
  end if;

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    workspace_key,
    actor_key,
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    entity_key,
    jsonb_build_object('operation', tg_op)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger manager_plans_audit
  after insert or update or delete on public.manager_plans
  for each row execute procedure public.audit_module_change();
create trigger tasks_audit
  after insert or update or delete on public.tasks
  for each row execute procedure public.audit_module_change();
create trigger agent_runs_audit
  after insert or update or delete on public.agent_runs
  for each row execute procedure public.audit_module_change();

alter table public.manager_plans enable row level security;
alter table public.tasks enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_events enable row level security;

create policy "plans_select_member"
  on public.manager_plans for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "plans_insert_member"
  on public.manager_plans for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );
create policy "plans_update_operator"
  on public.manager_plans for update to authenticated
  using (
    public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  )
  with check (
    public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );

create policy "tasks_select_member"
  on public.tasks for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "tasks_insert_member"
  on public.tasks for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );
create policy "tasks_update_operator"
  on public.tasks for update to authenticated
  using (
    public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  )
  with check (
    public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );
create policy "tasks_delete_admin"
  on public.tasks for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['superuser','admin']::public.workspace_role[]));

create policy "agent_runs_select_member"
  on public.agent_runs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "agent_runs_insert_operator"
  on public.agent_runs for insert to authenticated
  with check (
    started_by = (select auth.uid())
    and public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );
create policy "agent_runs_update_operator"
  on public.agent_runs for update to authenticated
  using (public.has_workspace_role(workspace_id, array['superuser','admin','staff']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['superuser','admin','staff']::public.workspace_role[]));

create policy "agent_events_select_member"
  on public.agent_events for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "agent_events_insert_member"
  on public.agent_events for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

grant select, insert, update on public.manager_plans to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update on public.agent_runs to authenticated;
grant select, insert on public.agent_events to authenticated;
