-- Verdent workspace invitations and membership lifecycle.
-- Requires 0001_initial_schema.sql and 0002_core_modules.sql.

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and char_length(email) between 3 and 254
  ),
  role public.workspace_role not null check (role in ('admin','staff','investor','user')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One pending invitation per workspace and email address.
create unique index workspace_invitations_pending_unique
  on public.workspace_invitations (workspace_id, lower(email))
  where status = 'pending';
create index workspace_invitations_workspace_created_idx
  on public.workspace_invitations (workspace_id, created_at desc);
create index workspace_invitations_token_idx
  on public.workspace_invitations (token) where status = 'pending';

create trigger workspace_invitations_set_updated_at
  before update on public.workspace_invitations
  for each row execute procedure public.set_updated_at();

-- Append-only audit history for invitation changes (created_by column matches
-- the audit_module_change actor fallback contract).
create trigger workspace_invitations_audit
  after insert or update or delete on public.workspace_invitations
  for each row execute procedure public.audit_module_change();

alter table public.workspace_invitations enable row level security;

create policy "invitations_select_admin_or_recipient"
  on public.workspace_invitations for select to authenticated
  using (
    public.has_workspace_role(workspace_id, array['superuser','admin']::public.workspace_role[])
    or exists (
      select 1 from auth.users u
      where u.id = (select auth.uid()) and lower(u.email) = lower(workspace_invitations.email)
    )
  );

create policy "invitations_insert_admin"
  on public.workspace_invitations for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_workspace_role(workspace_id, array['superuser','admin']::public.workspace_role[])
  );

create policy "invitations_update_admin"
  on public.workspace_invitations for update to authenticated
  using (
    public.has_workspace_role(workspace_id, array['superuser','admin']::public.workspace_role[])
  )
  with check (
    public.has_workspace_role(workspace_id, array['superuser','admin']::public.workspace_role[])
  );

-- Invitations are revoked via status update; rows are never deleted from clients.
revoke delete on public.workspace_invitations from authenticated;

grant select on public.workspace_invitations to authenticated;
grant insert (workspace_id, email, role, created_by) on public.workspace_invitations to authenticated;
grant update (status) on public.workspace_invitations to authenticated;

-- Invitation acceptance must run with elevated rights because the recipient is
-- not yet a member: the memberships_insert_admin RLS policy would otherwise
-- reject their insert. Validation happens here, server-side, not in the client.
create or replace function public.accept_workspace_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  invitation record;
  actor uuid := (select auth.uid());
  actor_email text;
begin
  if actor is null then
    raise exception 'Authentication required.';
  end if;

  select email into actor_email from auth.users where id = actor;
  if actor_email is null then
    raise exception 'Authenticated account has no email address.';
  end if;

  select * into invitation
    from public.workspace_invitations
    where token = p_token and status = 'pending'
    for update;

  if not found then
    raise exception 'Invitation not found or no longer pending.';
  end if;

  if invitation.expires_at < now() then
    update public.workspace_invitations
      set status = 'expired' where id = invitation.id;
    raise exception 'This invitation has expired.';
  end if;

  if lower(invitation.email) <> lower(actor_email) then
    raise exception 'This invitation was issued to a different email address.';
  end if;

  if not exists (
    select 1 from public.workspace_memberships
    where workspace_id = invitation.workspace_id and user_id = actor
  ) then
    insert into public.workspace_memberships (workspace_id, user_id, role)
    values (invitation.workspace_id, actor, invitation.role);
  end if;

  update public.workspace_invitations
    set status = 'accepted' where id = invitation.id;

  return invitation.workspace_id;
end;
$fn$;

revoke all on function public.accept_workspace_invitation(text) from public, anon;
grant execute on function public.accept_workspace_invitation(text) to authenticated;

-- Membership lifecycle guard: a workspace must always keep at least one
-- superuser or admin. Without this trigger an admin could demote or remove the
-- final privileged member and lock the workspace.
create or replace function public.guard_last_privileged_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' then
    if old.role in ('superuser','admin') then
      select count(*) into remaining
        from public.workspace_memberships m
        where m.workspace_id = old.workspace_id
          and m.id <> old.id
          and m.role in ('superuser','admin');
      if remaining = 0 then
        raise exception 'Cannot remove the last admin or superuser of a workspace.';
      end if;
    end if;
    return old;
  else
    if old.role in ('superuser','admin') and new.role not in ('superuser','admin') then
      select count(*) into remaining
        from public.workspace_memberships m
        where m.workspace_id = old.workspace_id
          and m.id <> old.id
          and m.role in ('superuser','admin');
      if remaining = 0 then
        raise exception 'Cannot demote the last admin or superuser of a workspace.';
      end if;
    end if;
    return new;
  end if;
end;
$fn$;

create trigger workspace_memberships_last_admin_guard
  before update of role or delete on public.workspace_memberships
  for each row execute procedure public.guard_last_privileged_member();
