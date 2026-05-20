import { useMemo, useRef, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { cn } from '../lib/cn'
import { getShiftInfoForDate, SHIFT_PATTERN, type ShiftInfo, type ShiftSymbol } from '../lib/shifts'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

const shiftLetterClass: Record<ShiftSymbol, string> = {
  F: 'text-amber-500 dark:text-amber-400',
  S: 'text-red-500 dark:text-red-400',
  N: 'text-blue-500 dark:text-blue-400',
  '-': 'text-transparent',
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
interface CalendarWeek { weekNumber: number; days: CalendarCell[] }
interface CalendarMonth { year: number; monthIndex: number; weeks: CalendarWeek[] }

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}
function getIsoWeekNumber(date: Date): number {
  const t = new Date(date.valueOf())
  const dn = (date.getDay() + 6) % 7
  t.setDate(t.getDate() - dn + 3)
  const ft = new Date(t.getFullYear(), 0, 4)
  const fdn = (ft.getDay() + 6) % 7
  ft.setDate(ft.getDate() - fdn + 3)
  return 1 + Math.round((t.getTime() - ft.getTime()) / (7 * 24 * 60 * 60 * 1000))
}
function buildMonth(year: number, monthIndex: number, shiftStartDate?: string | null): CalendarMonth {
  const firstOfMonth = new Date(year, monthIndex, 1)
  const lastOfMonth = new Date(year, monthIndex + 1, 0)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const firstCell = addDays(firstOfMonth, -mondayOffset)
  const totalCells = Math.ceil((mondayOffset + lastOfMonth.getDate()) / 7) * 7
  const today = new Date()
  const weeks: CalendarWeek[] = []
  for (let wi = 0; wi < totalCells / 7; wi++) {
    const monday = addDays(firstCell, wi * 7)
    const days: CalendarCell[] = Array.from({ length: 7 }, (_, di) => {
      const date = addDays(monday, di)
      if (date.getMonth() !== monthIndex) return null
      return { date, isToday: sameDay(date, today), shift: getShiftInfoForDate(shiftStartDate, date) }
    })
    weeks.push({ weekNumber: getIsoWeekNumber(monday), days })
  }
  return { year, monthIndex, weeks }
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(date)
}

function MiniDayCell({ day, isSunday, isSelected, onSelectDay }: {
  day: CalendarCell; isSunday: boolean; isSelected: boolean; onSelectDay: (d: CalendarDay) => void
}) {
  if (!day) return <div className="h-9" />
  const symbol = day.shift?.symbol ?? '-'
  const hasShift = symbol !== '-'
  return (
    <button
      type="button"
      onClick={() => onSelectDay(day)}
      className={cn(
        'relative flex h-9 flex-col items-center justify-center rounded-lg transition-all active:scale-95',
        isSelected
          ? 'bg-emerald-500 text-white'
          : day.isToday
            ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-[#0f1f0f]'
            : 'hover:bg-gray-100 dark:hover:bg-slate-800'
      )}
    >
      <span className={cn(
        'text-xs font-medium sm:text-sm leading-none',
        isSelected
          ? 'text-white font-bold'
          : isSunday
            ? 'text-red-500 dark:text-red-400'
            : day.isToday
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-gray-800 dark:text-slate-200'
      )}>
        {day.date.getDate()}
      </span>
      {hasShift && (
        <span className={cn(
          'text-[8px] font-bold leading-none mt-0.5',
          isSelected ? 'text-white' : shiftLetterClass[symbol]
        )}>
          {symbol}
        </span>
      )}
    </button>
  )
}

function MonthCard({ month, selectedDate, onSelectDay, monthRef }: {
  month: CalendarMonth; selectedDate: Date | null
  onSelectDay: (d: CalendarDay) => void; monthRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div ref={monthRef} className="glass rounded-2xl p-4 shadow-sm">
      <h2 className="mb-3 text-center text-sm font-semibold text-gray-700 dark:text-slate-300 tracking-wide">
        {MONTH_NAMES[month.monthIndex]} <span className="text-gray-400 dark:text-slate-500 font-normal">{month.year}</span>
      </h2>
      <div className="grid grid-cols-7">
        {weekdays.map((d) => (
          <div key={d} className="pb-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500">
            {d}
          </div>
        ))}
        {month.weeks.flatMap((week) =>
          week.days.map((day, idx) => {
            const key = day ? day.date.toISOString() : `e-${week.weekNumber}-${idx}-${month.monthIndex}`
            return (
              <MiniDayCell
                key={key}
                day={day}
                isSunday={idx === 6}
                isSelected={!!day && !!selectedDate && sameDay(day.date, selectedDate)}
                onSelectDay={onSelectDay}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const today = new Date()

  // Navigation state: which month is shown first
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>({
    date: today,
    isToday: true,
    shift: getShiftInfoForDate(profile?.shift_start_date, today),
  })

  const currentMonthRef = useRef<HTMLDivElement>(null)

  // Build 3 consecutive months starting from viewMonth/viewYear
  const months = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => {
      let m = viewMonth + i
      let y = viewYear
      if (m > 11) { m -= 12; y += 1 }
      return buildMonth(y, m, profile?.shift_start_date)
    })
  }, [viewYear, viewMonth, profile?.shift_start_date])

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const goToToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelectedDay({ date: today, isToday: true, shift: getShiftInfoForDate(profile?.shift_start_date, today) })
  }

  const selectedShift = selectedDay?.shift
  const selectedSymbol = selectedShift?.symbol ?? '-'

  const firstMonth = months[0]

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-6">

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={prevMonth}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all pixel-shadow"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-50">
            {MONTH_NAMES[firstMonth.monthIndex]}
          </h1>
          <p className="text-xs text-gray-400 dark:text-slate-500">{firstMonth.year}</p>
        </div>

        <button
          onClick={nextMonth}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all pixel-shadow"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Heute-Button — nur sichtbar wenn nicht im aktuellen Monat */}
      {!isCurrentMonth && (
        <button
          onClick={goToToday}
          className="w-full text-xs text-emerald-600 dark:text-emerald-400 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors font-medium"
        >
          ↩ Zurück zu heute
        </button>
      )}


      {/* 3 Monate */}
      <div className="flex flex-col gap-4">
        {months.map((month, i) => (
          <MonthCard
            key={`${month.year}-${month.monthIndex}`}
            month={month}
            selectedDate={selectedDay?.date ?? null}
            onSelectDay={setSelectedDay}
            monthRef={i === 0 ? currentMonthRef : undefined}
          />
        ))}
      </div>

      {/* Ausgewählter Tag */}
      {selectedDay && (
        <div className="sticky bottom-20 sm:bottom-4 glass rounded-2xl border border-white/30 dark:border-emerald-900/25 p-4 shadow-lg pixel-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">
                Ausgewählter Tag
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-slate-50 capitalize">
                {formatSelectedDate(selectedDay.date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedShift && (
                <span className={cn('rounded-xl px-3 py-1.5 text-sm font-bold', shiftLabelClass[selectedSymbol])}>
                  {selectedShift.label}
                </span>
              )}
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold', shiftLabelClass[selectedSymbol])}>
                {selectedSymbol === '-' ? '—' : selectedSymbol}
              </div>
            </div>
          </div>
          {selectedShift?.patternDay && (
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Tag {selectedShift.patternDay} / {SHIFT_PATTERN.length} im 28-Tage-Zyklus
            </p>
          )}
        </div>
      )}
    </div>
  )
}
