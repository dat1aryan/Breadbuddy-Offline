import { StorageAdapter, defaultStorageAdapter } from './storageAdapter';
import { Transaction, CategoryInfo, DEFAULT_CATEGORIES } from '../lib/financeEngine';

export class FinanceRepository {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  getTransactions(userId: number): Transaction[] {
    const raw = this.storage.getItem(`breadbuddy_transactions_${userId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveTransactions(userId: number, list: Transaction[]): void {
    this.storage.setItem(`breadbuddy_transactions_${userId}`, JSON.stringify(list));
  }

  getCategories(userId: number): CategoryInfo[] {
    const raw = this.storage.getItem(`breadbuddy_categories_${userId}`);
    if (!raw) return DEFAULT_CATEGORIES;
    try {
      const saved: CategoryInfo[] = JSON.parse(raw);
      // Merge in any DEFAULT_CATEGORIES entries the user doesn't have yet
      const savedValues = new Set(saved.map((c) => c.value));
      const missing = DEFAULT_CATEGORIES.filter((c) => !savedValues.has(c.value));
      return missing.length > 0 ? [...saved, ...missing] : saved;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  saveCategories(userId: number, list: CategoryInfo[]): void {
    this.storage.setItem(`breadbuddy_categories_${userId}`, JSON.stringify(list));
  }
}

export const financeRepository = new FinanceRepository();
