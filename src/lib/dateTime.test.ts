import { describe, expect, it } from 'vitest'
import {
  formatEventSchedule,
  fromDateTimeLocalValue,
  getDateKeyInTimeZone,
  getLocalDateKey,
} from './dateTime'

describe('event date helpers', () => {
  it('groups an instant by the organization timezone', () => {
    expect(getDateKeyInTimeZone('2026-08-10T22:30:00.000Z', 'Europe/Berlin')).toBe('2026-08-11')
  })

  it('builds stable keys for local calendar days', () => {
    expect(getLocalDateKey(new Date(2026, 7, 5))).toBe('2026-08-05')
  })

  it('converts valid datetime-local values to ISO timestamps', () => {
    expect(fromDateTimeLocalValue('2026-08-10T18:30')).toMatch(/^2026-08-10T\d{2}:30:00\.000Z$/)
  })

  it('rejects invalid datetime-local values', () => {
    expect(fromDateTimeLocalValue('not-a-date')).toBeNull()
  })

  it('formats a same-day event as a compact range', () => {
    expect(formatEventSchedule(
      '2026-08-10T16:00:00.000Z',
      '2026-08-10T18:30:00.000Z',
      'Europe/Berlin'
    )).toContain('18:00')
  })
})
