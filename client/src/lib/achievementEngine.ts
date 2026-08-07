import { financeEngine } from './financeEngine';
import { savingsEngine } from './savingsEngine';
import { streakEngine } from './streakEngine';
import { gamificationRepository } from '../repositories/gamificationRepository';
import { notificationEngine } from './notificationEngine';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export const achievementEngine = {
  getAchievements(userId: number): Achievement[] {
    const saved = gamificationRepository.getAchievements(userId);
    const defaultAchievements: Achievement[] = [
      {
        id: 'first_expense',
        title: 'First Expense 🥖',
        description: 'Log your first transaction.',
        emoji: '🥖',
        unlocked: false,
        unlockedAt: null,
        progress: 0,
        target: 1,
      },
      {
        id: 'streak_7',
        title: '7 Day Streak 🔥',
        description: 'Stay active for seven consecutive days.',
        emoji: '🔥',
        unlocked: false,
        unlockedAt: null,
        progress: 0,
        target: 7,
      },
      {
        id: 'first_1000_saved',
        title: 'First ₹1000 Saved 💰',
        description: 'Reach ₹1,000 in accumulated savings goals.',
        emoji: '💰',
        unlocked: false,
        unlockedAt: null,
        progress: 0,
        target: 1000,
      },
      {
        id: 'goal_getter',
        title: 'Goal Getter 🎯',
        description: 'Complete your first savings goal.',
        emoji: '🎯',
        unlocked: false,
        unlockedAt: null,
        progress: 0,
        target: 1,
      },
      {
        id: 'expense_explorer',
        title: 'Expense Explorer 📊',
        description: 'Log 100 transactions.',
        emoji: '📊',
        unlocked: false,
        unlockedAt: null,
        progress: 0,
        target: 100,
      },
      {
        id: 'saver_30',
        title: 'Saver 🏦',
        description: 'Maintain a 30-day streak or reach 30 active days.',
        emoji: '🏦',
        unlocked: false,
        unlockedAt: null,
        progress: 0,
        target: 30,
      },
    ];

    const baseList = !saved
      ? defaultAchievements
      : defaultAchievements.map((def) => {
          const found = saved.find((p) => p.id === def.id);
          return found ? { ...def, ...found } : def;
        });

    const transactions = financeEngine.getTransactions(userId);
    const goals = savingsEngine.getGoals(userId);
    const streakState = streakEngine.getStreak(userId);

    return baseList.map((ach) => {
      if (ach.unlocked) return ach;
      let progress = 0;
      switch (ach.id) {
        case 'first_expense':
          progress = transactions.length;
          break;
        case 'streak_7':
          progress = streakState.currentStreak;
          break;
        case 'first_1000_saved':
          progress = goals.reduce((acc, g) => acc + g.current_amount, 0);
          break;
        case 'goal_getter':
          progress = goals.filter((g) => g.current_amount >= g.target_amount).length;
          break;
        case 'expense_explorer':
          progress = transactions.length;
          break;
        case 'saver_30':
          progress = streakState.longestStreak;
          break;
      }
      return {
        ...ach,
        progress: Math.min(ach.target, progress),
      };
    });
  },

  saveAchievements(userId: number, list: Achievement[]) {
    gamificationRepository.saveAchievements(userId, list);
  },

  checkAndUnlock(userId: number): { unlockedThisTime: Achievement[] } {
    const list = this.getAchievements(userId);
    const transactions = financeEngine.getTransactions(userId);
    const goals = savingsEngine.getGoals(userId);
    const streakState = streakEngine.getStreak(userId);

    const unlockedThisTime: Achievement[] = [];
    const updated = list.map((ach) => {
      if (ach.unlocked) return ach;

      let progress = 0;
      let shouldUnlock = false;

      switch (ach.id) {
        case 'first_expense':
          progress = transactions.length;
          shouldUnlock = progress >= ach.target;
          break;
        case 'streak_7':
          progress = streakState.currentStreak;
          shouldUnlock = progress >= ach.target;
          break;
        case 'first_1000_saved':
          const totalSaved = goals.reduce((acc, g) => acc + g.current_amount, 0);
          progress = totalSaved;
          shouldUnlock = progress >= ach.target;
          break;
        case 'goal_getter':
          const completedGoals = goals.filter((g) => g.current_amount >= g.target_amount).length;
          progress = completedGoals;
          shouldUnlock = progress >= ach.target;
          break;
        case 'expense_explorer':
          progress = transactions.length;
          shouldUnlock = progress >= ach.target;
          break;
        case 'saver_30':
          progress = streakState.longestStreak;
          shouldUnlock = progress >= ach.target;
          break;
      }

      const isNowUnlocked = !ach.unlocked && shouldUnlock;
      const finalAch = {
        ...ach,
        progress: Math.min(ach.target, progress),
        unlocked: ach.unlocked || shouldUnlock,
        unlockedAt: ach.unlockedAt || (isNowUnlocked ? new Date().toISOString() : null),
      };

      if (isNowUnlocked) {
        unlockedThisTime.push(finalAch);
        notificationEngine.addNotification(userId, {
          title: `🏆 Trophy Unlocked: ${finalAch.title}`,
          message: `Congratulations! You just earned the "${finalAch.title}" trophy! ${finalAch.description}`,
          emoji: finalAch.emoji || '🏆',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('achievement-unlocked', {
              detail: { userId, achievement: finalAch },
            })
          );
        }
      }

      return finalAch;
    });

    this.saveAchievements(userId, updated);
    return { unlockedThisTime };
  }
};
