import { savingsRepository } from '../repositories/savingsRepository';
import { financeEngine, Transaction } from './financeEngine';
import { getUser } from './auth';
import { progressionEngine } from '../engines/progressionEngine';
import { achievementEngine } from './achievementEngine';
import { notificationEngine } from './notificationEngine';

export interface Goal {
  id: number;
  title: string;
  emoji: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  archived: boolean;
  created_at: string;
}

export const savingsEngine = {
  getGoals(userId: number): Goal[] {
    return savingsRepository.getGoals(userId);
  },

  saveGoals(userId: number, list: Goal[]) {
    savingsRepository.saveGoals(userId, list);
  },

  createGoal(userId: number, title: string, emoji: string, targetAmount: number, targetDate?: string | null, skipEvents = false): Goal {
    const list = this.getGoals(userId);
    const newGoal: Goal = {
      id: Date.now() + Math.random(),
      title,
      emoji: emoji || '🎯',
      target_amount: targetAmount,
      current_amount: 0,
      target_date: targetDate || null,
      archived: false,
      created_at: new Date().toISOString(),
    };
    list.push(newGoal);
    this.saveGoals(userId, list);

    if (!skipEvents) {
      const user = getUser();
      const currency = user?.currency || '₹';
      notificationEngine.addNotification(userId, {
        title: 'New Goal Created 🎯',
        message: `Targeting ${emoji || '🎯'} ${title} (${currency}${targetAmount.toLocaleString()})!`,
        emoji: emoji || '🎯',
      });

      // Notify progression engine of goal creation
      progressionEngine.processEvent({
        userId,
        type: 'create_goal',
        timestamp: new Date().toISOString(),
      });

      // Check and unlock achievements
      achievementEngine.checkAndUnlock(userId);
    }

    return newGoal;
  },

  fundGoal(userId: number, id: number, amount: number): Goal | null {
    const list = this.getGoals(userId);
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return null;

    const goal = list[idx];
    const newAmount = Math.min(goal.target_amount, goal.current_amount + amount);
    const actualFunded = newAmount - goal.current_amount;

    if (actualFunded <= 0) return goal;

    goal.current_amount = newAmount;

    // 1. Create Ledger transaction for savings contribution
    const user = getUser();
    const currency = user?.currency || '₹';
    const txs = financeEngine.getTransactions(userId);
    const newTx: Transaction = {
      id: Date.now(),
      amount: actualFunded,
      currency: currency,
      type: 'expense',
      category: 'savings',
      title: 'Savings Contribution',
      description: `Contribution to "${goal.title}"`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      paymentMethod: 'Other',
      emoji: goal.emoji || '🎯',
      created_at: new Date().toISOString(),
    };
    financeEngine.saveTransactions(userId, [newTx, ...txs]);

    // Dispatch event to update other dashboard cards instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-updated'));
    }

    // 2. Complete goal validation and auto-archive if fully completed
    const wasCompleted = goal.current_amount - actualFunded < goal.target_amount;
    const isCompletedNow = goal.current_amount >= goal.target_amount;

    if (wasCompleted && isCompletedNow) {
      goal.archived = true;
      this.saveGoals(userId, list);

      notificationEngine.addNotification(userId, {
        title: 'Goal Achieved! 🏆',
        message: `Congrats! You completed ${goal.emoji} ${goal.title}!`,
        emoji: '🏆',
      });

      // Notify progression of goal completion
      progressionEngine.processEvent({
        userId,
        type: 'complete_goal',
        timestamp: new Date().toISOString(),
      });
    } else {
      this.saveGoals(userId, list);

      notificationEngine.addNotification(userId, {
        title: 'Goal Funded 💸',
        message: `Added ${currency}${actualFunded.toLocaleString()} to ${goal.emoji} ${goal.title}.`,
        emoji: '💸',
      });

      // Notify progression of goal funding
      progressionEngine.processEvent({
        userId,
        type: 'fund_goal',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Check and unlock achievements
    achievementEngine.checkAndUnlock(userId);

    return goal;
  },

  updateGoal(userId: number, id: number, updates: Partial<Omit<Goal, 'id' | 'created_at'>>): Goal | null {
    const list = this.getGoals(userId);
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    this.saveGoals(userId, list);
    return list[idx];
  },

  deleteGoal(userId: number, id: number): boolean {
    const list = this.getGoals(userId);
    const filtered = list.filter((g) => g.id !== id);
    this.saveGoals(userId, filtered);
    return list.length !== filtered.length;
  },

  archiveGoal(userId: number, id: number): Goal | null {
    return this.updateGoal(userId, id, { archived: true });
  },

  unarchiveGoal(userId: number, id: number): Goal | null {
    return this.updateGoal(userId, id, { archived: false });
  }
};
