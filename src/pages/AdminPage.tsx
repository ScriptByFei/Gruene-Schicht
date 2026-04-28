import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, Lock, Unlock, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { getAllEvents, createEvent, updateEvent, setEventStatus } from '../services/events'
import { getPollsForEvent, createPoll, togglePollOpen, deletePoll } from '../services/polls'
import { getAttendanceForEvent, computeAttendanceSummary } from '../services/attendance'
import { getSuggestionsForEvent, updateSuggestionStatus } from '../services/suggestions'
import { Card, CardHeader } from '../components/ui/Card'
import { Input, Textarea, Select } from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EventStatusBadge from '../components/events/EventStatusBadge'
import { PageSpinner } from '../components/ui/Spinner'
import type { Event, EventStatus, Poll, AttendanceSummary, Suggestion, PollType } from '../types'
import { cn } from '../lib/cn'

interface EventWithData {
  event: Event
  polls: Poll[]
  attendance: AttendanceSummary
  suggestions: Suggestion[]
}

export default function AdminPage() {
  const { user } = useAuth()
  const [eventsWithData, setEventsWithData] = useState<EventWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showPollForm, setShowPollForm] = useState<string | null>(null) // eventId
  const [showFinalForm, setShowFinalForm] = useState<string | null>(null)
  const [error, setError] = useState('')

  // New Event form
  const [newEvent, setNewEvent] = useState({ title: '', description: '', status: 'draft' as EventStatus })

  // New Poll form
  const [newPoll, setNewPoll] = useState({ title: '', description: '', type: 'single_choice' as PollType, optionsText: '' })

  // Final decision form
  const [finalForm, setFinalForm] = useState({ final_location: '', final_date: '', final_note: '' })

  const loadData = useCallback(async () => {
    const events = await getAllEvents()
    const withData = await Promise.all(
      events.map(async (event) => {
        const [polls, attendance, suggestions] = await Promise.all([
          getPollsForEvent(event.id),
          getAttendanceForEvent(event.id),
          getSuggestionsForEvent(event.id),
        ])
        return {
          event,
          polls,
          attendance: computeAttendanceSummary(attendance),
          suggestions,
        }
      })
    )
    setEventsWithData(withData)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      try {
        await loadData()
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [loadData])

  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      await createEvent({ ...newEvent, created_by: user.id })
      setNewEvent({ title: '', description: '', status: 'draft' })
      setShowCreateEvent(false)
      await loadData()
    } catch {
      setError('Event konnte nicht erstellt werden.')
    }
  }

  const handleStatusChange = async (eventId: string, status: EventStatus) => {
    try {
      await setEventStatus(eventId, status)
      await loadData()
    } catch {
      setError('Status konnte nicht geändert werden.')
    }
  }

  const handleCreatePoll = async (e: FormEvent, eventId: string) => {
    e.preventDefault()
    const labels = newPoll.optionsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (labels.length < 2) {
      setError('Mindestens 2 Optionen erforderlich.')
      return
    }
    try {
      await createPoll(
        { event_id: eventId, title: newPoll.title, description: newPoll.description || null, type: newPoll.type },
        labels
      )
      setNewPoll({ title: '', description: '', type: 'single_choice', optionsText: '' })
      setShowPollForm(null)
      await loadData()
    } catch {
      setError('Umfrage konnte nicht erstellt werden.')
    }
  }

  const handleSaveFinal = async (e: FormEvent, eventId: string) => {
    e.preventDefault()
    try {
      await updateEvent(eventId, {
        final_location: finalForm.final_location || null,
        final_date: finalForm.final_date || null,
        final_note: finalForm.final_note || null,
      })
      setShowFinalForm(null)
      await loadData()
    } catch {
      setError('Finale Entscheidung konnte nicht gespeichert werden.')
    }
  }

  if (loading) return <PageSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin-Bereich</h1>
          <p className="mt-1 text-sm text-gray-500">Events und Umfragen verwalten</p>
        </div>
        <Button onClick={() => setShowCreateEvent(true)} size="sm">
          <Plus className="w-4 h-4" />
          Neues Event
        </Button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </p>
      )}

      {/* Create Event Form */}
      {showCreateEvent && (
        <Card className="mb-6">
          <CardHeader title="Neues Event erstellen" />
          <form onSubmit={handleCreateEvent} className="mt-4 flex flex-col gap-3">
            <Input
              label="Titel"
              value={newEvent.title}
              onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
              required
              autoFocus
            />
            <Textarea
              label="Beschreibung"
              value={newEvent.description}
              onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
            />
            <Select
              label="Status"
              value={newEvent.status}
              onChange={(e) => setNewEvent((p) => ({ ...p, status: e.target.value as EventStatus }))}
              options={[
                { value: 'draft', label: 'Entwurf' },
                { value: 'active', label: 'Aktiv' },
                { value: 'closed', label: 'Abgeschlossen' },
              ]}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowCreateEvent(false)}>
                Abbrechen
              </Button>
              <Button type="submit">Erstellen</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Events List */}
      <div className="flex flex-col gap-4">
        {eventsWithData.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Noch keine Events vorhanden</p>
        )}
        {eventsWithData.map(({ event, polls, attendance, suggestions }) => {
          const isExpanded = expandedEventId === event.id
          const pendingSuggestions = suggestions.filter((s) => s.status === 'pending').length

          return (
            <Card key={event.id} padding="none">
              {/* Event Header */}
              <div
                className="flex items-start justify-between gap-3 p-5 cursor-pointer"
                onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <EventStatusBadge status={event.status} />
                    {pendingSuggestions > 0 && (
                      <Badge variant="yellow">{pendingSuggestions} offene Vorschläge</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>{polls.length} Umfrage{polls.length !== 1 ? 'n' : ''}</span>
                    <span className="text-emerald-600">{attendance.attending} dabei</span>
                    <span className="text-amber-600">{attendance.maybe} vielleicht</span>
                    <span className="text-red-500">{attendance.declined} abgesagt</span>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                }
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 p-5 flex flex-col gap-5">
                  {/* Status actions */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Status ändern</p>
                    <div className="flex flex-wrap gap-2">
                      {(['draft', 'active', 'closed'] as EventStatus[]).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={event.status === s ? 'primary' : 'secondary'}
                          onClick={() => handleStatusChange(event.id, s)}
                        >
                          {s === 'draft' ? 'Entwurf' : s === 'active' ? 'Aktiv' : 'Schließen'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Polls */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-gray-500">Umfragen</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPollForm(showPollForm === event.id ? null : event.id)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Umfrage
                      </Button>
                    </div>

                    {showPollForm === event.id && (
                      <Card className="mb-3 bg-gray-50">
                        <form onSubmit={(e) => handleCreatePoll(e, event.id)} className="flex flex-col gap-3">
                          <Input
                            label="Umfragetitel"
                            value={newPoll.title}
                            onChange={(e) => setNewPoll((p) => ({ ...p, title: e.target.value }))}
                            required
                            autoFocus
                          />
                          <Input
                            label="Beschreibung (optional)"
                            value={newPoll.description}
                            onChange={(e) => setNewPoll((p) => ({ ...p, description: e.target.value }))}
                          />
                          <Select
                            label="Typ"
                            value={newPoll.type}
                            onChange={(e) => setNewPoll((p) => ({ ...p, type: e.target.value as PollType }))}
                            options={[
                              { value: 'single_choice', label: 'Einfachauswahl' },
                              { value: 'multiple_choice', label: 'Mehrfachauswahl' },
                            ]}
                          />
                          <Textarea
                            label="Optionen (eine pro Zeile)"
                            value={newPoll.optionsText}
                            onChange={(e) => setNewPoll((p) => ({ ...p, optionsText: e.target.value }))}
                            placeholder={"Restaurant Zur Eiche\nBiergarten am See\nGrillabend im Betrieb"}
                            rows={4}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setShowPollForm(null)}>
                              Abbrechen
                            </Button>
                            <Button type="submit" size="sm">Erstellen</Button>
                          </div>
                        </form>
                      </Card>
                    )}

                    {polls.length === 0 ? (
                      <p className="text-xs text-gray-400">Keine Umfragen</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {polls.map((poll) => (
                          <div key={poll.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{poll.title}</p>
                              <div className="flex gap-2 mt-0.5">
                                <Badge variant={poll.is_open ? 'green' : 'gray'}>
                                  {poll.is_open ? 'Offen' : 'Geschlossen'}
                                </Badge>
                                <Badge variant="gray">
                                  {poll.type === 'single_choice' ? 'Einfach' : 'Mehrfach'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => togglePollOpen(poll.id, !poll.is_open).then(loadData)}
                                className="p-1.5 rounded-md text-gray-500 hover:bg-white hover:text-gray-800 transition-colors"
                                title={poll.is_open ? 'Schließen' : 'Öffnen'}
                              >
                                {poll.is_open ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => deletePoll(poll.id).then(loadData)}
                                className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Löschen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-3">Vorschläge</p>
                      <div className="flex flex-col gap-2">
                        {suggestions.map((s) => (
                          <div key={s.id} className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border text-sm',
                            s.status === 'approved' && 'border-emerald-200 bg-emerald-50',
                            s.status === 'rejected' && 'border-gray-200 bg-gray-50 opacity-60',
                            s.status === 'pending' && 'border-amber-200 bg-amber-50'
                          )}>
                            <div className="flex-1">
                              <p className="text-gray-800">{s.text}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {s.profile?.display_name}
                              </p>
                            </div>
                            {s.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateSuggestionStatus(s.id, 'approved').then(loadData)}
                                >
                                  Annehmen
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateSuggestionStatus(s.id, 'rejected').then(loadData)}
                                >
                                  Ablehnen
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Decision */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-gray-500">Finale Entscheidung</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFinalForm({
                            final_location: event.final_location ?? '',
                            final_date: event.final_date ?? '',
                            final_note: event.final_note ?? '',
                          })
                          setShowFinalForm(showFinalForm === event.id ? null : event.id)
                        }}
                      >
                        {showFinalForm === event.id ? 'Abbrechen' : 'Bearbeiten'}
                      </Button>
                    </div>

                    {showFinalForm === event.id ? (
                      <form onSubmit={(e) => handleSaveFinal(e, event.id)} className="flex flex-col gap-3">
                        <Input
                          label="Ort"
                          value={finalForm.final_location}
                          onChange={(e) => setFinalForm((p) => ({ ...p, final_location: e.target.value }))}
                          placeholder="z.B. Restaurant Zur Eiche"
                        />
                        <Input
                          label="Datum / Zeit"
                          value={finalForm.final_date}
                          onChange={(e) => setFinalForm((p) => ({ ...p, final_date: e.target.value }))}
                          placeholder="z.B. Samstag, 15. März 2025 ab 18:00 Uhr"
                        />
                        <Textarea
                          label="Hinweis"
                          value={finalForm.final_note}
                          onChange={(e) => setFinalForm((p) => ({ ...p, final_note: e.target.value }))}
                          placeholder="Weitere Informationen..."
                        />
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="secondary" size="sm" onClick={() => setShowFinalForm(null)}>
                            Abbrechen
                          </Button>
                          <Button type="submit" size="sm">Speichern</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="text-sm text-gray-600">
                        {event.final_location || event.final_date || event.final_note ? (
                          <div className="flex flex-col gap-1">
                            {event.final_location && <span>📍 {event.final_location}</span>}
                            {event.final_date && <span>📅 {event.final_date}</span>}
                            {event.final_note && <span>💬 {event.final_note}</span>}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs">Noch keine finale Entscheidung gesetzt</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
