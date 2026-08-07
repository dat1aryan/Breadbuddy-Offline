import { LevelState, XPState } from '../types/progression';
import { calculateXpForLevel, getLevelLabel } from '../configs/progressionConfig';

export const levelEngine = {
  calculateLevelState(level: number, xp: XPState): LevelState {
    const xpNeededForNext = calculateXpForLevel(level);
    const progressPercentage = xpNeededForNext > 0
      ? Math.min(100, Math.max(0, Math.round((xp.currentLevelXp / xpNeededForNext) * 100)))
      : 0;

    return {
      level,
      xpNeededForNext,
      progressPercentage,
      label: getLevelLabel(level),
    };
  },

  calculateNewLevelAfterXp(
    currentLevel: number,
    currentLevelXp: number,
    xpGained: number
  ): { newLevel: number; newLevelXp: number; levelUp: boolean } {
    let level = currentLevel;
    let xp = currentLevelXp + xpGained;
    let levelUp = false;

    let needed = calculateXpForLevel(level);
    while (xp >= needed) {
      xp -= needed;
      level += 1;
      needed = calculateXpForLevel(level);
      levelUp = true;
    }

    return {
      newLevel: level,
      newLevelXp: xp,
      levelUp,
    };
  },
};
