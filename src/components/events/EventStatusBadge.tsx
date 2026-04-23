import Badge from '../ui/Badge'
import type { EventStatus } from '../../types'

const config: Record<EventStatus, { label: string; variant: 'green' | 'yellow' | 'gray' }> = {
  active: { label: 'Aktiv', variant: 'green' },
  draft: { label: 'Entwurf', variant: 'yellow' },
  closed: { label: 'Abgeschlossen', variant: 'gray' },
}

export default function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}
