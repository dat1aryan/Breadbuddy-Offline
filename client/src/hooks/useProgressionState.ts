import { useState, useEffect, useCallback, useRef } from 'react';
import { xpEngine } from '../engines/xpEngine';
import { getSmartMotivation } from '../configs/progressionConfig';

export interface ProgressionStateResult {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercentage: number;
  title: string;
  motivationMessage: string;
  refresh: () => void;
}

export function useProgressionState(userId: number): ProgressionStateResult {
  const getLatestState = useCallback(() => {
    const xpState = xpEngine.getXPState(userId);
    const progressPercentage = xpState.xpNeededForNext > 0
      ? Math.min(100, Math.max(0, Math.round((xpState.currentLevelXp / xpState.xpNeededForNext) * 100)))
      : 0;
    
    return {
      level: xpState.level,
      totalXp: xpState.totalXp,
      currentLevelXp: xpState.currentLevelXp,
      xpNeededForNext: xpState.xpNeededForNext,
      progressPercentage,
      title: xpState.label,
    };
  }, [userId]);

  const [state, setState] = useState(getLatestState);
  const [motivationMessage, setMotivationMessage] = useState('');
  const lastMessageRef = useRef('');

  const refreshMotivation = useCallback((currentState: typeof state) => {
    const msg = getSmartMotivation({
      level: currentState.level,
      xp: currentState.currentLevelXp,
      xpNeededForNext: currentState.xpNeededForNext,
      progressPercentage: currentState.progressPercentage,
      title: currentState.title,
    }, lastMessageRef.current);
    
    lastMessageRef.current = msg;
    setMotivationMessage(msg);
  }, []);

  const refresh = useCallback(() => {
    const latest = getLatestState();
    setState(latest);
    refreshMotivation(latest);
  }, [getLatestState, refreshMotivation]);

  useEffect(() => {
    refresh();
  }, [userId, refresh]);

  useEffect(() => {
    const handleXpUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.userId === userId) {
        const { xpState, level, levelState } = customEvent.detail;
        const newState = {
          level,
          totalXp: xpState.totalXp,
          currentLevelXp: xpState.currentLevelXp,
          xpNeededForNext: levelState.xpNeededForNext,
          progressPercentage: levelState.progressPercentage,
          title: levelState.label,
        };
        setState(newState);
        refreshMotivation(newState);
      }
    };

    window.addEventListener('xp-updated', handleXpUpdate);
    return () => {
      window.removeEventListener('xp-updated', handleXpUpdate);
    };
  }, [userId, refreshMotivation]);

  return {
    ...state,
    motivationMessage,
    refresh,
  };
}
