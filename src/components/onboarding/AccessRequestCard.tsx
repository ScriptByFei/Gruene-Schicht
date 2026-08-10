import { useEffect, useState } from 'react'
import { Clock3, ShieldCheck } from 'lucide-react'
import Button from '../ui/Button'
import { Card } from '../ui/Card'
import { getMyAccessRequest, requestOrganizationAccess } from '../../services/accessRequests'
import type { OrganizationAccessRequest } from '../../types'

interface AccessRequestCardProps {
  userId: string
}

export default function AccessRequestCard({ userId }: AccessRequestCardProps) {
  const [request, setRequest] = useState<OrganizationAccessRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const nextRequest = await getMyAccessRequest(userId)
        if (!cancelled) setRequest(nextRequest)
      } catch {
        if (!cancelled) setError('Zugangsstatus konnte nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [userId])

  const handleRequest = async () => {
    setSubmitting(true)
    setError('')
    try {
      await requestOrganizationAccess()
      setRequest(await getMyAccessRequest(userId))
    } catch {
      setError('Zugang konnte nicht angefragt werden.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <p className="text-sm text-gray-500">Betriebszugang wird geprüft …</p>
      </Card>
    )
  }

  const isPending = request?.status === 'pending'
  const wasRejected = request?.status === 'rejected'

  return (
    <Card className="mb-6">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {isPending ? <Clock3 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {isPending ? 'Zugangsanfrage wird geprüft' : 'Betriebszugang anfragen'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {isPending
              ? 'Ein Admin ordnet dich einer Schichtgruppe zu. Danach erscheinen Kalender und Events automatisch.'
              : wasRejected
                ? 'Deine letzte Anfrage wurde abgelehnt. Du kannst nach Rücksprache erneut anfragen.'
                : 'Fordere Zugang zu Grüne Schicht an. Ein Admin prüft anschließend deine Zuordnung.'}
          </p>
          {!isPending && (
            <Button className="mt-3" size="sm" loading={submitting} onClick={handleRequest}>
              {wasRejected ? 'Erneut anfragen' : 'Zugang anfragen'}
            </Button>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </Card>
  )
}
