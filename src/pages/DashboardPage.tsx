import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { getActiveEvents } from '../services/events'
import { getAttendanceForEvent } from '../services/attendance'
import EventCard from '../components/events/EventCard'
import { PageSpinner } from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import type { Event, EventAttendance } from '../types'

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

  if (loading) return <PageSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Hallo, {profile?.display_name ?? 'Willkommen'} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {profile?.department && `${profile.department} · `}
          {profile?.shift_group && `Schicht: ${profile.shift_group}`}
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Active Events */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
          Aktive Events
        </h2>
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
        <section className="mt-8">
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
