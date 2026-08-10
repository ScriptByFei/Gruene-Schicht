begin;

select plan(20);

select has_table('public', 'notifications', 'notification table exists');
select has_type('public', 'notification_type', 'notification type enum exists');

select results_eq(
  $$
    select count(*)::bigint
    from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel::text collate "C" in ('event', 'poll', 'shift_request', 'suggestion')
  $$,
  array[4::bigint],
  'notification types cover the collaborative workflows'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  'RLS is enabled on notifications'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
  $$,
  array[2::bigint],
  'notifications have owner-only read and update policies'
);

select ok(
  has_table_privilege('authenticated', 'public.notifications', 'SELECT'),
  'authenticated users may read notifications through RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.notifications', 'INSERT'),
  'authenticated users cannot forge notifications'
);
select ok(
  not has_table_privilege('authenticated', 'public.notifications', 'DELETE'),
  'authenticated users cannot delete the notification audit trail'
);
select ok(
  has_column_privilege('authenticated', 'public.notifications', 'read_at', 'UPDATE'),
  'authenticated users may mark their notifications as read'
);
select ok(
  not has_column_privilege('authenticated', 'public.notifications', 'title', 'UPDATE'),
  'authenticated users cannot edit notification content'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'f'
  $$,
  array[3::bigint],
  'notifications preserve organization, recipient and actor integrity'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'notifications'
      and indexname in (
        'notifications_user_created_idx',
        'notifications_user_unread_idx',
        'notifications_actor_user_idx',
        'notifications_organization_user_idx'
      )
  $$,
  array[4::bigint],
  'notification inbox and foreign-key query paths are indexed'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'events_notify_members',
        'polls_notify_members',
        'suggestions_notify_decision',
        'shift_requests_notify_participants'
      )
  $$,
  array[4::bigint],
  'collaborative changes create notifications at the database boundary'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'private.enqueue_notification(uuid,uuid,public.notification_type,text,text,text,uuid)'::regprocedure
      and prosecdef = true
  $$,
  array[1::bigint],
  'notification creation is a private security-definer helper'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.enqueue_notification(uuid,uuid,public.notification_type,text,text,text,uuid)',
    'EXECUTE'
  ),
  'authenticated users cannot call notification creation directly'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'private.event_attendee_roster(uuid)'::regprocedure
      and prosecdef = true
  $$,
  array[1::bigint],
  'attendee roster access is protected by a security-definer helper'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.get_event_attendee_roster(uuid)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'public attendee roster RPC remains security invoker'
);

select ok(
  has_function_privilege('authenticated', 'public.get_event_attendee_roster(uuid)', 'EXECUTE'),
  'authenticated users may request a roster for visible events'
);
select ok(
  not has_function_privilege('anon', 'public.get_event_attendee_roster(uuid)', 'EXECUTE'),
  'anonymous users cannot read event rosters'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where pronamespace = 'private'::regnamespace
      and proname in (
        'notify_event_change',
        'notify_new_poll',
        'notify_suggestion_decision',
        'notify_shift_request_change'
      )
      and prosecdef = true
      and proconfig @> array['search_path=""']
  $$,
  array[4::bigint],
  'all notification triggers use hardened empty search paths'
);

select * from finish();
rollback;
