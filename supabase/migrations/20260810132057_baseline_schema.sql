-- Baseline of the schema that was previously managed through supabase/schema.sql.
-- Existing hosted projects must mark this migration as applied after verifying
-- that their schema matches this baseline. Fresh local projects execute it.

create extension if not exists "uuid-ossp";

create type public.user_role as enum ('employee', 'admin');
create type public.event_status as enum ('draft', 'active', 'closed');
create type public.poll_type as enum ('single_choice', 'multiple_choice');
create type public.attendance_status as enum ('attending', 'maybe', 'declined');
create type public.suggestion_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  display_name text not null,
  shift_start_date text default null,
  role public.user_role not null default 'employee',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  status public.event_status not null default 'draft',
  final_location text,
  final_date text,
  final_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.polls (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  type public.poll_type not null default 'single_choice',
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, option_id, user_id)
);

create table public.event_attendance (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger event_attendance_updated_at
  before update on public.event_attendance
  for each row execute function public.update_updated_at();

create table public.suggestions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  status public.suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;
alter table public.event_attendance enable row level security;
alter table public.suggestions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy profiles_read_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_read_authenticated on public.profiles
  for select using (auth.uid() is not null);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_read_admin on public.profiles
  for select using (public.is_admin());

create policy events_read_public on public.events
  for select using (status in ('active', 'closed') or public.is_admin());
create policy events_write_admin on public.events
  for all using (public.is_admin()) with check (public.is_admin());

create policy polls_read on public.polls
  for select using (auth.uid() is not null);
create policy polls_write_admin on public.polls
  for all using (public.is_admin()) with check (public.is_admin());

create policy poll_options_read on public.poll_options
  for select using (auth.uid() is not null);
create policy poll_options_write on public.poll_options
  for all using (public.is_admin()) with check (public.is_admin());

create policy votes_read on public.votes
  for select using (auth.uid() is not null);
create policy votes_insert_own on public.votes
  for insert with check (auth.uid() = user_id);
create policy votes_delete_own on public.votes
  for delete using (auth.uid() = user_id);

create policy attendance_read on public.event_attendance
  for select using (auth.uid() is not null);
create policy attendance_insert_own on public.event_attendance
  for insert with check (auth.uid() = user_id);
create policy attendance_update_own on public.event_attendance
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy attendance_delete_own on public.event_attendance
  for delete using (auth.uid() = user_id);

create policy suggestions_read on public.suggestions
  for select using (auth.uid() is not null);
create policy suggestions_insert_own on public.suggestions
  for insert with check (auth.uid() = user_id);
create policy suggestions_update_admin on public.suggestions
  for update using (public.is_admin()) with check (public.is_admin());

create index idx_events_status on public.events(status);
create index idx_polls_event_id on public.polls(event_id);
create index idx_poll_options_poll_id on public.poll_options(poll_id);
create index idx_votes_poll_id on public.votes(poll_id);
create index idx_votes_user_id on public.votes(user_id);
create index idx_attendance_event_id on public.event_attendance(event_id);
create index idx_suggestions_event_id on public.suggestions(event_id);
