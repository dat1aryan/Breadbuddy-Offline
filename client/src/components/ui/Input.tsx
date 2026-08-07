import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 dark:text-white/50 light:text-gray-500 font-mono">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-white/40 dark:text-white/40 light:text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full px-4 py-2.5 rounded-xl bg-white/[0.02] dark:bg-white/[0.02] light:bg-black/[0.02] border border-white/10 dark:border-white/10 light:border-black/10 focus:outline-none focus:ring-2 focus:ring-lavender/40 text-sm placeholder-white/30 dark:placeholder-white/30 light:placeholder-black/30 transition-all duration-200 ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-neon-coral/40 focus:ring-neon-coral/30'
                : 'focus:border-lavender/30'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-white/40 dark:text-white/40 light:text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <span className="text-xs text-neon-coral font-medium tracking-wide">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
