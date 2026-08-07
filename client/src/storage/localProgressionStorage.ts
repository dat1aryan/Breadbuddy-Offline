import { StorageAdapter, defaultStorageAdapter } from '../repositories/storageAdapter';
import { StreakState, XPState, ProgressionState } from '../types/progression';
import { DEFAULT_STREAK_STATE, DEFAULT_XP_STATE, getLevelLabel, calculateXpForLevel } from '../configs/progressionConfig';

export class LocalProgressionStorage {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  private getSafeJson<T>(key: string, defaultValue: T): T {
    const raw = this.storage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return { ...defaultValue, ...JSON.parse(raw) };
    } catch {
      return defaultValue;
    }
  }

  getStreak(userId: number): StreakState {
    return this.getSafeJson(`breadbuddy_streak_${userId}`, DEFAULT_STREAK_STATE);
  }

  saveStreak(userId: number, state: StreakState): void {
    this.storage.setItem(`breadbuddy_streak_${userId}`, JSON.stringify(state));
  }

  getXPState(userId: number): XPState {
    return this.getSafeJson(`breadbuddy_xp_${userId}`, DEFAULT_XP_STATE);
  }

  saveXPState(userId: number, state: XPState): void {
    this.storage.setItem(`breadbuddy_xp_${userId}`, JSON.stringify(state));
  }

  getLevel(userId: number): number {
    const raw = this.storage.getItem(`breadbuddy_level_${userId}`);
    if (!raw) return 1;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 1 : parsed;
  }

  saveLevel(userId: number, level: number): void {
    this.storage.setItem(`breadbuddy_level_${userId}`, String(level));
  }

  getFullState(userId: number): ProgressionState {
    const streak = this.getStreak(userId);
    const xp = this.getXPState(userId);
    const level = this.getLevel(userId);

    const xpNeededForNext = calculateXpForLevel(level);
    const progressPercentage = xpNeededForNext > 0 
      ? Math.min(100, Math.max(0, (xp.currentLevelXp / xpNeededForNext) * 100)) 
      : 0;

    return {
      userId,
      streak,
      xp,
      level: {
        level,
        xpNeededForNext,
        progressPercentage,
        label: getLevelLabel(level),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  saveFullState(userId: number, state: ProgressionState): void {
    this.saveStreak(userId, state.streak);
    this.saveXPState(userId, state.xp);
    this.saveLevel(userId, state.level.level);
  }
}

export const localProgressionStorage = new LocalProgressionStorage();
