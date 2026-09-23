import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const neonAuthUrl = env.VITE_NEON_AUTH_URL || env.NEON_AUTH_BASE_URL || ''
  const neonDataApiUrl = env.VITE_NEON_DATA_API_URL || env.NEON_DATA_API_URL || ''

  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/Gruene-Schicht/' : '/',
    define: {
      'import.meta.env.VITE_NEON_AUTH_URL': JSON.stringify(neonAuthUrl),
      'import.meta.env.VITE_NEON_DATA_API_URL': JSON.stringify(neonDataApiUrl),
    },
    plugins: [react(), tailwindcss()],
  }
})
