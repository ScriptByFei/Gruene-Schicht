import { supabase } from '../lib/supabase'
import type { Organization, OrganizationMembership, ShiftGroup } from '../types'

export interface OrganizationContext {
  membership: OrganizationMembership
  organization: Organization
  shiftGroup: ShiftGroup | null
}

export async function getPrimaryOrganization(userId: string): Promise<OrganizationContext | null> {
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at')
    .limit(1)
    .maybeSingle()

  if (membershipError) throw membershipError
  if (!membership) return null

  const [organizationResult, shiftGroupResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .single(),
    membership.shift_group_id
      ? supabase
          .from('shift_groups')
          .select('*')
          .eq('id', membership.shift_group_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (organizationResult.error) throw organizationResult.error
  if (shiftGroupResult.error) throw shiftGroupResult.error

  return {
    membership: membership as OrganizationMembership,
    organization: organizationResult.data as Organization,
    shiftGroup: shiftGroupResult.data as ShiftGroup | null,
  }
}
