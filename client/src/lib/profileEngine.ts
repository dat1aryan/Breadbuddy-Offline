import { financeEngine } from './financeEngine';
import { savingsEngine } from './savingsEngine';
import { streakEngine } from './streakEngine';
import { achievementEngine } from './achievementEngine';
import { xpEngine } from './xpEngine';
import { preferencesEngine } from './preferencesEngine';
import { profileRepository, UserProfileFields } from '../repositories/profileRepository';
import { User } from './types';

export interface ProfileData {
  avatar: string;
  name: string;
  joinDate: string;
  level: number;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  achievementsCount: number;
  goalsCompletedCount: number;
  lifetimeTransactionsCount: number;
  lifetimeSpending: number;
  lifetimeSavings: number;
  monthlyAllowance: number;
  primaryGoal: string;
  preferredPaymentMethods: string[];
  aiBroPersonality: string;
  completionPercentage: number;
  birthday?: string;
  college?: string;
  country?: string;
  currencyPreferred?: string;
  shortBio?: string;
  favoriteGoal?: string;
  themePreference?: string;
  hasSeenWelcome?: boolean;
}

export const profileEngine = {
  getJoinDate(userId: number): string {
    return profileRepository.getJoinDate(userId);
  },

  getAvatar(userId: number): string {
    return profileRepository.getAvatar(userId);
  },

  setAvatar(userId: number, emoji: string): void {
    profileRepository.setAvatar(userId, emoji);
  },

  getProfileFields(userId: number): UserProfileFields {
    return profileRepository.getProfileFields(userId);
  },

  saveProfileFields(userId: number, fields: UserProfileFields): void {
    profileRepository.saveProfileFields(userId, fields);
  },

  getProfile(userId: number, user: User): ProfileData {
    const prefs = preferencesEngine.getPreferences(userId);
    const profileFields = profileRepository.getProfileFields(userId);
    const xpState = xpEngine.getXPState(userId);
    const streakState = streakEngine.getStreak(userId);
    const achievements = achievementEngine.getAchievements(userId);
    const goals = savingsEngine.getGoals(userId);
    const transactions = financeEngine.getTransactions(userId);


    const achievementsCount = achievements.filter((a) => a.unlocked).length;
    const goalsCompletedCount = goals.filter((g) => g.current_amount >= g.target_amount).length;
    
    const lifetimeTransactionsCount = transactions.length;
    const lifetimeSpending = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const lifetimeSavings = goals.reduce((acc, g) => acc + g.current_amount, 0);

    const avatar = this.getAvatar(userId);
    const name = user.name || '';
    const monthlyAllowance = user.monthlyAllowance || 0;
    const primaryGoal = profileFields.primaryGoal || profileFields.favoriteGoal || '';
    const favoriteGoal = profileFields.favoriteGoal || profileFields.primaryGoal || '';
    const preferredPaymentMethods = profileFields.preferredPaymentMethods || ['UPI', 'Cash'];
    const aiBroPersonality = prefs.aiBroPersonality || 'bestie';

    // Calculate completion percentage across 12 canonical profile fields
    let completedFields = 0;
    if (name) completedFields++;
    if (avatar) completedFields++;
    if (monthlyAllowance > 0) completedFields++;
    if (primaryGoal || favoriteGoal) completedFields++;
    if (preferredPaymentMethods.length > 0) completedFields++;
    if (aiBroPersonality) completedFields++;
    if (profileFields.birthday) completedFields++;
    if (profileFields.college) completedFields++;
    if (profileFields.country) completedFields++;
    if (profileFields.currencyPreferred || user.currency) completedFields++;
    if (profileFields.shortBio) completedFields++;
    if (prefs.themePreference) completedFields++;

    const completionPercentage = Math.round((completedFields / 12) * 100);

    return {
      avatar,
      name,
      joinDate: this.getJoinDate(userId),
      level: xpState.level,
      xp: xpState.xp,
      currentStreak: streakState.currentStreak,
      longestStreak: streakState.longestStreak,
      achievementsCount,
      goalsCompletedCount,
      lifetimeTransactionsCount,
      lifetimeSpending,
      lifetimeSavings,
      monthlyAllowance,
      primaryGoal,
      preferredPaymentMethods,
      aiBroPersonality,
      completionPercentage,
      birthday: profileFields.birthday || '',
      college: profileFields.college || '',
      country: profileFields.country || '',
      currencyPreferred: profileFields.currencyPreferred || user.currency || '₹',
      shortBio: profileFields.shortBio || '',
      favoriteGoal: profileFields.favoriteGoal || '',
      themePreference: prefs.themePreference || 'dark',
      hasSeenWelcome: profileFields.hasSeenWelcome || false,
    };
  }
};
