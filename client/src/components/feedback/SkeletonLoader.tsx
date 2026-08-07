interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'text' | 'circle';
  count?: number;
  className?: string;
}

export function SkeletonLoader({ variant = 'text', count = 1, className = '' }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  const classes = {
    card: 'h-24 w-full rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden',
    list: 'h-12 w-full rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden',
    text: 'h-4 w-3/4 rounded bg-white/[0.03] relative overflow-hidden',
    circle: 'h-10 w-10 rounded-full bg-white/[0.03] relative overflow-hidden',
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {items.map((_, i) => (
        <div key={i} className={`${classes[variant]} ${className}`}>
          {/* Shimmer overlay */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />
        </div>
      ))}
    </div>
  );
}
