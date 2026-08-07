import { getUser } from './auth';
import { isBirthdayToday } from '../utils/dateUtils';
import { profileEngine } from './profileEngine';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  read: boolean;
  time: string;
  createdAt: string;
  emoji?: string;
}

export const notificationEngine = {
  getNotifications(userId: number, userCurrency = '₹', userAllowance = 0): NotificationItem[] {
    const key = `breadbuddy_notifications_${userId}`;
    const saved = localStorage.getItem(key);
    let list: NotificationItem[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (err) {
        console.error('Failed to parse notifications', err);
      }
    } else {
      // Default initial real notification for a new user (NO mock messages)
      const user = getUser();
      const curr = user?.currency || userCurrency || '₹';
      const allow = user?.monthlyAllowance || userAllowance || 0;
      list = [
        {
          id: Date.now(),
          title: 'Allowance Loaded!',
          message: `Monthly allowance of ${curr}${allow.toLocaleString()} loaded. Secure the bag!`,
          read: false,
          time: 'Just now',
          createdAt: new Date().toISOString(),
          emoji: '💳',
        },
      ];
      this.saveNotifications(userId, list);
    }

    // Check birthday notification
    const user = getUser();
    if (user && user.id === userId) {
      const profile = profileEngine.getProfile(userId, user);
      if (profile.birthday && isBirthdayToday(profile.birthday)) {
        const year = new Date().getFullYear();
        const bdayKey = `breadbuddy_bday_notif_${userId}_${year}`;
        if (!localStorage.getItem(bdayKey)) {
          const bdayNotif: NotificationItem = {
            id: Date.now() + Math.random(),
            title: `🎂 Happy Birthday, ${user.name || 'bestie'}! 🎉`,
            message: `Wishing you an amazing day full of joy, cake & good vibes! Enjoy your special day! 🎂✨`,
            read: false,
            time: 'Just now',
            createdAt: new Date().toISOString(),
            emoji: '🎂',
          };
          list = [bdayNotif, ...list];
          localStorage.setItem(bdayKey, 'true');
          this.saveNotifications(userId, list);
        }
      }
    }

    return list;
  },

  saveNotifications(userId: number, list: NotificationItem[]) {
    const key = `breadbuddy_notifications_${userId}`;
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { userId } }));
  },

  addNotification(userId: number, notif: { title: string; message: string; emoji?: string }): NotificationItem {
    const list = this.getNotifications(userId);
    const newNotif: NotificationItem = {
      id: Date.now() + Math.random(),
      title: notif.title,
      message: notif.message,
      read: false,
      time: 'Just now',
      createdAt: new Date().toISOString(),
      emoji: notif.emoji || '🔔',
    };
    const updated = [newNotif, ...list];
    if (updated.length > 30) updated.pop();
    this.saveNotifications(userId, updated);
    return newNotif;
  },

  markAsRead(userId: number, id: number) {
    const list = this.getNotifications(userId);
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveNotifications(userId, updated);
  },

  markAllAsRead(userId: number) {
    const list = this.getNotifications(userId);
    const updated = list.map((n) => ({ ...n, read: true }));
    this.saveNotifications(userId, updated);
  },

  dismissNotification(userId: number, id: number) {
    const list = this.getNotifications(userId);
    const updated = list.filter((n) => n.id !== id);
    this.saveNotifications(userId, updated);
  },

  clearAll(userId: number) {
    this.saveNotifications(userId, []);
  },
};
