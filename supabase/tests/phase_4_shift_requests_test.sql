begin;

select plan(26);

select has_table('public', 'shift_change_requests', 'shift request table exists');
select has_table('public', 'shift_overrides', 'shift override table exists');
select has_type('public', 'shift_request_type', 'shift request type enum exists');
select has_type('public', 'shift_request_status', 'shift request status enum exists');
select has_type('public', 'shift_override_kind', 'shift override kind enum exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.shift_change_requests'::regclass),
  'RLS is enabled on shift requests'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.shift_overrides'::regclass),
  'RLS is enabled on shift overrides'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_change_requests'
  $$,
  array[1::bigint],
  'shift requests use one participant-or-admin read policy'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_overrides'
  $$,
  array[1::bigint],
  'shift overrides use one owner-or-admin read policy'
);

select ok(
  has_table_privilege('authenticated', 'public.shift_change_requests', 'SELECT'),
  'authenticated participants may read requests through RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.shift_change_requests', 'INSERT'),
  'authenticated users cannot bypass request creation RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.shift_change_requests', 'UPDATE'),
  'authenticated users cannot bypass request state transitions'
);
select ok(
  has_table_privilege('authenticated', 'public.shift_overrides', 'SELECT'),
  'authenticated owners may read overrides through RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.shift_overrides', 'INSERT'),
  'authenticated users cannot create approved overrides directly'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.shift_change_requests'::regclass
      and contype = 'f'
  $$,
  array[4::bigint],
  'shift requests retain organization, participant and reviewer integrity'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.shift_overrides'::regclass
      and contype = 'f'
  $$,
  array[3::bigint],
  'shift overrides retain organization, owner and source integrity'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'private.create_shift_change_request(uuid,public.shift_request_type,date,uuid,date,text)'::regprocedure
      and prosecdef = true
  $$,
  array[1::bigint],
  'request creation helper is private and security definer'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.create_shift_change_request(uuid,public.shift_request_type,date,uuid,date,text)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'public request creation RPC is security invoker'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.respond_to_shift_swap(uuid,boolean,text)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'target response RPC is security invoker'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.review_shift_change_request(uuid,boolean,text)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'admin review RPC is security invoker'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.cancel_shift_change_request(uuid)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'request cancellation RPC is security invoker'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_shift_change_request(uuid,public.shift_request_type,date,uuid,date,text)',
    'EXECUTE'
  ),
  'authenticated users may call request creation RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_shift_change_request(uuid,public.shift_request_type,date,uuid,date,text)',
    'EXECUTE'
  ),
  'anonymous users cannot create shift requests'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.review_shift_change_request(uuid,boolean,text)',
    'EXECUTE'
  ),
  'anonymous users cannot review shift requests'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_indexes
    where schemaname = 'public'
      and tablename in ('shift_change_requests', 'shift_overrides')
      and indexname in (
        'shift_change_requests_requester_idx',
        'shift_change_requests_target_idx',
        'shift_change_requests_review_queue_idx',
        'shift_change_requests_reviewed_by_idx',
        'shift_overrides_source_request_idx'
      )
  $$,
  array[5::bigint],
  'request and override query paths are indexed'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_trigger
    where tgrelid = 'public.shift_change_requests'::regclass
      and tgname = 'shift_change_requests_updated_at'
      and not tgisinternal
  $$,
  array[1::bigint],
  'request updates maintain their audit timestamp'
);

select * from finish();
rollback;
