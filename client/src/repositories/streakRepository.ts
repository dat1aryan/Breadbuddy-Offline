import { IStreakRepository, StreakState } from '../types/progression';
import { localProgressionStorage, LocalProgressionStorage } from '../storage/localProgressionStorage';

export class StreakRepository implements IStreakRepository {
  constructor(private storage: LocalProgressionStorage = localProgressionStorage) {}

  getStreak(userId: number): StreakState {
    return this.storage.getStreak(userId);
  }

  saveStreak(userId: number, state: StreakState): void {
    this.storage.saveStreak(userId, state);
  }
}

export const streakRepository = new StreakRepository();
