import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const TARGET_EMAIL = process.argv[2] ?? 'local-test-gruene-schicht@example.com'
const PLACEHOLDER = 'PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE'

function loadEnv(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    env[key] = rest.join('=').replace(/^['"]|['"]$/g, '')
  }
  return env
}

const env = loadEnv('.env.local')
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env.local')
  process.exit(1)
}

if (!serviceRoleKey || serviceRoleKey === PLACEHOLDER) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error(`Replace ${PLACEHOLDER} with your Supabase service_role key.`)
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data: usersData, error: usersError } = await admin.auth.admin.listUsers()
if (usersError) throw usersError

const user = usersData.users.find((candidate) => candidate.email?.toLowerCase() === TARGET_EMAIL.toLowerCase())
if (!user) {
  console.error(`User not found: ${TARGET_EMAIL}`)
  process.exit(1)
}

const { data: profile, error: updateError } = await admin
  .from('profiles')
  .update({ role: 'admin' })
  .eq('id', user.id)
  .select('id, display_name, role')
  .single()

if (updateError) throw updateError

console.log(`Updated ${TARGET_EMAIL} to role=${profile.role}`)
console.log(`Profile id: ${profile.id}`)
