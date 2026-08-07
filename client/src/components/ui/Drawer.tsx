import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, title, children, className = '' }: DrawerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Desktop: slides in from the right
  const desktopBackdrop: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
    exit:    { opacity: 0, transition: { duration: 0.15 } },
  };
  const desktopSheet: Variants = {
    initial: { x: '100%' },
    animate: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit:    { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
  };

  // Mobile: slides up from the bottom (consistent with Modal.tsx entry pattern)
  const mobileBackdrop: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
    exit:    { opacity: 0, transition: { duration: 0.15 } },
  };
  const mobileSheet: Variants = {
    initial: { y: '100%' },
    animate: { y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit:    { y: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
  };

  const activeBackdrop = isMobile ? mobileBackdrop : desktopBackdrop;
  const activeSheet    = isMobile ? mobileSheet    : desktopSheet;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex justify-end ${isMobile ? 'items-end' : ''}`}>

          {/* ── Backdrop — flat dark scrim, no blur ──────────────────── */}
          <motion.div
            variants={activeBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-bb-bg/80"
          />

          {/* ── Drawer Panel ─────────────────────────────────────────── */}
          <motion.div
            variants={activeSheet}
            initial="initial"
            animate="animate"
            exit="exit"
            className={[
              'relative z-10 flex flex-col',
              'bg-[#1C1A24]/95 backdrop-blur-2xl shadow-2xl',
              isMobile
                ? 'w-full max-h-[85vh] rounded-t-2xl border-t border-white/10'
                : 'h-screen w-full max-w-md border-l border-white/10',
              className,
            ].filter(Boolean).join(' ')}
          >

            {/* ── Panel Header ───────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-white/10 p-5 flex-shrink-0">
              <h3 className="font-display font-black text-xl md:text-2xl text-bb-text-primary tracking-tight leading-tight">
                {title || ''}
              </h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className={[
                  'flex items-center justify-center w-7 h-7',
                  'bg-white/5 border border-white/10 rounded-lg',
                  'text-bb-text-muted',
                  'hover:bg-bb-coral/20 hover:text-bb-coral hover:border-bb-coral/40',
                  'transition-colors duration-150 outline-none',
                ].join(' ')}
              >
                <X size={13} />
              </button>
            </div>

            {/* ── Scrollable Body ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
