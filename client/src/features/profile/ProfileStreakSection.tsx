import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flame, Trophy, Calendar, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { useStreakState } from '../../hooks/useStreakState';
import {
  getMilestoneEmoji,
  getMilestoneLabel,
} from '../../utils/streakUtils';

interface ProfileStreakSectionProps {
  userId: number;
}

// ---------------------------------------------------------------------------
// MilestoneChip — migrated from glass-era to bb-* tokens
// ---------------------------------------------------------------------------
function MilestoneChip({ milestone, reached }: { milestone: number; reached: boolean }) {
  return (
    <div
      title={getMilestoneLabel(milestone)}
      className={`
        flex flex-col items-center justify-center p-2.5 rounded-bb-xs border-2 w-full
        ${
          reached
            // bg-neon-coral/10 border-neon-coral/20 → flat solid bb-coral
            ? 'bg-bb-coral text-bb-coral-fg border-black'
            // bg-white/[0.02] border-white/5 text-white/25 → bg-bb-bg bb-border muted
            : 'bg-bb-bg border-bb-border text-bb-text-muted grayscale'
        }
      `}
    >
      <span className="text-base leading-none mb-1">{getMilestoneEmoji(milestone)}</span>
      <span className="text-[8px] font-bold font-mono uppercase tracking-wider text-center leading-tight truncate w-full max-w-[50px]">
        {getMilestoneLabel(milestone).split(' ')[0]}
      </span>
      {/* Day label: text-toxic-lime (reached) → inherit coral-fg; text-white/20 → text-bb-text-muted */}
      <span className={`text-[8px] font-mono mt-0.5 ${reached ? '' : 'text-bb-text-muted'}`}>
        {milestone}d
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local StatPill — migrated from glass-era to bb-* tokens
// ---------------------------------------------------------------------------
function StatPill({
  icon: Icon,
  label,
  value,
  accent = 'text-bb-text-primary',
  sizeClass = 'text-base font-black',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
  sizeClass?: string;
}) {
  return (
    // bg-white/[0.02] border border-white/5 → bg-bb-bg border-2 border-bb-border
    <div className="flex flex-col gap-1 p-3 rounded-bb-xs bg-bb-bg border-2 border-bb-border">
      <div className="flex items-center gap-1.5">
        <Icon size={10} className="text-bb-text-muted" aria-hidden="true" />
        {/* text-white/30 → text-bb-text-muted */}
        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-bb-text-muted font-sans">
          {label}
        </span>
      </div>
      <span className={`tracking-tight truncate ${sizeClass} ${accent}`}>
        {value}
      </span>
    </div>
  );
}

const ALL_MILESTONES = [3, 7, 14, 30, 50, 100, 365];

export function ProfileStreakSection({ userId }: ProfileStreakSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const { streakState, message, milestoneProgress, status } = useStreakState(userId);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'streak') {
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 2000);

      const el = document.getElementById('profile-streak-section');
      if (el) {
        const scrollTimer = setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        const newParams = new URLSearchParams(searchParams);
        newParams.delete('section');
        setSearchParams(newParams, { replace: true });

        return () => {
          clearTimeout(scrollTimer);
          clearTimeout(timer);
        };
      }
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  const { currentStreak, longestStreak, missedDays } = streakState;
  const { nextMilestone, progressToNext, reached } = milestoneProgress;

  const isActive = status === 'active';
  const isAtRisk = status === 'at_risk';

  const totalMilestonesReached = reached.length;

  return (
    // Card: glassy glowVariant="coral" bg-surface-card border-white/10 → accent="coral"
    // Highlight ring: ring-neon-coral → ring-bb-coral
    <Card
      id="profile-streak-section"
      accent="coral"
      glassy
      className={`p-5 space-y-5 transition-all duration-500 ${
        isHighlighted ? 'ring-2 ring-bb-coral scale-[1.01]' : ''
      }`}
    >
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
          <Flame className="text-bb-coral" size={14} aria-hidden="true" />
          Streak Journey
        </h3>
        {/* Status badge — all translucent variants → flat solid bb-* */}
        <div
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-bb-xs border-2 text-[9px] font-black font-mono uppercase tracking-wider
            ${
              isActive
                // bg-toxic-lime/10 border-toxic-lime/20 text-toxic-lime → flat bb-lime
                ? 'bg-bb-lime text-bb-lime-fg border-black'
                : isAtRisk
                // bg-amber-400/10 border-amber-400/20 text-amber-400 → flat bb-coral
                ? 'bg-bb-coral text-bb-coral-fg border-black'
                // bg-white/5 border-white/10 text-white/30 → flat bb-surface/bb-border
                : 'bg-bb-surface border-bb-border text-bb-text-muted'
            }
          `}
          aria-label={`Streak status: ${status}`}
        >
          {/* At-risk dot: animate-pulse → REMOVED (Tailwind core loop). Static dot. */}
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? 'bg-bb-lime-fg' : isAtRisk ? 'bg-bb-coral-fg' : 'bg-bb-text-muted'
            }`}
            aria-hidden="true"
          />
          {status === 'active'
            ? 'On Fire 🔥'
            : status === 'at_risk'
            ? 'At Risk ⚠️'
            : status === 'broken'
            ? 'Broken 💔'
            : 'Not Started'}
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* text-neon-coral → text-bb-coral */}
        <StatPill
          icon={Flame}
          label="Current Streak"
          value={`${currentStreak}d`}
          accent="text-bb-coral"
          sizeClass="text-lg font-black"
        />
        {/* text-iridescent-pink → text-bb-violet */}
        <StatPill
          icon={Trophy}
          label="Best Streak"
          value={`${longestStreak}d`}
          accent="text-bb-violet"
          sizeClass="text-xs font-extrabold"
        />
        {/* text-toxic-lime/text-white/60 → text-bb-lime/text-bb-text-secondary */}
        <StatPill
          icon={Calendar}
          label="Missed Days"
          value={`${missedDays}d`}
          accent={missedDays === 0 ? 'text-bb-lime' : 'text-bb-text-secondary'}
          sizeClass="text-xs font-bold"
        />
        {/* text-lavender → text-bb-violet */}
        <StatPill
          icon={Zap}
          label="Milestones"
          value={`${totalMilestonesReached} / ${ALL_MILESTONES.length}`}
          accent="text-bb-violet"
          sizeClass="text-xs font-semibold"
        />
      </div>

      {/* ── Progress to next milestone ── */}
      {nextMilestone !== null ? (
        <div className="pb-1.5">
          <div className="flex justify-between items-center mb-2 select-none">
            {/* text-white/40 → text-bb-text-muted */}
            <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-bb-text-muted flex items-center gap-1">
              <TrendingUp size={9} aria-hidden="true" />
              Next milestone — {getMilestoneLabel(nextMilestone)}
            </span>
            <span className="text-[9px] font-mono font-bold text-bb-text-muted">
              {currentStreak} / {nextMilestone}d
            </span>
          </div>
          {/* Track: bg-white/5 border-white/5 → bg-bb-border border-2 border-bb-border */}
          <div
            className="w-full h-2 bg-bb-border border-2 border-bb-border overflow-hidden rounded-bb-xs"
            role="progressbar"
            aria-valuenow={progressToNext}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress to ${nextMilestone}-day streak milestone`}
          >
            {/* motion.div preserved; gradient → flat bg-bb-coral */}
            <motion.div
              className="h-full rounded-bb-xs bg-bb-coral"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
        </div>
      ) : (
        // text-toxic-lime → text-bb-lime
        <div className="text-center text-[11px] text-bb-lime font-bold py-1 select-none">
          🏆 All milestones reached! You are a legend.
        </div>
      )}

      {/* ── Milestone grid ── */}
      {/* border-t border-white/5 → border-t-2 border-bb-border */}
      <div className="pt-1 border-t-2 border-bb-border">
        {/* text-white/30 → text-bb-text-muted */}
        <p className="text-[9px] font-bold font-mono uppercase tracking-widest text-bb-text-muted mb-3 select-none">
          Milestone Badges
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
          {ALL_MILESTONES.map((m) => (
            <MilestoneChip key={m} milestone={m} reached={reached.includes(m)} />
          ))}
        </div>
      </div>

      {/* ── Motivational message ── */}
      {/* bg-white/[0.02] border-white/5 → bg-bb-bg border-2 border-bb-border; text-white/60 → text-bb-text-secondary */}
      <div className="bg-bb-bg border-2 border-bb-border rounded-bb-xs px-4 py-3">
        <p className="text-[11px] text-bb-text-secondary leading-relaxed font-semibold italic">
          "{message}"
        </p>
      </div>
    </Card>
  );
}
