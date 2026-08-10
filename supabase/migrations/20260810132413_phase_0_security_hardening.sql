-- Keep the Auth trigger outside exposed API schemas and remove overlapping
-- permissive SELECT policies reported by the Supabase advisors.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, display_name, shift_start_date, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'shift_start_date', ''),
    'employee'
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop function public.handle_new_user();

drop policy if exists poll_options_write_admin on public.poll_options;

create policy poll_options_insert_admin
  on public.poll_options for insert to authenticated
  with check (
    exists (
      select 1
      from public.polls as poll
      join public.events as event on event.id = poll.event_id
      where poll.id = poll_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );

create policy poll_options_update_admin
  on public.poll_options for update to authenticated
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

create policy poll_options_delete_admin
  on public.poll_options for delete to authenticated
  using (
    exists (
      select 1
      from public.polls as poll
      join public.events as event on event.id = poll.event_id
      where poll.id = poll_id
        and (select private.is_organization_admin(event.organization_id))
    )
  );
