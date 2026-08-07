import { ProgressionEvent, ProgressionResult, ProgressionState } from '../types/progression';
import { progressionRepository, ProgressionRepository } from '../repositories/progressionRepository';
import { streakEngine, StreakEngine } from './streakEngine';
import { xpEngine, XPEngine } from './xpEngine';
import { XP_REWARDS } from '../configs/progressionConfig';

export class ProgressionEngine {
  constructor(
    private repository: ProgressionRepository = progressionRepository,
    private streakEng: StreakEngine = streakEngine,
    private xpEng: XPEngine = xpEngine
  ) {}

  getFullState(userId: number): ProgressionState {
    return this.repository.getFullState(userId);
  }

  processEvent(event: ProgressionEvent): ProgressionResult {
    const { userId, type } = event;

    // 1. Determine XP Gained from configuration
    const xpGained = XP_REWARDS[type] || 0;

    // 2. Add XP
    const xpResult = this.xpEng.addXP(userId, xpGained);

    // 3. Record Action in Streak Engine
    const streakResult = this.streakEng.recordAction(userId);

    // 4. If a streak milestone was unlocked, reward extra XP
    let extraXpGained = 0;
    let finalXpState = xpResult.newXpState;
    let finalLevelState = xpResult.levelState;
    let finalLevelUp = xpResult.levelUp;
    let finalNewLevel = xpResult.newLevel;

    if (streakResult.milestoneUnlocked) {
      const milestone = streakResult.milestoneUnlocked;
      const extraRewardType = milestone === 7 ? 'streak_7' : milestone === 30 ? 'streak_30' : null;
      if (extraRewardType) {
        extraXpGained = XP_REWARDS[extraRewardType] || 0;
        
        const extraResult = this.xpEng.addXP(userId, extraXpGained);
        finalXpState = extraResult.newXpState;
        finalLevelState = extraResult.levelState;
        finalLevelUp = finalLevelUp || extraResult.levelUp;
        finalNewLevel = extraResult.newLevel;
      }
    }

    const result = {
      xpGained: xpGained + extraXpGained,
      xpState: finalXpState,
      levelState: finalLevelState,
      levelUp: finalLevelUp,
      oldLevel: xpResult.oldLevel,
      newLevel: finalNewLevel,
      streakUpdated: streakResult.streakUpdated,
      streakState: streakResult.streakState,
      milestoneUnlocked: streakResult.milestoneUnlocked,
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('progression-updated', {
          detail: { userId, result },
        })
      );
    }

    return result;
  }
}

export const progressionEngine = new ProgressionEngine();
