import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

const TARGET_EMAIL = process.argv[2] ?? 'local-test-gruene-schicht@example.com'
const databaseContainer = `supabase_db_${basename(process.cwd())}`

function runLocalSql(sql) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      databaseContainer,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      `target_email=${TARGET_EMAIL}`,
      '-At',
    ],
    { encoding: 'utf8', input: sql, stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim()
}

try {
  const userId = runLocalSql(`
    select id
    from auth.users
    where lower(email) = lower(:'target_email')
    limit 1;
  `)

  if (!userId) {
    console.error(`User not found in local Supabase: ${TARGET_EMAIL}`)
    process.exit(1)
  }

  const membership = runLocalSql(`
    insert into public.organization_members (
      organization_id,
      user_id,
      role,
      status
    )
    select organization.id, auth_user.id, 'admin', 'active'
    from public.organizations as organization
    cross join auth.users as auth_user
    where organization.slug = 'gruene-schicht'
      and lower(auth_user.email) = lower(:'target_email')
    on conflict (organization_id, user_id) do update
    set role = excluded.role,
        status = excluded.status
    returning organization_id || '|' || role;
  `)

  if (!membership) {
    console.error('Local organization gruene-schicht was not found.')
    process.exit(1)
  }

  const [organizationId, role] = membership.split(/\r?\n/)[0].split('|')
  console.log(`Updated ${TARGET_EMAIL} to role=${role}`)
  console.log(`Organization: Grüne Schicht (${organizationId})`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('Could not update the local test user.')
  console.error('Make sure Docker Desktop and local Supabase are running.')
  console.error(message)
  process.exit(1)
}
