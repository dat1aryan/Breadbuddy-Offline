import { Card } from '../../components/ui/Card';

/**
 * DoodleZone — Interactive canvas scaffold.
 * Full drawing engine (pen, eraser, colour palette, undo, clear)
 * will be implemented in a dedicated pass.
 */
export function DoodleZone() {
  return (
    <Card className="h-72 flex flex-col items-center justify-center gap-3">
      <span className="text-4xl select-none">✏️</span>
      <div className="text-center space-y-1">
        <p className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono">
          Coming soon
        </p>
        <p className="text-[11px] text-bb-text-secondary font-sans leading-relaxed max-w-[240px]">
          A freehand canvas with pen, eraser, colour picker, and one-click clear.
        </p>
      </div>
    </Card>
  );
}
