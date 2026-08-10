-- Phase 2: controlled organization access requests and safe membership management.

create type public.access_request_status as enum ('pending', 'approved', 'rejected');

create table public.organization_access_requests (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.access_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_shift_group_id uuid,
  unique (organization_id, user_id),
  foreign key (organization_id, reviewed_shift_group_id)
    references public.shift_groups(organization_id, id)
    on delete set null (reviewed_shift_group_id)
);

create index organization_access_requests_org_status_idx
  on public.organization_access_requests(organization_id, status, requested_at);

alter table public.organization_access_requests enable row level security;

create policy organization_access_requests_read_own_or_admin
  on public.organization_access_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_organization_admin(organization_id))
  );

create policy organization_access_requests_update_admin
  on public.organization_access_requests for update to authenticated
  using ((select private.is_organization_admin(organization_id)))
  with check ((select private.is_organization_admin(organization_id)));

revoke all on table public.organization_access_requests from anon, authenticated;
grant select on table public.organization_access_requests to authenticated;
grant update (status, reviewed_at, reviewed_by, reviewed_shift_group_id)
  on table public.organization_access_requests to authenticated;
grant all on table public.organization_access_requests to service_role;

create or replace function private.request_organization_access(target_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_organization_id uuid;
  access_request_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select organization.id into target_organization_id
  from public.organizations as organization
  where organization.slug = lower(trim(target_slug));

  if target_organization_id is null then
    raise exception 'organization not found';
  end if;

  if exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
  ) then
    raise exception 'user already has active organization access';
  end if;

  insert into public.organization_access_requests (
    organization_id,
    user_id,
    status,
    requested_at,
    reviewed_at,
    reviewed_by,
    reviewed_shift_group_id
  )
  values (
    target_organization_id,
    current_user_id,
    'pending',
    now(),
    null,
    null,
    null
  )
  on conflict (organization_id, user_id) do update
  set status = 'pending',
      requested_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      reviewed_shift_group_id = null
  returning id into access_request_id;

  return access_request_id;
end;
$$;

revoke all on function private.request_organization_access(text) from public, anon;
grant execute on function private.request_organization_access(text) to authenticated;
grant execute on function private.request_organization_access(text) to service_role;

create or replace function public.request_organization_access(p_organization_slug text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.request_organization_access(p_organization_slug);
$$;

revoke all on function public.request_organization_access(text) from public, anon;
grant execute on function public.request_organization_access(text) to authenticated;
grant execute on function public.request_organization_access(text) to service_role;

create or replace function public.review_organization_access_request(
  p_request_id uuid,
  p_approve boolean,
  p_shift_group_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_request public.organization_access_requests%rowtype;
begin
  select request.* into target_request
  from public.organization_access_requests as request
  where request.id = p_request_id
  for update;

  if target_request.id is null then
    raise exception 'access request not found';
  end if;

  if not (select private.is_organization_admin(target_request.organization_id)) then
    raise exception 'organization admin required';
  end if;

  if target_request.status <> 'pending' then
    raise exception 'access request was already reviewed';
  end if;

  if p_approve then
    if p_shift_group_id is null then
      raise exception 'shift group is required for approval';
    end if;

    if not exists (
      select 1
      from public.shift_groups as shift_group
      where shift_group.id = p_shift_group_id
        and shift_group.organization_id = target_request.organization_id
    ) then
      raise exception 'shift group does not belong to organization';
    end if;

    insert into public.organization_members (
      organization_id,
      user_id,
      role,
      status,
      shift_group_id
    )
    values (
      target_request.organization_id,
      target_request.user_id,
      'employee',
      'active',
      p_shift_group_id
    )
    on conflict (organization_id, user_id) do update
    set role = 'employee',
        status = 'active',
        shift_group_id = excluded.shift_group_id;
  end if;

  update public.organization_access_requests
  set status = case
        when p_approve then 'approved'::public.access_request_status
        else 'rejected'::public.access_request_status
      end,
      reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      reviewed_shift_group_id = case when p_approve then p_shift_group_id else null end
  where id = p_request_id;
end;
$$;

revoke all on function public.review_organization_access_request(uuid, boolean, uuid)
  from public, anon;
grant execute on function public.review_organization_access_request(uuid, boolean, uuid)
  to authenticated;
grant execute on function public.review_organization_access_request(uuid, boolean, uuid)
  to service_role;

create or replace function private.can_manage_organization_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as own_membership
    join public.organization_members as target_membership
      on target_membership.organization_id = own_membership.organization_id
    where own_membership.user_id = (select auth.uid())
      and own_membership.role = 'admin'
      and own_membership.status = 'active'
      and target_membership.user_id = target_user_id
  ) or exists (
    select 1
    from public.organization_members as own_membership
    join public.organization_access_requests as access_request
      on access_request.organization_id = own_membership.organization_id
    where own_membership.user_id = (select auth.uid())
      and own_membership.role = 'admin'
      and own_membership.status = 'active'
      and access_request.user_id = target_user_id
  );
$$;

revoke all on function private.can_manage_organization_user(uuid) from public, anon;
grant execute on function private.can_manage_organization_user(uuid) to authenticated;
grant execute on function private.can_manage_organization_user(uuid) to service_role;

drop policy profile_directory_read_colleague on public.profile_directory;
create policy profile_directory_read_colleague
  on public.profile_directory for select to authenticated
  using (
    (select auth.uid()) = id
    or (select private.shares_organization(id))
    or (select private.can_manage_organization_user(id))
  );

create or replace function private.protect_organization_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removes_active_admin boolean;
begin
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
      raise exception 'membership identity cannot be changed';
    end if;

    removes_active_admin := old.role = 'admin'
      and old.status = 'active'
      and (new.role <> 'admin' or new.status <> 'active');
  else
    removes_active_admin := old.role = 'admin' and old.status = 'active';
  end if;

  if removes_active_admin and not exists (
    select 1
    from public.organization_members as other_admin
    where other_admin.organization_id = old.organization_id
      and other_admin.user_id <> old.user_id
      and other_admin.role = 'admin'
      and other_admin.status = 'active'
  ) then
    raise exception 'organization must keep at least one active admin';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_organization_admin() from public, anon, authenticated;

create trigger organization_members_protect_admin
  before update or delete on public.organization_members
  for each row execute function private.protect_organization_admin();
