-- Compatibility roles for the migrated Supabase SQL history.
-- Neon Data API uses `authenticated` and `anonymous`; these legacy roles are
-- NOLOGIN placeholders only, so historical GRANT/REVOKE statements remain valid.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit nobypassrls;
  end if;
end
$$;
