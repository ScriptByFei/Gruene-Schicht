import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { getActiveEvents } from '../services/events'
import { getUserAttendanceForEvents } from '../services/attendance'
import EventCard from '../components/events/EventCard'
import { PageSpinner } from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { getCurrentShift } from '../lib/shifts'
import type { Event, EventAttendance } from '../types'

export default function DashboardPage() {
  const { profile, user, organization, shiftGroup } = useAuth()
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
          const allAttendance = await getUserAttendanceForEvents(
            evts.map((event) => event.id),
            user.id
          )
          const map: Record<string, EventAttendance> = {}
          allAttendance.forEach((record) => {
            map[record.event_id] = record
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

  const currentShift = getCurrentShift(shiftGroup?.anchor_date, new Date(), shiftGroup?.pattern)

  if (loading) return <PageSpinner />

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Hallo, {profile?.display_name ?? 'Willkommen'} 👋
        </h1>
        <p className="mt-1.5 text-sm text-gray-600">
          {shiftGroup ? `${shiftGroup.name} Schicht` : 'Schichtgruppe noch nicht zugeordnet'}
          {currentShift && ` · Heute: ${currentShift}`}
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {!organization && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Betriebszugang ausstehend</p>
          <p className="mt-1 text-xs text-amber-700">
            Dein Konto ist registriert, wurde aber noch keinem Betrieb zugeordnet.
          </p>
        </div>
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
    </div>
  )
}
