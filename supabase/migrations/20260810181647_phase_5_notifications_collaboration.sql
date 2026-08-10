-- Phase 5: private in-app notifications and a privacy-preserving event roster.

create type public.notification_type as enum (
  'event',
  'poll',
  'shift_request',
  'suggestion'
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  type public.notification_type not null,
  title text not null check (length(trim(title)) between 1 and 120),
  body text not null check (length(trim(body)) between 1 and 300),
  link text not null check (
    length(link) between 1 and 240
    and link like '/%'
    and link not like '//%'
  ),
  actor_user_id uuid references auth.users(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, user_id)
    references public.organization_members(organization_id, user_id)
    on delete cascade
);

create index notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;
create index notifications_actor_user_idx
  on public.notifications(actor_user_id)
  where actor_user_id is not null;

alter table public.notifications enable row level security;

create policy notifications_read_own
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_mark_own_read
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

create or replace function private.enqueue_notification(
  target_organization_id uuid,
  target_user_id uuid,
  target_type public.notification_type,
  target_title text,
  target_body text,
  target_link text,
  target_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_user_id
      and membership.status = 'active'
  ) then
    insert into public.notifications (
      organization_id,
      user_id,
      type,
      title,
      body,
      link,
      actor_user_id
    ) values (
      target_organization_id,
      target_user_id,
      target_type,
      left(trim(target_title), 120),
      left(trim(target_body), 300),
      target_link,
      target_actor_user_id
    );
  end if;
end;
$$;

revoke all on function private.enqueue_notification(
  uuid, uuid, public.notification_type, text, text, text, uuid
) from public, anon, authenticated;

create or replace function private.notify_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
  actor_id uuid := (select auth.uid());
  notification_title text;
  notification_body text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'active' then
      return new;
    end if;
    notification_title := 'Neues Event';
    notification_body := new.title || ' ist jetzt zur Planung freigegeben.';
  elsif old.status <> 'active' and new.status = 'active' then
    notification_title := 'Event freigegeben';
    notification_body := new.title || ' ist jetzt zur Planung freigegeben.';
  elsif old.status is distinct from new.status and new.status = 'closed' then
    notification_title := 'Event abgeschlossen';
    notification_body := new.title || ' wurde abgeschlossen.';
  elsif new.status in ('active', 'closed') and (
    old.title is distinct from new.title
    or old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at
    or old.final_location is distinct from new.final_location
    or old.final_note is distinct from new.final_note
  ) then
    notification_title := 'Event aktualisiert';
    notification_body := new.title || ': Termin oder Details wurden geändert.';
  else
    return new;
  end if;

  for recipient in
    select membership.user_id
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.status = 'active'
      and membership.user_id is distinct from actor_id
  loop
    perform private.enqueue_notification(
      new.organization_id,
      recipient.user_id,
      'event',
      notification_title,
      notification_body,
      '/events/' || new.id::text,
      actor_id
    );
  end loop;

  return new;
end;
$$;

revoke all on function private.notify_event_change()
  from public, anon, authenticated;

create trigger events_notify_members
  after insert or update of title, status, starts_at, ends_at, final_location, final_note
  on public.events
  for each row execute function private.notify_event_change();

create or replace function private.notify_new_poll()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.events%rowtype;
  recipient record;
  actor_id uuid := (select auth.uid());
begin
  select event.* into target_event
  from public.events as event
  where event.id = new.event_id;

  if target_event.status <> 'active' then
    return new;
  end if;

  for recipient in
    select membership.user_id
    from public.organization_members as membership
    where membership.organization_id = target_event.organization_id
      and membership.status = 'active'
      and membership.user_id is distinct from actor_id
  loop
    perform private.enqueue_notification(
      target_event.organization_id,
      recipient.user_id,
      'poll',
      'Neue Umfrage',
      new.title || ' wartet auf deine Stimme.',
      '/events/' || new.event_id::text,
      actor_id
    );
  end loop;

  return new;
end;
$$;

revoke all on function private.notify_new_poll()
  from public, anon, authenticated;

create trigger polls_notify_members
  after insert on public.polls
  for each row execute function private.notify_new_poll();

create or replace function private.notify_suggestion_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.events%rowtype;
  actor_id uuid := (select auth.uid());
begin
  if old.status = new.status or new.status = 'pending' then
    return new;
  end if;

  select event.* into target_event
  from public.events as event
  where event.id = new.event_id;

  perform private.enqueue_notification(
    target_event.organization_id,
    new.user_id,
    'suggestion',
    case when new.status = 'approved' then 'Vorschlag angenommen' else 'Vorschlag abgelehnt' end,
    'Zu ' || target_event.title || ' gibt es eine Entscheidung zu deinem Vorschlag.',
    '/events/' || new.event_id::text,
    actor_id
  );

  return new;
end;
$$;

revoke all on function private.notify_suggestion_decision()
  from public, anon, authenticated;

create trigger suggestions_notify_decision
  after update of status on public.suggestions
  for each row execute function private.notify_suggestion_decision();

create or replace function private.notify_shift_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  recipient record;
  request_label text := case
    when new.request_type = 'swap' then 'Schichttausch'
    else 'Abwesenheit'
  end;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending_target' then
      perform private.enqueue_notification(
        new.organization_id,
        new.target_user_id,
        'shift_request',
        'Neue Tauschanfrage',
        'Eine Tauschanfrage wartet auf deine Entscheidung.',
        '/requests',
        actor_id
      );
    elsif new.status = 'pending_admin' then
      for recipient in
        select membership.user_id
        from public.organization_members as membership
        where membership.organization_id = new.organization_id
          and membership.status = 'active'
          and membership.role = 'admin'
          and membership.user_id is distinct from actor_id
      loop
        perform private.enqueue_notification(
          new.organization_id,
          recipient.user_id,
          'shift_request',
          'Neuer Schichtantrag',
          request_label || ' wartet auf eine Admin-Entscheidung.',
          '/requests',
          actor_id
        );
      end loop;
    end if;
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if new.status = 'pending_admin' then
    perform private.enqueue_notification(
      new.organization_id,
      new.requester_user_id,
      'shift_request',
      'Tauschanfrage angenommen',
      'Dein Tausch wurde bestätigt und wartet nun auf die Admin-Freigabe.',
      '/requests',
      actor_id
    );
    for recipient in
      select membership.user_id
      from public.organization_members as membership
      where membership.organization_id = new.organization_id
        and membership.status = 'active'
        and membership.role = 'admin'
        and membership.user_id is distinct from actor_id
    loop
      perform private.enqueue_notification(
        new.organization_id,
        recipient.user_id,
        'shift_request',
        'Bestätigter Schichttausch',
        'Ein bestätigter Schichttausch wartet auf die Admin-Freigabe.',
        '/requests',
        actor_id
      );
    end loop;
  elsif new.status in ('approved', 'rejected') then
    perform private.enqueue_notification(
      new.organization_id,
      new.requester_user_id,
      'shift_request',
      case when new.status = 'approved' then request_label || ' genehmigt' else request_label || ' abgelehnt' end,
      case when new.status = 'approved' then 'Dein Antrag wurde genehmigt.' else 'Dein Antrag wurde abgelehnt.' end,
      '/requests',
      actor_id
    );
    if new.target_user_id is not null and new.target_user_id <> new.requester_user_id then
      perform private.enqueue_notification(
        new.organization_id,
        new.target_user_id,
        'shift_request',
        case when new.status = 'approved' then 'Schichttausch genehmigt' else 'Schichttausch abgelehnt' end,
        case when new.status = 'approved' then 'Euer Schichttausch wurde genehmigt.' else 'Euer Schichttausch wurde abgelehnt.' end,
        '/requests',
        actor_id
      );
    end if;
  elsif new.status = 'cancelled' and new.target_user_id is not null then
    perform private.enqueue_notification(
      new.organization_id,
      new.target_user_id,
      'shift_request',
      'Tauschanfrage zurückgezogen',
      'Eine Tauschanfrage an dich wurde zurückgezogen.',
      '/requests',
      actor_id
    );
  end if;

  return new;
end;
$$;

revoke all on function private.notify_shift_request_change()
  from public, anon, authenticated;

create trigger shift_requests_notify_participants
  after insert or update of status on public.shift_change_requests
  for each row execute function private.notify_shift_request_change();

create or replace function private.event_attendee_roster(target_event_id uuid)
returns table (
  user_id uuid,
  display_name text,
  status public.attendance_status,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    attendance.user_id,
    directory.display_name,
    attendance.status,
    attendance.updated_at
  from public.event_attendance as attendance
  join public.profile_directory as directory on directory.id = attendance.user_id
  where attendance.event_id = target_event_id
    and (select private.can_read_event(target_event_id))
  order by
    case attendance.status
      when 'attending' then 1
      when 'maybe' then 2
      else 3
    end,
    lower(directory.display_name);
$$;

revoke all on function private.event_attendee_roster(uuid) from public, anon;
grant execute on function private.event_attendee_roster(uuid) to authenticated;

create or replace function public.get_event_attendee_roster(p_event_id uuid)
returns table (
  user_id uuid,
  display_name text,
  status public.attendance_status,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.event_attendee_roster(p_event_id);
$$;

revoke all on function public.get_event_attendee_roster(uuid) from public, anon;
grant execute on function public.get_event_attendee_roster(uuid) to authenticated;
grant execute on function public.get_event_attendee_roster(uuid) to service_role;
