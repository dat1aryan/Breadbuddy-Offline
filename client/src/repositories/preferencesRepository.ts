import { StorageAdapter, defaultStorageAdapter } from './storageAdapter';

export interface UserPreferences {
  aiBroPersonality: 'bestie' | 'professional' | 'coach' | 'calm';
  themePreference?: 'dark' | 'light';
  currency?: '₹' | '$' | '€' | '£' | '¥';
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

const DEFAULT_PREFS: UserPreferences = {
  aiBroPersonality: 'bestie',
  themePreference: 'dark',
  currency: '₹',
  dateFormat: 'DD/MM/YYYY',
};

export class PreferencesRepository {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  getPreferences(userId: number): UserPreferences {
    const raw = this.storage.getItem(`breadbuddy_prefs_${userId}`);
    if (!raw) return DEFAULT_PREFS;
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PREFS;
    }
  }

  savePreferences(userId: number, prefs: Partial<UserPreferences>): void {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...prefs };
    this.storage.setItem(`breadbuddy_prefs_${userId}`, JSON.stringify(updated));
  }
}

export const preferencesRepository = new PreferencesRepository();
