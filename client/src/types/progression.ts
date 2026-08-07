export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // format YYYY-MM-DD
  missedDays: number;
}

export interface XPState {
  totalXp: number;
  currentLevelXp: number;
  xp?: number; // Legacy compatibility
  level?: number; // Legacy compatibility
}

export interface LevelState {
  level: number;
  xpNeededForNext: number;
  progressPercentage: number; // 0 to 100
  label: string;
}

export interface ProgressionState {
  userId: number;
  streak: StreakState;
  xp: XPState;
  level: LevelState;
  updatedAt: string;
}

export type ProgressionEventType =
  | 'log_expense'
  | 'create_goal'
  | 'complete_goal'
  | 'streak_7'
  | 'streak_30'
  | 'daily_login'
  | 'chat_with_bro'
  | 'fund_goal';

export interface ProgressionEvent {
  userId: number;
  type: ProgressionEventType;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ProgressionResult {
  xpGained: number;
  xpState: XPState;
  levelState: LevelState;
  levelUp: boolean;
  oldLevel: number;
  newLevel: number;
  streakUpdated: boolean;
  streakState: StreakState;
  milestoneUnlocked: number | null;
}

export interface IStreakRepository {
  getStreak(userId: number): StreakState;
  saveStreak(userId: number, state: StreakState): void;
}

export interface IXPRepository {
  getXPState(userId: number): XPState;
  saveXPState(userId: number, state: XPState): void;
  getLevel(userId: number): number;
  saveLevel(userId: number, level: number): void;
}

export interface IProgressionRepository {
  getFullState(userId: number): ProgressionState;
  saveFullState(userId: number, state: ProgressionState): void;
}
