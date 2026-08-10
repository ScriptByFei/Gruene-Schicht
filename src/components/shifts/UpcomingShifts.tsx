import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { getShiftInfoForDate, type ShiftSymbol } from '../../lib/shifts'
import type { ShiftGroup } from '../../types'

const symbolClasses: Record<ShiftSymbol, string> = {
  F: 'bg-amber-400 text-white',
  S: 'bg-red-500 text-white',
  N: 'bg-blue-600 text-white',
  '-': 'bg-gray-100 text-gray-500',
}
const weekdayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })

export default function UpcomingShifts({ shiftGroup }: { shiftGroup: ShiftGroup }) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index)
    return {
      date,
      shift: getShiftInfoForDate(shiftGroup.anchor_date, date, shiftGroup.pattern),
    }
  })

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
          Deine nächsten 7 Tage
        </h2>
        <Link to="/calendar" className="flex items-center gap-1 text-xs font-medium text-emerald-700">
          Kalender
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ date, shift }, index) => {
          const symbol = shift?.symbol ?? '-'
          return (
            <div key={date.toISOString()} className="text-center">
              <p className="mb-1 text-[10px] font-medium uppercase text-gray-400">
                {index === 0
                  ? 'Heute'
                  : weekdayFormatter.format(date)}
              </p>
              <div className={cn(
                'flex aspect-square items-center justify-center rounded-lg text-xs font-bold',
                symbolClasses[symbol]
              )}>
                {symbol === '-' ? '—' : symbol}
              </div>
              <p className="mt-1 text-[10px] text-gray-400">{date.getDate()}.</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
