-- Phase 0: tenant boundary, least-privilege grants, private role helpers,
-- database-enforced event rules, aggregate APIs, and vote integrity.

create type public.membership_status as enum ('active', 'disabled');

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug = lower(slug)),
  timezone text not null default 'Europe/Berlin',
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'employee',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

insert into public.organizations (name, slug)
values ('Grüne Schicht', 'gruene-schicht')
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, role, status)
select organization.id, profile.id, profile.role, 'active'
from public.organizations as organization
cross join public.profiles as profile
where organization.slug = 'gruene-schicht'
on conflict (organization_id, user_id) do nothing;

alter table public.events
  add column organization_id uuid references public.organizations(id) on delete restrict;

update public.events
set organization_id = (
  select id from public.organizations where slug = 'gruene-schicht'
)
where organization_id is null;

alter table public.events
  alter column organization_id set not null;

alter table public.profiles
  add constraint profiles_name_not_blank check (length(trim(name)) > 0) not valid;
alter table public.profiles
  add constraint profiles_display_name_not_blank check (length(trim(display_name)) > 0) not valid;
alter table public.events
  add constraint events_title_not_blank check (length(trim(title)) > 0) not valid;
alter table public.polls
  add constraint polls_title_not_blank check (length(trim(title)) > 0) not valid;
alter table public.poll_options
  add constraint poll_options_label_not_blank check (length(trim(label)) > 0) not valid;
alter table public.suggestions
  add constraint suggestions_text_not_blank check (length(trim(text)) > 0) not valid;

create index organization_members_user_id_idx
  on public.organization_members(user_id, status);
create index events_organization_status_created_idx
  on public.events(organization_id, status, created_at desc);
create index events_created_by_idx
  on public.events(created_by);
create index votes_poll_user_idx
  on public.votes(poll_id, user_id);
create index votes_option_id_idx
  on public.votes(option_id);
create index attendance_event_status_idx
  on public.event_attendance(event_id, status);
create index attendance_user_id_idx
  on public.event_attendance(user_id);
create index suggestions_event_status_idx
  on public.suggestions(event_id, status);
create index suggestions_user_id_idx
  on public.suggestions(user_id);

drop index if exists public.idx_votes_poll_id;
drop index if exists public.idx_attendance_event_id;
drop index if exists public.idx_suggestions_event_id;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function private.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'admin'
      and membership.status = 'active'
  );
$$;

create or replace function private.shares_organization(target_user_id uuid)
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
      and own_membership.status = 'active'
      and target_membership.user_id = target_user_id
      and target_membership.status = 'active'
  );
$$;

create or replace function private.can_read_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events as event
    join public.organization_members as membership
      on membership.organization_id = event.organization_id
    where event.id = target_event_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (event.status in ('active', 'closed') or membership.role = 'admin')
  );
$$;

create or replace function private.can_respond_to_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events as event
    join public.organization_members as membership
      on membership.organization_id = event.organization_id
    where event.id = target_event_id
      and event.status = 'active'
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

revoke all on function private.is_organization_member(uuid) from public, anon;
revoke all on function private.is_organization_admin(uuid) from public, anon;
revoke all on function private.shares_organization(uuid) from public, anon;
revoke all on function private.can_read_event(uuid) from public, anon;
revoke all on function private.can_respond_to_event(uuid) from public, anon;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;
grant execute on function private.shares_organization(uuid) to authenticated;
grant execute on function private.can_read_event(uuid) to authenticated;
grant execute on function private.can_respond_to_event(uuid) to authenticated;

create table public.profile_directory (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  shift_start_date text
);

insert into public.profile_directory (id, display_name, shift_start_date)
select id, display_name, shift_start_date from public.profiles
on conflict (id) do update
set display_name = excluded.display_name,
    shift_start_date = excluded.shift_start_date;

create or replace function private.sync_profile_directory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_directory (id, display_name, shift_start_date)
  values (new.id, new.display_name, new.shift_start_date)
  on conflict (id) do update
  set display_name = excluded.display_name,
      shift_start_date = excluded.shift_start_date;
  return new;
end;
$$;

revoke all on function private.sync_profile_directory() from public, anon, authenticated;

create trigger profiles_sync_directory
  after insert or update of display_name, shift_start_date on public.profiles
  for each row execute function private.sync_profile_directory();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profile_directory enable row level security;

drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_read_authenticated on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_read_admin on public.profiles;
drop policy if exists events_read_public on public.events;
drop policy if exists events_write_admin on public.events;
drop policy if exists polls_read on public.polls;
drop policy if exists polls_write_admin on public.polls;
drop policy if exists poll_options_read on public.poll_options;
drop policy if exists poll_options_write on public.poll_options;
drop policy if exists votes_read on public.votes;
drop policy if exists votes_insert_own on public.votes;
drop policy if exists votes_delete_own on public.votes;
drop policy if exists attendance_read on public.event_attendance;
drop policy if exists attendance_insert_own on public.event_attendance;
drop policy if exists attendance_update_own on public.event_attendance;
drop policy if exists attendance_delete_own on public.event_attendance;
drop policy if exists suggestions_read on public.suggestions;
drop policy if exists suggestions_insert_own on public.suggestions;
drop policy if exists suggestions_update_admin on public.suggestions;

drop function if exists public.is_admin();

create policy profiles_read_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy organizations_read_member
  on public.organizations for select to authenticated
  using ((select private.is_organization_member(id)));

create policy organization_members_read_member
  on public.organization_members for select to authenticated
  using ((select private.is_organization_member(organization_id)));

create policy organization_members_insert_admin
  on public.organization_members for insert to authenticated
  with check ((select private.is_organization_admin(organization_id)));

create policy organization_members_update_admin
  on public.organization_members for update to authenticated
  using ((select private.is_organization_admin(organization_id)))
  with check ((select private.is_organization_admin(organization_id)));

create policy organization_members_delete_admin
  on public.organization_members for delete to authenticated
  using ((select private.is_organization_admin(organization_id)));

create policy profile_directory_read_colleague
  on public.profile_directory for select to authenticated
  using (
    (select auth.uid()) = id
    or (select private.shares_organization(id))
  );

create policy events_read_member
  on public.events for select to authenticated
  using (
    (status in ('active', 'closed') and (select private.is_organization_member(organization_id)))
    or (select private.is_organization_admin(organization_id))
  );

create policy events_insert_admin
  on public.events for insert to authenticated
  with check (
    (select private.is_organization_admin(organization_id))
    and created_by = (select auth.uid())
  );

create policy events_update_admin
  on public.events for update to authenticated
  using ((select private.is_organization_admin(organization_id)))
  with check ((select private.is_organization_admin(organization_id)));

create policy events_delete_admin
  on public.events for delete to authenticated
  using ((select private.is_organization_admin(organization_id)));

create policy polls_read_with_event
  on public.polls for select to authenticated
  using ((select private.can_read_event(event_id)));

create policy polls_insert_admin
  on public.polls for insert to authenticated
  with check (
    exists (
      select 1 from public.events as event
      where event.id = event_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

create policy polls_update_admin
  on public.polls for update to authenticated
  using (
    exists (
      select 1 from public.events as event
      where event.id = event_id
        and (select private.is_organization_admin(event.organization_id))
    )
  )
  with check (
    exists (
      select 1 from public.events as event
      where event.id = event_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

create policy polls_delete_admin
  on public.polls for delete to authenticated
  using (
    exists (
      select 1 from public.events as event
      where event.id = event_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

create policy poll_options_read_with_poll
  on public.poll_options for select to authenticated
  using (
    exists (
      select 1 from public.polls as poll
      where poll.id = poll_id
        and (select private.can_read_event(poll.event_id))
    )
  );

create policy poll_options_write_admin
  on public.poll_options for all to authenticated
  using (
    exists (
      select 1
      from public.polls as poll
      join public.events as event on event.id = poll.event_id
      where poll.id = poll_id
        and (select private.is_organization_admin(event.organization_id))
    )
  )
  with check (
    exists (
      select 1
      from public.polls as poll
      join public.events as event on event.id = poll.event_id
      where poll.id = poll_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

create policy votes_read_own_or_admin
  on public.votes for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.polls as poll
      join public.events as event on event.id = poll.event_id
      where poll.id = poll_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

create policy votes_insert_own_open_poll
  on public.votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.polls as poll
      where poll.id = poll_id
        and poll.is_open
        and (select private.can_respond_to_event(poll.event_id))
    )
  );

create policy votes_delete_own_open_poll
  on public.votes for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.polls as poll
      where poll.id = poll_id
        and poll.is_open
        and (select private.can_respond_to_event(poll.event_id))
    )
  );

create policy attendance_read_own_or_admin
  on public.event_attendance for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events as event
      where event.id = event_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

create policy attendance_insert_own_active_event
  on public.event_attendance for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.can_respond_to_event(event_id))
  );

create policy attendance_update_own_active_event
  on public.event_attendance for update to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.can_respond_to_event(event_id))
  )
  with check (
    user_id = (select auth.uid())
    and (select private.can_respond_to_event(event_id))
  );

create policy attendance_delete_own_active_event
  on public.event_attendance for delete to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.can_respond_to_event(event_id))
  );

create policy suggestions_read_with_event
  on public.suggestions for select to authenticated
  using ((select private.can_read_event(event_id)));

create policy suggestions_insert_own_active_event
  on public.suggestions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.can_respond_to_event(event_id))
  );

create policy suggestions_update_admin
  on public.suggestions for update to authenticated
  using (
    exists (
      select 1 from public.events as event
      where event.id = event_id
        and (select private.is_organization_admin(event.organization_id))
    )
  )
  with check (
    exists (
      select 1 from public.events as event
      where event.id = event_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

alter table public.poll_options
  add constraint poll_options_poll_id_id_unique unique (poll_id, id);

alter table public.votes
  add constraint votes_poll_option_match
  foreign key (poll_id, option_id)
  references public.poll_options(poll_id, id)
  on delete cascade
  not valid;

create or replace function private.enforce_single_choice_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_poll_type public.poll_type;
begin
  select poll.type into selected_poll_type
  from public.polls as poll
  where poll.id = new.poll_id;

  if selected_poll_type = 'single_choice' and exists (
    select 1 from public.votes as vote
    where vote.poll_id = new.poll_id
      and vote.user_id = new.user_id
      and vote.id <> new.id
  ) then
    raise exception 'single-choice polls allow one option per user';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_single_choice_vote() from public, anon, authenticated;

create trigger votes_enforce_single_choice
  before insert or update on public.votes
  for each row execute function private.enforce_single_choice_vote();

create or replace function private.poll_results(target_poll_id uuid)
returns table (option_id uuid, vote_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select vote.option_id, count(*)::bigint
  from public.votes as vote
  join public.polls as poll on poll.id = vote.poll_id
  where vote.poll_id = target_poll_id
    and (select private.can_read_event(poll.event_id))
  group by vote.option_id;
$$;

create or replace function public.get_poll_results(p_poll_id uuid)
returns table (option_id uuid, vote_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.poll_results(p_poll_id);
$$;

create or replace function private.attendance_summary(target_event_id uuid)
returns table (attending bigint, maybe bigint, declined bigint, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where attendance.status = 'attending')::bigint,
    count(*) filter (where attendance.status = 'maybe')::bigint,
    count(*) filter (where attendance.status = 'declined')::bigint,
    count(*)::bigint
  from public.event_attendance as attendance
  where attendance.event_id = target_event_id
    and (select private.can_read_event(target_event_id));
$$;

create or replace function public.get_attendance_summary(p_event_id uuid)
returns table (attending bigint, maybe bigint, declined bigint, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.attendance_summary(p_event_id);
$$;

create or replace function public.replace_single_vote(p_poll_id uuid, p_option_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.polls
    where id = p_poll_id and type = 'single_choice'
  ) then
    raise exception 'poll is not a visible single-choice poll';
  end if;

  delete from public.votes
  where poll_id = p_poll_id and user_id = (select auth.uid());

  insert into public.votes (poll_id, option_id, user_id)
  values (p_poll_id, p_option_id, (select auth.uid()));
end;
$$;

create or replace function public.create_poll_with_options(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_type public.poll_type,
  p_option_labels text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_poll_id uuid;
begin
  if length(trim(p_title)) = 0 then
    raise exception 'poll title is required';
  end if;

  if coalesce(cardinality(p_option_labels), 0) < 2 then
    raise exception 'at least two poll options are required';
  end if;

  if exists (
    select 1 from unnest(p_option_labels) as option_label
    where length(trim(option_label)) = 0
  ) then
    raise exception 'poll options must not be empty';
  end if;

  insert into public.polls (event_id, title, description, type, is_open)
  values (p_event_id, trim(p_title), nullif(trim(p_description), ''), p_type, true)
  returning id into created_poll_id;

  insert into public.poll_options (poll_id, label)
  select created_poll_id, trim(option_label)
  from unnest(p_option_labels) as option_label;

  return created_poll_id;
end;
$$;

revoke all on function private.poll_results(uuid) from public, anon;
revoke all on function private.attendance_summary(uuid) from public, anon;
grant execute on function private.poll_results(uuid) to authenticated;
grant execute on function private.attendance_summary(uuid) to authenticated;
grant execute on function private.poll_results(uuid) to service_role;
grant execute on function private.attendance_summary(uuid) to service_role;

revoke all on function public.get_poll_results(uuid) from public, anon;
revoke all on function public.get_attendance_summary(uuid) from public, anon;
revoke all on function public.replace_single_vote(uuid, uuid) from public, anon;
revoke all on function public.create_poll_with_options(uuid, text, text, public.poll_type, text[]) from public, anon;
grant execute on function public.get_poll_results(uuid) to authenticated;
grant execute on function public.get_attendance_summary(uuid) to authenticated;
grant execute on function public.replace_single_vote(uuid, uuid) to authenticated;
grant execute on function public.create_poll_with_options(uuid, text, text, public.poll_type, text[]) to authenticated;

revoke update on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (name, display_name, shift_start_date) on table public.profiles to authenticated;

grant select on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select on table public.profile_directory to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.polls to authenticated;
grant select, insert, update, delete on table public.poll_options to authenticated;
grant select, insert, delete on table public.votes to authenticated;
grant select, insert, update, delete on table public.event_attendance to authenticated;
grant select, insert, update on table public.suggestions to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.organizations to service_role;
grant all on table public.organization_members to service_role;
grant all on table public.profile_directory to service_role;
grant all on table public.events to service_role;
grant all on table public.polls to service_role;
grant all on table public.poll_options to service_role;
grant all on table public.votes to service_role;
grant all on table public.event_attendance to service_role;
grant all on table public.suggestions to service_role;
grant execute on function public.get_poll_results(uuid) to service_role;
grant execute on function public.get_attendance_summary(uuid) to service_role;
grant execute on function public.replace_single_vote(uuid, uuid) to service_role;
grant execute on function public.create_poll_with_options(uuid, text, text, public.poll_type, text[]) to service_role;
