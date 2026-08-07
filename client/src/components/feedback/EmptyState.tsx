import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** Border accent: dashed in the accent colour. Default 'neutral'. */
  accent?: 'lime' | 'coral' | 'violet' | 'neutral';
  className?: string;
}

const accentBorder: Record<string, string> = {
  lime:    'border-bb-lime',
  coral:   'border-bb-coral',
  violet:  'border-bb-violet',
  neutral: 'border-bb-border',
};

export function EmptyState({ title, description, icon, action, accent = 'neutral', className = '' }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        'p-4 sm:p-6 bg-bb-surface/40 backdrop-blur-md',
        'border-2 border-dashed rounded-bb-sm',
        accentBorder[accent],
        className,
      ].join(' ')}
    >
      {icon && (
        <div className="text-3xl leading-none mb-4 select-none">
          {icon}
        </div>
      )}
      <h3 className="font-display font-extrabold text-[15px] text-bb-text-primary mb-2 tracking-tight leading-tight">
        {title}
      </h3>
      <p className={`text-[12px] text-bb-text-secondary max-w-xs leading-relaxed ${action ? 'mb-5' : ''}`}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
