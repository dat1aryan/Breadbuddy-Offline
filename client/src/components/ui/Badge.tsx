import React from 'react';
import { motion } from 'framer-motion';
import { bbBadgeVariants } from '../../animations/transitions';

export type BadgeVariant = 'lime' | 'coral' | 'violet' | 'paper' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  /** Level badges are larger, use heavier border, and can have a slight rotation offset */
  size?: 'sm' | 'md';
  /** Degrees to rotate — use for sticker-style placement. Usually ±2deg. */
  rotate?: number;
  /** Enable wobble-on-hover sticker animation */
  wobble?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  lime:    'bg-bb-lime    text-bb-lime-fg   border-black',
  coral:   'bg-bb-coral   text-bb-coral-fg  border-black',
  violet:  'bg-bb-violet  text-bb-violet-fg border-black',
  // paper: light surface, readable on dark backgrounds
  paper:   'bg-bb-paper   text-[#1A1724]    border-bb-border',
  // neutral: ghost-style, for "archived" / inactive states
  neutral: 'bg-bb-surface text-bb-text-muted border-bb-border',
};

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'px-2   py-0.5 text-[9px]  border-2',
  md: 'px-3   py-1   text-[11px] border-3',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  rotate = 0,
  wobble = false,
  className = '',
}: BadgeProps) {
  const base = [
    'inline-flex items-center gap-1',
    'font-bold tracking-[0.1em] uppercase',
    'rounded-bb-xs',
    variantClasses[variant],
    sizeClasses[size],
  ].join(' ');

  const style: React.CSSProperties = rotate !== 0 ? { transform: `rotate(${rotate}deg)` } : {};

  if (wobble) {
    return (
      <motion.span
        variants={bbBadgeVariants}
        initial="rest"
        whileHover="hover"
        className={`${base} ${className}`}
        style={style}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <span className={`${base} ${className}`} style={style}>
      {children}
    </span>
  );
}
