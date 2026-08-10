import { supabase } from '../lib/supabase'
import type {
  OrganizationMemberWithProfile,
  ShiftGroup,
  ShiftGroupColor,
} from '../types'

export interface ShiftGroupInput {
  name: string
  anchor_date: string
  pattern: string
  color: ShiftGroupColor
  sort_order: number
}

export async function getShiftGroups(organizationId: string): Promise<ShiftGroup[]> {
  const { data, error } = await supabase
    .from('shift_groups')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order')
    .order('name')

  if (error) throw error
  return (data ?? []) as ShiftGroup[]
}

export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberWithProfile[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('joined_at')

  if (membershipError) throw membershipError
  if (!memberships?.length) return []

  const { data: profiles, error: profileError } = await supabase
    .from('profile_directory')
    .select('id, display_name')
    .in('id', memberships.map((membership) => membership.user_id))

  if (profileError) throw profileError
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]))

  return memberships.map((membership) => ({
    ...membership,
    display_name: names.get(membership.user_id) ?? 'Unbekanntes Konto',
  })) as OrganizationMemberWithProfile[]
}

export async function createShiftGroup(
  organizationId: string,
  input: ShiftGroupInput
): Promise<void> {
  const { error } = await supabase
    .from('shift_groups')
    .insert({ ...input, organization_id: organizationId })

  if (error) throw error
}

export async function updateShiftGroup(id: string, input: ShiftGroupInput): Promise<void> {
  const { error } = await supabase
    .from('shift_groups')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteShiftGroup(id: string): Promise<void> {
  const { error } = await supabase.from('shift_groups').delete().eq('id', id)
  if (error) throw error
}

export async function assignMemberShiftGroup(
  organizationId: string,
  userId: string,
  shiftGroupId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .update({ shift_group_id: shiftGroupId })
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) throw error
}
