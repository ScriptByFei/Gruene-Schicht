import { supabase } from '../lib/supabase'
import type {
  ShiftChangeRequest,
  ShiftChangeRequestWithProfiles,
  ShiftOverride,
  ShiftRequestType,
} from '../types'

export interface CreateShiftRequestInput {
  organizationId: string
  requestType: ShiftRequestType
  requesterDate: string
  targetUserId?: string
  targetDate?: string
  note?: string
}

export async function getShiftChangeRequests(
  organizationId: string
): Promise<ShiftChangeRequestWithProfiles[]> {
  const { data, error } = await supabase
    .from('shift_change_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  const requests = (data ?? []) as ShiftChangeRequest[]
  if (requests.length === 0) return []

  const profileIds = Array.from(new Set(requests.flatMap((request) => [
    request.requester_user_id,
    request.target_user_id,
    request.reviewed_by,
  ]).filter((id): id is string => Boolean(id))))

  const { data: profiles, error: profileError } = await supabase
    .from('profile_directory')
    .select('id, display_name')
    .in('id', profileIds)

  if (profileError) throw profileError
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]))

  return requests.map((request) => ({
    ...request,
    requester_name: names.get(request.requester_user_id) ?? 'Unbekanntes Konto',
    target_name: request.target_user_id
      ? names.get(request.target_user_id) ?? 'Unbekanntes Konto'
      : null,
    reviewer_name: request.reviewed_by
      ? names.get(request.reviewed_by) ?? 'Unbekanntes Konto'
      : null,
  }))
}

export async function getShiftOverrides(
  organizationId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<ShiftOverride[]> {
  const { data, error } = await supabase
    .from('shift_overrides')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date')

  if (error) throw error
  return (data ?? []) as ShiftOverride[]
}

export async function createShiftChangeRequest(input: CreateShiftRequestInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_shift_change_request', {
    p_organization_id: input.organizationId,
    p_request_type: input.requestType,
    p_requester_date: input.requesterDate,
    p_target_user_id: input.targetUserId,
    p_target_date: input.targetDate,
    p_note: input.note || undefined,
  })

  if (error) throw error
  return data
}

export async function respondToShiftSwap(
  requestId: string,
  accept: boolean,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc('respond_to_shift_swap', {
    p_request_id: requestId,
    p_accept: accept,
    p_note: note || undefined,
  })
  if (error) throw error
}

export async function reviewShiftChangeRequest(
  requestId: string,
  approve: boolean,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc('review_shift_change_request', {
    p_request_id: requestId,
    p_approve: approve,
    p_note: note || undefined,
  })
  if (error) throw error
}

export async function cancelShiftChangeRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_shift_change_request', {
    p_request_id: requestId,
  })
  if (error) throw error
}
