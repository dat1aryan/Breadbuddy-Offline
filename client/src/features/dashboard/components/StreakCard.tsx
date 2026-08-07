import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flame, Trophy, ArrowRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StatBlock } from '../../../components/ui/StatBlock';
import { useCelebration } from '../../../components/ui/CelebrationSystem';
import { useStreakState } from '../../../hooks/useStreakState';
import {
  getMilestoneEmoji,
  getMilestoneLabel,
} from '../../../utils/streakUtils';

interface StreakCardProps {
  userId: number;
}

const STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  active:   { variant: 'lime',    label: 'Active' },
  at_risk:  { variant: 'coral',   label: 'At Risk' },
  broken:   { variant: 'coral',   label: 'Broken' },
  inactive: { variant: 'neutral', label: 'Not Started' },
};

function MilestoneChip({
  milestone,
  reached,
}: {
  milestone: number;
  reached: boolean;
}) {
  return (
    <Badge
      variant={reached ? 'coral' : 'neutral'}
      size="sm"
      className={reached ? 'opacity-100' : 'opacity-40 grayscale'}
    >
      <span>{getMilestoneEmoji(milestone)}</span>
      <span className="font-mono">{milestone}d</span>
    </Badge>
  );
}

export function StreakCard({ userId }: StreakCardProps) {
  const { celebrate } = useCelebration();
  const [, setSearchParams] = useSearchParams();
  const { streakState, context, message, milestoneProgress, status, recordAction } =
    useStreakState(userId);

  const { currentStreak, longestStreak } = streakState;
  const { nextMilestone, progressToNext, reached } = milestoneProgress;

  const statusBadge = STATUS_BADGE[status] || STATUS_BADGE.inactive;
  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak && currentStreak > 1;

  const handleNavigate = () => {
    setSearchParams({ tab: 'profile', section: 'streak' });
  };

  useEffect(() => {
    const result = recordAction();
    if (result.milestoneUnlocked !== null) {
      celebrate({
        variant: 'milestone',
        emoji: getMilestoneEmoji(result.milestoneUnlocked),
        title: getMilestoneLabel(result.milestoneUnlocked),
        description: `You hit the ${result.milestoneUnlocked}-day streak milestone! Legendary.`,
      });
    } else if (result.streakUpdated && context === 'personal_best') {
      celebrate({
        variant: 'personal_best',
        emoji: '🌟',
        title: 'Personal Best!',
        description: `New record — ${currentStreak} days of consistency. You're on fire!`,
      });
    } else if (result.streakUpdated && context === 'comeback') {
      celebrate({
        variant: 'comeback',
        emoji: '🏠',
        title: "You're Back!",
        description: 'Welcome home. The comeback is always stronger.',
      });
    }
  }, [userId]);

  const MILESTONES_TO_SHOW = [3, 7, 14, 30, 50, 100, 365];

  return (
    <Card accent="coral" className="p-5 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-bb-xs bg-bb-coral text-bb-coral-fg border-2 border-black flex items-center justify-center">
            <Flame size={14} />
          </div>
          <span className="text-label text-bb-text-muted">
            Daily Streak
          </span>
        </div>

        <Badge variant={statusBadge.variant} size="sm" wobble={status === 'active'}>
          {statusBadge.label}
        </Badge>
      </div>

      {/* Hero numbers — Replaced custom markup with StatBlock component */}
      <div className="flex items-center justify-between">
        <StatBlock
          label="Active Streak"
          value={String(currentStreak)}
          sub={currentStreak === 1 ? '1 day active' : `${currentStreak} days active`}
          accent="coral"
          size="lg"
        />

        <div className="text-right flex flex-col items-end gap-1">
          {isPersonalBest ? (
            <Badge variant="lime" size="sm">
              <Trophy size={10} /> Personal Best
            </Badge>
          ) : currentStreak !== longestStreak ? (
            <Badge variant="neutral" size="sm">
              <Trophy size={10} /> Record: {longestStreak}d
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Progress to next milestone using ProgressBar primitive */}
      {nextMilestone !== null && (
        <ProgressBar
          percentage={progressToNext}
          color="coral"
          height={12}
          showLabel
          label={`Next: ${getMilestoneLabel(nextMilestone)}`}
          valueLabel={`${currentStreak} / ${nextMilestone}d`}
        />
      )}

      {/* Milestone chips — blocky, bordered, legible */}
      <div className="flex items-center justify-between pt-2 border-t-2 border-bb-border">
        {MILESTONES_TO_SHOW.map((m) => (
          <MilestoneChip key={m} milestone={m} reached={reached.includes(m)} />
        ))}
      </div>

      {/* Motivational message */}
      <div className="bg-bb-bg border-2 border-bb-border rounded-bb-xs p-3">
        <p className="text-[12px] text-bb-text-secondary leading-relaxed font-sans italic">
          "{message}"
        </p>
      </div>

      {/* Navigation button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleNavigate}
          className="inline-flex items-center gap-1.5 text-label text-bb-violet hover:text-bb-text-primary transition-colors cursor-pointer outline-none"
        >
          <span>View streak journey</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </Card>
  );
}
