import { StorageAdapter, defaultStorageAdapter } from './storageAdapter';
import { Subscription } from '../lib/subscriptionEngine';

export class SubscriptionRepository {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  getSubscriptions(userId: number): Subscription[] {
    const raw = this.storage.getItem(`breadbuddy_subscriptions_${userId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveSubscriptions(userId: number, list: Subscription[]): void {
    this.storage.setItem(`breadbuddy_subscriptions_${userId}`, JSON.stringify(list));
  }
}

export const subscriptionRepository = new SubscriptionRepository();
