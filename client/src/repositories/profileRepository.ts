import { StorageAdapter, defaultStorageAdapter } from './storageAdapter';

export interface UserProfileFields {
  avatar?: string;
  joinDate?: string;
  birthday?: string;
  college?: string;
  country?: string;
  currencyPreferred?: string;
  shortBio?: string;
  favoriteGoal?: string;
  primaryGoal?: string;
  preferredPaymentMethods?: string[];
  hasSeenWelcome?: boolean;
  themePreference?: string;
}

export class ProfileRepository {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  getJoinDate(userId: number): string {
    let raw = this.storage.getItem(`breadbuddy_join_date_${userId}`);
    if (!raw) {
      const today = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      this.storage.setItem(`breadbuddy_join_date_${userId}`, today);
      return today;
    }
    return raw;
  }

  getAvatar(userId: number): string {
    return this.storage.getItem(`breadbuddy_avatar_${userId}`) || '🦊';
  }

  setAvatar(userId: number, emoji: string): void {
    this.storage.setItem(`breadbuddy_avatar_${userId}`, emoji);
  }

  getProfileFields(userId: number): UserProfileFields {
    const raw = this.storage.getItem(`breadbuddy_profile_${userId}`);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  saveProfileFields(userId: number, fields: UserProfileFields): void {
    const current = this.getProfileFields(userId);
    const updated = { ...current, ...fields };
    this.storage.setItem(`breadbuddy_profile_${userId}`, JSON.stringify(updated));
  }
}

export const profileRepository = new ProfileRepository();
