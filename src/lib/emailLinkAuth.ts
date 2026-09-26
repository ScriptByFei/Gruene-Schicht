import { createAuthClient } from '@neondatabase/neon-js/auth'

export const emailLinkAuth = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL as string)
