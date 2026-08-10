import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, MessageSquare } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { getEvent } from '../services/events'
import { getPollsForEvent } from '../services/polls'
import { getPollResults, getUserVotesForPoll } from '../services/votes'
import { getAttendanceSummary, getUserAttendance } from '../services/attendance'
import { getSuggestionsForEvent } from '../services/suggestions'
import PollCard from '../components/polls/PollCard'
import AttendanceSection from '../components/attendance/AttendanceSection'
import SuggestionsSection from '../components/suggestions/SuggestionsSection'
import EventStatusBadge from '../components/events/EventStatusBadge'
import { Card } from '../components/ui/Card'
import { PageSpinner } from '../components/ui/Spinner'
import type { Event, Poll, Vote, PollResult, EventAttendance, AttendanceSummary, Suggestion, AttendanceStatus } from '../types'
import { formatEventSchedule } from '../lib/dateTime'
import { getShiftInfoForDate } from '../lib/shifts'

interface PollWithVotes {
  poll: Poll
  results: PollResult[]
  userVotes: Vote[]
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin, organization, shiftGroup } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [pollsWithVotes, setPollsWithVotes] = useState<PollWithVotes[]>([])
  const [attendance, setAttendance] = useState<EventAttendance | null>(null)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({ attending: 0, maybe: 0, declined: 0, total: 0 })
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPolls = useCallback(async () => {
    if (!id || !user) return
    const polls = await getPollsForEvent(id)
    const withVotes = await Promise.all(
      polls.map(async (poll) => ({
        poll,
        results: await getPollResults(poll.id, poll.options ?? []),
        userVotes: await getUserVotesForPoll(poll.id, user.id),
      }))
    )
    setPollsWithVotes(withVotes)
  }, [id, user])

  const loadAttendance = useCallback(async () => {
    if (!id || !user) return
    const [summary, mine] = await Promise.all([
      getAttendanceSummary(id),
      getUserAttendance(id, user.id),
    ])
    setAttendanceSummary(summary)
    setAttendance(mine)
  }, [id, user])

  const loadSuggestions = useCallback(async () => {
    if (!id) return
    const data = await getSuggestionsForEvent(id)
    setSuggestions(data)
  }, [id])

  useEffect(() => {
    const load = async () => {
      if (!id) {
        navigate('/dashboard')
        return
      }
      try {
        const evt = await getEvent(id)
        if (!evt) {
          navigate('/dashboard')
          return
        }
        setEvent(evt)
        await Promise.all([loadPolls(), loadAttendance(), loadSuggestions()])
      } catch {
        setError('Event konnte nicht geladen werden.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, loadAttendance, loadPolls, loadSuggestions, navigate])

  if (loading) return <PageSpinner />
  if (!event) return null

  const isClosed = event.status === 'closed'
  const schedule = formatEventSchedule(
    event.starts_at,
    event.ends_at,
    organization?.timezone
  )
  const eventShift = event.starts_at
    ? getShiftInfoForDate(shiftGroup?.anchor_date, new Date(event.starts_at), shiftGroup?.pattern)
    : null
  const hasFinalInfo = event.final_location || schedule || event.final_date || event.final_note

  return (
    <div>
      {/* Back */}
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Zurück
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 justify-between">
          <div>
            <div className="mb-2">
              <EventStatusBadge status={event.status} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            {event.description && (
              <p className="mt-2 text-gray-600">{event.description}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Schedule and location */}
      {hasFinalInfo && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <h2 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Termin &amp; Treffpunkt
          </h2>
          <div className="flex flex-col gap-2">
            {event.final_location && (
              <div className="flex items-center gap-2 text-sm text-emerald-900">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Ort:</strong> {event.final_location}</span>
              </div>
            )}
            {(schedule || event.final_date) && (
              <div className="flex items-center gap-2 text-sm text-emerald-900">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Termin:</strong> {schedule ?? event.final_date}</span>
              </div>
            )}
            {eventShift && (
              <div className="flex items-center gap-2 text-sm text-emerald-900">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-200 text-[9px] font-bold text-emerald-800">
                  {eventShift.symbol === '-' ? '—' : eventShift.symbol}
                </span>
                <span><strong>Deine Schicht:</strong> {eventShift.label}</span>
              </div>
            )}
            {event.final_note && (
              <div className="flex items-start gap-2 text-sm text-emerald-900">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{event.final_note}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-5">
        {/* Polls */}
        {pollsWithVotes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Umfragen
            </h2>
            <div className="flex flex-col gap-4">
              {pollsWithVotes.map(({ poll, results, userVotes }) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  results={results}
                  userVotes={userVotes}
                  userId={user!.id}
                  onVoteChange={loadPolls}
                />
              ))}
            </div>
          </section>
        )}

        {/* Attendance */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Anwesenheit
          </h2>
          <AttendanceSection
            eventId={event.id}
            userId={user!.id}
            currentStatus={(attendance?.status as AttendanceStatus) ?? null}
            summary={attendanceSummary}
            onStatusChange={(status) => {
              setAttendance((prev) => prev
                ? { ...prev, status }
                : { id: '', event_id: event.id, user_id: user!.id, status, created_at: '', updated_at: '' }
              )
              loadAttendance()
            }}
            eventClosed={isClosed}
          />
        </section>

        {/* Suggestions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Vorschläge
          </h2>
          <SuggestionsSection
            eventId={event.id}
            userId={user!.id}
            suggestions={suggestions}
            isAdmin={isAdmin}
            eventClosed={isClosed}
            onUpdate={loadSuggestions}
          />
        </section>
      </div>
    </div>
  )
}
