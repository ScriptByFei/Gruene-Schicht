import { useEffect, useMemo, useState } from 'react'
import { UserCheck } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Select } from '../ui/Input'
import { getPendingAccessRequests, reviewAccessRequest } from '../../services/accessRequests'
import { getShiftGroups } from '../../services/shiftGroups'
import type { OrganizationAccessRequestWithProfile, ShiftGroup } from '../../types'

interface AccessRequestManagementProps {
  organizationId: string
  onMemberChanged: () => void
}

export default function AccessRequestManagement({
  organizationId,
  onMemberChanged,
}: AccessRequestManagementProps) {
  const [requests, setRequests] = useState<OrganizationAccessRequestWithProfile[]>([])
  const [groups, setGroups] = useState<ShiftGroup[]>([])
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [nextRequests, nextGroups] = await Promise.all([
          getPendingAccessRequests(organizationId),
          getShiftGroups(organizationId),
        ])
        if (!cancelled) {
          setRequests(nextRequests)
          setGroups(nextGroups)
          setSelections(Object.fromEntries(nextRequests.map((request) => [
            request.id,
            request.requested_shift_group_id ?? '',
          ])))
        }
      } catch {
        if (!cancelled) setError('Zugangsanfragen konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [organizationId, refreshKey])

  const groupOptions = useMemo(() => [
    { value: '', label: 'Schichtgruppe auswählen' },
    ...groups.map((group) => ({ value: group.id, label: `${group.name} Schicht` })),
  ], [groups])

  const handleReview = async (
    request: OrganizationAccessRequestWithProfile,
    approve: boolean
  ) => {
    const selectedGroup = selections[request.id] ?? request.requested_shift_group_id ?? ''
    if (approve && !selectedGroup) {
      setError('Bitte vor der Freigabe eine Schichtgruppe auswählen.')
      return
    }

    setWorkingId(request.id)
    setError('')
    try {
      const latestRequests = await getPendingAccessRequests(organizationId)
      const latestRequest = latestRequests.find((entry) => entry.id === request.id)
      if (!latestRequest || latestRequest.requested_at !== request.requested_at
        || latestRequest.requested_shift_group_id !== request.requested_shift_group_id) {
        setRequests(latestRequests)
        setSelections(Object.fromEntries(latestRequests.map((entry) => [
          entry.id,
          entry.requested_shift_group_id ?? '',
        ])))
        setError('Diese Anfrage hat sich geändert. Bitte prüfe die aktuelle Wunschgruppe erneut.')
        return
      }
      await reviewAccessRequest(request.id, approve, selectedGroup)
      setRequests((current) => current.filter((entry) => entry.id !== request.id))
      if (approve) onMemberChanged()
    } catch {
      setError('Zugangsanfrage konnte nicht bearbeitet werden.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Zugangsanfragen"
        subtitle="Wunschgruppe prüfen und Mitarbeitende einer Schicht zuordnen."
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={loading || workingId !== null}
              onClick={() => setRefreshKey((current) => current + 1)}>
              Aktualisieren
            </Button>
            <Badge variant={requests.length ? 'yellow' : 'gray'}>{requests.length} offen</Badge>
          </div>
        }
      />

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-5 text-sm text-gray-400">Zugangsanfragen werden geladen …</p>
      ) : requests.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
          <UserCheck className="h-5 w-5 text-emerald-600" />
          <p className="text-sm text-gray-600">Keine offenen Zugangsanfragen.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{request.display_name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Angefragt am {new Intl.DateTimeFormat('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(new Date(request.requested_at))}
                  </p>
                </div>
                <Badge variant="yellow">Offen</Badge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                {request.requested_shift_group_id && (
                  <p className="text-xs font-medium text-amber-900 sm:col-span-2">
                    Wunsch: {groups.find((group) => group.id === request.requested_shift_group_id)?.name ?? 'Unbekannte Gruppe'} Schicht
                  </p>
                )}
                <Select
                  aria-label={`Schichtgruppe für ${request.display_name}`}
                  value={selections[request.id] ?? ''}
                  onChange={(event) => setSelections((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))}
                  options={groupOptions}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={workingId === request.id}
                    onClick={() => handleReview(request, false)}
                  >
                    Ablehnen
                  </Button>
                  <Button
                    size="sm"
                    loading={workingId === request.id}
                    onClick={() => handleReview(request, true)}
                  >
                    Freigeben
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
