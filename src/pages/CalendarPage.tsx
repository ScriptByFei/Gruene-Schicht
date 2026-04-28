import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { cn } from '../lib/cn'
import { SHIFT_PATTERN, getShiftInfoForDate, type ShiftInfo, type ShiftSymbol } from '../lib/shifts'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const shiftStyles: Record<ShiftSymbol, { badge: string; tile: string; dot: string }> = {
  F: {
    badge: 'bg-amber-100 text-amber-800',
    tile: 'bg-amber-50 border-amber-200 text-amber-900',
    dot: 'bg-amber-400',
  },
  S: {
    badge: 'bg-sky-100 text-sky-800',
    tile: 'bg-sky-50 border-sky-200 text-sky-900',
    dot: 'bg-sky-400',
  },
  N: {
    badge: 'bg-violet-100 text-violet-800',
    tile: 'bg-violet-50 border-violet-200 text-violet-900',
    dot: 'bg-violet-400',
  },
  '-': {
    badge: 'bg-emerald-100 text-emerald-800',
    tile: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    dot: 'bg-emerald-400',
  },
}

interface CalendarDay {
  date: Date
  inMonth: boolean
  isToday: boolean
  shift: ShiftInfo | null
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function buildMonthDays(monthDate: Date, shiftStartDate?: string | null): CalendarDay[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const firstCell = addDays(firstOfMonth, -mondayOffset)
  const today = new Date()

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstCell, index)
    return {
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
      isToday: sameDay(date, today),
      shift: getShiftInfoForDate(shiftStartDate, date),
    }
  })
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date)
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function ShiftPill({ shift }: { shift: ShiftInfo }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', shiftStyles[shift.symbol].badge)}>
      {shift.label}
    </span>
  )
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())

  const days = useMemo(
    () => buildMonthDays(visibleMonth, profile?.shift_start_date),
    [visibleMonth, profile?.shift_start_date]
  )
  const todayShift = getShiftInfoForDate(profile?.shift_start_date)
  const nextDays = useMemo(
    () => Array.from({ length: 10 }, (_, index) => {
      const date = addDays(new Date(), index)
      return { date, shift: getShiftInfoForDate(profile?.shift_start_date, date) }
    }),
    [profile?.shift_start_date]
  )

  const goToPreviousMonth = () =>
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))

  const goToNextMonth = () =>
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))

  const goToToday = () => setVisibleMonth(new Date())

  if (!profile?.shift_start_date) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Schichtkalender</h1>
          <p className="mt-2 text-sm text-gray-600">
            Lege zuerst dein Startdatum im Profil fest. Danach zeigt dir der Kalender automatisch alle Früh-, Spät-, Nacht- und freien Tage.
          </p>
          <Link
            to="/profile"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Startdatum eintragen
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-emerald-700">Grüne Schicht</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schichtkalender</h1>
        <p className="mt-1 text-sm text-gray-600">
          Dein Dienstplan wird automatisch aus dem {SHIFT_PATTERN}-Rhythmus berechnet.
        </p>
      </div>

      {todayShift && (
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-emerald-100">Heute arbeitest du</p>
              <p className="mt-1 text-2xl font-bold">{todayShift.label}</p>
              <p className="mt-1 text-xs text-emerald-100">Tag {todayShift.patternDay} im {SHIFT_PATTERN.length}-Tage-Zyklus</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-black">
              {todayShift.symbol}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth} aria-label="Vorheriger Monat">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 capitalize">{formatMonth(visibleMonth)}</h2>
            <button type="button" onClick={goToToday} className="text-xs text-emerald-700 font-medium hover:text-emerald-800">
              Heute anzeigen
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={goToNextMonth} aria-label="Nächster Monat">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ date, inMonth, isToday, shift }) => (
            <div
              key={date.toISOString()}
              className={cn(
                'min-h-[72px] rounded-xl border p-1.5 flex flex-col transition-colors',
                shift ? shiftStyles[shift.symbol].tile : 'bg-white border-gray-200 text-gray-700',
                !inMonth && 'opacity-35',
                isToday && 'ring-2 ring-emerald-500 ring-offset-1'
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={cn('text-xs font-bold', isToday && 'text-emerald-700')}>{date.getDate()}</span>
                {shift && <span className={cn('w-2 h-2 rounded-full', shiftStyles[shift.symbol].dot)} />}
              </div>
              {shift && (
                <div className="mt-auto">
                  <div className="text-base font-black leading-none">{shift.symbol}</div>
                  <div className="text-[10px] leading-tight font-medium mt-1 hidden sm:block">
                    {shift.label.replace('schicht', '')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          {(['F', 'S', 'N', '-'] as ShiftSymbol[]).map((symbol) => (
            <div key={symbol} className="flex items-center gap-2 text-xs text-gray-600">
              <span className={cn('w-3 h-3 rounded-full', shiftStyles[symbol].dot)} />
              <span>{symbol === '-' ? 'Frei' : symbol === 'F' ? 'Frühschicht' : symbol === 'S' ? 'Spätschicht' : 'Nachtschicht'}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Nächste 10 Tage</h2>
        <div className="flex flex-col divide-y divide-gray-100">
          {nextDays.map(({ date, shift }) => (
            <div key={date.toISOString()} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{formatLongDate(date)}</p>
                {sameDay(date, new Date()) && <p className="text-xs text-emerald-700 font-medium">Heute</p>}
              </div>
              {shift && <ShiftPill shift={shift} />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
