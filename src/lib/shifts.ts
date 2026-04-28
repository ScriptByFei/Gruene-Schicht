// 28-day shift cycle: S=Spät, N=Nacht, F=Früh, -=Frei
export const SHIFT_PATTERN = 'SSSNN-----FFFNNNN----FFFSSS-' as const

export type ShiftCode = 'S' | 'N' | 'F' | '-'

export const SHIFT_LABELS: Record<ShiftCode, string> = {
  F: 'Frühschicht',
  S: 'Spätschicht',
  N: 'Nachtschicht',
  '-': 'Frei',
}

export const SHIFT_COLORS: Record<ShiftCode, string> = {
  F: 'bg-amber-100 text-amber-800',
  S: 'bg-blue-100 text-blue-800',
  N: 'bg-violet-100 text-violet-800',
  '-': 'bg-gray-100 text-gray-600',
}

export function getShiftForDate(shiftStartDate: string, date: Date = new Date()): ShiftCode {
  const start = new Date(shiftStartDate)
  start.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const index = ((diffDays % SHIFT_PATTERN.length) + SHIFT_PATTERN.length) % SHIFT_PATTERN.length
  return SHIFT_PATTERN[index] as ShiftCode
}

export function getTodayShift(shiftStartDate: string): ShiftCode {
  return getShiftForDate(shiftStartDate)
}

// Returns the next 7 days with their shift codes
export function getWeekOverview(shiftStartDate: string): { date: Date; shift: ShiftCode }[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    return { date, shift: getShiftForDate(shiftStartDate, date) }
  })
}
