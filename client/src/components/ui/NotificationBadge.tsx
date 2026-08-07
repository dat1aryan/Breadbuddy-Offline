import { AnimatePresence, motion } from 'framer-motion';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className={`absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-neon-coral text-[9px] font-black text-white font-numeric tracking-tighter shadow-md shadow-neon-coral/20 select-none border border-surface-dark ${className}`}
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
