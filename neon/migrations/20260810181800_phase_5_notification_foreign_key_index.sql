-- Cover both the organization foreign key and the composite recipient foreign key.
create index notifications_organization_user_idx
  on public.notifications(organization_id, user_id);
