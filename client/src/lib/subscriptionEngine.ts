import { subscriptionRepository } from '../repositories/subscriptionRepository';

export interface Subscription {
  id: number;
  name: string;
  emoji: string;
  cost: number; // Legacy compatibility
  amount: number;
  billingDate: number; // Legacy billing day
  category: string;
  status: 'active' | 'paused' | 'cancelled' | 'archived';
  frequency: 'weekly' | 'every_2_weeks' | 'monthly' | 'every_2_months' | 'quarterly' | 'every_6_months' | 'yearly' | 'custom';
  interval?: number; // Custom interval value
  intervalType?: 'days' | 'months'; // Custom interval scale
  nextDueDate: string; // YYYY-MM-DD
  reminderEnabled: boolean;
}

export function normalizeSubscription(sub: any): Subscription {
  const cost = sub.amount !== undefined ? sub.amount : (sub.cost !== undefined ? sub.cost : 0);
  const amount = cost;
  const frequency = sub.frequency || 'monthly';
  const reminderEnabled = sub.reminderEnabled !== undefined ? sub.reminderEnabled : false;

  let nextDueDate = sub.nextDueDate;
  if (!nextDueDate) {
    const billingDay = sub.billingDate || 1;
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    
    if (today.getDate() > billingDay) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    const nextDate = new Date(year, month, billingDay);
    nextDueDate = nextDate.toISOString().split('T')[0];
  }

  return {
    id: sub.id,
    name: sub.name,
    emoji: sub.emoji || '📺',
    cost,
    amount,
    billingDate: sub.billingDate || new Date(nextDueDate).getDate(),
    category: sub.category,
    status: sub.status || 'active',
    frequency,
    interval: sub.interval,
    intervalType: sub.intervalType,
    nextDueDate,
    reminderEnabled,
  };
}

export function getNextOccurrenceDate(sub: Subscription): string {
  const normalized = normalizeSubscription(sub);
  const due = new Date(normalized.nextDueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() >= today.getTime()) {
    return normalized.nextDueDate;
  }

  while (due.getTime() < today.getTime()) {
    switch (normalized.frequency) {
      case 'weekly':
        due.setDate(due.getDate() + 7);
        break;
      case 'every_2_weeks':
        due.setDate(due.getDate() + 14);
        break;
      case 'monthly':
        due.setMonth(due.getMonth() + 1);
        break;
      case 'every_2_months':
        due.setMonth(due.getMonth() + 2);
        break;
      case 'quarterly':
        due.setMonth(due.getMonth() + 3);
        break;
      case 'every_6_months':
        due.setMonth(due.getMonth() + 6);
        break;
      case 'yearly':
        due.setFullYear(due.getFullYear() + 1);
        break;
      case 'custom':
        const interval = normalized.interval || 1;
        if (normalized.intervalType === 'days') {
          due.setDate(due.getDate() + interval);
        } else {
          due.setMonth(due.getMonth() + interval);
        }
        break;
      default:
        due.setMonth(due.getMonth() + 1);
        break;
    }
  }

  return due.toISOString().split('T')[0];
}

export function getDaysUntilDue(sub: Subscription): number {
  const nextDueStr = getNextOccurrenceDate(sub);
  const due = new Date(nextDueStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getMonthlyEquivalent(sub: Subscription): number {
  const norm = normalizeSubscription(sub);
  const amt = norm.amount;
  switch (norm.frequency) {
    case 'weekly':
      return amt * (52 / 12);
    case 'every_2_weeks':
      return amt * (26 / 12);
    case 'monthly':
      return amt;
    case 'every_2_months':
      return amt / 2;
    case 'quarterly':
      return amt / 3;
    case 'every_6_months':
      return amt / 6;
    case 'yearly':
      return amt / 12;
    case 'custom':
      const val = norm.interval || 1;
      if (norm.intervalType === 'days') {
        return amt * (30.4375 / val);
      } else {
        return amt / val;
      }
    default:
      return amt;
  }
}

export const subscriptionEngine = {
  getSubscriptions(userId: number): Subscription[] {
    const raw = subscriptionRepository.getSubscriptions(userId);
    return raw.map(normalizeSubscription);
  },

  saveSubscriptions(userId: number, list: Subscription[]) {
    subscriptionRepository.saveSubscriptions(userId, list.map(normalizeSubscription));
  },

  createSubscription(userId: number, sub: Omit<Subscription, 'id'>): Subscription {
    const list = this.getSubscriptions(userId);
    const newSub: Subscription = {
      ...normalizeSubscription(sub),
      id: Date.now() + Math.random()
    };
    list.push(newSub);
    this.saveSubscriptions(userId, list);
    return newSub;
  },

  updateSubscription(userId: number, id: number, updates: Partial<Subscription>): Subscription | null {
    const list = this.getSubscriptions(userId);
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    list[idx] = normalizeSubscription({ ...list[idx], ...updates });
    this.saveSubscriptions(userId, list);
    return list[idx];
  },

  deleteSubscription(userId: number, id: number): boolean {
    const list = this.getSubscriptions(userId);
    const filtered = list.filter((s) => s.id !== id);
    this.saveSubscriptions(userId, filtered);
    return list.length !== filtered.length;
  },

  getMonthlyTotal(userId: number): number {
    const list = this.getSubscriptions(userId);
    return list
      .filter((s) => s.status === 'active')
      .reduce((acc, s) => acc + getMonthlyEquivalent(s), 0);
  },

  getSmartInsights(userId: number): string[] {
    const list = this.getSubscriptions(userId).filter((s) => s.status === 'active');
    if (list.length === 0) return ['No active subscriptions. Track recurring payments before they surprise you! 💅'];

    const total = this.getMonthlyTotal(userId);
    const insights: string[] = [`You spend ₹${Math.round(total).toLocaleString('en-IN')}/month on active subscriptions.`];

    const upcoming = list.map((s) => {
      const daysLeft = getDaysUntilDue(s);
      return { sub: s, daysLeft };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    if (upcoming.length > 0) {
      const nearest = upcoming[0];
      if (nearest.daysLeft === 0) {
        insights.push(`${nearest.sub.name} renews today! 🍿`);
      } else {
        insights.push(`${nearest.sub.name} renews in ${nearest.daysLeft} day${nearest.daysLeft > 1 ? 's' : ''}.`);
      }
    }

    const categories: Record<string, number> = {};
    list.forEach((s) => {
      categories[s.category] = (categories[s.category] || 0) + getMonthlyEquivalent(s);
    });
    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0 && total > 0) {
      const [topCat, topVal] = sortedCats[0];
      const pct = Math.round((topVal / total) * 100);
      if (pct > 30) {
        insights.push(`${topCat} subscriptions account for ${pct}% of recurring spending.`);
      }
    }

    return insights;
  }
};
