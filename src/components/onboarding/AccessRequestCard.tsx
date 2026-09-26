import { useEffect, useState } from 'react'
import { Clock3, ShieldCheck } from 'lucide-react'
import Button from '../ui/Button'
import { Card } from '../ui/Card'
import {
  getJoinableShiftGroups,
  getMyAccessRequest,
  requestShiftGroupJoin,
} from '../../services/accessRequests'
import { cn } from '../../lib/cn'
import { formatShiftStartDate, getShiftInfoForDate, type ShiftSymbol } from '../../lib/shifts'
import type { JoinableShiftGroup, OrganizationAccessRequest, ShiftGroupColor } from '../../types'

const groupDotClass: Record<ShiftGroupColor, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-600',
  green: 'bg-emerald-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
}

const shiftClass: Record<ShiftSymbol, string> = {
  F: 'bg-yellow-400 text-yellow-950',
  S: 'bg-red-500 text-white',
  N: 'bg-blue-600 text-white',
  '-': 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-300',
}

interface AccessRequestCardProps {
  userId: string
  refreshProfile: () => Promise<void>
}

export default function AccessRequestCard({ userId, refreshProfile }: AccessRequestCardProps) {
  const [request, setRequest] = useState<OrganizationAccessRequest | null>(null)
  const [groups, setGroups] = useState<JoinableShiftGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [nextRequest, nextGroups] = await Promise.all([
          getMyAccessRequest(userId),
          getJoinableShiftGroups(),
        ])
        if (!cancelled) {
          setRequest(nextRequest)
          setGroups(nextGroups)
          setSelectedGroupId(nextRequest?.requested_shift_group_id ?? nextGroups[0]?.id ?? '')
        }
      } catch {
        if (!cancelled) setError('Schichtgruppen konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [userId])

  const selectedGroup = groups.find((group) => group.id === selectedGroupId)
  const isPending = request?.status === 'pending'

  const handleRequest = async () => {
    if (!selectedGroupId) return
    setSubmitting(true)
    setError('')
    try {
      await requestShiftGroupJoin(selectedGroupId)
      setRequest(await getMyAccessRequest(userId))
    } catch {
      setError('Dein Gruppenwunsch konnte nicht gesendet werden. Bitte versuche es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError('')
    try {
      const nextRequest = await getMyAccessRequest(userId)
      setRequest(nextRequest)
      await refreshProfile()
    } catch {
      setError('Der Status konnte nicht aktualisiert werden.')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return <Card className="mb-6"><p className="text-sm text-gray-500">Schichtgruppen werden geladen …</p></Card>
  }

  return (
    <Card className="mb-6">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}
        >
          {isPending ? <Clock3 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">
            {isPending ? 'Dein Gruppenwunsch wird geprüft' : 'Wähle deine Schichtgruppe'}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            {isPending
              ? 'Ein Admin prüft deine Auswahl. Du kannst deinen Wunsch ändern, solange er noch offen ist.'
              : request?.status === 'rejected'
                ? 'Dein letzter Wunsch wurde abgelehnt. Du kannst nach Rücksprache eine neue Gruppe anfragen.'
                : 'Wähle die Gruppe, in der du dauerhaft arbeiten möchtest. Die Zuordnung wird erst nach Admin-Freigabe aktiv.'}
          </p>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="Gewünschte Schichtgruppe">
          {groups.map((group) => {
            const shift = getShiftInfoForDate(group.anchor_date, new Date(), group.pattern)
            const symbol = shift?.symbol ?? '-'
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                aria-pressed={selectedGroupId === group.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  selectedGroupId === group.id
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900'
                )}
              >
                <span className={cn('h-3 w-3 shrink-0 rounded-full', groupDotClass[group.color])} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-slate-100">{group.name} Schicht</span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400">Start: {formatShiftStartDate(group.anchor_date)}</span>
                </span>
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold', shiftClass[symbol])}
                  aria-label={`Heute: ${shift?.label ?? 'frei'}`}>
                  {symbol === '-' ? '—' : symbol}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">Zurzeit sind keine Schichtgruppen verfügbar.</p>
      )}

      {selectedGroup && (
        <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Gewählt: {selectedGroup.name} Schicht · {selectedGroup.pattern.length}-Tage-Rhythmus ab {formatShiftStartDate(selectedGroup.anchor_date)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          loading={submitting}
          disabled={!selectedGroupId || (isPending && request?.requested_shift_group_id === selectedGroupId)}
          onClick={handleRequest}
        >
          {isPending ? 'Wunsch ändern' : 'Gruppe anfragen'}
        </Button>
        {isPending && <Button size="sm" variant="secondary" loading={refreshing} onClick={handleRefresh}>Status aktualisieren</Button>}
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
    </Card>
  )
}
