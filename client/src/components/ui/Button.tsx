import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { bbButtonVariants } from '../../animations/transitions';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass' | 'violet';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, className = '', ...props }, ref) => {

    // Base: hard border, no radius beyond 4px, bold uppercase text
    const baseStyle = [
      'inline-flex items-center justify-center gap-2',
      'font-bold text-[13px] uppercase tracking-[0.04em]',
      'rounded-bb-sm',
      'border-3',
      'outline-none',
      'cursor-pointer',
      'transition-none', // transitions handled by framer translate
      'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none',
    ].join(' ');

    // Variants: flat solid fills + hard offset shadow
    const variants: Record<string, string> = {
      // Lime fill — for primary CTAs (save, log, confirm)
      primary:   'bg-bb-lime text-bb-lime-fg border-black shadow-bb',
      // Dark surface + border — secondary/cancel actions
      secondary: 'bg-bb-surface text-bb-text-primary border-bb-border shadow-bb',
      // Coral fill — destructive/delete actions
      danger:    'bg-bb-coral text-bb-coral-fg border-black shadow-bb',
      // Violet outline → fills on hover — for gamification CTAs
      ghost:     'bg-transparent text-bb-violet border-bb-violet shadow-bb-violet hover:bg-bb-violet hover:text-bb-violet-fg hover:border-black',
      // Alias: glass → secondary during migration
      glass:     'bg-bb-surface text-bb-text-primary border-bb-border shadow-bb',
      // Violet fill — solid purple buttons
      violet:    'bg-bb-violet text-bb-violet-fg border-black shadow-bb',
    };

    const sizes: Record<string, string> = {
      sm: 'px-3.5 py-2   text-[11px]',
      md: 'px-5   py-2.5',
      lg: 'px-6   py-3   text-[15px] border-4',
    };

    return (
      <motion.button
        ref={ref}
        variants={bbButtonVariants}
        initial="rest"
        whileHover={props.disabled ? undefined : 'hover'}
        whileTap={props.disabled ? undefined : 'tap'}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={loading || props.disabled}
        {...(props as any)}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {!loading && leftIcon && <span>{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span>{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
