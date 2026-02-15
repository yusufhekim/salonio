import { create } from 'zustand';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (title: string, body: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (title, body) =>
    set((state) => ({
      notifications: [
        {
          id: Date.now().toString(),
          title,
          body,
          createdAt: Date.now(),
        },
        ...state.notifications,
      ],
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
