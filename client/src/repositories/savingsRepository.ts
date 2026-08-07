import { StorageAdapter, defaultStorageAdapter } from './storageAdapter';
import { Goal } from '../lib/savingsEngine';

export class SavingsRepository {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  getGoals(userId: number): Goal[] {
    const raw = this.storage.getItem(`breadbuddy_goals_${userId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveGoals(userId: number, list: Goal[]): void {
    this.storage.setItem(`breadbuddy_goals_${userId}`, JSON.stringify(list));
  }
}

export const savingsRepository = new SavingsRepository();
