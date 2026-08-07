import { preferencesRepository, UserPreferences } from '../repositories/preferencesRepository';

export { type UserPreferences } from '../repositories/preferencesRepository';

export const preferencesEngine = {
  getPreferences(userId: number): UserPreferences {
    return preferencesRepository.getPreferences(userId);
  },

  savePreferences(userId: number, prefs: Partial<UserPreferences>): void {
    preferencesRepository.savePreferences(userId, prefs);
  },

  getPersonalityGreeting(name: string, personality: string): { title: string; subtitle: string } {
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    // isEvening: 17–23 + midnight 0–4

    switch (personality) {
      case 'professional':
        if (isMorning) {
          return {
            title: `Good morning, ${name}.`,
            subtitle: "Let's review your morning budget status and cashflow."
          };
        }
        if (isAfternoon) {
          return {
            title: `Good afternoon, ${name}.`,
            subtitle: "Let's check your midday spending metrics and updates."
          };
        }
        return {
          title: `Good evening, ${name}.`,
          subtitle: "Let's review your financial position and end-of-day metrics."
        };
      case 'coach':
        if (isMorning) {
          return {
            title: `Good morning, ${name}! 🚀`,
            subtitle: "Ready to make today's bread? No excuses, let's win today!"
          };
        }
        if (isAfternoon) {
          return {
            title: `Keep grinding, ${name}! 🏆`,
            subtitle: "Hope your wallet's having a strong day. Lock in your savings!"
          };
        }
        return {
          title: `Good evening, ${name}! 🚀`,
          subtitle: "Let's see how today went. Did we hit our targets?"
        };
      case 'calm':
        if (isMorning) {
          return {
            title: `Good morning, ${name} ☀️`,
            subtitle: "Let's start today with peaceful, intentional choices."
          };
        }
        if (isAfternoon) {
          return {
            title: `Good afternoon, ${name} 🧘`,
            subtitle: "Taking a deep breath. Hope your wallet's having a peaceful day."
          };
        }
        return {
          title: `Good evening, ${name} 🌙`,
          subtitle: "Let's look over today gently. You did great."
        };
      case 'bestie':
      default:
        if (isMorning) {
          return {
            title: `Good morning, ${name} ☀️`,
            subtitle: "Ready to make today's bread? Let's secure the bag! 💅"
          };
        }
        if (isAfternoon) {
          return {
            title: `Hey ${name}! 👋`,
            subtitle: "Hope your wallet's having a good day 🍞"
          };
        }
        return {
          title: `Good evening, ${name} 🌙`,
          subtitle: "Let's see how today went. Spill the tea!"
        };
    }
  }
};
