import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import Button from '../components/ui/Button'
import { cn } from '../lib/cn'
import { getShiftInfoForDate, type ShiftInfo, type ShiftSymbol } from '../lib/shifts'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const shiftStyles: Record<ShiftSymbol, string> = {
  F: 'bg-yellow-300 text-black',
  S: 'bg-red-600 text-white',
  N: 'bg-blue-700 text-white',
  '-': 'bg-black text-white',
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
  date: Date
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

function buildMonth(monthDate: Date, shiftStartDate?: string | null): CalendarMonth {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const firstCell = addDays(firstOfMonth, -mondayOffset)
  const totalCells = Math.ceil((mondayOffset + lastOfMonth.getDate()) / 7) * 7
  const today = new Date()

  const weeks: CalendarWeek[] = []

  for (let weekIndex = 0; weekIndex < totalCells / 7; weekIndex += 1) {
    const monday = addDays(firstCell, weekIndex * 7)
    const days: CalendarCell[] = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(monday, dayIndex)
      if (date.getMonth() !== monthDate.getMonth()) return null

      return {
        date,
        isToday: sameDay(date, today),
        shift: getShiftInfoForDate(shiftStartDate, date),
      }
    })

    weeks.push({ weekNumber: getIsoWeekNumber(monday), days })
  }

  return { date: firstOfMonth, weeks }
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date)
}

function createMonthOffset(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + offset, 1)
}

function CalendarMonthBlock({ month }: { month: CalendarMonth }) {
  return (
    <section>
      <div className="bg-zinc-900 px-2 py-2 text-center">
        <h2 className="text-3xl font-light capitalize leading-tight text-white sm:text-4xl">{formatMonth(month.date)}</h2>
        <div className="mt-1 grid grid-cols-[22px_repeat(7,minmax(0,1fr))] text-2xl font-light text-white sm:text-3xl">
          <div />
          {weekdays.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
      </div>

      <div className="bg-black pb-1 pt-3">
        {month.weeks.map((week) => (
          <div key={`${month.date.toISOString()}-${week.weekNumber}`} className="grid grid-cols-[22px_repeat(7,minmax(0,1fr))] items-end">
            <div className="pb-8 pl-1 text-[10px] italic text-zinc-600 sm:text-xs">{week.weekNumber}</div>
            {week.days.map((day, index) => (
              <DayCell key={day ? day.date.toISOString() : `${week.weekNumber}-${index}`} day={day} isSunday={index === 6} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function DayCell({ day, isSunday }: { day: CalendarCell; isSunday: boolean }) {
  if (!day) return <div className="h-[72px] sm:h-20" />

  const symbol = day.shift?.symbol ?? '-'
  const showBlock = symbol !== '-'

  return (
    <div className="relative flex h-[72px] flex-col items-center justify-start text-white sm:h-20">
      <div className={cn('text-2xl font-light leading-none sm:text-3xl', isSunday && 'text-red-600', day.isToday && 'text-red-500 italic')}>
        {day.date.getDate()}
      </div>

      <div
        className={cn(
          'mt-2 flex h-10 w-full items-center justify-center border border-black text-2xl font-light leading-none sm:h-11 sm:text-3xl',
          showBlock ? shiftStyles[symbol] : 'bg-black text-white',
          day.isToday && 'ring-4 ring-red-600 ring-inset'
        )}
        aria-label={day.shift?.label ?? 'Frei'}
      >
        {symbol}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())

  const months = useMemo(
    () => [-1, 0, 1].map((offset) => buildMonth(createMonthOffset(visibleMonth, offset), profile?.shift_start_date)),
    [visibleMonth, profile?.shift_start_date]
  )

  const goToPreviousMonth = () =>
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))

  const goToNextMonth = () =>
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))

  const goToToday = () => setVisibleMonth(new Date())

  return (
    <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-zinc-800">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-black px-3 py-3">
        <Button variant="ghost" size="sm" onClick={goToPreviousMonth} aria-label="Vorheriger Monat" className="text-white hover:bg-zinc-900">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button type="button" onClick={goToToday} className="text-sm font-semibold text-zinc-300 hover:text-white">
          Heute anzeigen
        </button>
        <Button variant="ghost" size="sm" onClick={goToNextMonth} aria-label="Nächster Monat" className="text-white hover:bg-zinc-900">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-[calc(100svh-190px)] overflow-y-auto bg-black">
        {months.map((month) => (
          <CalendarMonthBlock key={month.date.toISOString()} month={month} />
        ))}
      </div>
    </div>
  )
}
