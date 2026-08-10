-- Phase 4: absence and shift-swap requests with auditable approvals and calendar overrides.

create type public.shift_request_type as enum ('absence', 'swap');
create type public.shift_request_status as enum (
  'pending_target',
  'pending_admin',
  'approved',
  'rejected',
  'cancelled'
);
create type public.shift_override_kind as enum ('absence', 'swap');

create table public.shift_change_requests (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null,
  request_type public.shift_request_type not null,
  requester_date date not null,
  target_user_id uuid,
  target_date date,
  note text check (note is null or length(note) <= 500),
  status public.shift_request_status not null,
  target_responded_at timestamptz,
  target_response_note text check (
    target_response_note is null or length(target_response_note) <= 500
  ),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  admin_response_note text check (
    admin_response_note is null or length(admin_response_note) <= 500
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, requester_user_id)
    references public.organization_members(organization_id, user_id)
    on delete cascade,
  foreign key (organization_id, target_user_id)
    references public.organization_members(organization_id, user_id)
    on delete cascade,
  constraint shift_change_requests_shape_check check (
    (
      request_type = 'absence'
      and target_user_id is null
      and target_date is null
      and status <> 'pending_target'
    )
    or (
      request_type = 'swap'
      and target_user_id is not null
      and target_date is not null
      and requester_user_id <> target_user_id
    )
  )
);

create table public.shift_overrides (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  shift_date date not null,
  shift_symbol text not null check (shift_symbol in ('F', 'S', 'N', '-')),
  kind public.shift_override_kind not null,
  source_request_id uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, shift_date),
  foreign key (organization_id, user_id)
    references public.organization_members(organization_id, user_id)
    on delete cascade,
  foreign key (organization_id, source_request_id)
    references public.shift_change_requests(organization_id, id)
    on delete cascade
);

create index shift_change_requests_requester_idx
  on public.shift_change_requests(organization_id, requester_user_id, requester_date, status);
create index shift_change_requests_target_idx
  on public.shift_change_requests(organization_id, target_user_id, target_date, status)
  where target_user_id is not null;
create index shift_change_requests_review_queue_idx
  on public.shift_change_requests(organization_id, status, created_at);
create index shift_change_requests_reviewed_by_idx
  on public.shift_change_requests(reviewed_by)
  where reviewed_by is not null;
create index shift_overrides_source_request_idx
  on public.shift_overrides(organization_id, source_request_id);

create trigger shift_change_requests_updated_at
  before update on public.shift_change_requests
  for each row execute function public.update_updated_at();

alter table public.shift_change_requests enable row level security;
alter table public.shift_overrides enable row level security;

create policy shift_change_requests_read_participant_or_admin
  on public.shift_change_requests for select to authenticated
  using (
    requester_user_id = (select auth.uid())
    or target_user_id = (select auth.uid())
    or (select private.is_organization_admin(organization_id))
  );

create policy shift_overrides_read_owner_or_admin
  on public.shift_overrides for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_organization_admin(organization_id))
  );

revoke all on table public.shift_change_requests from anon, authenticated;
revoke all on table public.shift_overrides from anon, authenticated;
grant select on table public.shift_change_requests to authenticated;
grant select on table public.shift_overrides to authenticated;
grant all on table public.shift_change_requests to service_role;
grant all on table public.shift_overrides to service_role;

create or replace function private.base_shift_symbol(
  target_organization_id uuid,
  target_user_id uuid,
  target_date date
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select substr(
    shift_group.pattern,
    mod(
      mod(
        (target_date - shift_group.anchor_date),
        length(shift_group.pattern)
      ) + length(shift_group.pattern),
      length(shift_group.pattern)
    ) + 1,
    1
  )
  from public.organization_members as membership
  join public.shift_groups as shift_group
    on shift_group.organization_id = membership.organization_id
   and shift_group.id = membership.shift_group_id
  where membership.organization_id = target_organization_id
    and membership.user_id = target_user_id
    and membership.status = 'active';
$$;

revoke all on function private.base_shift_symbol(uuid, uuid, date)
  from public, anon, authenticated;

create or replace function private.has_shift_request_conflict(
  target_organization_id uuid,
  target_user_id uuid,
  target_date date,
  ignored_request_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shift_change_requests as request
    where request.organization_id = target_organization_id
      and request.id is distinct from ignored_request_id
      and request.status in ('pending_target', 'pending_admin', 'approved')
      and (
        (
          request.requester_user_id = target_user_id
          and request.requester_date = target_date
        )
        or (
          request.target_user_id = target_user_id
          and request.target_date = target_date
        )
      )
  );
$$;

revoke all on function private.has_shift_request_conflict(uuid, uuid, date, uuid)
  from public, anon, authenticated;

create or replace function private.create_shift_change_request(
  target_organization_id uuid,
  target_request_type public.shift_request_type,
  target_requester_date date,
  target_target_user_id uuid default null,
  target_target_date date default null,
  target_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_request_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  if target_requester_date < current_date then
    raise exception 'request date must not be in the past';
  end if;

  if length(coalesce(target_note, '')) > 500 then
    raise exception 'note must not exceed 500 characters';
  end if;

  if target_request_type = 'absence' then
    if target_target_user_id is not null or target_target_date is not null then
      raise exception 'absence request must not have a swap target';
    end if;
  elsif target_request_type = 'swap' then
    if target_target_user_id is null or target_target_date is null then
      raise exception 'swap target and date are required';
    end if;
    if target_target_user_id = current_user_id then
      raise exception 'cannot swap with yourself';
    end if;
    if target_target_date < current_date then
      raise exception 'target date must not be in the past';
    end if;
  else
    raise exception 'unsupported request type';
  end if;

  -- Lock involved memberships in a deterministic order. This serializes
  -- conflicting request creation and later approval without deadlocks.
  perform membership.user_id
  from public.organization_members as membership
  where membership.organization_id = target_organization_id
    and membership.user_id in (current_user_id, target_target_user_id)
  order by membership.user_id
  for update;

  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and membership.shift_group_id is not null
  ) then
    raise exception 'active membership with shift group required';
  end if;

  if target_request_type = 'swap' and not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_target_user_id
      and membership.status = 'active'
      and membership.shift_group_id is not null
  ) then
    raise exception 'swap target must be an active member with shift group';
  end if;

  if private.has_shift_request_conflict(
    target_organization_id,
    current_user_id,
    target_requester_date
  ) then
    raise exception 'a request or override already exists for your selected date';
  end if;

  if target_request_type = 'swap' and private.has_shift_request_conflict(
    target_organization_id,
    target_target_user_id,
    target_target_date
  ) then
    raise exception 'a request or override already exists for the target date';
  end if;

  insert into public.shift_change_requests (
    organization_id,
    requester_user_id,
    request_type,
    requester_date,
    target_user_id,
    target_date,
    note,
    status
  ) values (
    target_organization_id,
    current_user_id,
    target_request_type,
    target_requester_date,
    target_target_user_id,
    target_target_date,
    nullif(trim(target_note), ''),
    case
      when target_request_type = 'swap' then 'pending_target'::public.shift_request_status
      else 'pending_admin'::public.shift_request_status
    end
  )
  returning id into created_request_id;

  return created_request_id;
end;
$$;

revoke all on function private.create_shift_change_request(
  uuid, public.shift_request_type, date, uuid, date, text
) from public, anon;
grant execute on function private.create_shift_change_request(
  uuid, public.shift_request_type, date, uuid, date, text
) to authenticated;

create or replace function public.create_shift_change_request(
  p_organization_id uuid,
  p_request_type public.shift_request_type,
  p_requester_date date,
  p_target_user_id uuid default null,
  p_target_date date default null,
  p_note text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_shift_change_request(
    p_organization_id,
    p_request_type,
    p_requester_date,
    p_target_user_id,
    p_target_date,
    p_note
  );
$$;

revoke all on function public.create_shift_change_request(
  uuid, public.shift_request_type, date, uuid, date, text
) from public, anon;
grant execute on function public.create_shift_change_request(
  uuid, public.shift_request_type, date, uuid, date, text
) to authenticated;

create or replace function private.respond_to_shift_swap(
  target_request_id uuid,
  accept_request boolean,
  response_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_request public.shift_change_requests%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if length(coalesce(response_note, '')) > 500 then
    raise exception 'response note must not exceed 500 characters';
  end if;

  select request.* into target_request
  from public.shift_change_requests as request
  where request.id = target_request_id
  for update;

  if target_request.id is null then
    raise exception 'shift request not found';
  end if;
  if target_request.request_type <> 'swap' or target_request.status <> 'pending_target' then
    raise exception 'shift request is not waiting for target response';
  end if;
  if target_request.target_user_id <> current_user_id then
    raise exception 'only the requested colleague may respond';
  end if;

  update public.shift_change_requests
  set status = case
        when accept_request then 'pending_admin'::public.shift_request_status
        else 'rejected'::public.shift_request_status
      end,
      target_responded_at = now(),
      target_response_note = nullif(trim(response_note), '')
  where id = target_request_id;
end;
$$;

revoke all on function private.respond_to_shift_swap(uuid, boolean, text)
  from public, anon;
grant execute on function private.respond_to_shift_swap(uuid, boolean, text)
  to authenticated;

create or replace function public.respond_to_shift_swap(
  p_request_id uuid,
  p_accept boolean,
  p_note text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.respond_to_shift_swap(p_request_id, p_accept, p_note);
$$;

revoke all on function public.respond_to_shift_swap(uuid, boolean, text)
  from public, anon;
grant execute on function public.respond_to_shift_swap(uuid, boolean, text)
  to authenticated;

create or replace function private.review_shift_change_request(
  target_request_id uuid,
  approve_request boolean,
  response_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_request public.shift_change_requests%rowtype;
  requester_symbol text;
  target_symbol text;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if length(coalesce(response_note, '')) > 500 then
    raise exception 'response note must not exceed 500 characters';
  end if;

  select request.* into target_request
  from public.shift_change_requests as request
  where request.id = target_request_id
  for update;

  if target_request.id is null then
    raise exception 'shift request not found';
  end if;
  if not private.is_organization_admin(target_request.organization_id) then
    raise exception 'organization admin required';
  end if;
  if target_request.status <> 'pending_admin' then
    raise exception 'shift request is not waiting for admin review';
  end if;

  if approve_request then
    if target_request.requester_date < current_date
       or (target_request.target_date is not null and target_request.target_date < current_date) then
      raise exception 'past shifts cannot be approved';
    end if;

    perform membership.user_id
    from public.organization_members as membership
    where membership.organization_id = target_request.organization_id
      and membership.user_id in (
        target_request.requester_user_id,
        target_request.target_user_id
      )
      and membership.status = 'active'
      and membership.shift_group_id is not null
    order by membership.user_id
    for update;

    if not exists (
      select 1
      from public.organization_members as membership
      where membership.organization_id = target_request.organization_id
        and membership.user_id = target_request.requester_user_id
        and membership.status = 'active'
        and membership.shift_group_id is not null
    ) then
      raise exception 'requester no longer has an active shift assignment';
    end if;

    if target_request.request_type = 'absence' then
      insert into public.shift_overrides (
        organization_id, user_id, shift_date, shift_symbol, kind, source_request_id
      ) values (
        target_request.organization_id,
        target_request.requester_user_id,
        target_request.requester_date,
        '-',
        'absence',
        target_request.id
      );
    else
      if not exists (
        select 1
        from public.organization_members as membership
        where membership.organization_id = target_request.organization_id
          and membership.user_id = target_request.target_user_id
          and membership.status = 'active'
          and membership.shift_group_id is not null
      ) then
        raise exception 'target no longer has an active shift assignment';
      end if;

      requester_symbol := private.base_shift_symbol(
        target_request.organization_id,
        target_request.requester_user_id,
        target_request.requester_date
      );
      target_symbol := private.base_shift_symbol(
        target_request.organization_id,
        target_request.target_user_id,
        target_request.target_date
      );

      if requester_symbol is null or target_symbol is null then
        raise exception 'shift assignment could not be calculated';
      end if;

      insert into public.shift_overrides (
        organization_id, user_id, shift_date, shift_symbol, kind, source_request_id
      ) values
        (
          target_request.organization_id,
          target_request.requester_user_id,
          target_request.requester_date,
          target_symbol,
          'swap',
          target_request.id
        ),
        (
          target_request.organization_id,
          target_request.target_user_id,
          target_request.target_date,
          requester_symbol,
          'swap',
          target_request.id
        );
    end if;
  end if;

  update public.shift_change_requests
  set status = case
        when approve_request then 'approved'::public.shift_request_status
        else 'rejected'::public.shift_request_status
      end,
      reviewed_at = now(),
      reviewed_by = current_user_id,
      admin_response_note = nullif(trim(response_note), '')
  where id = target_request_id;
end;
$$;

revoke all on function private.review_shift_change_request(uuid, boolean, text)
  from public, anon;
grant execute on function private.review_shift_change_request(uuid, boolean, text)
  to authenticated;

create or replace function public.review_shift_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.review_shift_change_request(p_request_id, p_approve, p_note);
$$;

revoke all on function public.review_shift_change_request(uuid, boolean, text)
  from public, anon;
grant execute on function public.review_shift_change_request(uuid, boolean, text)
  to authenticated;

create or replace function private.cancel_shift_change_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_request public.shift_change_requests%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select request.* into target_request
  from public.shift_change_requests as request
  where request.id = target_request_id
  for update;

  if target_request.id is null then
    raise exception 'shift request not found';
  end if;
  if target_request.requester_user_id <> current_user_id then
    raise exception 'only the requester may cancel';
  end if;
  if target_request.status not in ('pending_target', 'pending_admin') then
    raise exception 'shift request can no longer be cancelled';
  end if;

  update public.shift_change_requests
  set status = 'cancelled'
  where id = target_request_id;
end;
$$;

revoke all on function private.cancel_shift_change_request(uuid) from public, anon;
grant execute on function private.cancel_shift_change_request(uuid) to authenticated;

create or replace function public.cancel_shift_change_request(p_request_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_shift_change_request(p_request_id);
$$;

revoke all on function public.cancel_shift_change_request(uuid) from public, anon;
grant execute on function public.cancel_shift_change_request(uuid) to authenticated;
