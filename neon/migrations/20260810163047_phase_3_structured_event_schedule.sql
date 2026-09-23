-- Phase 3: structured event scheduling for calendar and shift-aware planning.

alter table public.events
  add column starts_at timestamptz,
  add column ends_at timestamptz;

alter table public.events
  add constraint events_schedule_order
  check (
    ends_at is null
    or (starts_at is not null and ends_at > starts_at)
  );

create index events_organization_starts_at_idx
  on public.events(organization_id, starts_at)
  where starts_at is not null;
