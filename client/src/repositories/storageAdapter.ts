/**
 * StorageAdapter Interface
 * Defines a backend-agnostic key-value storage contract.
 * Default implementation uses LocalStorage. Future implementations can target Supabase or REST API.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`Failed to set item in LocalStorage [${key}]:`, e);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove item from LocalStorage [${key}]:`, e);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear LocalStorage:', e);
    }
  }
}

// Singleton storage instance
export const defaultStorageAdapter: StorageAdapter = new LocalStorageAdapter();
