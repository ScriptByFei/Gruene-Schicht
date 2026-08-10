const DEFAULT_SHIFT_PATTERN = 'FFFSSS-SSSNN-----FFFNNNN----'
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type CurrentShift = 'Spätschicht' | 'Nachtschicht' | 'Frühschicht' | 'Frei'
export type ShiftSymbol = 'S' | 'N' | 'F' | '-'

export interface ShiftInfo {
  symbol: ShiftSymbol
  label: CurrentShift
  patternDay: number
}

const shiftLabels: Record<ShiftSymbol, CurrentShift> = {
  S: 'Spätschicht',
  N: 'Nachtschicht',
  F: 'Frühschicht',
  '-': 'Frei',
}

function parseLocalDate(date: string): Date | null {
  if (!date) return null
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getPatternIndex(shiftStartDate: string, date: Date, pattern: string): number | null {
  const start = parseLocalDate(shiftStartDate)
  if (!start || !pattern || !/^[FSN-]+$/.test(pattern)) return null

  const current = startOfLocalDay(date)
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const currentUtc = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
  const diffDays = Math.floor((currentUtc - startUtc) / MS_PER_DAY)
  return ((diffDays % pattern.length) + pattern.length) % pattern.length
}

export function getShiftInfoForDate(
  shiftStartDate?: string | null,
  date = new Date(),
  pattern = DEFAULT_SHIFT_PATTERN
): ShiftInfo | null {
  const patternIndex = getPatternIndex(shiftStartDate ?? '', date, pattern)
  if (patternIndex === null) return null

  const symbol = pattern[patternIndex] as ShiftSymbol
  return {
    symbol,
    label: shiftLabels[symbol],
    patternDay: patternIndex + 1,
  }
}

export function getCurrentShift(
  shiftStartDate?: string | null,
  today = new Date(),
  pattern = DEFAULT_SHIFT_PATTERN
): CurrentShift | null {
  return getShiftInfoForDate(shiftStartDate, today, pattern)?.label ?? null
}

export function getEffectiveShiftInfoForDate(
  shiftStartDate: string | null | undefined,
  date: Date,
  pattern: string | undefined,
  overrideSymbol?: ShiftSymbol
): ShiftInfo | null {
  const baseShift = getShiftInfoForDate(shiftStartDate, date, pattern)
  if (!overrideSymbol) return baseShift

  return {
    symbol: overrideSymbol,
    label: shiftLabels[overrideSymbol],
    patternDay: baseShift?.patternDay ?? 0,
  }
}

export function formatShiftStartDate(date?: string | null): string {
  const parsed = parseLocalDate(date ?? '')
  if (!parsed) return 'nicht gesetzt'

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

export { DEFAULT_SHIFT_PATTERN }
