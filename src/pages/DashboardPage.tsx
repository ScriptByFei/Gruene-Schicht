import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { getActiveEvents } from '../services/events'
import { getShiftOverrides } from '../services/shiftRequests'
import { getUserAttendanceForEvents } from '../services/attendance'
import EventCard from '../components/events/EventCard'
import { PageSpinner } from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { getEffectiveShiftInfoForDate } from '../lib/shifts'
import { getLocalDateKey } from '../lib/dateTime'
import type { Event, EventAttendance, ShiftOverride } from '../types'
import AccessRequestCard from '../components/onboarding/AccessRequestCard'
import UpcomingShifts from '../components/shifts/UpcomingShifts'

export default function DashboardPage() {
  const { profile, user, organization, shiftGroup } = useAuth()
  const userId = user?.id
  const organizationId = organization?.id
  const [events, setEvents] = useState<Event[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, EventAttendance>>({})
  const [shiftOverrides, setShiftOverrides] = useState<ShiftOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date()
        const finalDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6)
        const [evts, nextOverrides] = await Promise.all([
          getActiveEvents(),
          userId && organizationId
            ? getShiftOverrides(
                organizationId,
                userId,
                getLocalDateKey(today),
                getLocalDateKey(finalDay)
              )
            : Promise.resolve([]),
        ])
        setEvents(evts)
        setShiftOverrides(nextOverrides)

        if (userId && evts.length > 0) {
          const allAttendance = await getUserAttendanceForEvents(
            evts.map((event) => event.id),
            userId
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
  }, [organizationId, userId])

  const activeEvents = events.filter((e) => e.status === 'active')
  const closedEvents = events.filter((e) => e.status === 'closed')

  const currentShiftOverride = shiftOverrides.find(
    (override) => override.shift_date === getLocalDateKey(new Date())
  )
  const currentShift = getEffectiveShiftInfoForDate(
    shiftGroup?.anchor_date,
    new Date(),
    shiftGroup?.pattern,
    currentShiftOverride?.shift_symbol
  )?.label ?? null

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

      {!organization && user && <AccessRequestCard userId={user.id} />}

      {shiftGroup && <UpcomingShifts shiftGroup={shiftGroup} overrides={shiftOverrides} />}

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
