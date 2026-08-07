import { motion } from 'framer-motion';
import { buttonPressVariants } from '../../animations/transitions';

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
}

export function FloatingActionButton({
  icon,
  onClick,
  title,
  className = '',
}: FloatingActionButtonProps) {
  return (
    <motion.button
      variants={buttonPressVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      title={title}
      // Item 14: bg-gradient-to-r from-lavender to-iridescent-pink → bg-bb-violet (flat)
      //          shadow-lavender/20 → shadow-[4px_4px_0px_#000] (Phase 0 offset shadow)
      //          focus:ring-lavender/50 → focus:ring-bb-violet
      className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-bb-violet text-bb-violet-fg border-2 border-black shadow-[4px_4px_0px_#000] outline-none focus:ring-2 focus:ring-bb-violet cursor-pointer ${className}`}
    >
      {icon}
    </motion.button>
  );
}
