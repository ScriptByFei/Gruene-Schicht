import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readEnvFile(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
  return env
}

const env = { ...process.env, ...readEnvFile(resolve(process.cwd(), '.env.local')) }
const url = env.VITE_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey || serviceRoleKey === 'PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const testEventTitlePrefixes = [
  'Lokaler Admin Test',
]

const exactTestEventTitles = [
  'Test',
]

const exactTestSuggestions = [
  'Desktop Vorschlag lokal',
  'DOM-click Vorschlag lokal',
  'Gezielter Vorschlagstest lokal',
]

async function throwIfError(result, label) {
  if (result.error) {
    console.error(`${label} failed:`, result.error.message)
    process.exit(1)
  }
  return result.data ?? []
}

const { data: allEvents, error: eventsError } = await supabase
  .from('events')
  .select('id,title,created_at')
if (eventsError) throw eventsError

const testEvents = (allEvents ?? []).filter((event) =>
  exactTestEventTitles.includes(event.title) ||
  testEventTitlePrefixes.some((prefix) => event.title.startsWith(prefix))
)
const testEventIds = testEvents.map((event) => event.id)

const { data: matchingSuggestions, error: suggestionsError } = await supabase
  .from('suggestions')
  .select('id,text,event_id,status')
  .in('text', exactTestSuggestions)
if (suggestionsError) throw suggestionsError

console.log('Found test events:', testEvents.map((e) => e.title))
console.log('Found test suggestions:', (matchingSuggestions ?? []).map((s) => s.text))

let deletedSuggestions = 0
if ((matchingSuggestions ?? []).length > 0) {
  const ids = matchingSuggestions.map((s) => s.id)
  const deleted = await throwIfError(
    await supabase.from('suggestions').delete().in('id', ids).select('id'),
    'delete suggestions'
  )
  deletedSuggestions = deleted.length
}

let deletedEvents = 0
if (testEventIds.length > 0) {
  const deleted = await throwIfError(
    await supabase.from('events').delete().in('id', testEventIds).select('id,title'),
    'delete events'
  )
  deletedEvents = deleted.length
}

// Verify cleanup.
const { data: remainingEvents, error: remainingEventsError } = await supabase
  .from('events')
  .select('id,title')
if (remainingEventsError) throw remainingEventsError
const stillTestEvents = (remainingEvents ?? []).filter((event) =>
  exactTestEventTitles.includes(event.title) ||
  testEventTitlePrefixes.some((prefix) => event.title.startsWith(prefix))
)

const { data: remainingSuggestions, error: remainingSuggestionsError } = await supabase
  .from('suggestions')
  .select('id,text')
  .in('text', exactTestSuggestions)
if (remainingSuggestionsError) throw remainingSuggestionsError

console.log('Deleted test events:', deletedEvents)
console.log('Deleted exact test suggestions:', deletedSuggestions)
console.log('Remaining matching test events:', stillTestEvents.length)
console.log('Remaining matching test suggestions:', (remainingSuggestions ?? []).length)

if (stillTestEvents.length > 0 || (remainingSuggestions ?? []).length > 0) {
  process.exit(2)
}
