-- Phase 6 follow-up: keep elevated helpers outside the exposed API schema.

create index client_error_reports_organization_user_idx
  on public.client_error_reports(organization_id, user_id);

create policy client_error_reports_deny_direct_access
  on public.client_error_reports
  for all
  to authenticated
  using (false)
  with check (false);

alter function public.export_my_data() security invoker;
alter function public.delete_my_account(text) security invoker;
alter function public.report_client_error(text, text) security invoker;
alter function public.get_beta_health(uuid) security invoker;
alter function public.get_admin_event_overview(uuid) security invoker;

grant execute on function private.export_current_user_data() to authenticated;
grant execute on function private.delete_current_user_account(text) to authenticated;
grant execute on function private.record_client_error(text, text) to authenticated;
grant execute on function private.beta_health(uuid) to authenticated;
grant execute on function private.admin_event_overview(uuid) to authenticated;
