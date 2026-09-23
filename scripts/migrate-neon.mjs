import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import pg from 'pg'

const { Client } = pg
const projectRoot = resolve(import.meta.dirname, '..')

async function loadLocalEnvironment() {
  try {
    const contents = await readFile(resolve(projectRoot, '.env.local'), 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]] !== undefined) continue
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

await loadLocalEnvironment()

const rawConnectionString = process.env.DATABASE_URL_UNPOOLED
if (!rawConnectionString) {
  throw new Error('DATABASE_URL_UNPOOLED fehlt. Führe zuerst `neon env pull` aus.')
}
const connectionString = rawConnectionString.replace('sslmode=require', 'sslmode=verify-full')

const migrationsDirectory = resolve(projectRoot, 'neon', 'migrations')
const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith('.sql'))
  .sort()

const client = new Client({ connectionString })
await client.connect()

try {
  await client.query('create schema if not exists neon_migrations')
  await client.query(`
    create table if not exists neon_migrations.applied_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const appliedResult = await client.query('select name from neon_migrations.applied_migrations')
  const applied = new Set(appliedResult.rows.map((row) => row.name))

  for (const name of migrationNames) {
    if (applied.has(name)) {
      console.log(`skip  ${name}`)
      continue
    }

    const sql = await readFile(resolve(migrationsDirectory, name), 'utf8')
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query(
        'insert into neon_migrations.applied_migrations (name) values ($1)',
        [name],
      )
      await client.query('commit')
      console.log(`apply ${name}`)
    } catch (error) {
      await client.query('rollback')
      error.message = `${name}: ${error.message}`
      throw error
    }
  }
} finally {
  await client.end()
}
