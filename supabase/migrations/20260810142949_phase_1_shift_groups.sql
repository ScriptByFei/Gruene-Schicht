-- Phase 1: organization-owned shift groups and authoritative member assignments.

create table public.shift_groups (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  anchor_date date not null,
  pattern text not null default 'FFFSSS-SSSNN-----FFFNNNN----'
    check (length(pattern) between 1 and 366 and pattern ~ '^[FSN-]+$'),
  color text not null default 'green'
    check (color in ('red', 'yellow', 'blue', 'green', 'purple', 'orange', 'gray')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, id)
);

create index shift_groups_organization_sort_idx
  on public.shift_groups(organization_id, sort_order, name);

insert into public.shift_groups (organization_id, name, anchor_date, color, sort_order)
select organization.id, seed.name, seed.anchor_date, seed.color, seed.sort_order
from public.organizations as organization
cross join (
  values
    ('Rote', '2026-04-27'::date, 'red', 10),
    ('Gelbe', '2026-04-13'::date, 'yellow', 20),
    ('Blaue', '2026-04-20'::date, 'blue', 30),
    ('Grüne', '2026-05-04'::date, 'green', 40)
) as seed(name, anchor_date, color, sort_order)
where organization.slug = 'gruene-schicht'
on conflict (organization_id, name) do nothing;

alter table public.organization_members
  add column shift_group_id uuid;

alter table public.organization_members
  add constraint organization_members_shift_group_fk
  foreign key (organization_id, shift_group_id)
  references public.shift_groups(organization_id, id)
  on delete set null (shift_group_id);

create index organization_members_shift_group_idx
  on public.organization_members(organization_id, shift_group_id)
  where shift_group_id is not null;

update public.organization_members as membership
set shift_group_id = shift_group.id
from public.profiles as profile
join public.shift_groups as shift_group
  on shift_group.anchor_date::text = profile.shift_start_date
where profile.id = membership.user_id
  and shift_group.organization_id = membership.organization_id
  and membership.shift_group_id is null;

alter table public.shift_groups enable row level security;

create policy shift_groups_read_member
  on public.shift_groups for select to authenticated
  using ((select private.is_organization_member(organization_id)));

create policy shift_groups_insert_admin
  on public.shift_groups for insert to authenticated
  with check ((select private.is_organization_admin(organization_id)));

create policy shift_groups_update_admin
  on public.shift_groups for update to authenticated
  using ((select private.is_organization_admin(organization_id)))
  with check ((select private.is_organization_admin(organization_id)));

create policy shift_groups_delete_admin
  on public.shift_groups for delete to authenticated
  using ((select private.is_organization_admin(organization_id)));

revoke all on table public.shift_groups from anon, authenticated;
grant select, insert, update, delete on table public.shift_groups to authenticated;
grant all on table public.shift_groups to service_role;

revoke update (shift_start_date) on table public.profiles from authenticated;

alter table public.profile_directory
  drop column shift_start_date;

create or replace function private.sync_profile_directory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_directory (id, display_name)
  values (new.id, new.display_name)
  on conflict (id) do update
  set display_name = excluded.display_name;
  return new;
end;
$$;

revoke all on function private.sync_profile_directory() from public, anon, authenticated;

drop trigger profiles_sync_directory on public.profiles;
create trigger profiles_sync_directory
  after insert or update of display_name on public.profiles
  for each row execute function private.sync_profile_directory();

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
    null,
    'employee'
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
