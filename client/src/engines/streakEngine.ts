import { StreakState } from '../types/progression';
import { streakRepository, StreakRepository } from '../repositories/streakRepository';
import { STREAK_MILESTONES, type StreakMilestone } from '../configs/progressionConfig';
import { notificationEngine } from '../lib/notificationEngine';

export class StreakEngine {
  constructor(private repository: StreakRepository = streakRepository) {}

  getStreak(userId: number): StreakState {
    return this.repository.getStreak(userId);
  }

  saveStreak(userId: number, state: StreakState): void {
    this.repository.saveStreak(userId, state);
  }

  recordAction(userId: number): {
    currentStreak: number;
    longestStreak: number;
    streakUpdated: boolean;
    milestoneUnlocked: StreakMilestone | null;
    streakState: StreakState;
  } {
    const state = this.getStreak(userId);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (state.lastActiveDate === todayStr) {
      return {
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        streakUpdated: false,
        milestoneUnlocked: null,
        streakState: state,
      };
    }

    let current = state.currentStreak;
    let longest = state.longestStreak;
    let streakUpdated = false;
    let milestoneUnlocked: StreakMilestone | null = null;

    if (state.lastActiveDate) {
      const [lastYear, lastMonth, lastDay] = state.lastActiveDate.split('-').map(Number);
      const lastActiveDateObj = new Date(lastYear, lastMonth - 1, lastDay);
      const todayDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const diffTime = todayDateObj.getTime() - lastActiveDateObj.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        current += 1;
        streakUpdated = true;
      } else if (diffDays > 1) {
        state.missedDays += (diffDays - 1);
        current = 1;
        streakUpdated = true;
      }
    } else {
      current = 1;
      streakUpdated = true;
    }

    if (current > longest) {
      longest = current;
    }

    // Check if the new streak value hits any configured milestone
    milestoneUnlocked = STREAK_MILESTONES.find((m) => current === m) ?? null;

    const newState: StreakState = {
      currentStreak: current,
      longestStreak: longest,
      lastActiveDate: todayStr,
      missedDays: state.missedDays,
    };

    this.saveStreak(userId, newState);

    if (streakUpdated) {
      if (milestoneUnlocked) {
        notificationEngine.addNotification(userId, {
          title: `🔥 Streak Flame Unlocked! (${milestoneUnlocked} Days)`,
          message: `Incredible! You hit a ${milestoneUnlocked}-day streak milestone! Flame tier achieved!`,
          emoji: '🔥',
        });
      } else {
        notificationEngine.addNotification(userId, {
          title: 'Streak Active 🔥',
          message: `${current} day login streak achieved! Keep stacking.`,
          emoji: '🔥',
        });
      }
    }

    return {
      currentStreak: current,
      longestStreak: longest,
      streakUpdated,
      milestoneUnlocked,
      streakState: newState,
    };
  }

  breakStreak(userId: number): StreakState {
    const state = this.getStreak(userId);
    const updatedState: StreakState = {
      ...state,
      currentStreak: 0,
      lastActiveDate: null,
    };
    this.saveStreak(userId, updatedState);
    return updatedState;
  }
}

export const streakEngine = new StreakEngine();
