import { client } from '../lib/neon'
import type {
  JoinableShiftGroup,
  OrganizationAccessRequest,
  OrganizationAccessRequestWithProfile,
} from '../types'

export async function getJoinableShiftGroups(): Promise<JoinableShiftGroup[]> {
  const { data, error } = await client.rpc('list_joinable_shift_groups')
  if (error) throw error
  return (data ?? []) as JoinableShiftGroup[]
}

export async function getMyAccessRequest(
  userId: string
): Promise<OrganizationAccessRequest | null> {
  const { data, error } = await client
    .from('organization_access_requests')
    .select('id, organization_id, user_id, requested_shift_group_id, status, requested_at, reviewed_at, reviewed_by, reviewed_shift_group_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as OrganizationAccessRequest | null
}

export async function requestShiftGroupJoin(shiftGroupId: string): Promise<void> {
  const { error } = await client.rpc('request_shift_group_join', {
    p_shift_group_id: shiftGroupId,
  })
  if (error) throw error
}

export async function getPendingAccessRequests(
  organizationId: string
): Promise<OrganizationAccessRequestWithProfile[]> {
  const { data: requests, error: requestError } = await client
    .from('organization_access_requests')
    .select('id, organization_id, user_id, requested_shift_group_id, status, requested_at, reviewed_at, reviewed_by, reviewed_shift_group_id')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('requested_at')
    .limit(100)

  if (requestError) throw requestError
  if (!requests?.length) return []

  const { data: profiles, error: profileError } = await client
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
  const { error } = await client.rpc('review_organization_access_request', {
    p_request_id: requestId,
    p_approve: approve,
    ...(shiftGroupId ? { p_shift_group_id: shiftGroupId } : {}),
  })
  if (error) throw error
}
