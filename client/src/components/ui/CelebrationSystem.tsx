import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CelebrationVariant =
  | 'milestone'
  | 'personal_best'
  | 'comeback'
  | 'first_streak'
  | 'level_up'
  | 'achievement';

export interface CelebrationPayload {
  id: string;
  variant: CelebrationVariant;
  emoji: string;
  title: string;
  description: string;
}

interface CelebrationContextValue {
  celebrate: (payload: Omit<CelebrationPayload, 'id'>) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used inside <CelebrationProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Styles — Item 8: all translucent fills → bg-bb-surface; each variant maps to
// the closest Phase 0 accent hard border.
// Item 9: all shadow-[0_0_*] glow shadows → shadow-[4px_4px_0px_#000]
// Item 13: backdrop-blur-md removed from card className below
// ---------------------------------------------------------------------------
const VARIANT_STYLES: Record<CelebrationVariant, { border: string }> = {
  // level_up: bright milestone — bb-lime (achievement color)
  level_up: {
    border: 'border-bb-lime',
  },
  // achievement: purple for personal unlock — bb-violet
  achievement: {
    border: 'border-bb-violet',
  },
  // milestone: fire/streak milestone — bb-coral
  milestone: {
    border: 'border-bb-coral',
  },
  // personal_best: personal record — bb-violet (closest to amber distinction)
  personal_best: {
    border: 'border-bb-violet',
  },
  // comeback: return after break — bb-coral (matches "comeback" energy)
  comeback: {
    border: 'border-bb-coral',
  },
  // first_streak: first streak hit — bb-lime (positive start)
  first_streak: {
    border: 'border-bb-lime',
  },
};

// ---------------------------------------------------------------------------
// Component: CelebrationToast
// ---------------------------------------------------------------------------
interface CelebrationToastProps {
  item: CelebrationPayload;
  onDismiss: () => void;
}

function CelebrationToast({ item, onDismiss }: CelebrationToastProps) {
  const styles = VARIANT_STYLES[item.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      // Item 8: bg-bb-surface replaces translucent variant fills
      // Item 9: shadow-[4px_4px_0px_#000] replaces glow shadows
      // Item 13: backdrop-blur-md removed
      className={`w-80 p-4 rounded-bb-sm border-2 bg-bb-surface ${styles.border} shadow-[4px_4px_0px_#000] flex gap-3.5 relative overflow-hidden select-none`}
      role="alert"
    >
      {/* Item 10: level_up blur/animate-pulse blobs removed entirely */}

      {/* Item 11: animate-bounce is a Tailwind core utility (not in theme.extend) — REMOVED.
          Using static emoji display instead. A single-shot scale-in from the motion.div entry
          animation above (scale: 0.9 → 1) provides enough entrance energy. */}
      <span className="text-3xl self-start">
        {item.emoji}
      </span>

      <div className="flex-1 min-w-0 z-10">
        <h4 className="text-xs font-black tracking-wide text-bb-text-primary uppercase mb-0.5">
          {item.title}
        </h4>
        <p className="text-[10px] leading-relaxed text-bb-text-secondary font-semibold">
          {item.description}
        </p>
      </div>

      {/* Item 12: hover:bg-white/5 → hover:bg-bb-border; flat ghost dismiss */}
      <button
        onClick={onDismiss}
        className="text-bb-text-muted hover:text-bb-text-primary hover:bg-bb-border transition-colors p-1 rounded-bb-xs self-start z-10 focus:outline-none"
        aria-label="Dismiss celebration"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface CelebrationProviderProps {
  children: React.ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const toast = useToast();
  const [queue, setQueue] = useState<CelebrationPayload[]>([]);
  const shownIds = useRef<Set<string>>(new Set());

  const celebrate = useCallback(
    (payload: Omit<CelebrationPayload, 'id'>) => {
      // Deduplicate — same title+variant never queued twice per session
      const dedupeKey = `${payload.variant}:${payload.title}`;
      if (shownIds.current.has(dedupeKey)) return;
      shownIds.current.add(dedupeKey);

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: CelebrationPayload = { ...payload, id };

      setQueue((prev) => [...prev, item]);

      // Auto-dismiss after 4.5 s
      setTimeout(() => {
        setQueue((prev) => prev.filter((q) => q.id !== id));
      }, 4500);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }, []);

  useEffect(() => {
    const handleXpUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { levelUp, newLevel, oldLevel, levelState } = customEvent.detail;
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

    const handleAchievementUnlocked = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { achievement } = customEvent.detail;
        celebrate({
          variant: 'achievement',
          emoji: achievement.emoji,
          title: `Achievement Unlocked! 🏆`,
          description: `${achievement.title}: ${achievement.description}`,
        });
      }
    };
    window.addEventListener('achievement-unlocked', handleAchievementUnlocked);

    const handleProgressionUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { result } = customEvent.detail;
        if (result.streakUpdated) {
          toast.success(`Streak advanced! 🔥 Day ${result.streakState.currentStreak}`);
        }
        if (result.xpGained > 0) {
          toast.success(`+${result.xpGained} XP Gained! ✨`);
        }
        if (result.milestoneUnlocked) {
          celebrate({
            variant: 'milestone',
            emoji: '🔥',
            title: `Streak Milestone!`,
            description: `You reached a ${result.milestoneUnlocked} day active streak! Bread advanced! 🍞`,
          });
        }
      }
    };
    window.addEventListener('progression-updated', handleProgressionUpdated);

    return () => {
      window.removeEventListener('xp-updated', handleXpUpdate);
      window.removeEventListener('achievement-unlocked', handleAchievementUnlocked);
      window.removeEventListener('progression-updated', handleProgressionUpdated);
    };
  }, [celebrate, toast]);

  const portalRoot = typeof document !== 'undefined' ? document.body : null;

  const toastPortal = portalRoot
    ? createPortal(
        <div
          className="fixed top-5 right-5 z-[10000] flex flex-col gap-3 items-end"
          aria-label="Celebration notifications"
          role="region"
        >
          <AnimatePresence mode="sync">
            {queue.map((item) => (
              <CelebrationToast
                key={item.id}
                item={item}
                onDismiss={() => dismiss(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>,
        portalRoot
      )
    : null;

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}
      {toastPortal}
    </CelebrationContext.Provider>
  );
}
