import { User } from './types';

export const onboardingEngine = {
  isCompleted(userId: number, user?: User | null): boolean {
    if (user?.isOnboarded || (user?.monthlyAllowance !== undefined && user.monthlyAllowance > 0)) {
      localStorage.setItem(`breadbuddy_onboarded_${userId}`, 'true');
      return true;
    }
    return localStorage.getItem(`breadbuddy_onboarded_${userId}`) === 'true';
  },

  setCompleted(userId: number, completed: boolean): void {
    localStorage.setItem(`breadbuddy_onboarded_${userId}`, completed ? 'true' : 'false');
  },

  getResumeStep(userId: number): number {
    return Number(localStorage.getItem(`breadbuddy_onboarding_step_${userId}`) || '0');
  },

  saveResumeStep(userId: number, step: number): void {
    localStorage.setItem(`breadbuddy_onboarding_step_${userId}`, String(step));
  },

  clearUserData(userId: number, targetEmail?: string): void {
    if (targetEmail) {
      try {
        const rawSavedUser = localStorage.getItem('breadbuddy_user');
        if (rawSavedUser) {
          const savedUser = JSON.parse(rawSavedUser);
          if (savedUser && savedUser.email && savedUser.email.toLowerCase() === targetEmail.toLowerCase()) {
            // Same user account being synced/re-registered across devices: preserve their data!
            return;
          }
        }
      } catch {
        // If parsing fails, fall through to safe clearing
      }
    }

    const keysToRemove = [
      `breadbuddy_onboarded_${userId}`,
      `breadbuddy_onboarding_step_${userId}`,
      `onboarded_${userId}`,
      `breadbuddy_transactions_${userId}`,
      `breadbuddy_categories_${userId}`,
      `breadbuddy_goals_${userId}`,
      `breadbuddy_xp_${userId}`,
      `breadbuddy_level_${userId}`,
      `breadbuddy_achievements_${userId}`,
      `breadbuddy_streak_${userId}`,
      `breadbuddy_subscriptions_${userId}`,
      `breadbuddy_settings_${userId}`,
      `breadbuddy_prefs_${userId}`,
      `breadbuddy_profile_${userId}`,
      `breadbuddy_avatar_${userId}`,
      `breadbuddy_join_date_${userId}`,
      `breadbuddy_cycle_start_${userId}`,
      `breadbuddy_notifications_${userId}`,
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to remove key ${key}:`, e);
      }
    });

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes(`_${userId}_`) || key.endsWith(`_${userId}`))) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`Failed to remove dynamic key ${key}:`, e);
        }
      }
    }
  }
};


