-- Phase 6: privacy controls, low-volume beta monitoring and egress guardrails.

create table public.client_error_reports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  error_code text not null check (
    length(error_code) between 1 and 80
    and error_code ~ '^[a-z0-9_]+$'
  ),
  route text not null check (
    length(route) between 1 and 160
    and route like '/%'
    and route not like '//%'
  ),
  created_at timestamptz not null default now(),
  foreign key (organization_id, user_id)
    references public.organization_members(organization_id, user_id)
    on delete cascade
);

create index client_error_reports_org_created_idx
  on public.client_error_reports(organization_id, created_at desc);
create index client_error_reports_user_recent_idx
  on public.client_error_reports(user_id, created_at desc);

alter table public.client_error_reports enable row level security;

revoke all on table public.client_error_reports from public, anon, authenticated;
grant all on table public.client_error_reports to service_role;

create or replace function private.export_current_user_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then
      null
    else jsonb_build_object(
      'exported_at', now(),
      'account', jsonb_build_object(
        'id', auth_user.id,
        'email', auth_user.email,
        'created_at', auth_user.created_at
      ),
      'profile', coalesce((
        select to_jsonb(profile)
        from public.profiles as profile
        where profile.id = (select auth.uid())
      ), '{}'::jsonb),
      'memberships', coalesce((
        select jsonb_agg(jsonb_build_object(
          'organization_id', membership.organization_id,
          'organization_name', organization.name,
          'role', membership.role,
          'status', membership.status,
          'joined_at', membership.joined_at,
          'shift_group', shift_group.name
        ) order by membership.joined_at)
        from public.organization_members as membership
        join public.organizations as organization on organization.id = membership.organization_id
        left join public.shift_groups as shift_group on shift_group.id = membership.shift_group_id
        where membership.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'access_requests', coalesce((
        select jsonb_agg(jsonb_build_object(
          'organization_id', request.organization_id,
          'status', request.status,
          'requested_at', request.requested_at,
          'reviewed_at', request.reviewed_at
        ) order by request.requested_at)
        from public.organization_access_requests as request
        where request.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'event_attendance', coalesce((
        select jsonb_agg(jsonb_build_object(
          'event_id', attendance.event_id,
          'event_title', event.title,
          'status', attendance.status,
          'updated_at', attendance.updated_at
        ) order by attendance.updated_at)
        from public.event_attendance as attendance
        join public.events as event on event.id = attendance.event_id
        where attendance.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'votes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'poll_id', vote.poll_id,
          'poll_title', poll.title,
          'option', option.label,
          'created_at', vote.created_at
        ) order by vote.created_at)
        from public.votes as vote
        join public.polls as poll on poll.id = vote.poll_id
        join public.poll_options as option on option.id = vote.option_id
        where vote.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'suggestions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'event_id', suggestion.event_id,
          'event_title', event.title,
          'text', suggestion.text,
          'status', suggestion.status,
          'created_at', suggestion.created_at
        ) order by suggestion.created_at)
        from public.suggestions as suggestion
        join public.events as event on event.id = suggestion.event_id
        where suggestion.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'shift_requests_created', coalesce((
        select jsonb_agg(jsonb_build_object(
          'request_type', request.request_type,
          'requester_date', request.requester_date,
          'target_date', request.target_date,
          'note', request.note,
          'status', request.status,
          'created_at', request.created_at,
          'updated_at', request.updated_at
        ) order by request.created_at)
        from public.shift_change_requests as request
        where request.requester_user_id = (select auth.uid())
      ), '[]'::jsonb),
      'shift_requests_received', coalesce((
        select jsonb_agg(jsonb_build_object(
          'request_type', request.request_type,
          'requester_date', request.requester_date,
          'target_date', request.target_date,
          'status', request.status,
          'created_at', request.created_at,
          'updated_at', request.updated_at
        ) order by request.created_at)
        from public.shift_change_requests as request
        where request.target_user_id = (select auth.uid())
      ), '[]'::jsonb),
      'shift_overrides', coalesce((
        select jsonb_agg(jsonb_build_object(
          'shift_date', override.shift_date,
          'shift_symbol', override.shift_symbol,
          'kind', override.kind,
          'created_at', override.created_at
        ) order by override.shift_date)
        from public.shift_overrides as override
        where override.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'notifications', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', notification.type,
          'title', notification.title,
          'body', notification.body,
          'link', notification.link,
          'read_at', notification.read_at,
          'created_at', notification.created_at
        ) order by notification.created_at)
        from public.notifications as notification
        where notification.user_id = (select auth.uid())
      ), '[]'::jsonb)
    )
  end
  from auth.users as auth_user
  where auth_user.id = (select auth.uid());
$$;

revoke all on function private.export_current_user_data() from public, anon, authenticated;
grant execute on function private.export_current_user_data() to service_role;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;
  result := private.export_current_user_data();
  if result is null then
    raise exception 'account not found';
  end if;
  return result;
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.export_my_data() to service_role;

create or replace function private.delete_current_user_account(expected_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select lower(trim(auth_user.email)) into current_email
  from auth.users as auth_user
  where auth_user.id = current_user_id;

  if current_email is null or current_email <> lower(trim(expected_email)) then
    raise exception 'email confirmation does not match';
  end if;

  if exists (
    select 1
    from public.organization_members as membership
    where membership.user_id = current_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
      and not exists (
        select 1
        from public.organization_members as other_admin
        where other_admin.organization_id = membership.organization_id
          and other_admin.user_id <> current_user_id
          and other_admin.role = 'admin'
          and other_admin.status = 'active'
      )
  ) then
    raise exception 'last organization admin cannot delete account';
  end if;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function private.delete_current_user_account(text) from public, anon, authenticated;
grant execute on function private.delete_current_user_account(text) to service_role;

create or replace function public.delete_my_account(p_expected_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;
  perform private.delete_current_user_account(p_expected_email);
end;
$$;

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
grant execute on function public.delete_my_account(text) to service_role;

create or replace function private.record_client_error(target_error_code text, target_route text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select membership.organization_id into current_organization_id
  from public.organization_members as membership
  where membership.user_id = current_user_id
    and membership.status = 'active'
  order by membership.joined_at
  limit 1;

  if current_organization_id is null then
    raise exception 'active membership required';
  end if;

  if (
    select count(*)
    from public.client_error_reports as report
    where report.user_id = current_user_id
      and report.created_at >= now() - interval '1 hour'
  ) >= 10 then
    return;
  end if;

  delete from public.client_error_reports
  where created_at < now() - interval '30 days';

  insert into public.client_error_reports (organization_id, user_id, error_code, route)
  values (current_organization_id, current_user_id, target_error_code, target_route);
end;
$$;

revoke all on function private.record_client_error(text, text) from public, anon, authenticated;
grant execute on function private.record_client_error(text, text) to service_role;

create or replace function public.report_client_error(p_error_code text, p_route text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;
  if p_error_code is null or p_error_code !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid error code';
  end if;
  if p_route is null or length(p_route) > 160 or p_route not like '/%' or p_route like '//%' then
    raise exception 'invalid route';
  end if;
  perform private.record_client_error(p_error_code, p_route);
end;
$$;

revoke all on function public.report_client_error(text, text) from public, anon;
grant execute on function public.report_client_error(text, text) to authenticated;
grant execute on function public.report_client_error(text, text) to service_role;

create or replace function private.beta_health(target_organization_id uuid)
returns table (
  database_now timestamptz,
  active_members bigint,
  active_events bigint,
  pending_access_requests bigint,
  pending_shift_requests bigint,
  unread_notifications bigint,
  client_errors_24h bigint,
  client_errors_7d bigint,
  last_client_error_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    now(),
    (select count(*) from public.organization_members where organization_id = target_organization_id and status = 'active'),
    (select count(*) from public.events where organization_id = target_organization_id and status = 'active'),
    (select count(*) from public.organization_access_requests where organization_id = target_organization_id and status = 'pending'),
    (select count(*) from public.shift_change_requests where organization_id = target_organization_id and status in ('pending_target', 'pending_admin')),
    (select count(*) from public.notifications where organization_id = target_organization_id and read_at is null),
    (select count(*) from public.client_error_reports where organization_id = target_organization_id and created_at >= now() - interval '24 hours'),
    (select count(*) from public.client_error_reports where organization_id = target_organization_id and created_at >= now() - interval '7 days'),
    (select max(created_at) from public.client_error_reports where organization_id = target_organization_id)
  where (select auth.uid()) is not null
    and (select private.is_organization_admin(target_organization_id));
$$;

revoke all on function private.beta_health(uuid) from public, anon, authenticated;
grant execute on function private.beta_health(uuid) to service_role;

create or replace function public.get_beta_health(p_organization_id uuid)
returns table (
  database_now timestamptz,
  active_members bigint,
  active_events bigint,
  pending_access_requests bigint,
  pending_shift_requests bigint,
  unread_notifications bigint,
  client_errors_24h bigint,
  client_errors_7d bigint,
  last_client_error_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not (select private.is_organization_admin(p_organization_id)) then
    raise exception 'organization admin required';
  end if;
  return query select * from private.beta_health(p_organization_id);
end;
$$;

revoke all on function public.get_beta_health(uuid) from public, anon;
grant execute on function public.get_beta_health(uuid) to authenticated;
grant execute on function public.get_beta_health(uuid) to service_role;

create or replace function private.admin_event_overview(target_organization_id uuid)
returns table (
  event_id uuid,
  poll_count bigint,
  attending bigint,
  maybe bigint,
  declined bigint,
  pending_suggestions bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    event.id,
    (select count(*) from public.polls where event_id = event.id),
    (select count(*) from public.event_attendance where event_id = event.id and status = 'attending'),
    (select count(*) from public.event_attendance where event_id = event.id and status = 'maybe'),
    (select count(*) from public.event_attendance where event_id = event.id and status = 'declined'),
    (select count(*) from public.suggestions where event_id = event.id and status = 'pending')
  from public.events as event
  where event.organization_id = target_organization_id
    and (select auth.uid()) is not null
    and (select private.is_organization_admin(target_organization_id))
  order by event.created_at desc
  limit 50;
$$;

revoke all on function private.admin_event_overview(uuid) from public, anon, authenticated;
grant execute on function private.admin_event_overview(uuid) to service_role;

create or replace function public.get_admin_event_overview(p_organization_id uuid)
returns table (
  event_id uuid,
  poll_count bigint,
  attending bigint,
  maybe bigint,
  declined bigint,
  pending_suggestions bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not (select private.is_organization_admin(p_organization_id)) then
    raise exception 'organization admin required';
  end if;
  return query select * from private.admin_event_overview(p_organization_id);
end;
$$;

revoke all on function public.get_admin_event_overview(uuid) from public, anon;
grant execute on function public.get_admin_event_overview(uuid) to authenticated;
grant execute on function public.get_admin_event_overview(uuid) to service_role;

-- Existing notifications are intentionally not deleted by this migration.
-- The client only retrieves the newest 50 entries. A destructive retention job
-- can be enabled later after the beta operator approves the retention period.
