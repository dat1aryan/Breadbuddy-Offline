import { XPState, LevelState, ProgressionEventType } from '../types/progression';
import { xpRepository, XPRepository } from '../repositories/xpRepository';
import { levelEngine } from './levelEngine';
import { calculateXpForLevel, getLevelLabel, XP_REWARDS } from '../configs/progressionConfig';
import { notificationEngine } from '../lib/notificationEngine';

export class XPEngine {
  constructor(
    private repository: XPRepository = xpRepository,
    private levelCalc = levelEngine
  ) {}

  getXPState(userId: number): {
    totalXp: number;
    currentLevelXp: number;
    xp: number; // alias for currentLevelXp (legacy support)
    level: number;
    label: string;
    xpNeededForNext: number;
    xpForCurrentLevel: number; // legacy support
  } {
    const xpState = this.repository.getXPState(userId);
    const level = this.repository.getLevel(userId);
    const label = getLevelLabel(level);
    const xpNeededForNext = calculateXpForLevel(level);

    return {
      totalXp: xpState.totalXp,
      currentLevelXp: xpState.currentLevelXp,
      xp: xpState.currentLevelXp,
      level,
      label,
      xpNeededForNext,
      xpForCurrentLevel: xpNeededForNext,
    };
  }

  saveXPState(userId: number, xpState: XPState, level: number): void {
    this.repository.saveXPState(userId, xpState);
    this.repository.saveLevel(userId, level);
  }

  rewardXP(
    userId: number,
    activity: ProgressionEventType
  ): {
    xpGained: number;
    newXp: number;
    levelUp: boolean;
    newLevel: number;
    oldLevel: number;
  } {
    const xpGained = XP_REWARDS[activity] || 0;
    const result = this.addXP(userId, xpGained);
    return {
      xpGained: result.xpGained,
      newXp: result.newXpState.currentLevelXp,
      levelUp: result.levelUp,
      newLevel: result.newLevel,
      oldLevel: result.oldLevel,
    };
  }

  addXP(
    userId: number,
    xpGained: number
  ): {
    xpGained: number;
    newXpState: XPState;
    levelUp: boolean;
    oldLevel: number;
    newLevel: number;
    levelState: LevelState;
  } {
    const currentState = this.getXPState(userId);
    const currentLevel = currentState.level;

    const { newLevel, newLevelXp, levelUp } = this.levelCalc.calculateNewLevelAfterXp(
      currentLevel,
      currentState.currentLevelXp,
      xpGained
    );

    const newXPState: XPState = {
      totalXp: currentState.totalXp + xpGained,
      currentLevelXp: newLevelXp,
    };

    this.saveXPState(userId, newXPState, newLevel);

    const levelState = this.levelCalc.calculateLevelState(newLevel, newXPState);

    if (levelUp) {
      const label = getLevelLabel(newLevel);
      notificationEngine.addNotification(userId, {
        title: `⚡ Level Up! Reached Level ${newLevel}`,
        message: `Congratulations! You leveled up to Level ${newLevel} (${label})! Keep baking wealth habits.`,
        emoji: '⚡',
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('xp-updated', {
          detail: {
            userId,
            xpGained,
            xpState: newXPState,
            levelUp,
            oldLevel: currentLevel,
            newLevel,
            level: newLevel,
            levelState,
          },
        })
      );
    }

    return {
      xpGained,
      newXpState: newXPState,
      levelUp,
      oldLevel: currentLevel,
      newLevel,
      levelState,
    };
  }
}

export const xpEngine = new XPEngine();
