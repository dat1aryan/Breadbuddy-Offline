import { motion } from 'framer-motion';

interface BudgetRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function BudgetRing({ percentage, size = 110, strokeWidth = 10 }: BudgetRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  const cappedPercentage = Math.min(percentage, 100);
  const strokeDashoffset = circumference - (cappedPercentage / 100) * circumference;

  const isOver = percentage > 100;
  const strokeTokenClass = isOver 
    ? 'stroke-bb-coral' 
    : percentage > 85 
      ? 'stroke-bb-violet' 
      : 'stroke-bb-lime';

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track ring */}
        <circle
          className="stroke-bb-border"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Foreground animated indicator ring */}
        <motion.circle
          className={`${strokeTokenClass} transition-all duration-500 ease-out`}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          strokeLinecap="butt"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>

      {/* Inside Text Label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`text-base font-mono font-black ${
          isOver ? 'text-bb-coral' : 'text-bb-text-primary'
        }`}>
          {percentage.toFixed(0)}%
        </span>
        <span className="text-label text-bb-text-muted">
          {isOver ? 'over limit' : 'spent'}
        </span>
      </div>
    </div>
  );
}
