import { IXPRepository, XPState } from '../types/progression';
import { localProgressionStorage, LocalProgressionStorage } from '../storage/localProgressionStorage';

export class XPRepository implements IXPRepository {
  constructor(private storage: LocalProgressionStorage = localProgressionStorage) {}

  getXPState(userId: number): XPState {
    return this.storage.getXPState(userId);
  }

  saveXPState(userId: number, state: XPState): void {
    this.storage.saveXPState(userId, state);
  }

  getLevel(userId: number): number {
    return this.storage.getLevel(userId);
  }

  saveLevel(userId: number, level: number): void {
    this.storage.saveLevel(userId, level);
  }
}

export const xpRepository = new XPRepository();
