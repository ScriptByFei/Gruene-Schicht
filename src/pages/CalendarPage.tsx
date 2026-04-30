import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
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

function formatSelectedDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function createMonthOffset(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + offset, 1)
}

function CalendarMonthBlock({
  month,
  selectedDate,
  onSelectDay,
}: {
  month: CalendarMonth
  selectedDate: Date | null
  onSelectDay: (day: CalendarDay) => void
}) {
  return (
    <section>
      <div className="bg-zinc-900 px-2 py-1.5 text-center">
        <h2 className="text-2xl font-light capitalize leading-tight text-white sm:text-3xl">{formatMonth(month.date)}</h2>
        <div className="mt-0.5 grid grid-cols-[18px_repeat(7,minmax(0,1fr))] text-xl font-light text-white sm:text-2xl">
          <div />
          {weekdays.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
      </div>

      <div className="bg-black pb-0.5 pt-2">
        {month.weeks.map((week) => (
          <div key={`${month.date.toISOString()}-${week.weekNumber}`} className="grid grid-cols-[18px_repeat(7,minmax(0,1fr))] items-end">
            <div className="pb-6 pl-0.5 text-[9px] italic text-zinc-600 sm:text-[11px]">{week.weekNumber}</div>
            {week.days.map((day, index) => (
              <DayCell
                key={day ? day.date.toISOString() : `${week.weekNumber}-${index}`}
                day={day}
                isSunday={index === 6}
                isSelected={!!day && !!selectedDate && sameDay(day.date, selectedDate)}
                onSelectDay={onSelectDay}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function DayCell({
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
  if (!day) return <div className="h-[56px] sm:h-16" />

  const symbol = day.shift?.symbol ?? '-'
  const showBlock = symbol !== '-'

  return (
    <button
      type="button"
      onClick={() => onSelectDay(day)}
      aria-pressed={isSelected}
      aria-label={`${formatSelectedDate(day.date)}: ${day.shift?.label ?? 'Frei'}`}
      className={cn(
        'relative flex h-[56px] flex-col items-center justify-start text-white transition-transform active:scale-95 sm:h-16',
        isSelected && 'z-10 scale-[1.02]'
      )}
    >
      <div className={cn('text-xl font-light leading-none sm:text-2xl', isSunday && 'text-red-600', day.isToday && 'text-red-500 italic')}>
        {day.date.getDate()}
      </div>

      <div
        className={cn(
          'mt-1.5 flex h-8 w-full items-center justify-center border border-black text-xl font-light leading-none sm:h-9 sm:text-2xl',
          showBlock ? shiftStyles[symbol] : 'bg-black text-white',
          day.isToday && 'ring-3 ring-red-600 ring-inset',
          isSelected && 'ring-4 ring-white ring-inset'
        )}
      >
        {symbol}
      </div>
    </button>
  )
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const months = useMemo(
    () => [-1, 0, 1].map((offset) => buildMonth(createMonthOffset(visibleMonth, offset), profile?.shift_start_date)),
    [visibleMonth, profile?.shift_start_date]
  )

  const selectedShift = selectedDay?.shift
  const selectedSymbol = selectedShift?.symbol ?? '-'

  const goToPreviousMonth = () =>
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))

  const goToNextMonth = () =>
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))

  const goToToday = () => {
    const today = new Date()
    setVisibleMonth(today)
    setSelectedDay({ date: today, isToday: true, shift: getShiftInfoForDate(profile?.shift_start_date, today) })
  }

  return (
    <div
      className={cn(
        'overflow-hidden bg-black shadow-2xl ring-1 ring-zinc-800',
        isFullscreen ? 'fixed inset-0 z-50 flex h-svh flex-col rounded-none' : 'rounded-2xl'
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-black px-2 py-2">
        <Button variant="ghost" size="sm" onClick={goToPreviousMonth} aria-label="Vorheriger Monat" className="px-2 text-white hover:bg-zinc-900">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button type="button" onClick={goToToday} className="text-xs font-semibold text-zinc-300 hover:text-white sm:text-sm">
          Heute
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen((current) => !current)} aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'} className="px-2 text-white hover:bg-zinc-900">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNextMonth} aria-label="Nächster Monat" className="px-2 text-white hover:bg-zinc-900">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedDay && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Ausgewählter Tag</div>
            <div className="text-sm font-semibold capitalize">{formatSelectedDate(selectedDay.date)}</div>
          </div>
          <div className={cn('min-w-14 px-3 py-1 text-center text-lg font-semibold', shiftStyles[selectedSymbol])}>
            {selectedSymbol === '-' ? 'Frei' : selectedSymbol}
          </div>
        </div>
      )}

      <div className={cn('overflow-y-auto bg-black', isFullscreen ? 'min-h-0 flex-1' : 'max-h-[calc(100svh-190px)]')}>
        {months.map((month) => (
          <CalendarMonthBlock key={month.date.toISOString()} month={month} selectedDate={selectedDay?.date ?? null} onSelectDay={setSelectedDay} />
        ))}
      </div>
    </div>
  )
}
