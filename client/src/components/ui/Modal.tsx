import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { bbModalBackdropVariants, bbModalContentVariants } from '../../animations/transitions';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /**
   * When true, the built-in header bar and body scroll wrapper are skipped.
   * The consumer is responsible for all internal structure (header, scrollable
   * body, footer). An ✕ close button is still injected in the top-right corner.
   * Used by modals that need a fixed-header / scrollable-body / fixed-footer layout.
   */
  rawLayout?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  style,
  rawLayout = false,
}: ModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modalRoot = typeof document !== 'undefined' ? document.body : null;
  if (!modalRoot) return null;

  const modalJSX = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">

          {/* ── Backdrop ── no blur, flat dark scrim ───────────────────── */}
          <motion.div
            key="bb-modal-backdrop"
            variants={bbModalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-bb-bg/80"
          />

          {/* ── Modal panel ──────────────────────────────────────────────── */}
          <motion.div
            key="bb-modal-panel"
            variants={bbModalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={style}
            className={[
              'relative z-10',
              'w-full max-w-lg',
              'bg-[#1C1A24]/95 backdrop-blur-2xl',
              'border border-white/10',
              'rounded-2xl',
              'shadow-[0_12px_50px_rgba(0,0,0,0.6)]',
              'overflow-hidden',
              rawLayout ? '' : 'p-6',
              className,
            ].filter(Boolean).join(' ')}
          >
            {rawLayout ? (
              // Raw layout — consumer owns structure; we only inject the close button
              <>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className={[
                    'absolute top-4 right-4 z-10',
                    'flex items-center justify-center',
                    'w-7 h-7',
                    'bg-white/5',
                    'border border-white/10 rounded-lg',
                    'text-bb-text-muted',
                    'hover:bg-bb-coral/20 hover:text-bb-coral hover:border-bb-coral/40',
                    'transition-colors duration-150 outline-none',
                  ].join(' ')}
                >
                  <X size={13} />
                </button>
                {children}
              </>
            ) : (
              <>
                {/* ── Standard header ──────────────────────────────────── */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  {title ? (
                    <h3 className="font-display font-black text-xl gradient-text tracking-tight leading-tight">
                      {title}
                    </h3>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className={[
                      'flex items-center justify-center',
                      'w-7 h-7 ml-4 flex-shrink-0',
                      'bg-white/5',
                      'border border-white/10 rounded-lg',
                      'text-bb-text-muted',
                      'hover:bg-bb-coral/20 hover:text-bb-coral hover:border-bb-coral/40',
                      'transition-colors duration-150 outline-none',
                    ].join(' ')}
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* ── Body (scrollable) ─────────────────────────────────── */}
                <div className="max-h-[75vh] overflow-y-auto pr-3 md:pr-4 custom-scrollbar">
                  {children}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalJSX, modalRoot);
}
