import { StreakState } from '../types/progression';
import { getNextMilestone, getReachedMilestones } from '../configs/progressionConfig';

// ---------------------------------------------------------------------------
// Streak Context
// ---------------------------------------------------------------------------
export type StreakContext =
  | 'first_day'
  | 'building'
  | 'milestone_3'
  | 'milestone_7'
  | 'milestone_14'
  | 'milestone_30'
  | 'milestone_50'
  | 'milestone_100'
  | 'milestone_365'
  | 'long_streak'
  | 'comeback'
  | 'no_streak'
  | 'personal_best';

export function getStreakContext(state: StreakState): StreakContext {
  const { currentStreak, longestStreak, missedDays } = state;

  if (currentStreak === 0) {
    return missedDays > 0 ? 'comeback' : 'no_streak';
  }
  if (currentStreak === 1 && missedDays > 0) return 'comeback';
  if (currentStreak === 1) return 'first_day';
  if (currentStreak === 3) return 'milestone_3';
  if (currentStreak === 7) return 'milestone_7';
  if (currentStreak === 14) return 'milestone_14';
  if (currentStreak === 30) return 'milestone_30';
  if (currentStreak === 50) return 'milestone_50';
  if (currentStreak === 100) return 'milestone_100';
  if (currentStreak === 365) return 'milestone_365';
  if (currentStreak > longestStreak) return 'personal_best';
  if (currentStreak >= 50) return 'long_streak';
  return 'building';
}

// ---------------------------------------------------------------------------
// Message Pools
// ---------------------------------------------------------------------------
type MessagePool = Record<StreakContext, string[]>;

const MESSAGES: MessagePool = {
  no_streak: [
    "Start your streak today — one day is all it takes. 🌱",
    "Every legend started at day zero. Your journey begins now.",
    "Open BreadBuddy daily and watch the magic compound. ✨",
    "Today is a perfect day to start something consistent.",
  ],
  first_day: [
    "Day 1 unlocked. The hardest day is always the first. 🔑",
    "You showed up. That already puts you ahead. Keep going. 💪",
    "First day in the books. Let's come back tomorrow. 🍞",
    "One day down, a habit in the making. See you tomorrow! 🌱",
  ],
  building: [
    "You're building real momentum. Don't stop now. 🔥",
    "Consistency is a superpower. You're developing it. ✨",
    "Every day you come back, the streak gets stronger.",
    "Small habits. Big results. Keep showing up. 💅",
    "Your future self is grateful you're here today. 🙏",
  ],
  milestone_3: [
    "3 days straight! The hardest streak to start is now behind you. 🌟",
    "Day 3 unlocked! You've formed the beginning of a habit. 🔥",
    "Three in a row. You're officially in the rhythm now! 🎯",
  ],
  milestone_7: [
    "7 Day Streak! A full week of financial discipline. Iconic. 🔥",
    "One whole week straight. That's elite-tier consistency. 👑",
    "Week one complete! You're in the top tier of BreadBuddy users. 🏆",
  ],
  milestone_14: [
    "Two weeks of daily dedication. That's not a coincidence — that's a habit. 💪",
    "14 Days! Your financial ritual is officially locked in. 🔥🔥",
    "Fortnight of fire! You're building something real here. 🏗️",
  ],
  milestone_30: [
    "30 Days! One month of unbroken consistency. Absolutely elite. 👑",
    "A month straight — you've proven this is a lifestyle, not a phase. 🏆",
    "30-day streak! Most people give up. You didn't. Respect. 🙏",
  ],
  milestone_50: [
    "50 Days! You're in rare company now. Keep going. 💎",
    "Half a century of daily check-ins. Legendary. 👑",
    "Day 50! Your commitment to your finances is genuinely impressive. 🌟",
  ],
  milestone_100: [
    "100 DAYS! You've reached the hall of fame. Absolutely legendary. 🏆",
    "Triple digits. Your discipline is next level. 💎",
    "Day 100! This is what financial mastery looks like. 🔥",
  ],
  milestone_365: [
    "365 DAYS! A full year of daily practice. You're a BreadBuddy legend. 👑🎊",
    "One year straight. This is one for the history books. 🏆",
    "365 days of showing up. Your future self owes you everything. 💎",
  ],
  long_streak: [
    "You've been locked in for a while. Keep the energy going. 🔥",
    "This is consistency at its finest. You're on a serious roll. 💎",
    "Long-term discipline is the rarest superpower. You have it. 👑",
    "The streak is impressive. The habit is real. Keep going. ✨",
  ],
  personal_best: [
    "New personal record! You've never been this consistent before. 🌟",
    "Personal best streak! You're outdoing yourself. 🏆",
    "This is your best streak ever — and you're still going! 🔥",
    "New record unlocked! Future you is very proud right now. 💅",
  ],
  comeback: [
    "You're back! Comeback streaks hit different. Welcome home. 🏠",
    "Missed a few days, but you returned. That's what matters. 💪",
    "The comeback is always stronger than the setback. Let's go! 🚀",
    "Back in the game! Every streak is just a reset with a new story. 🌱",
  ],
};

/**
 * Picks a rotating, non-repeating message from the pool for the given context.
 * Uses the current day-of-year so the message changes daily without repeating consecutively.
 */
export function getStreakMessage(context: StreakContext): string {
  const pool = MESSAGES[context];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
}

// ---------------------------------------------------------------------------
// Milestone helpers
// ---------------------------------------------------------------------------
export interface StreakMilestoneProgress {
  nextMilestone: number | null;
  progressToNext: number; // 0–100
  reached: number[];
}

export function getMilestoneProgress(state: StreakState): StreakMilestoneProgress {
  const current = state.currentStreak;
  const next = getNextMilestone(current);
  const reached = getReachedMilestones(current) as unknown as number[];

  let progressToNext = 0;
  if (next !== null) {
    // Find the previous milestone as the "from" baseline
    const reachedArr = reached;
    const prev = reachedArr.length > 0 ? reachedArr[reachedArr.length - 1] : 0;
    const span = next - prev;
    const progress = current - prev;
    progressToNext = span > 0 ? Math.round((progress / span) * 100) : 0;
  } else {
    progressToNext = 100;
  }

  return { nextMilestone: next, progressToNext, reached };
}

export function getMilestoneEmoji(milestone: number): string {
  const map: Record<number, string> = {
    3: '🌱',
    7: '🔥',
    14: '💪',
    30: '🏆',
    50: '💎',
    100: '👑',
    365: '🎊',
  };
  return map[milestone] ?? '⭐';
}

export function getMilestoneLabel(milestone: number): string {
  const map: Record<number, string> = {
    3: '3-Day Warm-Up',
    7: 'Week Warrior',
    14: 'Fortnight Focus',
    30: 'Monthly Legend',
    50: 'Half-Century',
    100: 'Century Club',
    365: 'Full Year',
  };
  return map[milestone] ?? `${milestone}-Day Streak`;
}

// ---------------------------------------------------------------------------
// Streak Status
// ---------------------------------------------------------------------------
export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'inactive';

export function getStreakStatus(state: StreakState): StreakStatus {
  if (state.currentStreak === 0 && state.longestStreak === 0) return 'inactive';
  if (state.currentStreak === 0) return 'broken';

  const todayStr = new Date().toISOString().split('T')[0];
  if (state.lastActiveDate === todayStr) return 'active';

  // Last active was yesterday — at risk
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (state.lastActiveDate === yesterdayStr) return 'at_risk';

  return 'broken';
}
