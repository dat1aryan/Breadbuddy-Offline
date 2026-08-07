import { IProgressionRepository, ProgressionState } from '../types/progression';
import { localProgressionStorage, LocalProgressionStorage } from '../storage/localProgressionStorage';

export class ProgressionRepository implements IProgressionRepository {
  constructor(private storage: LocalProgressionStorage = localProgressionStorage) {}

  getFullState(userId: number): ProgressionState {
    return this.storage.getFullState(userId);
  }

  saveFullState(userId: number, state: ProgressionState): void {
    this.storage.saveFullState(userId, state);
  }
}

export const progressionRepository = new ProgressionRepository();
