import { useCallback, useEffect, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import type { BetaHealth } from '../../types'
import { getBetaHealth } from '../../services/monitoring'
import { Card, CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

export default function BetaHealthCard({ organizationId }: { organizationId: string }) {
  const [health, setHealth] = useState<BetaHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setHealth(await getBetaHealth(organizationId))
    } catch {
      setError('Beta-Status konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    let cancelled = false
    void getBetaHealth(organizationId)
      .then((nextHealth) => {
        if (!cancelled) setHealth(nextHealth)
      })
      .catch(() => {
        if (!cancelled) setError('Beta-Status konnte nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId])

  const status = (health?.client_errors_24h ?? 0) === 0 ? 'Stabil' : 'Prüfen'

  return (
    <Card className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <CardHeader
          title="Beta-Status"
          subtitle="Kompakte Kennzahlen, einmalig beim Öffnen geladen. Keine Dauerüberwachung."
        />
        <Button variant="outline" size="sm" loading={loading} onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {health && (
        <div className="mt-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <Badge variant={status === 'Stabil' ? 'green' : 'yellow'}>{status}</Badge>
            <span className="text-xs text-gray-500">
              {health.client_errors_24h} Fehlercode(s) in 24 Stunden
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Aktive Mitglieder" value={health.active_members} />
            <Metric label="Aktive Events" value={health.active_events} />
            <Metric label="Offene Zugänge" value={health.pending_access_requests} />
            <Metric label="Offene Anträge" value={health.pending_shift_requests} />
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Letzter Datenbankabgleich: {new Date(health.database_now).toLocaleString('de-DE')}
          </p>
        </div>
      )}
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3 dark:bg-slate-800">
      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}
