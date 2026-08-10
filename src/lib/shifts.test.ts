import { describe, expect, it } from 'vitest'
import { SHIFT_PATTERN, getShiftInfoForDate } from './shifts'

describe('getShiftInfoForDate', () => {
  it('starts on the first day of the configured pattern', () => {
    expect(getShiftInfoForDate('2026-04-27', new Date(2026, 3, 27))).toEqual({
      symbol: 'F',
      label: 'Frühschicht',
      patternDay: 1,
    })
  })

  it('repeats after a complete cycle', () => {
    const firstDay = getShiftInfoForDate('2026-04-27', new Date(2026, 3, 27))
    const nextCycle = getShiftInfoForDate(
      '2026-04-27',
      new Date(2026, 3, 27 + SHIFT_PATTERN.length)
    )

    expect(nextCycle).toEqual(firstDay)
  })

  it('calculates calendar days correctly across daylight-saving changes', () => {
    const result = getShiftInfoForDate('2026-03-20', new Date(2026, 2, 31))

    expect(result?.patternDay).toBe(12)
    expect(result?.symbol).toBe('N')
  })

  it('supports dates before the anchor date', () => {
    const result = getShiftInfoForDate('2026-04-27', new Date(2026, 3, 26))

    expect(result?.patternDay).toBe(SHIFT_PATTERN.length)
  })

  it('returns null for an invalid anchor date', () => {
    expect(getShiftInfoForDate('invalid', new Date(2026, 3, 27))).toBeNull()
  })
})
