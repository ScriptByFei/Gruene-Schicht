import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

function readEnvFile(path) {
  return Object.fromEntries(readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]))
}

const targetEmail = process.argv[2] ?? 'local-test-gruene-schicht@example.com'
const env = { ...readEnvFile(resolve(process.cwd(), '.env.local')), ...process.env }

if (!env.DATABASE_URL_UNPOOLED) {
  console.error('DATABASE_URL_UNPOOLED fehlt. Führe zuerst `neon env pull` aus.')
  process.exit(1)
}

const connectionString = env.DATABASE_URL_UNPOOLED.replace('sslmode=require', 'sslmode=verify-full')
const client = new pg.Client({ connectionString })
await client.connect()

try {
  const result = await client.query(`
    insert into public.organization_members (organization_id, user_id, role, status)
    select organization.id, auth_user.id, 'admin', 'active'
    from public.organizations as organization
    cross join neon_auth."user" as auth_user
    where organization.slug = 'gruene-schicht'
      and lower(auth_user.email) = lower($1)
    on conflict (organization_id, user_id) do update
      set role = excluded.role,
          status = excluded.status
    returning organization_id, role
  `, [targetEmail])

  if (!result.rowCount) {
    throw new Error(`Neon-Nutzer oder Organisation nicht gefunden: ${targetEmail}`)
  }

  console.log(`Updated ${targetEmail} to role=${result.rows[0].role}`)
  console.log(`Organization: Grüne Schicht (${result.rows[0].organization_id})`)
} finally {
  await client.end()
}
