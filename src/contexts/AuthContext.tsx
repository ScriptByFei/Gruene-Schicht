import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Organization, OrganizationMembership, Profile } from '../types'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/profiles'
import { getPrimaryOrganization } from '../services/organizations'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [membership, setMembership] = useState<OrganizationMembership | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  const loadIdentity = async (userId: string) => {
    const [nextProfile, organizationContext] = await Promise.all([
      getProfile(userId),
      getPrimaryOrganization(userId),
    ])
    setProfile(nextProfile)
    setMembership(organizationContext?.membership ?? null)
    setOrganization(organizationContext?.organization ?? null)
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
        loadIdentity(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setLoading(true)
        void loadIdentity(session.user.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setMembership(null)
        setOrganization(null)
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
        loading,
        isAdmin: membership?.role === 'admin' && membership.status === 'active',
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
