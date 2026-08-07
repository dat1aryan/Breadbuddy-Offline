import { Variants } from 'framer-motion';

// Transition constants typed with as const to prevent type widening
export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

export const gentleSpring = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 20,
};

// Page transitions
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.7, 0, 0.84, 0], // easeIn
    },
  },
};

// Card Hover lift (legacy — kept for old glass components)
export const cardHoverVariants: Variants = {
  initial: {
    y: 0,
    scale: 1,
  },
  hover: {
    y: -3,
    scale: 1.005,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// Button Press Feedback (legacy — kept for old glass buttons)
export const buttonPressVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.01 },
  tap: { scale: 0.97 },
};

// Modal transitions (legacy)
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 15 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: gentleSpring,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.15 },
  },
};

// Bottom Sheet / Drawer slide transitions
export const bottomSheetBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const bottomSheetVariants: Variants = {
  initial: { y: '100%' },
  animate: { 
    y: 0, 
    transition: springTransition,
  },
  exit: { 
    y: '100%', 
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
};

// Toast notification transition
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 50, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: gentleSpring,
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95, 
    transition: { duration: 0.15 },
  },
};

// Skeleton shimmer
export const shimmerVariants: Variants = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear' as const,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NEO-BRUTALISM TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Neo-brutal card press: element translates +2px toward its offset shadow,
 * making the shadow "compress" — a physical press-into-surface sensation.
 * Pair with shadow-bb → shadow-bb-hover CSS classes.
 */
export const bbCardVariants: Variants = {
  rest: {
    x: 0,
    y: 0,
    transition: { duration: 0.08, ease: 'easeOut' },
  },
  hover: {
    x: 2,
    y: 2,
    transition: { duration: 0.08, ease: 'easeOut' },
  },
  tap: {
    x: 4,
    y: 4,
    transition: { duration: 0.06, ease: 'easeOut' },
  },
};

/**
 * Neo-brutal button press — same physical offset mechanic as cards,
 * but tighter travel distance for a snappier feel on small elements.
 */
export const bbButtonVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  hover: {
    scale: 1.02,
    y: -1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: { duration: 0.08, ease: 'easeOut' },
  },
};

/**
 * Badge wobble — sticker rotation on hover.
 */
export const bbBadgeVariants: Variants = {
  rest: {
    rotate: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  hover: {
    rotate: [-2, 3, -2, 1, 0],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
};

/**
 * Modal slide-up — translates from below, no scale distortion.
 */
export const bbModalContentVariants: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 16,
    transition: { duration: 0.15, ease: [0.7, 0, 0.84, 0] },
  },
};

export const bbModalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};
