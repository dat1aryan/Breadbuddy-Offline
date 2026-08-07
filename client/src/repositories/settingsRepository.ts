import { StorageAdapter, defaultStorageAdapter } from './storageAdapter';

export interface DashboardLayoutItem {
  id: string;
  name: string;
  visible: boolean;
}

export interface SettingsState {
  currency: '₹' | '$' | '€' | '£' | '¥';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  dashboardLayout: DashboardLayoutItem[];
}

export const DEFAULT_LAYOUT: DashboardLayoutItem[] = [
  { id: 'overview', name: 'Dashboard Overview', visible: true },
  { id: 'goals', name: 'Saving Goals', visible: true },
  { id: 'subscriptions', name: 'Subscription Hub', visible: true },
  { id: 'expenses', name: 'Recent Transactions', visible: true },
  { id: 'aibro', name: 'AI Bro', visible: true },
];

export class SettingsRepository {
  constructor(private storage: StorageAdapter = defaultStorageAdapter) {}

  getSettings(userId: number): SettingsState {
    const raw = this.storage.getItem(`breadbuddy_settings_${userId}`);
    const defaultState: SettingsState = {
      currency: '₹',
      dateFormat: 'DD/MM/YYYY',
      dashboardLayout: DEFAULT_LAYOUT,
    };
    if (!raw) return defaultState;
    try {
      const parsed = JSON.parse(raw);
      const layout = parsed.dashboardLayout || DEFAULT_LAYOUT;
      return {
        currency: parsed.currency || '₹',
        dateFormat: parsed.dateFormat || 'DD/MM/YYYY',
        dashboardLayout: layout.filter((item: DashboardLayoutItem) => item.id !== 'wellness'),
      };
    } catch {
      return defaultState;
    }
  }

  saveSettings(userId: number, settings: SettingsState): void {
    this.storage.setItem(`breadbuddy_settings_${userId}`, JSON.stringify(settings));
    window.dispatchEvent(new Event('breadbuddy-settings-updated'));
  }

  restoreDefaultLayout(userId: number): void {
    const current = this.getSettings(userId);
    current.dashboardLayout = DEFAULT_LAYOUT;
    this.saveSettings(userId, current);
  }
}

export const settingsRepository = new SettingsRepository();
