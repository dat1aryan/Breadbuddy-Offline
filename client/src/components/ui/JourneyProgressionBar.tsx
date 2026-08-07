import { Flame, Sparkles } from 'lucide-react';
import { useStreakState } from '../../hooks/useStreakState';
import { useProgressionState } from '../../hooks/useProgressionState';
import { Card } from './Card';

interface JourneyProgressionBarProps {
  userId: number;
  className?: string;
}

export function JourneyProgressionBar({ userId, className = '' }: JourneyProgressionBarProps) {
  const { streakState } = useStreakState(userId);
  const { level, currentLevelXp, xpNeededForNext, progressPercentage, title } = useProgressionState(userId);

  return (
    <Card 
      className={`p-3.5 flex flex-col md:flex-row items-center justify-between gap-4 rounded-bb-sm ${className}`}
    >
      {/* Left: Compact Streak Info */}
      <div className="flex items-center gap-3 w-full md:w-auto shrink-0 select-none">
        <div className="w-8 h-8 rounded-bb-xs bg-bb-coral/10 border border-bb-coral/30 flex items-center justify-center text-bb-coral shrink-0">
          <Flame size={15} />
        </div>
        <div>
          <p className="text-[9px] font-mono font-bold text-bb-text-muted uppercase tracking-wider">Consistency</p>
          <p className="text-xs font-black text-bb-text-primary">{streakState.currentStreak} Day Streak</p>
        </div>
      </div>

      {/* Center: Compact Level Progress Bar */}
      <div className="flex-1 w-full px-0 md:px-4 select-none">
        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-bb-text-muted uppercase tracking-wider mb-1">
          <span className="flex items-center gap-1">
            <Sparkles size={10} className="text-bb-violet" />
            Level {level} &bull; {title}
          </span>
          <span>{currentLevelXp} / {xpNeededForNext} XP</span>
        </div>
        <div className="h-1.5 w-full bg-bb-border border border-bb-border overflow-hidden rounded-bb-xs">
          <div
            className="bg-bb-lime h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Right: Badge */}
      <div className="flex items-center gap-2 shrink-0 select-none">
        <span className="px-2 py-0.5 rounded-full bg-bb-violet/15 border border-bb-violet/30 text-[9px] font-mono font-black text-bb-violet uppercase tracking-widest">
          LVL {level}
        </span>
      </div>
    </Card>
  );
}
