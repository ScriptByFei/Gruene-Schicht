import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Organization, OrganizationMembership, Profile, ShiftGroup } from '../types'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/profiles'
import { getPrimaryOrganization } from '../services/organizations'
import { AuthContext } from './auth-context'
import { readOfflineCache, writeOfflineCache } from '../lib/offlineCache'

interface CachedIdentity {
  profile: Profile | null
  membership: OrganizationMembership | null
  organization: Organization | null
  shiftGroup: ShiftGroup | null
}

const IDENTITY_CACHE_KEY = 'identity'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [membership, setMembership] = useState<OrganizationMembership | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [shiftGroup, setShiftGroup] = useState<ShiftGroup | null>(null)
  const [loading, setLoading] = useState(true)

  const loadIdentity = async (userId: string) => {
    try {
      const [nextProfile, organizationContext] = await Promise.all([
        getProfile(userId),
        getPrimaryOrganization(userId),
      ])
      const identity: CachedIdentity = {
        profile: nextProfile,
        membership: organizationContext?.membership ?? null,
        organization: organizationContext?.organization ?? null,
        shiftGroup: organizationContext?.shiftGroup ?? null,
      }
      setProfile(identity.profile)
      setMembership(identity.membership)
      setOrganization(identity.organization)
      setShiftGroup(identity.shiftGroup)
      writeOfflineCache(userId, IDENTITY_CACHE_KEY, identity)
    } catch (error) {
      const cached = readOfflineCache<CachedIdentity>(userId, IDENTITY_CACHE_KEY)
      if (!cached) throw error
      setProfile(cached.profile)
      setMembership(cached.membership)
      setOrganization(cached.organization)
      setShiftGroup(cached.shiftGroup)
    }
  }

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await loadIdentity(session.user.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        void loadIdentity(session.user.id)
          .catch(() => undefined)
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setLoading(true)
        void loadIdentity(session.user.id)
          .catch(() => undefined)
          .finally(() => setLoading(false))
      } else {
        setProfile(null)
        setMembership(null)
        setOrganization(null)
        setShiftGroup(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        membership,
        organization,
        shiftGroup,
        loading,
        isAdmin: membership?.role === 'admin' && membership.status === 'active',
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
