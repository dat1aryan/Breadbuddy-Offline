import React from 'react';
import { motion } from 'framer-motion';
import type { CardAccent } from './Card';

interface StatBlockProps {
  /** Short uppercase label above the number */
  label: string;
  /** The big stat value — passed as a string for max formatting flexibility */
  value: string;
  /** Sub-text below the value — trend, description, status */
  sub?: string;
  /** Accent colour — sets top border stripe + offset shadow colour */
  accent?: CardAccent;
  /** Stat number size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Leading emoji/icon rendered before the number */
  icon?: React.ReactNode;
  /** Make the whole card interactive (press animation) */
  interactive?: boolean;
  /** Font family for the stat value. Default 'mono'. */
  font?: 'mono' | 'sans' | 'display';
  className?: string;
  /** Custom classes for the stat number text (e.g. gradient-text) */
  valueClassName?: string;
  /** Custom classes for the sub-text description */
  subClassName?: string;
}

/** Size → font size + weight + tracking */
const statSizeClasses: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'text-sm sm:text-base font-extrabold tracking-tight',
  sm: 'text-stat-sm',
  md: 'text-stat-md',
  lg: 'text-stat-lg',
  xl: 'text-stat-xl',
};

/** Accent → stat number text colour */
const statAccentTextColor: Record<CardAccent, string> = {
  lime:   'text-bb-lime',
  coral:  'text-bb-coral',
  violet: 'text-bb-violet',
  paper:  'text-[#1A1724]',
  none:   'text-bb-text-primary',
};

const statAccentBorder: Record<CardAccent, string> = {
  lime:   'border border-bb-lime/10',
  coral:  'border border-bb-coral/10',
  violet: 'border border-bb-violet/10',
  paper:  'border border-bb-paper/10',
  none:   'border border-white/5',
};

const statAccentBg: Record<CardAccent, string> = {
  lime:   'bg-bb-lime/[0.02]',
  coral:  'bg-bb-coral/[0.02]',
  violet: 'bg-bb-violet/[0.02]',
  paper:  'bg-bb-paper',
  none:   'bg-[#1C1A24]/30',
};

export function StatBlock({
  label,
  value,
  sub,
  accent = 'none',
  size = 'md',
  icon,
  interactive = false,
  font = 'mono',
  className = '',
  valueClassName,
  subClassName,
}: StatBlockProps) {
  const base = [
    'p-4',
    statAccentBorder[accent],
    statAccentBg[accent],
    'rounded-xl',
    'flex flex-col gap-1 select-none',
  ].join(' ');

  const labelClass = 'font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-bb-text-muted';
  const fontClass = font === 'sans' ? 'font-sans' : font === 'display' ? 'font-display' : 'font-mono';
  const valueClass = `${fontClass} font-black leading-none tracking-tight ${statSizeClasses[size]} ${
    valueClassName ? valueClassName : (statAccentTextColor[accent] || 'text-bb-text-primary')
  }`;
  const subClass   = `text-[11px] ${subClassName ? subClassName : 'text-bb-text-muted'} mt-1`;

  const inner = (
    <>
      {label && <span className={labelClass}>{label}</span>}
      <span className={valueClass}>
        {icon && <span className="mr-1">{icon}</span>}
        {value}
      </span>
      {sub && <span className={subClass}>{sub}</span>}
    </>
  );

  if (interactive) {
    return (
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
        whileTap={{ y: 0 }}
        className={`${base} hover:border-white/15 transition-all duration-200 cursor-pointer ${className}`}
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <div className={`${base} ${className}`}>
      {inner}
    </div>
  );
}
