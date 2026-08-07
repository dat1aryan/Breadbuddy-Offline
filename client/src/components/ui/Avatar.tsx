import { profileEngine } from '../../lib/profileEngine';

interface AvatarProps {
  name: string;
  userId?: number;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'surface' | 'violet';
}

export function Avatar({ name, userId, src, size = 'md', className = '', variant = 'surface' }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  const emoji = userId ? profileEngine.getAvatar(userId) : null;

  // Square sizes — matching standard icon button sizes
  const sizeClasses = {
    sm: 'w-9 h-9 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-2xl',
  };

  const variantClasses =
    variant === 'violet'
      ? 'bg-bb-violet text-bb-violet-fg border-2 border-black'
      : 'bg-bb-surface border-2 border-bb-border hover:bg-bb-bg hover:border-black text-bb-text-primary transition-colors duration-100';

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden select-none font-bold uppercase tracking-wider rounded-bb-sm ${variantClasses} ${sizeClasses[size]} ${className}`}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : emoji ? (
        <span className="leading-none">{emoji}</span>
      ) : (
        <span className="font-mono">{initials}</span>
      )}
    </div>
  );
}
