import React from 'react';
import { motion } from 'framer-motion';

export type CardAccent = 'lime' | 'coral' | 'violet' | 'paper' | 'none';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Accent stripe — renders a 4px solid top border in the accent colour
   * and animates the matching offset shadow. Default 'none'.
   */
  accent?: CardAccent;
  /** Interactive card: enables the press-toward-shadow hover animation. */
  interactive?: boolean;
  /** @deprecated Glass-era prop — no longer applies styles; kept for API compat. */
  hoverLift?: boolean;
  /** @deprecated Glass-era prop — no longer applies styles; kept for API compat. */
  glowVariant?: 'lavender' | 'pink' | 'lime' | 'coral';
  /** @deprecated Glass-era prop — no longer applies styles; kept for API compat. */
  glassy?: boolean;
  /** @deprecated Use interactive instead. */
  asMotion?: boolean;
}

// ── Top border stripe per accent ──────────────────────────────────────────────
const accentTopBorder: Record<CardAccent, string> = {
  lime:   'border-t-4 border-t-bb-lime',
  coral:  'border-t-4 border-t-bb-coral',
  violet: 'border-t-4 border-t-bb-violet',
  paper:  'border-t-4 border-t-bb-paper',
  none:   '',
};

// ── Shadow values (Tailwind class — used for static, non-interactive cards) ───
const accentShadowClass: Record<CardAccent, string> = {
  lime:   'shadow-bb-lime',
  coral:  'shadow-bb-coral',
  violet: 'shadow-bb-violet',
  paper:  'shadow-bb-paper',
  none:   'shadow-bb',
};

// ── Inline shadow values for Framer Motion animation (interactive cards only) ─
// The shadow shrinks from 4px → 2px → 0px as the element translates
// toward it, giving the physical press-into-surface sensation.
const restShadow: Record<CardAccent, string> = {
  lime:   '4px 4px 0px 0px #A8E635',
  coral:  '4px 4px 0px 0px #F85C50',
  violet: '4px 4px 0px 0px #9B59F5',
  paper:  '4px 4px 0px 0px #F4F0FF',
  none:   '4px 4px 0px 0px #000000',
};

const hoverShadow: Record<CardAccent, string> = {
  lime:   '2px 2px 0px 0px #A8E635',
  coral:  '2px 2px 0px 0px #F85C50',
  violet: '2px 2px 0px 0px #9B59F5',
  paper:  '2px 2px 0px 0px #F4F0FF',
  none:   '2px 2px 0px 0px #000000',
};

const activeShadow: Record<CardAccent, string> = {
  lime:   '0px 0px 0px 0px #A8E635',
  coral:  '0px 0px 0px 0px #F85C50',
  violet: '0px 0px 0px 0px #9B59F5',
  paper:  '0px 0px 0px 0px #F4F0FF',
  none:   '0px 0px 0px 0px #000000',
};

export function Card({
  children,
  accent = 'none',
  interactive = false,
  glassy = true,
  // deprecated props — silently ignored
  hoverLift: _hoverLift,
  glowVariant: _glowVariant,
  asMotion: _asMotion,
  className = '',
  ...props
}: CardProps) {
  // Determine border and roundness based on glassy prop
  const borderClass = glassy ? 'border border-white/10 dark:border-white/5' : 'border-3 border-bb-border';
  const roundedClass = glassy ? 'rounded-2xl' : 'rounded-bb-sm';
  const bgClass = glassy ? 'bg-[#1C1A24]/40 backdrop-blur-xl' : 'bg-bb-surface';

  // Soft glow accent borders if glassy
  const accentBorder = glassy
    ? accent === 'lime'
      ? 'border-t-2 border-t-bb-lime'
      : accent === 'coral'
      ? 'border-t-2 border-t-bb-coral'
      : accent === 'violet'
      ? 'border-t-2 border-t-bb-violet'
      : ''
    : accentTopBorder[accent];

  const base = [
    bgClass,
    borderClass,
    roundedClass,
    accentBorder,
  ].filter(Boolean).join(' ');

  // Standard shadow class
  const shadowClass = glassy
    ? accent === 'lime'
      ? 'shadow-[0_0_25px_rgba(168,230,53,0.06)]'
      : accent === 'coral'
      ? 'shadow-[0_0_25px_rgba(248,92,80,0.06)]'
      : accent === 'violet'
      ? 'shadow-[0_0_25px_rgba(155,89,245,0.06)]'
      : 'shadow-xl'
    : accentShadowClass[accent];

  if (interactive) {
    if (glassy) {
      return (
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15, ease: 'easeOut' } }}
          whileTap={{ y: 0 }}
          className={`${base} ${shadowClass} hover:shadow-2xl hover:border-white/15 transition-all duration-200 cursor-pointer ${className}`}
          {...(props as any)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ x: 0, y: 0, boxShadow: restShadow[accent] }}
        whileHover={{ x: 2, y: 2, boxShadow: hoverShadow[accent] }}
        whileTap={{ x: 4, y: 4, boxShadow: activeShadow[accent] }}
        transition={{ duration: 0.08, ease: 'easeOut' }}
        className={`${base} ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={`${base} ${shadowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
