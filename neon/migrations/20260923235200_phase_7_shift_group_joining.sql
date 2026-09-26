-- Let authenticated beta users request one of the four shift groups.
-- A request never changes membership until an organization admin approves it.

alter table public.organization_access_requests
  add column requested_shift_group_id uuid;

alter table public.organization_access_requests
  add constraint organization_access_requests_requested_shift_group_fk
  foreign key (organization_id, requested_shift_group_id)
  references public.shift_groups(organization_id, id)
  on delete set null (requested_shift_group_id);

create or replace function public.list_joinable_shift_groups()
returns table (
  id uuid,
  name text,
  anchor_date date,
  pattern text,
  color text,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select shift_group.id,
         shift_group.name,
         shift_group.anchor_date,
         shift_group.pattern,
         shift_group.color,
         shift_group.sort_order
  from public.shift_groups as shift_group
  join public.organizations as organization
    on organization.id = shift_group.organization_id
  where (select auth.uid()) is not null
    and organization.slug = 'gruene-schicht'
  order by shift_group.sort_order, shift_group.name;
$$;

revoke all on function public.list_joinable_shift_groups() from public, anon;
grant execute on function public.list_joinable_shift_groups() to authenticated;

create or replace function public.request_shift_group_join(p_shift_group_id uuid)
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

  select shift_group.organization_id into target_organization_id
  from public.shift_groups as shift_group
  join public.organizations as organization
    on organization.id = shift_group.organization_id
  where shift_group.id = p_shift_group_id
    and organization.slug = 'gruene-schicht';

  if target_organization_id is null then
    raise exception 'shift group not found';
  end if;

  if exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and membership.shift_group_id is not null
  ) then
    raise exception 'user already has a shift group';
  end if;

  insert into public.organization_access_requests (
    organization_id,
    user_id,
    requested_shift_group_id,
    status,
    requested_at,
    reviewed_at,
    reviewed_by,
    reviewed_shift_group_id
  ) values (
    target_organization_id,
    current_user_id,
    p_shift_group_id,
    'pending',
    now(),
    null,
    null,
    null
  )
  on conflict (organization_id, user_id) do update
  set requested_shift_group_id = excluded.requested_shift_group_id,
      status = 'pending',
      requested_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      reviewed_shift_group_id = null
  returning id into access_request_id;

  -- Approval can race with a preference change. Recheck after the upsert's
  -- row lock so an already approved membership cannot leave a stale request.
  if exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and membership.shift_group_id is not null
  ) then
    raise exception 'user already has a shift group';
  end if;

  return access_request_id;
end;
$$;

revoke all on function public.request_shift_group_join(uuid) from public, anon;
grant execute on function public.request_shift_group_join(uuid) to authenticated;

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
  approved_group_id uuid;
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
    approved_group_id := coalesce(p_shift_group_id, target_request.requested_shift_group_id);
    if approved_group_id is null then
      raise exception 'shift group is required for approval';
    end if;

    if not exists (
      select 1
      from public.shift_groups as shift_group
      where shift_group.id = approved_group_id
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
    ) values (
      target_request.organization_id,
      target_request.user_id,
      'employee',
      'active',
      approved_group_id
    )
    on conflict (organization_id, user_id) do update
    set status = 'active',
        shift_group_id = excluded.shift_group_id;
  end if;

  update public.organization_access_requests
  set status = case
        when p_approve then 'approved'::public.access_request_status
        else 'rejected'::public.access_request_status
      end,
      reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      reviewed_shift_group_id = case when p_approve then approved_group_id else null end
  where id = p_request_id;
end;
$$;
