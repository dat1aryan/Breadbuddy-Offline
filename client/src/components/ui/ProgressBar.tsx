import { motion } from 'framer-motion';

/**
 * Canonical runtime color set (maps to bb-* fill classes).
 * 'lavender' and 'pink' are legacy aliases that remap to 'violet'.
 */
export type ProgressColor = 'lime' | 'coral' | 'violet' | 'lavender' | 'pink';

/** Resolved to one of the three canonical fills internally. */
type ProgressColorCanonical = 'lime' | 'coral' | 'violet';

interface ProgressBarProps {
  /** 0–100 */
  percentage: number;
  /**
   * Accent fill color.
   * Accepts canonical values ('lime' | 'coral' | 'violet') and legacy aliases
   * ('lavender' → violet, 'pink' → violet) so existing call sites require
   * no changes during the page-by-page migration phase.
   */
  color?: ProgressColor;
  /**
   * Pixel height of the track.
   * Default 16px (chunky neo-brutal). Use 12 for compact, 24 for large.
   */
  height?: number;
  /** Show left label + right percentage/value above the track. */
  showLabel?: boolean;
  /** Left-side label text when showLabel is true. */
  label?: string;
  /** Right-side value text — overrides the auto "N%" when provided. */
  valueLabel?: string;
  /** Sub-text rendered below the track. */
  caption?: string;
  className?: string;
}

/** Remap legacy color names to the three canonical fills. */
function resolveColor(color: ProgressColor | undefined): ProgressColorCanonical {
  if (!color)                              return 'lime';   // safe default
  if (color === 'lavender' || color === 'pink') return 'violet';
  return color;
}

const fillClasses: Record<ProgressColorCanonical, string> = {
  lime:   'bg-bb-lime',
  coral:  'bg-bb-coral',
  violet: 'bg-bb-violet',
};

const captionColorClasses: Record<ProgressColorCanonical, string> = {
  lime:   'text-bb-lime',
  coral:  'text-bb-coral',
  violet: 'text-bb-violet',
};

export function ProgressBar({
  percentage,
  color,
  height = 16,
  showLabel = false,
  label = 'Progress',
  valueLabel,
  caption,
  className = '',
}: ProgressBarProps) {
  const resolvedColor = resolveColor(color);
  const pct = Math.max(0, Math.min(percentage, 100));
  const isComplete = pct >= 100;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-bb-text-muted">
            {label}
          </span>
          <span className="font-mono text-[12px] font-bold text-bb-text-primary tabular-nums">
            {valueLabel ?? `${pct.toFixed(0)}%`}
          </span>
        </div>
      )}

      {/* Track: 0px radius (hard square), solid 2px border, 3px black offset shadow */}
      <div
        className="w-full bg-bb-surface border-2 border-black overflow-hidden"
        style={{
          height,
          borderRadius: 0,
          boxShadow: '3px 3px 0px 0px #000',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full ${fillClasses[resolvedColor]}`}
          style={{ borderRadius: 0 }}
        />
      </div>

      {caption && (
        <span
          className={`text-[11px] font-semibold ${
            isComplete ? captionColorClasses[resolvedColor] : 'text-bb-text-muted'
          }`}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
