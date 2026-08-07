import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: 'lavender' | 'pink' | 'lime' | 'coral';
  className?: string;
}

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 10,
  label,
  color = 'lavender',
  className = '',
}: ProgressRingProps) {
  const [animatedPct, setAnimatedPct] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    // Soft animated transition to percentage
    const timer = setTimeout(() => {
      setAnimatedPct(Math.max(0, Math.min(percentage, 100)));
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  const colorMap = {
    lavender: 'stroke-lavender dark:stroke-lavender light:stroke-purple-600',
    pink: 'stroke-iridescent-pink',
    lime: 'stroke-toxic-lime',
    coral: 'stroke-neon-coral',
  };

  const shadowColorMap = {
    lavender: 'rgba(180, 122, 234, 0.25)',
    pink: 'rgba(255, 113, 206, 0.25)',
    lime: 'rgba(57, 255, 20, 0.25)',
    coral: 'rgba(255, 87, 87, 0.25)',
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          className="stroke-white/[0.04] dark:stroke-white/[0.04] light:stroke-black/5"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Animated Progress Circle */}
        <motion.circle
          className={colorMap[color]}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            filter: `drop-shadow(0 0 6px ${shadowColorMap[color]})`,
          }}
        />
      </svg>
      {/* Center Label Overlay */}
      {label && (
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xl font-black font-numeric tracking-tight text-white dark:text-white light:text-gray-900">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
