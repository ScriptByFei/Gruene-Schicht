import { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { cn } from '../lib/cn'
import { getShiftInfoForDate, type ShiftInfo, type ShiftSymbol } from '../lib/shifts'
import { getScheduledEventsForRange } from '../services/events'
import { formatEventSchedule, getDateKeyInTimeZone, getLocalDateKey } from '../lib/dateTime'
import type { Event } from '../types'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
const calendarDayFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'long',
})

const shiftCellClass: Record<ShiftSymbol, string> = {
  F: 'bg-amber-400 text-white',
  S: 'bg-red-500 text-white',
  N: 'bg-blue-600 text-white',
  '-': 'bg-transparent text-gray-400 dark:text-slate-600',
}

interface CalendarDay {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  shift: ShiftInfo | null
}
interface CalendarWeek { weekNumber: number; days: (CalendarDay | null)[] }
interface CalendarMonth { year: number; monthIndex: number; weeks: CalendarWeek[] }

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function getIsoWeek(date: Date): number {
  const t = new Date(date.valueOf())
  const dn = (date.getDay() + 6) % 7
  t.setDate(t.getDate() - dn + 3)
  const ft = new Date(t.getFullYear(), 0, 4)
  ft.setDate(ft.getDate() - ((ft.getDay() + 6) % 7) + 3)
  return 1 + Math.round((t.getTime() - ft.getTime()) / (7 * 24 * 60 * 60 * 1000))
}
function buildMonth(
  year: number,
  monthIndex: number,
  shiftStartDate?: string | null,
  pattern?: string
): CalendarMonth {
  const first = new Date(year, monthIndex, 1)
  const last = new Date(year, monthIndex + 1, 0)
  const offset = (first.getDay() + 6) % 7
  const firstCell = addDays(first, -offset)
  const totalCells = Math.ceil((offset + last.getDate()) / 7) * 7
  const today = new Date()
  const weeks: CalendarWeek[] = []
  for (let wi = 0; wi < totalCells / 7; wi++) {
    const monday = addDays(firstCell, wi * 7)
    const days = Array.from({ length: 7 }, (_, di): CalendarDay | null => {
      const date = addDays(monday, di)
      const isCurrentMonth = date.getMonth() === monthIndex
      return {
        date,
        isToday: sameDay(date, today),
        isCurrentMonth,
        shift: isCurrentMonth ? getShiftInfoForDate(shiftStartDate, date, pattern) : null,
      }
    })
    weeks.push({ weekNumber: getIsoWeek(monday), days })
  }
  return { year, monthIndex, weeks }
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function DayCell({ day, onSelect, isSelected, eventCount }: {
  day: CalendarDay | null
  onSelect: (d: CalendarDay) => void
  isSelected: boolean
  eventCount: number
}) {
  if (!day || !day.isCurrentMonth) return <div className="h-8" />
  const symbol = day.shift?.symbol ?? '-'
  const isSunday = day.date.getDay() === 0
  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-label={`${calendarDayFormatter.format(day.date)}: ${day.shift?.label ?? 'Keine Schicht'}${
        eventCount > 0 ? `, ${eventCount} Event${eventCount === 1 ? '' : 's'}` : ''
      }`}
      className={cn(
        'relative h-8 w-full flex items-center justify-center rounded-sm text-xs font-bold transition-all select-none',
        shiftCellClass[symbol],
        day.isToday && 'ring-2 ring-red-500 ring-offset-1 dark:ring-offset-[#0f1f0f] z-10',
        isSelected && !day.isToday && 'ring-2 ring-white/60 z-10',
        symbol === '-' && isSunday && 'text-red-500 dark:text-red-400',
      )}
    >
      {symbol !== '-' && (
        <span className="absolute top-0.5 left-1 text-[8px] font-medium opacity-80 leading-none">
          {day.date.getDate()}
        </span>
      )}
      {symbol === '-' ? day.date.getDate() : symbol}
      {eventCount > 0 && (
        <span
          className={cn(
            'absolute bottom-0.5 right-0.5 flex h-2 min-w-2 items-center justify-center rounded-full px-0.5 text-[6px] leading-none',
            symbol === '-' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700'
          )}
          aria-hidden="true"
        >
          {eventCount > 1 ? eventCount : ''}
        </span>
      )}
    </button>
  )
}

function MonthGrid({ month, selectedDate, onSelect, eventsByDate }: {
  month: CalendarMonth
  selectedDate: Date | null
  onSelect: (d: CalendarDay) => void
  eventsByDate: Map<string, Event[]>
}) {
  return (
    <div>
      <h2 className="text-center text-sm font-bold text-gray-800 dark:text-slate-200 mb-2 tracking-wide">
        {MONTH_NAMES[month.monthIndex]}
      </h2>
      <div className="grid grid-cols-[2rem_repeat(7,1fr)] gap-0.5 mb-0.5">
        <div className="text-[9px] font-medium text-gray-400 dark:text-slate-600 flex items-center justify-center uppercase">KW</div>
        {weekdays.map((d) => (
          <div key={d} className={cn(
            'text-[10px] font-medium text-center py-0.5',
            d === 'So' ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'
          )}>{d}</div>
        ))}
      </div>
      {month.weeks.map((week) => (
        <div key={week.weekNumber} className="grid grid-cols-[2rem_repeat(7,1fr)] gap-0.5 mb-0.5">
          <div className="text-[9px] text-gray-400 dark:text-slate-600 flex items-center justify-center font-medium">
            {week.weekNumber}
          </div>
          {week.days.map((day, idx) => (
            <DayCell
              key={day ? day.date.toISOString() : `e-${week.weekNumber}-${idx}`}
              day={day}
              onSelect={onSelect}
              isSelected={!!day && !!selectedDate && sameDay(day.date, selectedDate)}
              eventCount={day ? (eventsByDate.get(getLocalDateKey(day.date))?.length ?? 0) : 0}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function CalendarPage() {
  const { organization, shiftGroup } = useAuth()
  const organizationId = organization?.id
  const [today] = useState(() => new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState('')

  const [year, setYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>({
    date: today,
    isToday: true,
    isCurrentMonth: true,
    shift: getShiftInfoForDate(shiftGroup?.anchor_date, today, shiftGroup?.pattern),
  })

  const months = useMemo(
    () => Array.from(
      { length: 12 },
      (_, i) => buildMonth(year, i, shiftGroup?.anchor_date, shiftGroup?.pattern)
    ),
    [year, shiftGroup?.anchor_date, shiftGroup?.pattern]
  )

  useEffect(() => {
    let cancelled = false

    const loadEvents = async () => {
      if (!organizationId) {
        setEvents([])
        setEventsLoading(false)
        return
      }

      setEventsLoading(true)
      setEventsError('')
      try {
        const rangeStart = new Date(year, 0, 1).toISOString()
        const rangeEnd = new Date(year + 1, 0, 1).toISOString()
        const nextEvents = await getScheduledEventsForRange(organizationId, rangeStart, rangeEnd)
        if (!cancelled) setEvents(nextEvents)
      } catch {
        if (!cancelled) setEventsError('Geplante Events konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setEventsLoading(false)
      }
    }

    void loadEvents()
    return () => { cancelled = true }
  }, [organizationId, year])

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, Event[]>()
    events.forEach((event) => {
      if (!event.starts_at) return
      const key = getDateKeyInTimeZone(event.starts_at, organization?.timezone)
      if (!key) return
      const entries = grouped.get(key)
      if (entries) entries.push(event)
      else grouped.set(key, [event])
    })
    return grouped
  }, [events, organization?.timezone])

  // Ref-Array für alle 12 Monate
  const monthRefs = useRef<(HTMLDivElement | null)[]>([])

  // Beim Laden & Jahreswechsel: zum aktuellen Monat scrollen
  useEffect(() => {
    const targetMonth = year === today.getFullYear() ? today.getMonth() : 0
    const ref = monthRefs.current[targetMonth]
    if (ref) {
      const timer = window.setTimeout(
        () => ref.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        50
      )
      return () => window.clearTimeout(timer)
    }
  }, [year, today])

  const shiftDetailClass: Record<ShiftSymbol, string> = {
    F: 'bg-amber-400 text-white',
    S: 'bg-red-500 text-white',
    N: 'bg-blue-600 text-white',
    '-': 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
  }

  const selectedShift = selectedDay
    ? getShiftInfoForDate(shiftGroup?.anchor_date, selectedDay.date, shiftGroup?.pattern)
    : null
  const selectedSymbol = selectedShift?.symbol ?? '-'
  const selectedEvents = selectedDay
    ? eventsByDate.get(getLocalDateKey(selectedDay.date)) ?? []
    : []

  const changeYear = (nextYear: number) => {
    setYear(nextYear)
    setSelectedDay(null)
  }

  return (
    <div className="mx-auto max-w-md pb-48 sm:pb-6">

      {!shiftGroup && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Noch keine Schichtgruppe zugeordnet</p>
          <p className="mt-1 text-xs text-amber-700">
            Ein Admin deines Betriebs kann die Zuordnung im Admin-Bereich vornehmen.
          </p>
        </div>
      )}

      {eventsError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{eventsError}</p>
      )}

      {/* Jahr-Navigation */}
      <div className="flex items-center justify-between mb-5 sticky top-14 z-10 glass py-2 px-1 rounded-xl">
        <button onClick={() => changeYear(year - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
          aria-label="Vorheriges Jahr">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-50">{year}</h1>
        <button onClick={() => changeYear(year + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
          aria-label="Nächstes Jahr">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Alle 12 Monate */}
      <div className="flex flex-col gap-2">
        {months.map((month, i) => (
          <div
            key={month.monthIndex}
            ref={el => { monthRefs.current[i] = el }}
            className="glass rounded-2xl p-2 scroll-mt-[116px]"
          >
            <MonthGrid
              month={month}
              selectedDate={selectedDay?.date ?? null}
              onSelect={setSelectedDay}
              eventsByDate={eventsByDate}
            />
          </div>
        ))}
      </div>

      {/* Ausgewählter Tag — fixed über Nav */}
      {selectedDay && (
        <div className="fixed bottom-16 left-0 right-0 max-h-[52vh] overflow-y-auto sm:sticky sm:bottom-0 glass rounded-t-2xl rounded-b-none border border-white/30 dark:border-emerald-900/25 border-b-0 p-4 shadow-lg z-20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">
                Ausgewählter Tag
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-slate-50 capitalize">
                {new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(selectedDay.date)}
              </p>
            </div>
            <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold', shiftDetailClass[selectedSymbol])}>
              {selectedSymbol === '-' ? '—' : selectedSymbol}
            </div>
          </div>
          {selectedShift?.label && (
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{selectedShift.label}</p>
          )}
          {eventsLoading ? (
            <p className="mt-3 text-xs text-gray-400">Events werden geladen …</p>
          ) : selectedEvents.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-emerald-900/30">
              {selectedEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="rounded-xl bg-emerald-50 px-3 py-2 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60"
                >
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                        {event.title}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        {formatEventSchedule(event.starts_at, event.ends_at, organization?.timezone)}
                      </p>
                      {event.final_location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {event.final_location}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-400">Keine Events an diesem Tag.</p>
          )}
        </div>
      )}
    </div>
  )
}
