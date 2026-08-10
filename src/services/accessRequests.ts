import { supabase } from '../lib/supabase'
import type {
  OrganizationAccessRequest,
  OrganizationAccessRequestWithProfile,
} from '../types'

export async function getMyAccessRequest(
  userId: string
): Promise<OrganizationAccessRequest | null> {
  const { data, error } = await supabase
    .from('organization_access_requests')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as OrganizationAccessRequest | null
}

export async function requestOrganizationAccess(): Promise<void> {
  const { error } = await supabase.rpc('request_organization_access', {
    p_organization_slug: 'gruene-schicht',
  })
  if (error) throw error
}

export async function getPendingAccessRequests(
  organizationId: string
): Promise<OrganizationAccessRequestWithProfile[]> {
  const { data: requests, error: requestError } = await supabase
    .from('organization_access_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('requested_at')

  if (requestError) throw requestError
  if (!requests?.length) return []

  const { data: profiles, error: profileError } = await supabase
    .from('profile_directory')
    .select('id, display_name')
    .in('id', requests.map((request) => request.user_id))

  if (profileError) throw profileError
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]))

  return requests.map((request) => ({
    ...request,
    display_name: names.get(request.user_id) ?? 'Unbekanntes Konto',
  })) as OrganizationAccessRequestWithProfile[]
}

export async function reviewAccessRequest(
  requestId: string,
  approve: boolean,
  shiftGroupId?: string
): Promise<void> {
  const { error } = await supabase.rpc('review_organization_access_request', {
    p_request_id: requestId,
    p_approve: approve,
    ...(shiftGroupId ? { p_shift_group_id: shiftGroupId } : {}),
  })
  if (error) throw error
}
