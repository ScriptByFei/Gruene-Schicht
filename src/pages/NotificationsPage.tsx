import { ArrowLeftRight, Bell, CalendarDays, CheckCheck, Lightbulb, Vote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../contexts/useNotifications'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { cn } from '../lib/cn'
import type { NotificationType } from '../types'

const typeIcon = {
  event: CalendarDays,
  poll: Vote,
  shift_request: ArrowLeftRight,
  suggestion: Lightbulb,
} satisfies Record<NotificationType, typeof Bell>

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Benachrichtigungen</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} noch ungelesen` : 'Alles gelesen'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="h-4 w-4" />
            Alle gelesen
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title={loading ? 'Wird geladen …' : 'Noch keine Benachrichtigungen'}
          description="Neuigkeiten zu Events, Anträgen und Vorschlägen erscheinen hier."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => {
            const Icon = typeIcon[notification.type]
            const unread = !notification.read_at
            return (
              <Link
                key={notification.id}
                to={notification.link}
                onClick={() => unread && void markRead(notification.id)}
                className={cn(
                  'glass flex gap-3 rounded-2xl p-4 transition-colors hover:bg-white/90 dark:hover:bg-emerald-950/30',
                  unread && 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-700'
                )}
              >
                <span className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  unread ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className={cn('text-sm text-gray-900', unread ? 'font-bold' : 'font-medium')}>
                      {notification.title}
                    </span>
                    {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Ungelesen" />}
                  </span>
                  <span className="mt-1 block text-sm text-gray-600">{notification.body}</span>
                  <span className="mt-2 block text-xs text-gray-400">
                    {dateFormatter.format(new Date(notification.created_at))}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
