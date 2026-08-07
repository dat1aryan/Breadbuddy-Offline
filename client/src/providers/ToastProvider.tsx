import React, { createContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { toastVariants } from '../animations/transitions';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  remove: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      remove(id);
    }, 4000);
  }, [remove]);

  const success = useCallback((message: string) => add(message, 'success'), [add]);
  const error = useCallback((message: string) => add(message, 'error'), [add]);
  const info = useCallback((message: string) => add(message, 'info'), [add]);

  return (
    <ToastContext.Provider value={{ success, error, info, remove }}>
      {children}
      
      {/* Toast Render Layer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            // 5. Flat neo-brutal surface — no backdrop-blur, shadow-[4px_4px_0px_#000], rounded-bb-sm
            // 6. Icon tokens migrated to bb-* — no glow-text-* utilities
            let Icon = Info;
            let borderColor = 'border-bb-border';
            let iconColor = 'text-bb-violet';

            if (toast.type === 'success') {
              Icon = CheckCircle2;
              borderColor = 'border-bb-lime';
              iconColor = 'text-bb-lime';
            } else if (toast.type === 'error') {
              Icon = AlertCircle;
              borderColor = 'border-bb-coral';
              iconColor = 'text-bb-coral';
            }

            return (
              <motion.div
                key={toast.id}
                variants={toastVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-bb-sm border-2 shadow-[4px_4px_0px_#000] bg-bb-surface ${borderColor}`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={iconColor} />
                  <p className="text-xs font-semibold tracking-wide font-mono text-bb-text-primary">{toast.message}</p>
                </div>
                <button
                  onClick={() => remove(toast.id)}
                  className="text-bb-text-muted hover:text-bb-text-primary transition-colors focus:outline-none"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
