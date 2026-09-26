-- The review RPC needs to read pending requests before a user becomes a member.
-- Run it with the migration owner's privileges, while enforcing admin identity
-- explicitly through private.is_organization_admin() inside the function.
alter function public.review_organization_access_request(uuid, boolean, uuid)
  security definer;

-- Cover the new composite foreign key when a shift group is changed or removed.
create index organization_access_requests_requested_group_idx
  on public.organization_access_requests(organization_id, requested_shift_group_id)
  where requested_shift_group_id is not null;
