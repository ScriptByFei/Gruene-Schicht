begin;

select plan(28);

select has_table('public', 'client_error_reports', 'client error report table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.client_error_reports'::regclass),
  'RLS is enabled on client error reports'
);
select results_eq(
  $$
    select count(*)::bigint from pg_policies
    where schemaname = 'public' and tablename = 'client_error_reports'
  $$,
  array[1::bigint],
  'client errors have an explicit deny-all RLS policy'
);
select ok(
  not has_table_privilege('authenticated', 'public.client_error_reports', 'SELECT'),
  'authenticated users cannot read raw client error reports'
);
select ok(
  not has_table_privilege('authenticated', 'public.client_error_reports', 'INSERT'),
  'authenticated users cannot forge raw client error reports'
);
select results_eq(
  $$
    select count(*)::bigint from pg_constraint
    where conrelid = 'public.client_error_reports'::regclass and contype = 'f'
  $$,
  array[2::bigint],
  'client error reports preserve organization and membership integrity'
);
select results_eq(
  $$
    select count(*)::bigint from pg_indexes
    where schemaname = 'public' and tablename = 'client_error_reports'
      and indexname in (
        'client_error_reports_pkey',
        'client_error_reports_org_created_idx',
        'client_error_reports_user_recent_idx',
        'client_error_reports_organization_user_idx'
      )
  $$,
  array[4::bigint],
  'monitoring query paths are indexed'
);

select has_function('public', 'export_my_data', array[]::text[], 'privacy export RPC exists');
select has_function('public', 'delete_my_account', array['text'], 'account deletion RPC exists');
select has_function('public', 'report_client_error', array['text', 'text'], 'client error RPC exists');
select has_function('public', 'get_beta_health', array['uuid'], 'beta health RPC exists');
select has_function('public', 'get_admin_event_overview', array['uuid'], 'admin event overview RPC exists');

select ok(
  has_function_privilege('authenticated', 'public.export_my_data()', 'EXECUTE'),
  'authenticated users may export their own data'
);
select ok(
  not has_function_privilege('anon', 'public.export_my_data()', 'EXECUTE'),
  'anonymous users cannot export account data'
);
select ok(
  has_function_privilege('authenticated', 'public.delete_my_account(text)', 'EXECUTE'),
  'authenticated users may request their own account deletion'
);
select ok(
  not has_function_privilege('anon', 'public.delete_my_account(text)', 'EXECUTE'),
  'anonymous users cannot delete accounts'
);
select ok(
  has_function_privilege('authenticated', 'public.report_client_error(text,text)', 'EXECUTE'),
  'authenticated members may submit sanitized error codes'
);
select ok(
  not has_function_privilege('anon', 'public.report_client_error(text,text)', 'EXECUTE'),
  'anonymous users cannot submit monitoring records'
);
select ok(
  has_function_privilege('authenticated', 'private.export_current_user_data()', 'EXECUTE'),
  'authenticated RPC wrapper may call the private export helper'
);
select ok(
  has_function_privilege('authenticated', 'private.delete_current_user_account(text)', 'EXECUTE'),
  'authenticated RPC wrapper may call the private deletion helper'
);
select ok(
  has_function_privilege('authenticated', 'private.record_client_error(text,text)', 'EXECUTE'),
  'authenticated RPC wrapper may call the private monitoring helper'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_proc
    where pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and proname in (
        'export_my_data',
        'export_current_user_data',
        'delete_my_account',
        'delete_current_user_account',
        'report_client_error',
        'record_client_error',
        'get_beta_health',
        'beta_health',
        'get_admin_event_overview',
        'admin_event_overview'
      )
      and (
        (pronamespace = 'private'::regnamespace and prosecdef = true)
        or (pronamespace = 'public'::regnamespace and prosecdef = false)
      )
      and proconfig @> array['search_path=""']
  $$,
  array[10::bigint],
  'Phase 6 exposes invoker wrappers and keeps definer helpers private'
);

select throws_ok(
  $$ select public.export_my_data() $$,
  'P0001',
  'authentication required',
  'privacy export requires authentication'
);
select throws_ok(
  $$ select public.delete_my_account('nobody@example.com') $$,
  'P0001',
  'authentication required',
  'account deletion requires authentication'
);
select throws_ok(
  $$ select public.report_client_error('invalid-code', '/dashboard') $$,
  'P0001',
  'authentication required',
  'monitoring requires authentication before accepting input'
);
select throws_ok(
  $$ select * from public.get_beta_health(uuid_generate_v4()) $$,
  'P0001',
  'organization admin required',
  'beta health requires an authenticated organization admin'
);
select throws_ok(
  $$ select * from public.get_admin_event_overview(uuid_generate_v4()) $$,
  'P0001',
  'organization admin required',
  'event overview requires an authenticated organization admin'
);

select results_eq(
  $$
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'client_error_reports'
      and column_name in ('error_code', 'route', 'organization_id', 'user_id', 'created_at')
  $$,
  array[5::bigint],
  'monitoring stores only the minimal fixed fields'
);

select * from finish();
rollback;
