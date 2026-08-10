import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { NotificationContext } from './notification-context'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notifications'
import { readOfflineCache, writeOfflineCache } from '../lib/offlineCache'
import type { AppNotification } from '../types'

const NOTIFICATION_CACHE_KEY = 'notifications'

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, membership } = useAuth()
  const userId = user?.id
  const hasActiveMembership = membership?.status === 'active'
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const refreshNotifications = useCallback(async () => {
    if (!userId || !hasActiveMembership) {
      setNotifications([])
      return
    }

    setLoading(true)
    try {
      const nextNotifications = await getNotifications()
      setNotifications(nextNotifications)
      writeOfflineCache(userId, NOTIFICATION_CACHE_KEY, nextNotifications)
    } catch {
      const cached = readOfflineCache<AppNotification[]>(userId, NOTIFICATION_CACHE_KEY)
      if (cached) setNotifications(cached)
    } finally {
      setLoading(false)
    }
  }, [hasActiveMembership, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshNotifications(), 0)
    return () => window.clearTimeout(timer)
  }, [refreshNotifications])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshNotifications()
    }
    const refreshWhenOnline = () => void refreshNotifications()

    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('online', refreshWhenOnline)
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('online', refreshWhenOnline)
    }
  }, [refreshNotifications])

  const markRead = useCallback(async (notificationId: string) => {
    const readAt = new Date().toISOString()
    setNotifications((current) => current.map((notification) =>
      notification.id === notificationId && !notification.read_at
        ? { ...notification, read_at: readAt }
        : notification
    ))
    try {
      await markNotificationRead(notificationId)
    } catch {
      await refreshNotifications()
    }
  }, [refreshNotifications])

  const markAllRead = useCallback(async () => {
    const readAt = new Date().toISOString()
    setNotifications((current) => current.map((notification) =>
      notification.read_at ? notification : { ...notification, read_at: readAt }
    ))
    try {
      await markAllNotificationsRead()
    } catch {
      await refreshNotifications()
    }
  }, [refreshNotifications])

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.reduce(
      (count, notification) => count + (notification.read_at ? 0 : 1),
      0
    ),
    loading,
    refreshNotifications,
    markRead,
    markAllRead,
  }), [loading, markAllRead, markRead, notifications, refreshNotifications])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
