import { useState, useEffect, useCallback, useRef } from 'react';
import { StreakState } from '../types/progression';
import { streakEngine } from '../engines/streakEngine';
import {
  getStreakContext,
  getStreakMessage,
  getMilestoneProgress,
  getStreakStatus,
  type StreakStatus,
  type StreakContext,
  type StreakMilestoneProgress,
} from '../utils/streakUtils';

export interface UseStreakStateResult {
  streakState: StreakState;
  context: StreakContext;
  message: string;
  milestoneProgress: StreakMilestoneProgress;
  status: StreakStatus;
  /** Call after any user action that should count for the streak. Returns
   *  whether a milestone was unlocked so the caller can trigger a celebration. */
  recordAction: () => { milestoneUnlocked: number | null; streakUpdated: boolean };
  refresh: () => void;
}

export function useStreakState(userId: number): UseStreakStateResult {
  const [streakState, setStreakState] = useState<StreakState>(() =>
    streakEngine.getStreak(userId)
  );

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refresh = useCallback(() => {
    if (!isMounted.current) return;
    setStreakState(streakEngine.getStreak(userId));
  }, [userId]);

  // Keep data current when userId changes
  useEffect(() => {
    refresh();
  }, [userId, refresh]);

  const recordAction = useCallback(() => {
    const result = streakEngine.recordAction(userId);
    if (isMounted.current) {
      setStreakState(result.streakState);
    }
    return {
      milestoneUnlocked: result.milestoneUnlocked as number | null,
      streakUpdated: result.streakUpdated,
    };
  }, [userId]);

  const context = getStreakContext(streakState);
  const message = getStreakMessage(context);
  const milestoneProgress = getMilestoneProgress(streakState);
  const status = getStreakStatus(streakState);

  return {
    streakState,
    context,
    message,
    milestoneProgress,
    status,
    recordAction,
    refresh,
  };
}
