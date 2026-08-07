import { StorageAdapter, defaultStorageAdapter } from './storageAdapter';
import { StreakState } from '../lib/streakEngine';
import { XPState } from '../lib/xpEngine';
import { Achievement } from '../lib/achievementEngine';

export class GamificationRepository {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  getStreak(userId: number): StreakState {
    const raw = this.storage.getItem(`breadbuddy_streak_${userId}`);
    const defaultState: StreakState = {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      missedDays: 0,
    };
    if (!raw) return defaultState;
    try {
      return { ...defaultState, ...JSON.parse(raw) };
    } catch {
      return defaultState;
    }
  }

  saveStreak(userId: number, state: StreakState): void {
    this.storage.setItem(`breadbuddy_streak_${userId}`, JSON.stringify(state));
  }

  getXPState(userId: number): XPState {
    const raw = this.storage.getItem(`breadbuddy_xp_${userId}`);
    let state: XPState = { totalXp: 0, currentLevelXp: 0, xp: 0, level: 1 };
    if (raw) {
      try {
        state = { ...state, ...JSON.parse(raw) };
      } catch {}
    }
    return state;
  }

  saveXPState(userId: number, state: XPState): void {
    this.storage.setItem(`breadbuddy_xp_${userId}`, JSON.stringify(state));
  }

  getAchievements(userId: number): Achievement[] | null {
    const raw = this.storage.getItem(`breadbuddy_achievements_${userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveAchievements(userId: number, list: Achievement[]): void {
    this.storage.setItem(`breadbuddy_achievements_${userId}`, JSON.stringify(list));
  }
}

export const gamificationRepository = new GamificationRepository();
