import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeftRight, CalendarOff, Check, Clock3, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { getLocalDateKey } from '../lib/dateTime'
import {
  cancelShiftChangeRequest,
  createShiftChangeRequest,
  getShiftChangeRequests,
  respondToShiftSwap,
  reviewShiftChangeRequest,
} from '../services/shiftRequests'
import { getOrganizationMembers } from '../services/shiftGroups'
import type {
  OrganizationMemberWithProfile,
  ShiftChangeRequestWithProfiles,
  ShiftRequestStatus,
  ShiftRequestType,
} from '../types'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Input, Select, Textarea } from '../components/ui/Input'
import { PageSpinner } from '../components/ui/Spinner'
import { cn } from '../lib/cn'

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const statusLabels: Record<ShiftRequestStatus, string> = {
  pending_target: 'Wartet auf Kollegen',
  pending_admin: 'Wartet auf Admin',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  cancelled: 'Zurückgezogen',
}

const statusClasses: Record<ShiftRequestStatus, string> = {
  pending_target: 'bg-sky-100 text-sky-800',
  pending_admin: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateKey(value: string): string {
  return dateFormatter.format(parseDateKey(value))
}

function getFriendlyError(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : ''
  if (message.includes('already exists')) {
    return 'Für einen der gewählten Tage gibt es bereits einen laufenden oder genehmigten Antrag.'
  }
  if (message.includes('past')) return 'Vergangene Tage können nicht mehr ausgewählt werden.'
  if (message.includes('active membership')) return 'Für diesen Antrag fehlt eine aktive Schichtzuordnung.'
  return 'Die Aktion konnte nicht gespeichert werden. Bitte versuche es erneut.'
}

interface RequestCardProps {
  request: ShiftChangeRequestWithProfiles
  actions?: React.ReactNode
}

function RequestCard({ request, actions }: RequestCardProps) {
  const isSwap = request.request_type === 'swap'

  return (
    <Card padding="sm" className="border border-white/60 dark:border-emerald-900/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isSwap
              ? <ArrowLeftRight className="h-4 w-4 text-sky-600" aria-hidden="true" />
              : <CalendarOff className="h-4 w-4 text-amber-600" aria-hidden="true" />}
            <h3 className="font-semibold text-gray-900">
              {isSwap ? 'Schichttausch' : 'Abwesenheit'}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {request.requester_name} · {formatDateKey(request.requester_date)}
          </p>
          {isSwap && request.target_date && (
            <p className="mt-0.5 text-sm text-gray-600">
              mit {request.target_name} · {formatDateKey(request.target_date)}
            </p>
          )}
        </div>
        <span className={cn(
          'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold',
          statusClasses[request.status]
        )}>
          {statusLabels[request.status]}
        </span>
      </div>

      {request.note && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {request.note}
        </p>
      )}
      {request.target_response_note && (
        <p className="mt-2 text-xs text-gray-500">
          Antwort des Kollegen: {request.target_response_note}
        </p>
      )}
      {request.admin_response_note && (
        <p className="mt-2 text-xs text-gray-500">
          Admin-Antwort: {request.admin_response_note}
        </p>
      )}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  )
}

function RequestList({
  title,
  description,
  requests,
  renderActions,
}: {
  title: string
  description: string
  requests: ShiftChangeRequestWithProfiles[]
  renderActions?: (request: ShiftChangeRequestWithProfiles) => React.ReactNode
}) {
  if (requests.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      <div className="mt-3 flex flex-col gap-3">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            actions={renderActions?.(request)}
          />
        ))}
      </div>
    </section>
  )
}

export default function ShiftRequestsPage() {
  const { user, organization, shiftGroup, isAdmin } = useAuth()
  const [requests, setRequests] = useState<ShiftChangeRequestWithProfiles[]>([])
  const [members, setMembers] = useState<OrganizationMemberWithProfile[]>([])
  const [requestType, setRequestType] = useState<ShiftRequestType>('absence')
  const [requesterDate, setRequesterDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return getLocalDateKey(tomorrow)
  })
  const [targetUserId, setTargetUserId] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const organizationId = organization?.id
  const userId = user?.id
  const todayKey = getLocalDateKey(new Date())

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setRequests([])
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [nextRequests, nextMembers] = await Promise.all([
        getShiftChangeRequests(organizationId),
        getOrganizationMembers(organizationId),
      ])
      setRequests(nextRequests)
      setMembers(nextMembers)
    } catch (loadError) {
      setError(getFriendlyError(loadError))
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  const colleagueOptions = useMemo(() => members
    .filter((member) => (
      member.user_id !== userId
      && member.status === 'active'
      && member.shift_group_id
    ))
    .map((member) => ({ value: member.user_id, label: member.display_name })), [members, userId])

  const incomingRequests = requests.filter((request) => (
    request.target_user_id === userId && request.status === 'pending_target'
  ))
  const reviewQueue = isAdmin
    ? requests.filter((request) => request.status === 'pending_admin')
    : []
  const runningRequests = requests.filter((request) => (
    (request.requester_user_id === userId || request.target_user_id === userId)
    && (request.status === 'pending_target' || request.status === 'pending_admin')
    && !(request.target_user_id === userId && request.status === 'pending_target')
    && !(isAdmin && request.status === 'pending_admin')
  ))
  const history = requests.filter((request) => (
    request.status === 'approved'
    || request.status === 'rejected'
    || request.status === 'cancelled'
  ))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!organizationId) return

    if (requestType === 'swap' && (!targetUserId || !targetDate)) {
      setError('Bitte wähle einen Kollegen und dessen Tauschtag aus.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await createShiftChangeRequest({
        organizationId,
        requestType,
        requesterDate,
        targetUserId: requestType === 'swap' ? targetUserId : undefined,
        targetDate: requestType === 'swap' ? targetDate : undefined,
        note,
      })
      setNote('')
      setTargetUserId('')
      setTargetDate('')
      setSuccess(requestType === 'swap'
        ? 'Tauschanfrage wurde an den ausgewählten Kollegen gesendet.'
        : 'Abwesenheitsantrag wurde an die Admins gesendet.')
      await loadData()
    } catch (submitError) {
      setError(getFriendlyError(submitError))
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (requestId: string, action: () => Promise<void>, message: string) => {
    setActionId(requestId)
    setError('')
    setSuccess('')
    try {
      await action()
      setSuccess(message)
      await loadData()
    } catch (actionError) {
      setError(getFriendlyError(actionError))
    } finally {
      setActionId('')
    }
  }

  if (loading) return <PageSpinner />

  if (!organization || !user) {
    return (
      <EmptyState
        icon={<Clock3 className="h-10 w-10" />}
        title="Noch keinem Betrieb zugeordnet"
        description="Nach der Freigabe deines Zugangs kannst du Abwesenheiten und Tauschanfragen verwalten."
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Anträge</h1>
        <p className="mt-1 text-sm text-gray-600">
          Abwesenheiten melden oder Schichten mit Kollegen tauschen.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <Card>
        <div className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900">Neuer Antrag</h2>
        </div>

        {!shiftGroup ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Du brauchst zuerst eine Schichtgruppenzuordnung durch einen Admin.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <Select
              label="Art des Antrags"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as ShiftRequestType)}
              options={[
                { value: 'absence', label: 'Abwesenheit' },
                { value: 'swap', label: 'Schichttausch' },
              ]}
            />
            <Input
              label="Dein Tag"
              type="date"
              min={todayKey}
              value={requesterDate}
              onChange={(event) => setRequesterDate(event.target.value)}
              required
            />
            {requestType === 'swap' && (
              <>
                <Select
                  label="Kollege"
                  value={targetUserId}
                  onChange={(event) => setTargetUserId(event.target.value)}
                  options={[
                    { value: '', label: 'Bitte auswählen' },
                    ...colleagueOptions,
                  ]}
                  required
                />
                <Input
                  label="Tag des Kollegen"
                  type="date"
                  min={todayKey}
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                  required
                />
              </>
            )}
            <Textarea
              label="Hinweis (optional)"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder={requestType === 'swap'
                ? 'Zum Beispiel: Ich habe an diesem Tag einen Termin.'
                : 'Nur notwendige Informationen – keine medizinischen Details erforderlich.'}
            />
            <Button type="submit" loading={saving} fullWidth>
              Antrag senden
            </Button>
          </form>
        )}
      </Card>

      <RequestList
        title="Deine Antwort"
        description="Diese Kollegen möchten mit dir tauschen. Erst nach deiner Zustimmung geht es zum Admin."
        requests={incomingRequests}
        renderActions={(request) => (
          <>
            <Button
              size="sm"
              loading={actionId === request.id}
              onClick={() => void runAction(
                request.id,
                () => respondToShiftSwap(request.id, true),
                'Du hast dem Tausch zugestimmt. Die Anfrage wartet jetzt auf den Admin.'
              )}
            >
              <Check className="h-4 w-4" /> Zustimmen
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={actionId === request.id}
              onClick={() => void runAction(
                request.id,
                () => respondToShiftSwap(request.id, false),
                'Du hast die Tauschanfrage abgelehnt.'
              )}
            >
              <X className="h-4 w-4" /> Ablehnen
            </Button>
          </>
        )}
      />

      <RequestList
        title="Admin-Freigabe"
        description="Diese Anträge sind vollständig und warten auf die finale Entscheidung."
        requests={reviewQueue}
        renderActions={(request) => (
          <>
            <Button
              size="sm"
              loading={actionId === request.id}
              onClick={() => void runAction(
                request.id,
                () => reviewShiftChangeRequest(request.id, true),
                'Der Antrag wurde genehmigt und im Kalender eingetragen.'
              )}
            >
              <ShieldCheck className="h-4 w-4" /> Genehmigen
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={actionId === request.id}
              onClick={() => void runAction(
                request.id,
                () => reviewShiftChangeRequest(request.id, false),
                'Der Antrag wurde abgelehnt.'
              )}
            >
              <X className="h-4 w-4" /> Ablehnen
            </Button>
          </>
        )}
      />

      <RequestList
        title="Laufende Anträge"
        description="Hier siehst du, auf wessen Entscheidung noch gewartet wird."
        requests={runningRequests}
        renderActions={(request) => request.requester_user_id === userId ? (
          <Button
            size="sm"
            variant="ghost"
            loading={actionId === request.id}
            onClick={() => void runAction(
              request.id,
              () => cancelShiftChangeRequest(request.id),
              'Der Antrag wurde zurückgezogen.'
            )}
          >
            Zurückziehen
          </Button>
        ) : null}
      />

      <RequestList
        title="Verlauf"
        description={isAdmin
          ? 'Abgeschlossene Anträge des Betriebs bleiben nachvollziehbar.'
          : 'Deine abgeschlossenen Anträge und Tauschanfragen.'}
        requests={history}
      />

      {requests.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={<ArrowLeftRight className="h-10 w-10" />}
            title="Noch keine Anträge"
            description="Deine Anträge und Entscheidungen erscheinen später hier."
          />
        </div>
      )}
    </div>
  )
}
