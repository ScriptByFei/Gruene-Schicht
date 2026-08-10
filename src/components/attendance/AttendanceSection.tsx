import { useState } from 'react'
import { Check, HelpCircle, X } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { cn } from '../../lib/cn'
import type { AttendanceStatus, AttendanceSummary, EventAttendee } from '../../types'
import { setAttendance } from '../../services/attendance'

const options: { status: AttendanceStatus; label: string; icon: typeof Check; color: string; active: string }[] = [
  {
    status: 'attending',
    label: 'Dabei',
    icon: Check,
    color: 'border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50',
    active: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  },
  {
    status: 'maybe',
    label: 'Vielleicht',
    icon: HelpCircle,
    color: 'border-gray-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50',
    active: 'border-amber-500 bg-amber-50 text-amber-800',
  },
  {
    status: 'declined',
    label: 'Absagen',
    icon: X,
    color: 'border-gray-200 text-gray-700 hover:border-red-400 hover:bg-red-50',
    active: 'border-red-500 bg-red-50 text-red-800',
  },
]

interface AttendanceSectionProps {
  eventId: string
  userId: string
  currentStatus: AttendanceStatus | null
  summary: AttendanceSummary
  onStatusChange: (status: AttendanceStatus) => void
  eventClosed?: boolean
  attendees: EventAttendee[]
}

export default function AttendanceSection({
  eventId,
  userId,
  currentStatus,
  summary,
  onStatusChange,
  eventClosed,
  attendees,
}: AttendanceSectionProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSet = async (status: AttendanceStatus) => {
    if (eventClosed) return
    setSaving(true)
    setError('')
    try {
      await setAttendance(eventId, userId, status)
      onStatusChange(status)
    } catch {
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Teilnahme" subtitle="Wirst du dabei sein?" />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {options.map(({ status, label, icon: Icon, color, active }) => (
          <button
            key={status}
            onClick={() => handleSet(status)}
            disabled={saving || eventClosed}
            className={cn(
              'flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 text-sm font-medium transition-all',
              currentStatus === status ? active : color,
              (saving || eventClosed) && 'opacity-60 cursor-default'
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="py-2 rounded-lg bg-emerald-50">
          <div className="text-xl font-bold text-emerald-700">{summary.attending}</div>
          <div className="text-xs text-emerald-600">Dabei</div>
        </div>
        <div className="py-2 rounded-lg bg-amber-50">
          <div className="text-xl font-bold text-amber-700">{summary.maybe}</div>
          <div className="text-xs text-amber-600">Vielleicht</div>
        </div>
        <div className="py-2 rounded-lg bg-red-50">
          <div className="text-xl font-bold text-red-700">{summary.declined}</div>
          <div className="text-xs text-red-600">Abgesagt</div>
        </div>
      </div>

      {attendees.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Rückmeldungen
          </p>
          <ul className="flex flex-col gap-2" aria-label="Teilnahmerückmeldungen">
            {attendees.map((attendee) => (
              <li key={attendee.user_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    {attendee.display_name.trim().slice(0, 1).toLocaleUpperCase('de-DE') || '?'}
                  </span>
                  <span className="truncate font-medium text-gray-800">{attendee.display_name}</span>
                </span>
                <span className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                  attendee.status === 'attending' && 'bg-emerald-100 text-emerald-800',
                  attendee.status === 'maybe' && 'bg-amber-100 text-amber-800',
                  attendee.status === 'declined' && 'bg-red-100 text-red-800'
                )}>
                  {attendee.status === 'attending'
                    ? 'Dabei'
                    : attendee.status === 'maybe'
                      ? 'Vielleicht'
                      : 'Abgesagt'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {eventClosed && (
        <p className="mt-2 text-xs text-gray-400">Dieses Event ist abgeschlossen.</p>
      )}
    </Card>
  )
}
