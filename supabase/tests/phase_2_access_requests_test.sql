begin;
select plan(17);

select has_table('public', 'organization_access_requests', 'access requests table exists');
select has_type('public', 'access_request_status', 'access request status enum exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organization_access_requests'::regclass),
  'RLS is enabled on access requests'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_access_requests'
  $$,
  array[2::bigint],
  'access requests have combined read and admin update policies'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_access_requests', 'INSERT'),
  'authenticated users cannot bypass the request RPC with direct inserts'
);

select ok(
  has_table_privilege('authenticated', 'public.organization_access_requests', 'SELECT'),
  'authenticated users can read requests allowed by RLS'
);

select ok(
  has_column_privilege('authenticated', 'public.organization_access_requests', 'status', 'UPDATE'),
  'admins can update review status through the invoker RPC'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'private.request_organization_access(text)'::regprocedure
      and prosecdef = true
  $$,
  array[1::bigint],
  'the organization lookup helper is private and security definer'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.request_organization_access(text)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'the public request RPC is security invoker'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.review_organization_access_request(uuid,boolean,uuid)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'the review RPC is security invoker'
);

select ok(
  not has_function_privilege('anon', 'public.request_organization_access(text)', 'EXECUTE'),
  'anonymous users cannot request organization access'
);

select ok(
  has_function_privilege('authenticated', 'public.request_organization_access(text)', 'EXECUTE'),
  'authenticated users can request organization access'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.review_organization_access_request(uuid,boolean,uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot review access requests'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_trigger
    where tgrelid = 'public.organization_members'::regclass
      and tgname = 'organization_members_protect_admin'
      and not tgisinternal
  $$,
  array[1::bigint],
  'organization memberships protect the last active admin'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'private.protect_organization_admin()'::regprocedure
      and prosecdef = true
  $$,
  array[1::bigint],
  'the last-admin guard can inspect all memberships'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_directory'
      and policyname = 'profile_directory_read_colleague'
  $$,
  array[1::bigint],
  'profile directory keeps one combined visibility policy'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.organization_access_requests'::regclass
      and contype = 'f'
  $$,
  array[4::bigint],
  'access requests retain organization, user, reviewer and group integrity'
);

select * from finish();
rollback;
