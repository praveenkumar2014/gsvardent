-- Verdent manager workflow: plan versions, approvals, dependencies, retries and cancellation.
-- Requires 0001_initial_schema.sql, 0002_core_modules.sql and 0003_workspace_invitations.sql.
--
-- All transitions are applied through SECURITY DEFINER functions so the whole
-- transition (row updates + semantic audit entry) is one atomic database call.
-- The pure TypeScript state machine in src/lib/server/workflow.ts mirrors these
-- rules and is exhaustively unit-tested; these checks are defence in depth.
-- No function in this migration starts an agent process or a terminal command.

-- ---------------------------------------------------------------------------
-- Status domains and version/attempt columns
-- ---------------------------------------------------------------------------

alter table public.manager_plans drop constraint if exists manager_plans_status_check;
alter table public.manager_plans add constraint manager_plans_status_check
  check (status in ('draft','approved','executing','completed','failed','rejected','cancelled','superseded'));

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('backlog','ready','in_progress','review','done','blocked','failed','cancelled'));

alter table public.manager_plans
  add column if not exists version integer not null default 1 check (version > 0),
  add column if not exists supersedes_id uuid references public.manager_plans(id) on delete set null,
  add column if not exists rejected_by uuid references auth.users(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text check (char_length(rejection_reason) between 3 and 1000);

alter table public.tasks
  add column if not exists attempt integer not null default 1 check (attempt between 1 and 3),
  add column if not exists retry_of uuid references public.tasks(id) on delete set null,
  add column if not exists last_error text check (char_length(last_error) <= 1000),
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists cancelled_at timestamptz;

create index if not exists manager_plans_workspace_project_version_idx
  on public.manager_plans (workspace_id, project_id, version desc);
create index if not exists manager_plans_supersedes_idx
  on public.manager_plans (supersedes_id) where supersedes_id is not null;
create index if not exists tasks_attempt_idx on public.tasks (plan_id, attempt);

-- One idempotency key may only ever produce one semantic workflow audit row.
create unique index if not exists audit_logs_workflow_idempotency_unique
  on public.audit_logs (workspace_id, action, (metadata ->> 'idempotency_key'))
  where metadata ? 'idempotency_key' and metadata ->> 'idempotency_key' is not null;

-- Plan/task mutation stays exclusively inside the SECURITY DEFINER functions
-- below; clients keep their existing SELECT/INSERT grants and cannot bypass a
-- transition check by writing status columns directly.

-- ---------------------------------------------------------------------------
-- Task dependency graph
-- ---------------------------------------------------------------------------

create table public.task_dependencies (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  depends_on_task_id uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id),
  foreign key (task_id, workspace_id)
    references public.tasks(id, workspace_id) on delete cascade,
  foreign key (depends_on_task_id, workspace_id)
    references public.tasks(id, workspace_id) on delete cascade
);

create index task_dependencies_task_idx on public.task_dependencies (task_id);
create index task_dependencies_prerequisite_idx on public.task_dependencies (depends_on_task_id);

create trigger task_dependencies_audit
  after insert or update or delete on public.task_dependencies
  for each row execute procedure public.audit_module_change();

-- Reject self loops, cross-plan edges and cycles inside the database as well
-- as in the unit-tested TypeScript graph validator.
create or replace function public.guard_task_dependency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if exists (
    select 1 from public.tasks task_row
    join public.tasks prerequisite_row on prerequisite_row.id = new.depends_on_task_id
    where task_row.id = new.task_id
      and task_row.workspace_id = new.workspace_id
      and task_row.plan_id is distinct from prerequisite_row.plan_id
  ) then
    raise exception 'Dependencies must belong to the same plan.' using errcode = '23514';
  end if;

  if exists (
    with recursive reachable as (
      select dependency.depends_on_task_id as node
        from public.task_dependencies dependency
       where dependency.task_id = new.depends_on_task_id
      union
      select dependency.depends_on_task_id
        from public.task_dependencies dependency
        join reachable on dependency.task_id = reachable.node
    )
    select 1 from reachable where node = new.task_id
  ) then
    raise exception 'Dependency cycle detected.' using errcode = '23514';
  end if;

  return new;
end;
$fn$;

create trigger task_dependencies_guard
  before insert or update on public.task_dependencies
  for each row execute procedure public.guard_task_dependency();

revoke all on function public.guard_task_dependency() from public, anon;
grant execute on function public.guard_task_dependency() to authenticated;

alter table public.task_dependencies enable row level security;

create policy "task_dependencies_select_member"
  on public.task_dependencies for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "task_dependencies_insert_operator"
  on public.task_dependencies for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );
create policy "task_dependencies_delete_operator"
  on public.task_dependencies for delete to authenticated
  using (
    public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );

grant select on public.task_dependencies to authenticated;
grant insert (workspace_id, task_id, depends_on_task_id, created_by) on public.task_dependencies to authenticated;
grant delete on public.task_dependencies to authenticated;

-- ---------------------------------------------------------------------------
-- Manager plan workflow (atomic transition + semantic audit record)
-- ---------------------------------------------------------------------------

create or replace function public.apply_manager_plan_action(
  p_plan_id uuid,
  p_action text,
  p_reason text default null,
  p_prompt text default null,
  p_note text default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor uuid := (select auth.uid());
  plan_row public.manager_plans;
  task_row record;
  audit_row_id bigint;
  new_plan_id uuid;
  new_task_id uuid;
  new_version integer;
  task_count integer := 0;
  id_map jsonb := '{}'::jsonb;
  final_status text;
  meta jsonb;
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_action not in ('approve','reject','cancel','revise','start_execution','complete','fail') then
    raise exception 'Unsupported plan action.' using errcode = '22023';
  end if;

  select * into plan_row from public.manager_plans where id = p_plan_id for update;
  if not found then
    raise exception 'Plan not found in this workspace.' using errcode = 'P0002';
  end if;
  if not public.is_workspace_member(plan_row.workspace_id) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if p_action in ('approve','reject','start_execution','complete','fail') then
    if not public.has_workspace_role(plan_row.workspace_id, array['superuser','admin']::public.workspace_role[]) then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  elsif not public.has_workspace_role(plan_row.workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select id into audit_row_id
      from public.audit_logs
     where workspace_id = plan_row.workspace_id
       and action = 'manager.plan.' || p_action
       and metadata ->> 'idempotency_key' = p_idempotency_key
     limit 1;
    if found then
      return jsonb_build_object(
        'already_applied', true, 'plan_id', plan_row.id,
        'action', p_action, 'audit_id', audit_row_id
      );
    end if;
  end if;

  case p_action
    when 'approve' then
      if plan_row.status <> 'draft' then
        raise exception 'Only a draft plan can be approved.' using errcode = '23514';
      end if;
      if exists (select 1 from public.manager_plans later where later.supersedes_id = plan_row.id) then
        raise exception 'This plan version has been superseded.' using errcode = '23514';
      end if;
      if exists (
        select 1 from public.task_dependencies dependency
         where dependency.workspace_id = plan_row.workspace_id
           and dependency.task_id in (select id from public.tasks where plan_id = plan_row.id)
           and dependency.depends_on_task_id not in (select id from public.tasks where plan_id = plan_row.id)
      ) then
        raise exception 'This plan has dependencies outside its own task set.' using errcode = '23514';
      end if;
      update public.manager_plans
         set status = 'approved', approved_by = actor, approved_at = now()
       where id = plan_row.id;
      update public.tasks set status = 'ready'
       where plan_id = plan_row.id and status = 'backlog';
      get diagnostics task_count = row_count;

    when 'reject' then
      if plan_row.status not in ('draft','approved') then
        raise exception 'This plan cannot be rejected.' using errcode = '23514';
      end if;
      if coalesce(length(trim(p_reason)), 0) < 3 then
        raise exception 'A rejection reason is required.' using errcode = '22023';
      end if;
      update public.manager_plans
         set status = 'rejected', rejected_by = actor,
             rejected_at = now(), rejection_reason = trim(p_reason)
       where id = plan_row.id;

    when 'cancel' then
      if plan_row.status not in ('draft','approved','executing','failed') then
        raise exception 'This plan cannot be cancelled.' using errcode = '23514';
      end if;
      update public.manager_plans set status = 'cancelled' where id = plan_row.id;
      update public.tasks
         set status = 'cancelled', cancelled_by = actor, cancelled_at = now()
       where plan_id = plan_row.id
         and status in ('backlog','ready','in_progress','review','blocked','failed');
      get diagnostics task_count = row_count;
      update public.agent_runs
         set status = 'cancelled', finished_at = now()
       where plan_id = plan_row.id and status in ('waiting_approval','queued','running');

    when 'start_execution' then
      if plan_row.status <> 'approved' then
        raise exception 'Only an approved plan can start execution.' using errcode = '23514';
      end if;
      update public.manager_plans set status = 'executing' where id = plan_row.id;

    when 'complete' then
      if plan_row.status <> 'executing' then
        raise exception 'Only an executing plan can complete.' using errcode = '23514';
      end if;
      update public.manager_plans set status = 'completed' where id = plan_row.id;

    when 'fail' then
      if plan_row.status <> 'executing' then
        raise exception 'Only an executing plan can fail.' using errcode = '23514';
      end if;
      update public.manager_plans set status = 'failed' where id = plan_row.id;

    when 'revise' then
      if plan_row.status not in ('draft','rejected','failed') then
        raise exception 'Only a draft, rejected or failed plan can be revised.' using errcode = '23514';
      end if;
      if coalesce(length(trim(p_prompt)), 0) < 12 then
        raise exception 'A revised plan requires an updated goal.' using errcode = '22023';
      end if;

      select coalesce(max(version), 0) + 1 into new_version
        from public.manager_plans
       where workspace_id = plan_row.workspace_id and project_id = plan_row.project_id;

      insert into public.manager_plans (
        workspace_id, project_id, title, source_prompt, description, status,
        provider, model, created_by, version, supersedes_id
      ) values (
        plan_row.workspace_id, plan_row.project_id, plan_row.title, trim(p_prompt),
        case
          when p_note is null or trim(p_note) = '' then plan_row.description
          else plan_row.description || E'\n\nRevision note: ' || trim(p_note)
        end,
        'draft', plan_row.provider, plan_row.model, actor, new_version, plan_row.id
      ) returning id into new_plan_id;

      for task_row in
        select * from public.tasks
         where plan_id = plan_row.id
         order by position, created_at
      loop
        insert into public.tasks (
          workspace_id, project_id, plan_id, title, description, status,
          priority, assigned_agent, position, created_by, attempt
        ) values (
          plan_row.workspace_id, plan_row.project_id, new_plan_id,
          task_row.title, task_row.description, 'backlog',
          task_row.priority, task_row.assigned_agent, task_row.position, actor, 1
        ) returning id into new_task_id;

        id_map := id_map || jsonb_build_object(task_row.id::text, new_task_id::text);

        insert into public.agent_runs (
          workspace_id, project_id, plan_id, task_id, agent_name, agent_role,
          status, progress, summary, started_by
        ) values (
          plan_row.workspace_id, plan_row.project_id, new_plan_id, new_task_id,
          task_row.assigned_agent, task_row.assigned_agent, 'waiting_approval', 0,
          'Task assigned in a revised plan. Human approval is required before execution.', actor
        );
        task_count := task_count + 1;
      end loop;

      insert into public.task_dependencies (workspace_id, task_id, depends_on_task_id, created_by)
      select dependency.workspace_id,
             (id_map ->> dependency.task_id::text)::uuid,
             (id_map ->> dependency.depends_on_task_id::text)::uuid,
             actor
        from public.task_dependencies dependency
       where dependency.task_id in (select id from public.tasks where plan_id = plan_row.id)
         and id_map ? dependency.task_id::text
         and id_map ? dependency.depends_on_task_id::text;

      update public.manager_plans set status = 'superseded' where id = plan_row.id;
  end case;

  meta := jsonb_build_object(
            'plan_id', plan_row.id,
            'version', plan_row.version,
            'task_count', task_count
          )
          || case when p_reason is null then '{}'::jsonb else jsonb_build_object('reason', p_reason) end
          || case when new_plan_id is null then '{}'::jsonb else jsonb_build_object('new_plan_id', new_plan_id) end
          || case when p_idempotency_key is null then '{}'::jsonb else jsonb_build_object('idempotency_key', p_idempotency_key) end;

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    plan_row.workspace_id, actor, 'manager.plan.' || p_action, 'manager_plan',
    coalesce(new_plan_id, plan_row.id)::text, meta
  );

  select status into final_status
    from public.manager_plans
   where id = coalesce(new_plan_id, plan_row.id);

  return jsonb_build_object(
    'already_applied', false,
    'plan_id', coalesce(new_plan_id, plan_row.id),
    'action', p_action,
    'status', final_status,
    'task_count', task_count
  );
end;
$fn$;

revoke all on function public.apply_manager_plan_action(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.apply_manager_plan_action(uuid, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Task lifecycle (atomic transition + semantic audit record)
-- ---------------------------------------------------------------------------

create or replace function public.apply_task_action(
  p_task_id uuid,
  p_action text,
  p_reason text default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor uuid := (select auth.uid());
  task_row public.tasks;
  audit_row_id bigint;
  new_run_id uuid;
  final_status text;
  next_attempt integer;
  meta jsonb;
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_action not in ('start','submit_review','complete','request_changes','block','unblock','fail','retry','cancel') then
    raise exception 'Unsupported task action.' using errcode = '22023';
  end if;

  select * into task_row from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found in this workspace.' using errcode = 'P0002';
  end if;
  if not public.is_workspace_member(task_row.workspace_id) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if p_action in ('start','submit_review','complete','request_changes','fail') then
    if not public.has_workspace_role(task_row.workspace_id, array['superuser','admin']::public.workspace_role[]) then
      raise exception 'PERMISSION_DENIED' using errcode = '42501';
    end if;
  elsif not public.has_workspace_role(task_row.workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select id into audit_row_id
      from public.audit_logs
     where workspace_id = task_row.workspace_id
       and action = 'tasks.' || p_action
       and metadata ->> 'idempotency_key' = p_idempotency_key
     limit 1;
    if found then
      return jsonb_build_object(
        'already_applied', true, 'task_id', task_row.id,
        'action', p_action, 'audit_id', audit_row_id
      );
    end if;
  end if;

  next_attempt := task_row.attempt;
  final_status := task_row.status;

  case p_action
    when 'start' then
      if task_row.status not in ('backlog','ready') then
        raise exception 'Only a backlog or ready task can start.' using errcode = '23514';
      end if;
      if exists (
        select 1
          from public.task_dependencies dependency
          join public.tasks prerequisite on prerequisite.id = dependency.depends_on_task_id
         where dependency.task_id = task_row.id
           and prerequisite.status <> 'done'
      ) then
        raise exception 'Prerequisite tasks are not complete.' using errcode = '23514';
      end if;
      update public.tasks set status = 'in_progress' where id = task_row.id;
      final_status := 'in_progress';

    when 'submit_review' then
      if task_row.status <> 'in_progress' then
        raise exception 'Only an in-progress task can be submitted for review.' using errcode = '23514';
      end if;
      update public.tasks set status = 'review' where id = task_row.id;
      final_status := 'review';

    when 'complete' then
      if task_row.status <> 'review' then
        raise exception 'Only a task in review can be completed.' using errcode = '23514';
      end if;
      update public.tasks set status = 'done', last_error = null where id = task_row.id;
      final_status := 'done';

    when 'request_changes' then
      if task_row.status <> 'review' then
        raise exception 'Changes can only be requested on a task in review.' using errcode = '23514';
      end if;
      if coalesce(length(trim(p_reason)), 0) < 3 then
        raise exception 'A review note is required.' using errcode = '22023';
      end if;
      update public.tasks set status = 'in_progress', last_error = trim(p_reason) where id = task_row.id;
      final_status := 'in_progress';

    when 'block' then
      if task_row.status not in ('ready','in_progress') then
        raise exception 'Only a ready or in-progress task can be blocked.' using errcode = '23514';
      end if;
      if coalesce(length(trim(p_reason)), 0) < 3 then
        raise exception 'A blocking reason is required.' using errcode = '22023';
      end if;
      update public.tasks set status = 'blocked', last_error = trim(p_reason) where id = task_row.id;
      final_status := 'blocked';

    when 'unblock' then
      if task_row.status <> 'blocked' then
        raise exception 'Only a blocked task can be unblocked.' using errcode = '23514';
      end if;
      update public.tasks set status = 'ready', last_error = null where id = task_row.id;
      final_status := 'ready';

    when 'fail' then
      if task_row.status not in ('in_progress','review') then
        raise exception 'Only an active task can fail.' using errcode = '23514';
      end if;
      if coalesce(length(trim(p_reason)), 0) < 3 then
        raise exception 'A failure reason is required.' using errcode = '22023';
      end if;
      update public.tasks set status = 'failed', last_error = trim(p_reason) where id = task_row.id;
      final_status := 'failed';

    when 'retry' then
      if task_row.status not in ('blocked','failed','cancelled') then
        raise exception 'Only a blocked, failed or cancelled task can be retried.' using errcode = '23514';
      end if;
      if task_row.attempt >= 3 then
        raise exception 'Retry limit reached. Create a new plan version instead.' using errcode = '23514';
      end if;
      next_attempt := task_row.attempt + 1;
      update public.tasks
         set status = 'ready', attempt = next_attempt, last_error = null,
             cancelled_by = null, cancelled_at = null
       where id = task_row.id;
      final_status := 'ready';
      insert into public.agent_runs (
        workspace_id, project_id, plan_id, task_id, agent_name, agent_role,
        status, progress, summary, started_by
      ) values (
        task_row.workspace_id, task_row.project_id, task_row.plan_id, task_row.id,
        task_row.assigned_agent, task_row.assigned_agent, 'waiting_approval', 0,
        'Retry ' || next_attempt || ' proposed by a workspace member. No worker runtime is connected.', actor
      ) returning id into new_run_id;

    when 'cancel' then
      if task_row.status = 'done' or task_row.status = 'cancelled' then
        raise exception 'This task is already in a terminal state.' using errcode = '23514';
      end if;
      update public.tasks
         set status = 'cancelled', cancelled_by = actor, cancelled_at = now()
       where id = task_row.id;
      final_status := 'cancelled';
      update public.agent_runs
         set status = 'cancelled', finished_at = now()
       where task_id = task_row.id and status in ('waiting_approval','queued','running');
  end case;

  meta := jsonb_build_object(
            'task_id', task_row.id,
            'from_status', task_row.status,
            'to_status', final_status,
            'attempt', next_attempt
          )
          || case when p_reason is null then '{}'::jsonb else jsonb_build_object('reason', p_reason) end
          || case when new_run_id is null then '{}'::jsonb else jsonb_build_object('new_agent_run_id', new_run_id) end
          || case when p_idempotency_key is null then '{}'::jsonb else jsonb_build_object('idempotency_key', p_idempotency_key) end;

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    task_row.workspace_id, actor, 'tasks.' || p_action, 'task', task_row.id::text, meta
  );

  return jsonb_build_object(
    'already_applied', false,
    'task_id', task_row.id,
    'action', p_action,
    'status', final_status,
    'attempt', next_attempt
  );
end;
$fn$;

revoke all on function public.apply_task_action(uuid, text, text, text) from public, anon;
grant execute on function public.apply_task_action(uuid, text, text, text) to authenticated;
