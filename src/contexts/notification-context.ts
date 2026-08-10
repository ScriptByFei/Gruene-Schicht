import { createContext } from 'react'
import type { AppNotification } from '../types'

export interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  refreshNotifications: () => Promise<void>
  markRead: (notificationId: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)
