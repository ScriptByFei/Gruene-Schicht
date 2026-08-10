import { supabase } from '../lib/supabase'
import type { AdminEventOverview, BetaHealth } from '../types'

export async function reportClientError(errorCode: string, route: string): Promise<void> {
  const { error } = await supabase.rpc('report_client_error', {
    p_error_code: errorCode,
    p_route: route.slice(0, 160),
  })
  if (error) throw error
}

export async function getBetaHealth(organizationId: string): Promise<BetaHealth> {
  const { data, error } = await supabase.rpc('get_beta_health', {
    p_organization_id: organizationId,
  })
  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('Keine Beta-Statusdaten verfügbar.')
  return {
    database_now: row.database_now,
    active_members: Number(row.active_members),
    active_events: Number(row.active_events),
    pending_access_requests: Number(row.pending_access_requests),
    pending_shift_requests: Number(row.pending_shift_requests),
    unread_notifications: Number(row.unread_notifications),
    client_errors_24h: Number(row.client_errors_24h),
    client_errors_7d: Number(row.client_errors_7d),
    last_client_error_at: row.last_client_error_at,
  }
}

export async function getAdminEventOverview(
  organizationId: string
): Promise<AdminEventOverview[]> {
  const { data, error } = await supabase.rpc('get_admin_event_overview', {
    p_organization_id: organizationId,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    event_id: row.event_id,
    poll_count: Number(row.poll_count),
    attending: Number(row.attending),
    maybe: Number(row.maybe),
    declined: Number(row.declined),
    pending_suggestions: Number(row.pending_suggestions),
  }))
}
