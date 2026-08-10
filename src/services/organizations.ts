import { supabase } from '../lib/supabase'
import type { Organization, OrganizationMembership } from '../types'

export interface OrganizationContext {
  membership: OrganizationMembership
  organization: Organization
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

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.organization_id)
    .single()

  if (organizationError) throw organizationError

  return {
    membership: membership as OrganizationMembership,
    organization: organization as Organization,
  }
}
