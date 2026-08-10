begin;

select plan(11);

select has_column('public', 'events', 'starts_at', 'events have a structured start time');
select has_column('public', 'events', 'ends_at', 'events have an optional end time');

select col_type_is(
  'public',
  'events',
  'starts_at',
  'timestamp with time zone',
  'event start times retain timezone information'
);

select col_type_is(
  'public',
  'events',
  'ends_at',
  'timestamp with time zone',
  'event end times retain timezone information'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_schedule_order'
      and contype = 'c'
  $$,
  array[1::bigint],
  'event schedules enforce a valid time range'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'events'
      and indexname = 'events_organization_starts_at_idx'
  $$,
  array[1::bigint],
  'scheduled event lookups have a covering index'
);

select ok(
  has_column_privilege('authenticated', 'public.events', 'starts_at', 'UPDATE'),
  'authenticated admins can update event start times through RLS'
);

select ok(
  has_column_privilege('authenticated', 'public.events', 'ends_at', 'UPDATE'),
  'authenticated admins can update event end times through RLS'
);

select lives_ok(
  $$
    insert into public.events (
      organization_id,
      title,
      status,
      starts_at,
      ends_at
    )
    select
      organization.id,
      'Phase 3 valid event',
      'draft',
      '2026-09-01 16:00:00+00'::timestamptz,
      '2026-09-01 18:00:00+00'::timestamptz
    from public.organizations as organization
    where organization.slug = 'gruene-schicht'
  $$,
  'valid event schedules are accepted'
);

select throws_ok(
  $$
    insert into public.events (
      organization_id,
      title,
      status,
      starts_at,
      ends_at
    )
    select
      organization.id,
      'Phase 3 invalid event',
      'draft',
      '2026-09-01 18:00:00+00'::timestamptz,
      '2026-09-01 16:00:00+00'::timestamptz
    from public.organizations as organization
    where organization.slug = 'gruene-schicht'
  $$,
  '23514',
  null,
  'event end times must be after their start times'
);

select throws_ok(
  $$
    insert into public.events (
      organization_id,
      title,
      status,
      ends_at
    )
    select
      organization.id,
      'Phase 3 event without start',
      'draft',
      '2026-09-01 18:00:00+00'::timestamptz
    from public.organizations as organization
    where organization.slug = 'gruene-schicht'
  $$,
  '23514',
  null,
  'event end times require a start time'
);

select * from finish();
rollback;
