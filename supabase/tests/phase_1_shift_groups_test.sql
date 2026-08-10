begin;
select plan(13);

select has_table('public', 'shift_groups', 'shift groups table exists');
select has_column('public', 'organization_members', 'shift_group_id', 'memberships reference a shift group');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.shift_groups'::regclass),
  'RLS is enabled on shift groups'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.shift_groups
    where organization_id = (
      select id from public.organizations where slug = 'gruene-schicht'
    )
  $$,
  array[4::bigint],
  'the four existing groups were migrated'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_shift_group_fk'
  $$,
  array[1::bigint],
  'member assignments use the organization-scoped foreign key'
);

select matches(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_shift_group_fk'
  ),
  'ON DELETE SET NULL \(shift_group_id\)',
  'deleting a group clears only the assignment and preserves the organization membership'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'shift_start_date', 'UPDATE'),
  'members cannot change the legacy shift anchor themselves'
);

select ok(
  has_table_privilege('authenticated', 'public.shift_groups', 'SELECT'),
  'authenticated members can query visible shift groups'
);

select ok(
  has_table_privilege('authenticated', 'public.shift_groups', 'INSERT'),
  'authenticated admins can reach the insert policy'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_groups'
  $$,
  array[4::bigint],
  'shift groups have explicit read and admin write policies'
);

select results_eq(
  $$
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_directory'
      and column_name = 'shift_start_date'
  $$,
  array[0::bigint],
  'the colleague directory no longer exposes legacy shift anchors'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.shift_groups
    where pattern !~ '^[FSN-]+$'
       or length(pattern) not between 1 and 366
  $$,
  array[0::bigint],
  'all migrated patterns satisfy the database constraints'
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
  'the hardened Auth trigger remains private'
);

select * from finish();
rollback;
