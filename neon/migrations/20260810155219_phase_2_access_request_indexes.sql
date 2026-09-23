-- Phase 2: cover access-request foreign keys for member and audit lookups.

create index organization_access_requests_user_id_idx
  on public.organization_access_requests(user_id);

create index organization_access_requests_reviewed_by_idx
  on public.organization_access_requests(reviewed_by);

create index organization_access_requests_reviewed_group_idx
  on public.organization_access_requests(organization_id, reviewed_shift_group_id);
