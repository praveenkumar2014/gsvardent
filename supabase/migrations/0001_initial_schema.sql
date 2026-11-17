-- Verdent initial workspace schema.
-- Apply once to a new Supabase project before using workspace records.

create extension if not exists pgcrypto;

create type public.workspace_role as enum ('superuser', 'admin', 'staff', 'investor', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_memberships_user_workspace_idx
  on public.workspace_memberships (user_id, workspace_id);
create index workspace_memberships_workspace_role_idx
  on public.workspace_memberships (workspace_id, role);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_workspace_created_idx
  on public.projects (workspace_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  outcome text not null default 'success' check (outcome in ('success', 'denied', 'failure')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_workspace_created_idx
  on public.audit_logs (workspace_id, created_at desc);
create index audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);

-- SECURITY DEFINER helpers avoid recursive evaluation of membership RLS policies.
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships m
    where m.workspace_id = target_workspace
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace uuid,
  allowed_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships m
    where m.workspace_id = target_workspace
      and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

-- Every new account receives a personal workspace and the Admin role in it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_label text;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user'), '@', 1))
  )
  on conflict (id) do nothing;

  workspace_label :=
    coalesce(nullif(split_part(coalesce(new.email, 'My'), '@', 1), ''), 'My') || '''s workspace';

  insert into public.workspaces (name, created_by)
  values (workspace_label, new.id)
  returning id into new_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'admin');

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new_workspace_id, new.id, 'workspace.created', 'workspace', new_workspace_id::text,
    jsonb_build_object('source', 'auth.signup')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute procedure public.set_updated_at();
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- Trigger-maintained security history. Authenticated clients have no direct write grant.
create or replace function public.audit_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_key uuid;
  actor_key uuid;
  event_key text;
  entity_key text;
begin
  if tg_table_name = 'workspace_memberships' then
    if tg_op = 'DELETE' then
      workspace_key := old.workspace_id;
      actor_key := coalesce((select auth.uid()), old.user_id);
      entity_key := old.id::text;
      event_key := 'membership.deleted';
    else
      workspace_key := new.workspace_id;
      actor_key := coalesce((select auth.uid()), new.user_id);
      entity_key := new.id::text;
      event_key := case when tg_op = 'INSERT' then 'membership.created' else 'membership.updated' end;
    end if;
  else
    if tg_op = 'DELETE' then
      workspace_key := old.workspace_id;
      actor_key := coalesce((select auth.uid()), old.created_by);
      entity_key := old.id::text;
      event_key := 'project.deleted';
    else
      workspace_key := new.workspace_id;
      actor_key := coalesce((select auth.uid()), new.created_by);
      entity_key := new.id::text;
      event_key := case when tg_op = 'INSERT' then 'project.created' else 'project.updated' end;
    end if;
  end if;

  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    workspace_key, actor_key, event_key, tg_table_name, entity_key,
    jsonb_build_object('operation', tg_op)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger workspace_memberships_audit
  after insert or update or delete on public.workspace_memberships
  for each row execute procedure public.audit_workspace_change();
create trigger projects_audit
  after insert or update or delete on public.projects
  for each row execute procedure public.audit_workspace_change();

create or replace function public.audit_workspace_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  insert into public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.id, (select auth.uid()), 'workspace.updated', 'workspace', new.id::text,
    jsonb_build_object('operation', tg_op)
  );
  return new;
end;
$;

create trigger workspaces_audit
  after update on public.workspaces
  for each row execute procedure public.audit_workspace_update();

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  raise exception 'audit_logs is append-only';
end;
$;

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute procedure public.prevent_audit_log_mutation();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.projects enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "workspaces_select_member"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy "workspaces_update_admin"
  on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['superuser','admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['superuser','admin']::public.workspace_role[]));

create policy "memberships_select_workspace"
  on public.workspace_memberships for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "memberships_insert_admin"
  on public.workspace_memberships for insert to authenticated
  with check (
    (
      role <> 'superuser'
      and public.has_workspace_role(workspace_id, array['superuser','admin']::public.workspace_role[])
    )
    or public.has_workspace_role(workspace_id, array['superuser']::public.workspace_role[])
  );
create policy "memberships_update_admin"
  on public.workspace_memberships for update to authenticated
  using (
    public.has_workspace_role(workspace_id, array['superuser']::public.workspace_role[])
    or (
      role <> 'superuser'
      and public.has_workspace_role(workspace_id, array['admin']::public.workspace_role[])
    )
  )
  with check (
    (
      role <> 'superuser'
      and public.has_workspace_role(workspace_id, array['superuser','admin']::public.workspace_role[])
    )
    or public.has_workspace_role(workspace_id, array['superuser']::public.workspace_role[])
  );
create policy "memberships_delete_admin"
  on public.workspace_memberships for delete to authenticated
  using (
    (
      public.has_workspace_role(workspace_id, array['superuser']::public.workspace_role[])
      or (
        role <> 'superuser'
        and public.has_workspace_role(workspace_id, array['admin']::public.workspace_role[])
      )
    )
    and user_id <> (select auth.uid())
  );

create policy "projects_select_member"
  on public.projects for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "projects_insert_non_investor"
  on public.projects for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_workspace_role(
      workspace_id, array['superuser','admin','staff','user']::public.workspace_role[]
    )
  );
create policy "projects_update_staff_admin"
  on public.projects for update to authenticated
  using (
    public.has_workspace_role(
      workspace_id, array['superuser','admin','staff']::public.workspace_role[]
    )
  )
  with check (
    public.has_workspace_role(
      workspace_id, array['superuser','admin','staff']::public.workspace_role[]
    )
  );

create policy "audit_logs_select_admin"
  on public.audit_logs for select to authenticated
  using (
    workspace_id is not null
    and public.has_workspace_role(
      workspace_id, array['superuser','admin']::public.workspace_role[]
    )
  );

grant usage on schema public to authenticated;
grant select on public.profiles, public.workspaces, public.workspace_memberships, public.projects to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (name) on public.workspaces to authenticated;
grant insert, delete on public.workspace_memberships to authenticated;
grant update (role) on public.workspace_memberships to authenticated;
grant insert on public.projects to authenticated;
grant update (name, description, status) on public.projects to authenticated;
grant select on public.audit_logs to authenticated;

revoke all on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;
