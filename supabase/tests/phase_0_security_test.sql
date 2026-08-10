begin;
select plan(14);

select has_table('public', 'organizations', 'organizations table exists');
select has_table('public', 'organization_members', 'organization memberships exist');
select has_table('public', 'profile_directory', 'minimal profile directory exists');
select has_column('public', 'events', 'organization_id', 'events have a tenant key');
select col_not_null('public', 'events', 'organization_id', 'event tenant key is required');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'RLS is enabled on organizations'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organization_members'::regclass),
  'RLS is enabled on organization memberships'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'authenticated users cannot update their profile role'
);

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'),
  'authenticated users can update their display name'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_read_authenticated'
  $$,
  array[0::bigint],
  'the broad authenticated profile policy was removed'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.votes'::regclass
      and conname = 'votes_poll_option_match'
  $$,
  array[1::bigint],
  'votes must reference an option from the same poll'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where oid = 'public.replace_single_vote(uuid,uuid)'::regprocedure
      and prosecdef = false
  $$,
  array[1::bigint],
  'the public vote RPC runs with invoker permissions'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'handle_new_user'
  $$,
  array[0::bigint],
  'the privileged Auth trigger function is not exposed through public'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'handle_new_user'
      and procedure.prosecdef = true
  $$,
  array[1::bigint],
  'the Auth trigger function exists only in the private schema'
);

select * from finish();
rollback;
