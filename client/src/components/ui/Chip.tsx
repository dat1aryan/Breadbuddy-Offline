import { motion } from 'framer-motion';
import { buttonPressVariants } from '../../animations/transitions';

type ChipVariant = 'lime' | 'coral' | 'violet' | 'none';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  /** Active fill variant. Defaults to 'violet'. */
  activeVariant?: ChipVariant;
  className?: string;
}

export function Chip({
  label,
  selected = false,
  onClick,
  activeVariant = 'violet',
  className = '',
}: ChipProps) {

  const baseStyle = 'inline-flex items-center px-4 py-2 rounded-bb-xs text-xs font-bold border-2 transition-none cursor-pointer select-none font-mono uppercase tracking-wide';

  const activeStyles: Record<ChipVariant, string> = {
    lime:   'bg-bb-lime   text-bb-lime-fg   border-black',
    coral:  'bg-bb-coral  text-bb-coral-fg  border-black',
    violet: 'bg-bb-violet text-bb-violet-fg border-black',
    none:   'bg-bb-surface text-bb-text-primary border-bb-border',
  };

  const idleStyle = 'bg-bb-surface border-bb-border text-bb-text-muted hover:border-bb-text-primary hover:text-bb-text-primary';

  return (
    <motion.button
      variants={buttonPressVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className={`${baseStyle} ${selected ? activeStyles[activeVariant] : idleStyle} ${className}`}
    >
      {label}
    </motion.button>
  );
}
