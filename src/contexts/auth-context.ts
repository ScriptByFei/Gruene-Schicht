import { createContext } from 'react'
import type { Organization, OrganizationMembership, Profile, ShiftGroup } from '../types'
import type { AuthSession, AuthUser } from '../lib/neon'

export interface AuthContextValue {
  session: AuthSession | null
  user: AuthUser | null
  profile: Profile | null
  membership: OrganizationMembership | null
  organization: Organization | null
  shiftGroup: ShiftGroup | null
  loading: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
