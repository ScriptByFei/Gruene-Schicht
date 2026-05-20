import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { getActiveEvents } from '../services/events'
import { getAttendanceForEvent } from '../services/attendance'
import EventCard from '../components/events/EventCard'
import { PageSpinner } from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Card } from '../components/ui/Card'
import { cn } from '../lib/cn'
import { getCurrentShift, getShiftInfoForDate, getShiftTeamLabel, type ShiftInfo, type ShiftSymbol } from '../lib/shifts'
import type { Event, EventAttendance } from '../types'

const shiftStyles: Record<ShiftSymbol, { badge: string; dot: string }> = {
  F: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  S: { badge: 'bg-sky-100 text-sky-800', dot: 'bg-sky-400' },
  N: { badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-400' },
  '-': { badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-400' },
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}


function formatLongDate(date: Date): string {
  const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  // "Mi. 20.05" — kein Komma, kein abschließender Punkt
  return `${weekday.replace('.', '')}. ${day}.${month}`
}

function ShiftPill({ shift }: { shift: ShiftInfo }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', shiftStyles[shift.symbol].badge)}>
      {shift.label}
    </span>
  )
}

export default function DashboardPage() {
  const { profile, user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, EventAttendance>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const evts = await getActiveEvents()
        setEvents(evts)

        if (user && evts.length > 0) {
          const allAttendance = await Promise.all(
            evts.map((e) => getAttendanceForEvent(e.id))
          )
          const map: Record<string, EventAttendance> = {}
          evts.forEach((evt, i) => {
            const myRecord = allAttendance[i].find((a) => a.user_id === user.id)
            if (myRecord) map[evt.id] = myRecord
          })
          setAttendanceMap(map)
        }
      } catch {
        setError('Events konnten nicht geladen werden.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const activeEvents = events.filter((e) => e.status === 'active')
  const closedEvents = events.filter((e) => e.status === 'closed')

  const currentShift = getCurrentShift(profile?.shift_start_date)
  const todayShift = getShiftInfoForDate(profile?.shift_start_date)
  const nextDays = useMemo(
    () => Array.from({ length: 5 }, (_, index) => {
      const date = addDays(new Date(), index)
      return { date, shift: getShiftInfoForDate(profile?.shift_start_date, date) }
    }),
    [profile?.shift_start_date]
  )

  if (loading) return <PageSpinner />

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Hallo, {profile?.display_name ?? 'Willkommen'} 👋
        </h1>
        <p className="mt-1.5 text-sm text-gray-600">
          {getShiftTeamLabel(profile?.shift_start_date)}
          {currentShift && ` · Heute: ${currentShift}`}
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Active Events */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Aktive Events
          </h2>
          {activeEvents.length > 0 && (
            <span className="text-xs font-medium text-gray-500">
              {activeEvents.length} aktiv
            </span>
          )}
        </div>
        {activeEvents.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="w-10 h-10" />}
            title="Keine aktiven Events"
            description="Sobald Events gestartet werden, erscheinen sie hier."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {activeEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                attendance={attendanceMap[event.id]}
              />
            ))}
          </div>
        )}
      </section>

      {/* Closed Events */}
      {closedEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Abgeschlossen
          </h2>
          <div className="flex flex-col gap-3 opacity-70">
            {closedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                attendance={attendanceMap[event.id]}
              />
            ))}
          </div>
        </section>
      )}

      {/* Schicht-Vorschau */}
      {profile?.shift_start_date ? (
        <section>
          <Card>
            {todayShift && (
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Heute:</span>
                  <span className="text-sm font-semibold text-gray-900">{todayShift.label}</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                  {todayShift.symbol === '-' ? '—' : todayShift.symbol}
                </span>
              </div>
            )}
            <h2 className="text-base font-semibold text-gray-900 mb-3">Nächste 5 Tage</h2>
            <div className="flex flex-col divide-y divide-gray-100">
              {nextDays.map(({ date, shift }) => (
                <div key={date.toISOString()} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatLongDate(date)}</p>
                  </div>
                  {shift && <ShiftPill shift={shift} />}
                </div>
              ))}
            </div>
        </Card>
        </section>
      ) : (
        <Card>
          <h2 className="text-base font-semibold text-gray-900">Schicht auswählen</h2>
          <p className="mt-1 text-sm text-gray-600">Wähle im Profil deine Schicht, damit hier angezeigt wird, wie du arbeitest.</p>
          <Link to="/profile" className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Zum Profil
          </Link>
        </Card>
      )}
    </div>
  )
}
