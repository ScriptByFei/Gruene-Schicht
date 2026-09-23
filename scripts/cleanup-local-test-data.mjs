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

const env = { ...readEnvFile(resolve(process.cwd(), '.env.local')), ...process.env }
if (!env.DATABASE_URL_UNPOOLED) {
  throw new Error('DATABASE_URL_UNPOOLED fehlt. Führe zuerst `neon env pull` aus.')
}

const testEventTitlePrefixes = ['Lokaler Admin Test']
const exactTestEventTitles = ['Test']
const exactTestSuggestions = [
  'Desktop Vorschlag lokal',
  'DOM-click Vorschlag lokal',
  'Gezielter Vorschlagstest lokal',
]

const connectionString = env.DATABASE_URL_UNPOOLED.replace('sslmode=require', 'sslmode=verify-full')
const client = new pg.Client({ connectionString })
await client.connect()

try {
  await client.query('begin')
  const suggestions = await client.query(`
    delete from public.suggestions
    where text = any($1::text[])
    returning id
  `, [exactTestSuggestions])
  const events = await client.query(`
    delete from public.events
    where title = any($1::text[])
       or title like any($2::text[])
    returning id, title
  `, [exactTestEventTitles, testEventTitlePrefixes.map((prefix) => `${prefix}%`)])
  await client.query('commit')

  console.log('Deleted test events:', events.rowCount)
  console.log('Deleted exact test suggestions:', suggestions.rowCount)
} catch (error) {
  await client.query('rollback')
  throw error
} finally {
  await client.end()
}
