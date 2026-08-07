import { settingsRepository, SettingsState } from '../repositories/settingsRepository';

export { type SettingsState, type DashboardLayoutItem } from '../repositories/settingsRepository';

export const settingsEngine = {
  getSettings(userId: number): SettingsState {
    return settingsRepository.getSettings(userId);
  },

  saveSettings(userId: number, settings: SettingsState): void {
    settingsRepository.saveSettings(userId, settings);
  },

  restoreDefaultLayout(userId: number): void {
    settingsRepository.restoreDefaultLayout(userId);
  },

  formatDate(dateStr: string, format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    if (format === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    }
    if (format === 'MM/DD/YYYY') {
      return `${month}/${day}/${year}`;
    }
    return dateStr; // YYYY-MM-DD
  }
};
