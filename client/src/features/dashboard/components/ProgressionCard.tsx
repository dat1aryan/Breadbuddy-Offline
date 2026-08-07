import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Zap, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StatBlock } from '../../../components/ui/StatBlock';
import { useProgressionState } from '../../../hooks/useProgressionState';
import { useCelebration } from '../../../components/ui/CelebrationSystem';

interface ProgressionCardProps {
  userId: number;
}

interface FloatingIndicator {
  id: number;
  amount: number;
}

export function ProgressionCard({ userId }: ProgressionCardProps) {
  const [, setSearchParams] = useSearchParams();
  const {
    level,
    totalXp,
    currentLevelXp,
    xpNeededForNext,
    progressPercentage,
    title,
    motivationMessage,
  } = useProgressionState(userId);

  const { celebrate } = useCelebration();
  const [floatingXps, setFloatingXps] = useState<FloatingIndicator[]>([]);

  const handleNavigate = () => {
    setSearchParams({ tab: 'profile', section: 'progression' });
  };

  useEffect(() => {
    const handleXpUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.userId === userId) {
        const { xpGained, levelUp, newLevel, oldLevel, levelState } = customEvent.detail;
        
        if (xpGained > 0) {
          const newIndicator = {
            id: Date.now() + Math.random(),
            amount: xpGained,
          };
          setFloatingXps((prev) => [...prev, newIndicator]);
          setTimeout(() => {
            setFloatingXps((prev) => prev.filter((item) => item.id !== newIndicator.id));
          }, 1200);
        }

        if (levelUp) {
          celebrate({
            variant: 'level_up',
            emoji: '🎉',
            title: `LEVEL UP! Level ${newLevel}`,
            description: `You advanced from Level ${oldLevel} to ${newLevel}! New Title: ${levelState.label}. Milestone XP reached! 🌟`,
          });
        }
      }
    };

    window.addEventListener('xp-updated', handleXpUpdate);
    return () => {
      window.removeEventListener('xp-updated', handleXpUpdate);
    };
  }, [userId, celebrate]);

  return (
    <Card
      accent="coral"
      className="p-5 flex flex-col gap-4 select-none relative overflow-hidden"
      role="region"
      aria-label="Level and XP progression"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-bb-xs bg-bb-coral text-bb-coral-fg border-2 border-black flex items-center justify-center">
            <Award size={14} aria-hidden="true" />
          </div>
          <span className="text-label text-bb-text-muted">
            Level & XP
          </span>
        </div>

        <Badge variant="coral" size="sm" wobble>
          <Sparkles size={10} /> {title}
        </Badge>
      </div>

      {/* Level & XP StatBlocks — Replaced custom markup with StatBlock components */}
      <div className="grid grid-cols-2 gap-4 relative">
        <StatBlock
          label="Current Level"
          value={String(level)}
          accent="coral"
          size="lg"
        />

        {/* Floating XP indicators */}
        <div className="absolute right-0 bottom-12 pointer-events-none z-10">
          <AnimatePresence>
            {floatingXps.map((indicator) => (
              <motion.span
                key={indicator.id}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: -40, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute right-0 text-bb-coral font-mono font-black text-sm whitespace-nowrap"
              >
                +{indicator.amount} XP
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <StatBlock
          label="Total XP"
          value={String(totalXp)}
          sub="XP accumulated"
          accent="none"
          size="sm"
          icon={<Zap size={12} className="text-bb-coral inline" />}
        />
      </div>

      {/* Level Progress Bar using ProgressBar primitive */}
      <ProgressBar
        percentage={progressPercentage}
        color="coral"
        height={12}
        showLabel
        label="Level Progress"
        valueLabel={`${currentLevelXp} / ${xpNeededForNext} XP`}
      />

      {/* Motivation message */}
      <div className="bg-bb-bg border-2 border-bb-border rounded-bb-xs p-3">
        <p className="text-[12px] text-bb-text-secondary leading-relaxed font-sans italic">
          "{motivationMessage}"
        </p>
      </div>

      {/* Navigation button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleNavigate}
          className="inline-flex items-center gap-1.5 text-label text-bb-coral hover:text-bb-text-primary transition-colors cursor-pointer outline-none"
        >
          <span>View progression details</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </Card>
  );
}
