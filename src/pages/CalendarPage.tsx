import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import Button from '../components/ui/Button'
import { cn } from '../lib/cn'
import { getShiftInfoForDate, SHIFT_PATTERN, type ShiftInfo, type ShiftSymbol } from '../lib/shifts'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

const shiftDotClass: Record<ShiftSymbol, string> = {
  F: 'bg-amber-400',
  S: 'bg-red-500',
  N: 'bg-blue-600',
  '-': 'bg-transparent',
}

const shiftLabelClass: Record<ShiftSymbol, string> = {
  F: 'bg-amber-100 text-amber-800',
  S: 'bg-red-100 text-red-800',
  N: 'bg-blue-100 text-blue-800',
  '-': 'bg-gray-100 text-gray-500',
}

interface CalendarDay {
  date: Date
  isToday: boolean
  shift: ShiftInfo | null
}

type CalendarCell = CalendarDay | null

interface CalendarWeek {
  weekNumber: number
  days: CalendarCell[]
}

interface CalendarMonth {
  year: number
  monthIndex: number
  weeks: CalendarWeek[]
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getIsoWeekNumber(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDayNumber = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3)
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

function buildMonth(year: number, monthIndex: number, shiftStartDate?: string | null): CalendarMonth {
  const firstOfMonth = new Date(year, monthIndex, 1)
  const lastOfMonth = new Date(year, monthIndex + 1, 0)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const firstCell = addDays(firstOfMonth, -mondayOffset)
  const totalCells = Math.ceil((mondayOffset + lastOfMonth.getDate()) / 7) * 7
  const today = new Date()

  const weeks: CalendarWeek[] = []

  for (let weekIndex = 0; weekIndex < totalCells / 7; weekIndex += 1) {
    const monday = addDays(firstCell, weekIndex * 7)
    const days: CalendarCell[] = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(monday, dayIndex)
      if (date.getMonth() !== monthIndex) return null

      return {
        date,
        isToday: sameDay(date, today),
        shift: getShiftInfoForDate(shiftStartDate, date),
      }
    })

    weeks.push({ weekNumber: getIsoWeekNumber(monday), days })
  }

  return { year, monthIndex, weeks }
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function formatSelectedDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function MiniMonth({
  month,
  selectedDate,
  onSelectDay,
}: {
  month: CalendarMonth
  selectedDate: Date | null
  onSelectDay: (day: CalendarDay) => void
}) {
  const monthName = MONTH_NAMES[month.monthIndex]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-2 text-center text-base font-semibold text-gray-800 dark:text-slate-200">
        {monthName}
      </h2>
      <div className="grid grid-cols-7 gap-0">
        {weekdays.map((d) => (
          <div key={d} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500">
            {d}
          </div>
        ))}
        {month.weeks.flatMap((week) =>
          week.days.map((day, index) => {
            const key = day ? day.date.toISOString() : `empty-${week.weekNumber}-${index}-${month.monthIndex}`
            return <MiniDayCell key={key} day={day} isSunday={index === 6} isSelected={!!day && !!selectedDate && sameDay(day.date, selectedDate)} onSelectDay={onSelectDay} />
          })
        )}
      </div>
    </div>
  )
}

function MiniDayCell({
  day,
  isSunday,
  isSelected,
  onSelectDay,
}: {
  day: CalendarCell
  isSunday: boolean
  isSelected: boolean
  onSelectDay: (day: CalendarDay) => void
}) {
  if (!day) {
    return <div className="h-8 sm:h-9" />
  }

  const symbol = day.shift?.symbol ?? '-'
  const hasShift = symbol !== '-'

  return (
    <button
      type="button"
      onClick={() => onSelectDay(day)}
      aria-pressed={isSelected}
      aria-label={`${formatSelectedDate(day.date)}: ${day.shift?.label ?? 'Frei'}`}
      className={cn(
        'relative flex h-8 flex-col items-center justify-center rounded-md transition-all active:scale-95 sm:h-9',
        isSelected && 'bg-gray-100 dark:bg-slate-800',
        !isSelected && 'hover:bg-gray-50 dark:hover:bg-slate-800'
      )}
    >
      <span
        className={cn(
          'text-xs font-medium sm:text-sm',
          isSunday && 'text-red-500 dark:text-red-400',
          day.isToday ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-slate-300'
        )}
      >
        {day.date.getDate()}
      </span>

      {hasShift && (
        <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2', shiftDotClass[symbol])} />
      )}

      {day.isToday && (
        <span className="absolute bottom-0.5 h-0.5 w-3 rounded-full bg-emerald-500" />
      )}
    </button>
  )
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>({
    date: today,
    isToday: true,
    shift: getShiftInfoForDate(profile?.shift_start_date, today),
  })

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => buildMonth(year, i, profile?.shift_start_date))
  }, [year, profile?.shift_start_date])

  const selectedShift = selectedDay?.shift
  const selectedSymbol = selectedShift?.symbol ?? '-'

  const goToPreviousYear = () => setYear((y) => y - 1)
  const goToNextYear = () => setYear((y) => y + 1)
  const goToToday = () => {
    const y = today.getFullYear()
    setYear(y)
    setSelectedDay({ date: today, isToday: true, shift: getShiftInfoForDate(profile?.shift_start_date, today) })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/40">
            <Calendar className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Schichtkalender</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">{year}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPreviousYear} aria-label="Vorheriges Jahr"> 
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Heute
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNextYear} aria-label="Nächstes Jahr">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900">
        <span className="text-gray-500 dark:text-slate-400">Legende:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-gray-700 dark:text-slate-300">Früh (F)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-gray-700 dark:text-slate-300">Spät (S)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span className="text-gray-700 dark:text-slate-300">Nacht (N)</span>
        </span>
      </div>

      {/* 12 Months Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((month) => (
          <MiniMonth key={`${month.year}-${month.monthIndex}`} month={month} selectedDate={selectedDay?.date ?? null} onSelectDay={setSelectedDay} />
        ))}
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="sticky bottom-0 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Ausgewählter Tag</p>
              <p className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-white capitalize">{formatSelectedDate(selectedDay.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedShift && (
                <div className={cn('rounded-lg px-3 py-1.5 text-sm font-bold', shiftLabelClass[selectedSymbol])}>
                  {selectedShift.label}
                </div>
              )}
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-xl font-bold', shiftLabelClass[selectedSymbol])}>
                {selectedSymbol === '-' ? '—' : selectedSymbol}
              </div>
            </div>
          </div>
          {selectedShift && selectedShift.patternDay && (
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Schichttag {selectedShift.patternDay} / {SHIFT_PATTERN.length} im 28-Tage-Zyklus
            </p>
          )}
        </div>
      )}
    </div>
  )
}
