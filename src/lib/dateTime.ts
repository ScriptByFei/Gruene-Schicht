const DEFAULT_TIME_ZONE = 'Europe/Berlin'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T')
}

export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function getDateKeyInTimeZone(
  value: string,
  timeZone = DEFAULT_TIME_ZONE
): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`
}

export function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatEventSchedule(
  startsAt?: string | null,
  endsAt?: string | null,
  timeZone = DEFAULT_TIME_ZONE
): string | null {
  if (!startsAt) return null
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return null

  const startText = new Intl.DateTimeFormat('de-DE', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(start)

  if (!endsAt) return `${startText} Uhr`
  const end = new Date(endsAt)
  if (Number.isNaN(end.getTime())) return `${startText} Uhr`

  const sameDay = getDateKeyInTimeZone(startsAt, timeZone) === getDateKeyInTimeZone(endsAt, timeZone)
  const endText = new Intl.DateTimeFormat('de-DE', sameDay
    ? { timeZone, hour: '2-digit', minute: '2-digit' }
    : {
        timeZone,
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(end)

  return `${startText} – ${endText} Uhr`
}
