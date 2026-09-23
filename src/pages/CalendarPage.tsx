import { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { cn } from '../lib/cn'
import {
  getEffectiveShiftInfoForDate,
  DEFAULT_SHIFT_PATTERN,
  formatShiftStartDate,
  type ShiftInfo,
  type ShiftSymbol,
} from '../lib/shifts'
import { getScheduledEventsForRange } from '../services/events'
import { getShiftGroups } from '../services/shiftGroups'
import { getShiftOverrides } from '../services/shiftRequests'
import { formatEventSchedule, getDateKeyInTimeZone, getLocalDateKey } from '../lib/dateTime'
import type { Event, ShiftGroup, ShiftGroupColor, ShiftOverride } from '../types'
import { readOfflineCache, writeOfflineCache } from '../lib/offlineCache'

interface CalendarCache {
  events: Event[]
  shiftOverrides: ShiftOverride[]
  groups?: ShiftGroup[]
}

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
const calendarDayFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'long',
})

const shiftCellClass: Record<ShiftSymbol, string> = {
  F: 'bg-yellow-400 text-yellow-950',
  S: 'bg-red-500 text-white',
  N: 'bg-blue-600 text-white',
  '-': 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
}

const groupDotClass: Record<ShiftGroupColor, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-600',
  green: 'bg-emerald-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
}

interface GroupShift {
  group: ShiftGroup
  shift: ShiftInfo | null
  override: ShiftOverride | null
}

interface CalendarDay {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  groupShifts: GroupShift[]
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
  groups: ShiftGroup[],
  ownGroupId: string | undefined,
  overridesByDate: Map<string, ShiftOverride>
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
      const ownOverride = isCurrentMonth
        ? overridesByDate.get(getLocalDateKey(date)) ?? null
        : null
      return {
        date,
        isToday: sameDay(date, today),
        isCurrentMonth,
        groupShifts: isCurrentMonth
          ? groups.map((group) => {
              const override = group.id === ownGroupId ? ownOverride : null
              return {
                group,
                shift: getEffectiveShiftInfoForDate(
                  group.anchor_date,
                  date,
                  group.pattern,
                  override?.shift_symbol
                ),
                override,
              }
            })
          : [],
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
  onSelect: (date: Date) => void
  isSelected: boolean
  eventCount: number
}) {
  if (!day || !day.isCurrentMonth) return <div className="h-12" />
  const onlyGroup = day.groupShifts.length === 1 ? day.groupShifts[0] : null
  const symbol = onlyGroup?.shift?.symbol ?? '-'
  const isSunday = day.date.getDay() === 0
  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      aria-label={`${calendarDayFormatter.format(day.date)}: ${day.groupShifts.map(({ group, shift }) => `${group.name}: ${shift?.label ?? 'Keine Schicht'}`).join(', ') || 'Keine Schichtgruppe'}${
        eventCount > 0 ? `, ${eventCount} Event${eventCount === 1 ? '' : 's'}` : ''
      }${day.groupShifts.some(({ override }) => override) ? ', genehmigte Schichtänderung' : ''}`}
      className={cn(
        'relative h-12 w-full flex items-center justify-center rounded-md text-xs font-bold transition-all select-none',
        onlyGroup ? shiftCellClass[symbol] : 'bg-white/70 dark:bg-slate-900/70',
        day.isToday && 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-[#0f1f0f] z-10',
        isSelected && !day.isToday && 'ring-2 ring-emerald-400 z-10',
        onlyGroup && symbol === '-' && isSunday && 'text-red-500 dark:text-red-400',
      )}
    >
      {day.groupShifts.length > 1 ? (
        <>
          <span className="absolute top-0.5 left-1 text-[9px] leading-none text-gray-600 dark:text-slate-300">
            {day.date.getDate()}
          </span>
          <span className="mt-2 grid w-full grid-cols-2 gap-0.5 px-0.5">
            {day.groupShifts.map(({ group, shift }) => (
              <span
                key={group.id}
                title={`${group.name}: ${shift?.label ?? 'Keine Schicht'}`}
                className={cn('flex h-3 items-center justify-center gap-0.5 rounded-[2px] text-[8px] leading-none', shiftCellClass[shift?.symbol ?? '-'])}
              >
                <span className={cn('h-1 w-1 shrink-0 rounded-full ring-1 ring-white/70', groupDotClass[group.color])} />
                {shift?.symbol === '-' ? '·' : shift?.symbol ?? '·'}
              </span>
            ))}
          </span>
        </>
      ) : onlyGroup ? (
        <>
          <span className="absolute top-0.5 left-1 text-[9px] font-medium leading-none">
            {day.date.getDate()}
          </span>
          <span className="pt-2">{symbol === '-' ? '—' : symbol}</span>
        </>
      ) : day.date.getDate()}
      {eventCount > 0 && (
        <span
          className={cn(
            'absolute right-0.5 top-0.5 flex h-2 min-w-2 items-center justify-center rounded-full px-0.5 text-[6px] leading-none',
            'bg-emerald-600 text-white'
          )}
          aria-hidden="true"
        >
          {eventCount > 1 ? eventCount : ''}
        </span>
      )}
      {day.groupShifts.some(({ override }) => override) && (
        <span
          className="absolute left-0.5 bottom-0.5 h-1.5 w-1.5 rounded-full bg-violet-500 ring-1 ring-white"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

function MonthGrid({ month, selectedDate, onSelect, eventsByDate }: {
  month: CalendarMonth
  selectedDate: Date | null
  onSelect: (date: Date) => void
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
  const { user, organization, shiftGroup } = useAuth()
  const userId = user?.id
  const organizationId = organization?.id
  const [today] = useState(() => new Date())
  const [groups, setGroups] = useState<ShiftGroup[]>(shiftGroup ? [shiftGroup] : [])
  const [selectedGroupId, setSelectedGroupId] = useState('all')
  const [events, setEvents] = useState<Event[]>([])
  const [shiftOverrides, setShiftOverrides] = useState<ShiftOverride[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [usingCachedData, setUsingCachedData] = useState(false)

  const [year, setYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<Date | null>(today)

  const visibleGroups = useMemo(
    () => selectedGroupId === 'all'
      ? groups
      : groups.filter((group) => group.id === selectedGroupId),
    [groups, selectedGroupId]
  )

  const overridesByDate = useMemo(
    () => new Map(shiftOverrides.map((override) => [override.shift_date, override])),
    [shiftOverrides]
  )

  const months = useMemo(
    () => Array.from(
      { length: 12 },
      (_, i) => buildMonth(
        year,
        i,
        visibleGroups,
        shiftGroup?.id,
        overridesByDate
      )
    ),
    [year, visibleGroups, shiftGroup?.id, overridesByDate]
  )

  useEffect(() => {
    let cancelled = false

    const loadCalendarData = async () => {
      if (!organizationId || !userId) {
        setEvents([])
        setShiftOverrides([])
        setGroups([])
        setEventsLoading(false)
        return
      }

      setEventsLoading(true)
      setEventsError('')
      try {
        const rangeStart = new Date(year, 0, 1).toISOString()
        const rangeEnd = new Date(year + 1, 0, 1).toISOString()
        const [nextEvents, nextOverrides, nextGroups] = await Promise.all([
          getScheduledEventsForRange(organizationId, rangeStart, rangeEnd),
          getShiftOverrides(organizationId, userId, `${year}-01-01`, `${year}-12-31`),
          getShiftGroups(organizationId),
        ])
        if (!cancelled) {
          setEvents(nextEvents)
          setShiftOverrides(nextOverrides)
          setGroups(nextGroups)
          setUsingCachedData(false)
          writeOfflineCache<CalendarCache>(userId, `calendar:${organizationId}:${year}`, {
            events: nextEvents,
            shiftOverrides: nextOverrides,
            groups: nextGroups,
          })
        }
      } catch {
        if (!cancelled) {
          const cached = readOfflineCache<CalendarCache>(
            userId,
            `calendar:${organizationId}:${year}`
          )
          if (cached) {
            setEvents(cached.events)
            setShiftOverrides(cached.shiftOverrides)
            setGroups(cached.groups ?? (shiftGroup ? [shiftGroup] : []))
            setUsingCachedData(true)
            setEventsError('Offline – zuletzt synchronisierte Kalenderdaten werden angezeigt.')
          } else {
            setEventsError('Kalenderdaten konnten nicht vollständig geladen werden.')
          }
        }
      } finally {
        if (!cancelled) setEventsLoading(false)
      }
    }

    void loadCalendarData()
    return () => { cancelled = true }
  }, [organizationId, userId, year, shiftGroup])

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
    F: 'bg-yellow-400 text-yellow-950',
    S: 'bg-red-500 text-white',
    N: 'bg-blue-600 text-white',
    '-': 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
  }

  const selectedOverride = selectedDay
    ? overridesByDate.get(getLocalDateKey(selectedDay)) ?? null
    : null
  const selectedGroupShifts = selectedDay
    ? visibleGroups.map((group) => ({
        group,
        shift: getEffectiveShiftInfoForDate(
          group.anchor_date,
          selectedDay,
          group.pattern,
          group.id === shiftGroup?.id ? selectedOverride?.shift_symbol : undefined
        ),
      }))
    : []
  const selectedEvents = selectedDay
    ? eventsByDate.get(getLocalDateKey(selectedDay)) ?? []
    : []

  const changeYear = (nextYear: number) => {
    setYear(nextYear)
    setSelectedDay(null)
  }

  return (
    <div className="mx-auto max-w-md pb-48 sm:pb-6">

      {!shiftGroup && organization && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Deine Schichtgruppe ist noch nicht zugeordnet</p>
          <p className="mt-1 text-xs text-amber-700">
            Du kannst den Plan aller Gruppen ansehen. Ein Admin kann deine persönliche Zuordnung im Admin-Bereich vornehmen.
          </p>
        </div>
      )}

      {eventsError && (
        <p className={cn(
          'mb-4 rounded-xl px-4 py-3 text-sm',
          usingCachedData ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-600'
        )}>{eventsError}</p>
      )}

      {groups.length > 0 && (
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70" aria-label="Schichtgruppen und Legende">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Schichtplan</h2>
            <span className="text-xs text-gray-500 dark:text-slate-400">{groups.length} Gruppen</span>
          </div>
          {groups.every((group) => group.pattern === DEFAULT_SHIFT_PATTERN) && (
            <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
              {DEFAULT_SHIFT_PATTERN.length}-Tage-Rhythmus: <code className="font-mono">{DEFAULT_SHIFT_PATTERN}</code>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Schichtgruppe anzeigen">
            <button
              type="button"
              onClick={() => setSelectedGroupId('all')}
              aria-pressed={selectedGroupId === 'all'}
              className={cn('rounded-full border px-3 py-1.5 text-xs font-medium', selectedGroupId === 'all'
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-gray-200 text-gray-700 dark:border-slate-700 dark:text-slate-300')}
            >
              Alle
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                aria-pressed={selectedGroupId === group.id}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium', selectedGroupId === group.id
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-gray-200 text-gray-700 dark:border-slate-700 dark:text-slate-300')}
              >
                <span className={cn('h-2 w-2 rounded-full', groupDotClass[group.color])} />
                {group.name}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600 dark:text-slate-300">
            {groups.map((group, index) => (
              <span key={group.id} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', groupDotClass[group.color])} />
                {index + 1}. {group.name}: Start {formatShiftStartDate(group.anchor_date)}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-gray-500 dark:text-slate-400">
            Im Tagesfeld stehen die Gruppen in dieser Reihenfolge: links oben bis rechts unten. Der Punkt zeigt die Gruppe, die Feldfarbe die Schichtart.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-[11px] dark:border-slate-700">
            {(['F', 'S', 'N', '-'] as ShiftSymbol[]).map((symbol) => (
              <span key={symbol} className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
                <span className={cn('inline-flex h-4 min-w-4 items-center justify-center rounded px-0.5 text-[9px] font-bold', shiftCellClass[symbol])}>
                  {symbol === '-' ? '—' : symbol}
                </span>
                {{ F: 'Früh', S: 'Spät', N: 'Nacht', '-': 'Frei' }[symbol]}
              </span>
            ))}
          </div>
        </section>
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
              selectedDate={selectedDay}
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
                {new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(selectedDay)}
              </p>
            </div>
          </div>
          {selectedGroupShifts.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {selectedGroupShifts.map(({ group, shift }) => (
                <div key={group.id} className="flex items-center gap-2 rounded-lg bg-white/70 p-2 dark:bg-slate-900/70">
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', groupDotClass[group.color])} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800 dark:text-slate-100">{group.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{shift?.label ?? 'Keine Schicht'}</p>
                  </div>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold', shiftDetailClass[shift?.symbol ?? '-'])}>
                    {shift?.symbol === '-' ? '—' : shift?.symbol ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {selectedOverride && visibleGroups.some((group) => group.id === shiftGroup?.id) && (
            <p className="mt-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
              {selectedOverride.kind === 'swap'
                ? 'Genehmigter Schichttausch'
                : 'Genehmigte Abwesenheit'}
            </p>
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
