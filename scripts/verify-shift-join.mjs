import pg from 'pg'

const connectionString = process.env.DATABASE_URL_UNPOOLED
if (!connectionString) throw new Error('DATABASE_URL_UNPOOLED fehlt.')
if (!process.env.NEON_TEST_BRANCH?.startsWith('dev-group-joining-')) {
  throw new Error('Dieser Rollback-Test darf nur auf dem Gruppenbeitritt-Testbranch laufen.')
}

const client = new pg.Client({
  connectionString: connectionString.replace('sslmode=require', 'sslmode=verify-full'),
})
await client.connect()

try {
  await client.query('begin')
  try {
    const { rows: groups } = await client.query(`
      select id
      from public.shift_groups
      where organization_id = (
        select id from public.organizations where slug = 'gruene-schicht'
      )
    `)
    if (groups.length !== 4) throw new Error(`Erwartet 4 Gruppen, erhalten: ${groups.length}`)

    const { rows: columns } = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'organization_access_requests'
        and column_name = 'requested_shift_group_id'
    `)
    if (columns.length !== 1) throw new Error('Wunschgruppen-Spalte fehlt.')

    const { rows: [reviewFunction] } = await client.query(`
      select procedure.prosecdef as security_definer,
             has_function_privilege('anon', procedure.oid, 'EXECUTE') as anon_can_execute
      from pg_proc as procedure
      where procedure.oid = 'public.review_organization_access_request(uuid, boolean, uuid)'::regprocedure
    `)
    if (!reviewFunction?.security_definer || reviewFunction.anon_can_execute) {
      throw new Error('Admin-Freigabe-RPC hat eine unsichere Rollen-Konfiguration.')
    }

    const { rows: [admin] } = await client.query(`
      select membership.user_id, membership.organization_id
      from public.organization_members as membership
      where membership.role = 'admin' and membership.status = 'active'
      limit 1
    `)
    if (!admin) throw new Error('Kein aktives Admin-Testkonto auf dem Branch.')

    const { rows: [testRequest] } = await client.query(`
      insert into public.organization_access_requests (organization_id, user_id, status)
      values ($1, $2, 'pending')
      on conflict (organization_id, user_id) do update set status = 'pending'
      returning id
    `, [admin.organization_id, admin.user_id])

    await client.query('set local role authenticated')
    const { rows: unauthenticatedGroups } = await client.query(
      'select id from public.list_joinable_shift_groups()'
    )
    if (unauthenticatedGroups.length !== 0) {
      throw new Error('Ohne Auth-JWT dürfen keine Gruppen sichtbar sein.')
    }

    await client.query('savepoint no_jwt_request')
    let denied = false
    try {
      await client.query('select public.request_shift_group_join($1)', [groups[0].id])
    } catch (error) {
      denied = error.message.includes('authentication required')
    }
    await client.query('rollback to savepoint no_jwt_request')
    if (!denied) throw new Error('Beitrittsanfrage ohne Auth-JWT wurde nicht abgewiesen.')

    await client.query('savepoint no_jwt_review')
    let reviewDenied = false
    try {
      await client.query('select public.review_organization_access_request($1, true, $2)', [
        testRequest.id,
        groups[0].id,
      ])
    } catch (error) {
      reviewDenied = error.message.includes('organization admin required')
    }
    await client.query('rollback to savepoint no_jwt_review')
    if (!reviewDenied) throw new Error('Freigabe ohne Admin-JWT wurde nicht abgewiesen.')

    console.log('Schema, JWT-Grenze und Admin-Freigabe ohne JWT auf dem Test-Branch geprüft. Der positive Freigabe-Flow benötigt eine echte Neon-Auth-Sitzung.')
  } finally {
    await client.query('rollback')
  }
} finally {
  await client.end()
}
