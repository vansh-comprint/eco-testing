import { create } from 'zustand';
import type { Notification, NotificationType, NotificationChannel } from '@/types';
import { mockNotifications } from './mockData';
import { generateId } from '@/lib/utils';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  // Actions
  fetchNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'status'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (userId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    // Get notifications for this user from mock data
    const userNotifications = mockNotifications.filter(n => n.recipientId === userId);
    // Also include any notifications that were added dynamically
    const currentNotifications = get().notifications.filter(n => n.recipientId === userId);
    // Merge, removing duplicates by id
    const existingIds = new Set(userNotifications.map(n => n.id));
    const newNotifications = currentNotifications.filter(n => !existingIds.has(n.id));
    const allNotifications = [...userNotifications, ...newNotifications];

    set({
      notifications: allNotifications,
      unreadCount: allNotifications.filter(n => n.status !== 'read').length,
    });
  },

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `not-${generateId()}`,
      status: 'sent',
      createdAt: new Date(),
    };

    set(state => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id: string) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, status: 'read' as const, readAt: new Date() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({
        ...n,
        status: 'read' as const,
        readAt: n.readAt || new Date(),
      })),
      unreadCount: 0,
    }));
  },

  removeNotification: (id: string) => {
    set(state => {
      const notification = state.notifications.find(n => n.id === id);
      const wasUnread = notification && notification.status !== 'read';
      return {
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
      };
    });
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

// Helper to trigger mock notifications
export const triggerNotification = (
  type: NotificationType,
  recipientId: string,
  title: string,
  message: string,
  channel: NotificationChannel = 'in_app'
) => {
  useNotificationStore.getState().addNotification({
    recipientType: 'user',
    recipientId,
    channel,
    type,
    title,
    message,
  });
};
