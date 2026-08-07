import { ProgressionEventType } from '../types/progression';

export const XP_REWARDS: Record<ProgressionEventType, number> = {
  log_expense: 10,
  create_goal: 25,
  complete_goal: 100,
  streak_7: 75,
  streak_30: 250,
  daily_login: 15,
  chat_with_bro: 5,
  fund_goal: 15,
};

export const LEVEL_BASE_XP = 100;
export const LEVEL_XP_MULTIPLIER = 100; // XP needed = level * LEVEL_XP_MULTIPLIER

export function calculateXpForLevel(level: number): number {
  return level * LEVEL_XP_MULTIPLIER;
}

export const LEVEL_LABELS = [
  { threshold: 50, label: 'Bread Legend 🌟' },
  { threshold: 35, label: 'Bakery Boss 🏆' },
  { threshold: 20, label: 'Crust Commander 👑' },
  { threshold: 10, label: 'Toast Tactician 🔥' },
  { threshold: 5, label: 'Dough Explorer 🍞' },
  { threshold: 1, label: 'Bread Beginner 🥖' },
];

export function getLevelLabel(level: number): string {
  const tier = LEVEL_LABELS.find((t) => level >= t.threshold);
  return tier ? tier.label : 'Bread Beginner 🥖';
}

export interface ProgressionMotivationContext {
  level: number;
  xp: number;
  xpNeededForNext: number;
  progressPercentage: number;
  title: string;
}

export const MOTIVATIONAL_MESSAGES = {
  firstLevel: [
    "Welcome to the breadline, bestie! Let's get this dough! 🍞",
    "First steps are the hardest, but you're already cooking! 🥖",
    "Level 1 down! Time to bake some real wealth habits! ✨"
  ],
  nearLevelUp: [
    "So close to leveling up! You can almost taste the fresh crust! 🍞",
    "Just a tiny bit more XP to level up! Get that bread! ⚡",
    "You're on the verge of greatness (and a level up)! Let's go! 🚀"
  ],
  newTitleEarned: [
    "New title unlocked! Wear it like a crown, boss! 👑",
    "Your rank just upgraded! The bakery is looking up to you! 🏆",
    "That new title suits you, bestie! Pure main character energy! 💅"
  ],
  majorMilestones: [
    "Level 50?! You're literally a Bread Legend, actual royalty! 🌟",
    "Double digits! Level 10 means you're a certified strategist! 🔥",
    "Bakery Boss status! Level 35 is no joke, you're running the place! 🏆"
  ],
  longJourney: [
    "Look how far you've come from a simple Bread Beginner! Proud of you! 💖",
    "Your financial garden is blooming. Consistency is key! 🌱",
    "You've logged so many smart moves. Future you is rich and happy! 💎"
  ],
  fastProgress: [
    "Speedrunning financial literacy? Absolute beast mode! ⚡",
    "Whoa, you're leveling up fast! Save some dough for the rest of us! 💸",
    "Your progression speed is unmatched! Locked in! 🎯"
  ],
  slowProgress: [
    "Steady wins the race! Every single log counts, bestie! 🐢",
    "Slow progress is still progress. Keep baking! 🍞",
    "No rush, bestie! We're building wealth that lasts! 💅"
  ]
};

export function getSmartMotivation(context: ProgressionMotivationContext, lastMessage?: string): string {
  const { level, xpNeededForNext, progressPercentage } = context;
  
  let pool = MOTIVATIONAL_MESSAGES.slowProgress;
  
  if (level === 1 && progressPercentage < 40) {
    pool = MOTIVATIONAL_MESSAGES.firstLevel;
  } else if (xpNeededForNext - (xpNeededForNext * progressPercentage / 100) <= 20) {
    pool = MOTIVATIONAL_MESSAGES.nearLevelUp;
  } else if (level >= 5 && progressPercentage === 0) {
    pool = MOTIVATIONAL_MESSAGES.newTitleEarned;
  } else if (level === 5 || level === 10 || level === 20 || level === 35 || level === 50) {
    pool = MOTIVATIONAL_MESSAGES.majorMilestones;
  } else if (level >= 10) {
    pool = [...MOTIVATIONAL_MESSAGES.longJourney, ...MOTIVATIONAL_MESSAGES.fastProgress];
  } else if (progressPercentage >= 70) {
    pool = MOTIVATIONAL_MESSAGES.nearLevelUp;
  } else {
    pool = [...MOTIVATIONAL_MESSAGES.fastProgress, ...MOTIVATIONAL_MESSAGES.slowProgress];
  }

  const choices = pool.filter(msg => msg !== lastMessage);
  const finalPool = choices.length > 0 ? choices : pool;
  const randomIndex = Math.floor(Math.random() * finalPool.length);
  return finalPool[randomIndex];
}

export const DEFAULT_STREAK_STATE = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  missedDays: 0,
};

export const DEFAULT_XP_STATE = {
  totalXp: 0,
  currentLevelXp: 0,
};

export const DEFAULT_LEVEL_STATE = {
  level: 1,
  xpNeededForNext: 100,
  progressPercentage: 0,
  label: 'Financial Newbie',
};
/** All tracked streak milestones, in ascending order. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/**
 * Returns the next milestone above the given streak, or null if all are surpassed.
 */
export function getNextMilestone(current: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m > current) ?? null;
}

/** Returns milestones already reached for the given streak value. */
export function getReachedMilestones(current: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => current >= m);
}
