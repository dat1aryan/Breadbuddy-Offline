import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Zap, Star, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { useProgressionState } from '../../hooks/useProgressionState';
import { LEVEL_LABELS, getLevelLabel } from '../../configs/progressionConfig';

interface ProfileProgressionSectionProps {
  userId: number;
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
        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-bb-text-muted">
          {label}
        </span>
      </div>
      <span className={`tracking-tight truncate ${sizeClass} ${accent}`}>
        {value}
      </span>
    </div>
  );
}

export function ProfileProgressionSection({ userId }: ProfileProgressionSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const {
    level,
    totalXp,
    currentLevelXp,
    xpNeededForNext,
    progressPercentage,
    title,
    motivationMessage,
  } = useProgressionState(userId);

  const [selectedMessage, setSelectedMessage] = useState('');

  const nextLevelTitle = getLevelLabel(level + 1);
  const xpRemaining = xpNeededForNext - currentLevelXp;

  useEffect(() => {
    const messages = [
      `You're only ${xpRemaining} XP away from ${nextLevelTitle}! Keep cooking! ⚡`,
      "Every expense logged gets you closer to securing the bag. 💰",
      "One savings contribution could level you up right now! 🪙",
      "Consistency is key, bestie! Keep banking and tracking daily. 📅",
      "Your financial progression is looking super robust. Manifesting that next rank! 🚀"
    ];
    setSelectedMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [level, xpRemaining, nextLevelTitle]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'progression') {
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 2000);

      const el = document.getElementById('profile-progression-section');
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

  // Find next title unlock
  const nextTitleUnlock = [...LEVEL_LABELS]
    .reverse()
    .find((t) => t.threshold > level);

  return (
    // Card: glassy glowVariant="lime" bg-surface-card border-white/10 → accent="lime"
    // Highlight ring: ring-toxic-lime → ring-bb-lime
    <Card
      id="profile-progression-section"
      accent="lime"
      glassy
      className={`p-5 space-y-5 transition-all duration-500 ${
        isHighlighted ? 'ring-2 ring-bb-lime scale-[1.01]' : ''
      }`}
    >
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
          <Award className="text-bb-lime" size={14} aria-hidden="true" />
          Progression Journey
        </h3>
        {/* Rank badge: border-toxic-lime/20 bg-toxic-lime/10 text-toxic-lime → flat solid */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-bb-xs border-2 border-black bg-bb-lime text-bb-lime-fg text-[9px] font-black font-mono uppercase tracking-wider"
          aria-label={`Current Rank: ${title}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-bb-lime-fg" aria-hidden="true" />
          {title}
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* text-toxic-lime → text-bb-lime */}
        <StatPill
          icon={Star}
          label="Current Level"
          value={`Lvl ${level}`}
          accent="text-bb-lime"
          sizeClass="text-lg font-black"
        />
        {/* text-white → text-bb-text-primary */}
        <StatPill
          icon={Sparkles}
          label="Current Title"
          value={title}
          accent="text-bb-text-primary"
          sizeClass="text-xs font-extrabold"
        />
        {/* text-iridescent-pink → text-bb-violet */}
        <StatPill
          icon={Zap}
          label="Total XP"
          value={`${totalXp} XP`}
          accent="text-bb-violet"
          sizeClass="text-xs font-bold"
        />
        {/* text-amber-400 → text-bb-coral (warm accent) */}
        <StatPill
          icon={Trophy}
          label="Highest Level"
          value={`Lvl ${level}`}
          accent="text-bb-coral"
          sizeClass="text-xs font-semibold"
        />
      </div>

      {/* ── Progress to next level ── */}
      <div>
        <div className="flex justify-between items-end mb-2 select-none">
          <div className="flex flex-col gap-0.5">
            {/* text-white/40 → text-bb-text-muted */}
            <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-bb-text-muted flex items-center gap-1">
              <TrendingUp size={9} aria-hidden="true" />
              Next Level Progress
            </span>
            {level < 50 && (
              // text-toxic-lime/80 → text-bb-lime
              <span className="text-[10px] text-bb-lime font-bold">
                {xpRemaining} XP until {nextLevelTitle}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {/* text-white/50 → text-bb-text-muted */}
            <span className="text-[9px] font-mono font-bold text-bb-text-muted">
              {currentLevelXp} / {xpNeededForNext} XP
            </span>
            {/* text-toxic-lime → text-bb-lime */}
            <span className="text-[10px] font-bold text-bb-lime font-mono">
              {progressPercentage}%
            </span>
          </div>
        </div>
        {/* Track: bg-white/5 border-white/5 → bg-bb-border border-2 border-bb-border */}
        <div
          className="w-full h-2 bg-bb-border border-2 border-bb-border overflow-hidden rounded-bb-xs"
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress to level ${level + 1}`}
        >
          {/* motion.div preserved; gradient → flat bg-bb-lime */}
          <motion.div
            className="h-full rounded-bb-xs bg-bb-lime"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Progression Summary ── */}
      {/* bg-white/[0.02] border-white/5 → bg-bb-bg border-2 border-bb-border; text-white/60 → text-bb-text-secondary */}
      <div className="bg-bb-bg border-2 border-bb-border rounded-bb-xs px-4 py-3">
        <p className="text-[11px] text-bb-text-secondary leading-relaxed font-semibold italic">
          "{selectedMessage || motivationMessage}"
        </p>
      </div>

      {/* ── Next Level Preview ── */}
      {!nextTitleUnlock || level >= 50 ? (
        // Max level: border-dashed border-toxic-lime/30 bg-toxic-lime/5 → border-2 border-bb-lime bg-bb-surface
        // animate-bounce on Trophy → REMOVED (Tailwind core loop)
        <div className="border-2 border-bb-lime bg-bb-surface rounded-bb-xs p-4 flex flex-col items-center justify-center text-center">
          <Trophy size={22} className="text-bb-lime mb-2" />
          <span className="text-xs font-black uppercase tracking-wider text-bb-lime font-mono">
            🏆 Maximum Level Reached
          </span>
          {/* text-white/60 → text-bb-text-secondary */}
          <p className="text-[10px] text-bb-text-secondary font-medium mt-1 leading-relaxed max-w-[280px]">
            You are officially a certified Bread Legend! You've mastered your finance era and secured the final title. Keep stacking dough! 👑
          </p>
        </div>
      ) : (
        // Next unlock preview: bg-white/[0.01] border-white/5 → bg-bb-bg border-2 border-bb-border
        <div className="bg-bb-bg border-2 border-bb-border rounded-bb-xs p-4 space-y-3">
          <div className="flex justify-between items-center select-none">
            {/* text-white/40 → text-bb-text-muted */}
            <span className="text-[9px] font-black font-mono uppercase tracking-widest text-bb-text-muted">
              Next Unlock Preview
            </span>
            {/* bg-toxic-lime/10 text-toxic-lime pill → flat solid bb-lime */}
            <span className="text-[9px] font-bold font-mono text-bb-lime-fg px-2.5 py-0.5 rounded-bb-xs bg-bb-lime border border-black">
              Lvl {nextTitleUnlock.threshold} Required
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* bg-white/[0.02] border-white/5 → bg-bb-surface border-2 border-bb-border */}
            <div className="w-10 h-10 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-lg flex items-center justify-center">
              {nextTitleUnlock.label.split(' ').pop()}
            </div>
            <div>
              {/* text-white → text-bb-text-primary */}
              <h4 className="text-xs font-bold text-bb-text-primary uppercase tracking-wide">
                {nextTitleUnlock.label}
              </h4>
              {/* text-white/40 → text-bb-text-muted */}
              <p className="text-[10px] text-bb-text-muted font-mono mt-0.5">
                Reach Level {level + 1} ({xpRemaining} XP remaining)
              </p>
            </div>
          </div>

          {/* Quote divider: border-white/5 → border-bb-border */}
          <p className="text-[10px] text-bb-text-muted leading-relaxed italic border-t-2 border-bb-border pt-2.5">
            "Keep tracking your expenses and funding your goals to unlock your next title."
          </p>
        </div>
      )}
    </Card>
  );
}
