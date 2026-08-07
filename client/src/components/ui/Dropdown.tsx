import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 mt-2 min-w-[170px] rounded-xl bg-neutral-950 p-2 pt-3.5 shadow-2xl shadow-black/80 border border-neutral-800 overflow-hidden ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {/* Premium Gradient Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-iridescent-pink to-lavender" />

            <div className="flex flex-col gap-1">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                    item.danger
                      ? 'text-neon-coral hover:bg-neon-coral/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.icon && <span className="opacity-75 transition-opacity duration-200 group-hover:opacity-100">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
