import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Organization, OrganizationMembership, Profile, ShiftGroup } from '../types'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  membership: OrganizationMembership | null
  organization: Organization | null
  shiftGroup: ShiftGroup | null
  loading: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
