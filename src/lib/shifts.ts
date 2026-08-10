const SHIFT_PATTERN = 'FFFSSS-SSSNN-----FFFNNNN----'
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type CurrentShift = 'Spätschicht' | 'Nachtschicht' | 'Frühschicht' | 'Frei'
export type ShiftSymbol = 'S' | 'N' | 'F' | '-'
export type ShiftTeamName = 'Rote' | 'Gelbe' | 'Blaue' | 'Grüne'

export interface ShiftInfo {
  symbol: ShiftSymbol
  label: CurrentShift
  patternDay: number
}

export interface ShiftTeam {
  name: ShiftTeamName
  startDate: string
  color: string
}

export const SHIFT_TEAMS: ShiftTeam[] = [
  { name: 'Rote', startDate: '2026-04-27', color: 'red' },
  { name: 'Gelbe', startDate: '2026-04-13', color: 'yellow' },
  { name: 'Blaue', startDate: '2026-04-20', color: 'blue' },
  { name: 'Grüne', startDate: '2026-05-04', color: 'green' },
]

export const SHIFT_TEAM_OPTIONS = [
  { value: '', label: 'Schicht auswählen' },
  ...SHIFT_TEAMS.map((team) => ({
    value: team.startDate,
    label: team.name,
  })),
]

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

function getPatternIndex(shiftStartDate: string, date: Date): number | null {
  const start = parseLocalDate(shiftStartDate)
  if (!start) return null

  const current = startOfLocalDay(date)
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const currentUtc = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
  const diffDays = Math.floor((currentUtc - startUtc) / MS_PER_DAY)
  return ((diffDays % SHIFT_PATTERN.length) + SHIFT_PATTERN.length) % SHIFT_PATTERN.length
}

export function getShiftInfoForDate(shiftStartDate?: string | null, date = new Date()): ShiftInfo | null {
  const patternIndex = getPatternIndex(shiftStartDate ?? '', date)
  if (patternIndex === null) return null

  const symbol = SHIFT_PATTERN[patternIndex] as ShiftSymbol
  return {
    symbol,
    label: shiftLabels[symbol],
    patternDay: patternIndex + 1,
  }
}

export function getCurrentShift(shiftStartDate?: string | null, today = new Date()): CurrentShift | null {
  return getShiftInfoForDate(shiftStartDate, today)?.label ?? null
}

export function getShiftTeamByStartDate(shiftStartDate?: string | null): ShiftTeam | null {
  if (!shiftStartDate) return null
  return SHIFT_TEAMS.find((team) => team.startDate === shiftStartDate) ?? null
}

export function getShiftTeamLabel(shiftStartDate?: string | null): string {
  const team = getShiftTeamByStartDate(shiftStartDate)
  return team ? `${team.name} Schicht` : 'Schicht nicht gesetzt'
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

export { SHIFT_PATTERN }
