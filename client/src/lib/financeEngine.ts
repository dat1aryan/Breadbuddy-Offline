import { Summary, Expense } from './types';
import { financeRepository } from '../repositories/financeRepository';

export interface Transaction {
  id: number;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  category: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  paymentMethod: string;
  notes?: string;
  emoji: string;
  created_at: string;
}

export interface CategoryInfo {
  value: string;
  label: string;
  emoji: string;
  type: 'income' | 'expense' | 'both';
}

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { value: 'food', label: 'Food', emoji: '🍕', type: 'expense' },
  { value: 'transport', label: 'Transport', emoji: '🛺', type: 'expense' },
  { value: 'shopping', label: 'Shopping', emoji: '👟', type: 'expense' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎉', type: 'expense' },
  { value: 'bills', label: 'Bills', emoji: '📺', type: 'expense' },
  { value: 'healthcare', label: 'Healthcare', emoji: '🏥', type: 'expense' },
  { value: 'education', label: 'Education', emoji: '📚', type: 'expense' },
  { value: 'salary', label: 'Salary', emoji: '💸', type: 'income' },
  { value: 'parents', label: 'Parents', emoji: '🏠', type: 'income' },
  { value: 'freelance', label: 'Freelance', emoji: '💻', type: 'income' },
  { value: 'investment', label: 'Investment', emoji: '📈', type: 'income' },
  { value: 'savings', label: 'Savings', emoji: '🎯', type: 'both' },
  { value: 'miscellaneous', label: 'Miscellaneous', emoji: '✨', type: 'both' }
];

export const PAYMENT_METHODS = ['Cash', 'UPI / Card', 'Bank Transfer', 'Other'];

export const financeEngine = {
  getTransactions(userId: number): Transaction[] {
    return financeRepository.getTransactions(userId);
  },

  getTransactionsForCycle(userId: number): Transaction[] {
    const list = this.getTransactions(userId);
    const cycleStartStr = localStorage.getItem(`breadbuddy_cycle_start_${userId}`);
    const cycleStart = cycleStartStr ? new Date(cycleStartStr).getTime() : 0;
    
    if (cycleStart) {
      return list.filter((t) => new Date(t.created_at).getTime() >= cycleStart);
    }
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return list.filter((t) => t.created_at.startsWith(currentMonth));
  },

  saveTransactions(userId: number, list: Transaction[]): void {
    financeRepository.saveTransactions(userId, list);
  },

  getCategories(userId: number): CategoryInfo[] {
    return financeRepository.getCategories(userId);
  },

  saveCategories(userId: number, list: CategoryInfo[]): void {
    financeRepository.saveCategories(userId, list);
  },

  getCategoryEmoji(categoryValue: string, userId: number): string {
    const cats = this.getCategories(userId);
    const matched = cats.find((c) => c.value === categoryValue);
    return matched ? matched.emoji : '✨';
  },

  getSummary(userId: number, allowance: number, currency: string): Summary {
    const list = this.getTransactions(userId);
    const cycleList = this.getTransactionsForCycle(userId);

    const expenses = cycleList.filter((t) => t.type === 'expense');
    const incomes = cycleList.filter((t) => t.type === 'income');
    
    const spent = expenses.reduce((acc, t) => acc + t.amount, 0);

    // Parent income is treated as an allowance top-up (not extra income on top)
    const parentIncome = incomes
      .filter((t) => t.category === 'parents')
      .reduce((acc, t) => acc + t.amount, 0);
    const otherIncome = incomes
      .filter((t) => t.category !== 'parents')
      .reduce((acc, t) => acc + t.amount, 0);

    // Effective allowance = base allowance + money received from parents this cycle
    const effectiveAllowance = allowance + parentIncome;

    // Remaining = effective allowance + any other income sources - expenses
    const remaining = effectiveAllowance + otherIncome - spent;

    // Group expenses by category
    const byCategoryMap: Record<string, { total: number; count: number; emoji: string }> = {};
    expenses.forEach((e) => {
      const catVal = e.category;
      const emoji = e.emoji || this.getCategoryEmoji(catVal, userId);
      if (!byCategoryMap[catVal]) {
        byCategoryMap[catVal] = { total: 0, count: 0, emoji };
      }
      byCategoryMap[catVal].total += e.amount;
      byCategoryMap[catVal].count += 1;
    });

    const byCategory = Object.entries(byCategoryMap).map(([category, info]) => {
      const catInfo = DEFAULT_CATEGORIES.find((c) => c.value === category);
      const label = catInfo ? catInfo.label : category;
      return {
        category: label,
        total: info.total,
        count: info.count,
        emoji: info.emoji
      };
    });

    // Map ALL transactions to legacy Expense type for the Recent Transactions widget
    // Sorted by created_at descending so most recent activity appears first
    const recent: Expense[] = [...list]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        amount: t.amount,
        category: t.category,
        note: t.title + (t.description ? ` • ${t.description}` : ''),
        emoji: t.emoji,
        created_at: t.created_at,
        type: t.type,
      }));

    // Group daily burn
    const dailyBurnMap: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = e.date;
      dailyBurnMap[date] = (dailyBurnMap[date] || 0) + e.amount;
    });
    const dailyBurn = Object.entries(dailyBurnMap).map(([day, total]) => ({
      day,
      total
    }));

    return {
      month: new Date().toLocaleString('default', { month: 'long' }),
      currency,
      allowance: effectiveAllowance, // reflects base + parent top-ups
      spent,
      remaining,
      byCategory,
      dailyBurn,
      recent
    };
  }
};
