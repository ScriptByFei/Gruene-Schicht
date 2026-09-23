import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js'
import type { Database } from './database.types'

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL as string
const neonDataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL as string

if (!neonAuthUrl || !neonDataApiUrl) {
  console.warn('Neon environment variables not set. Please configure VITE_NEON_AUTH_URL and VITE_NEON_DATA_API_URL in .env.local')
}

export const client = createClient<Database>({
  auth: {
    url: neonAuthUrl,
    adapter: SupabaseAuthAdapter(),
  },
  dataApi: {
    url: neonDataApiUrl,
  },
})

type SessionResponse = Awaited<ReturnType<typeof client.auth.getSession>>

export type AuthSession = NonNullable<SessionResponse['data']['session']>
export type AuthUser = AuthSession['user']
