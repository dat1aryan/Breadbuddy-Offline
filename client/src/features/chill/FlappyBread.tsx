import { Card } from '../../components/ui/Card';

/**
 * FlappyBread — Game canvas scaffold.
 * Full canvas-based Flappy Bird engine (bread character, pipe obstacles,
 * score, high-score persistence) will be implemented in a dedicated pass.
 */
export function FlappyBread() {
  return (
    <Card className="h-72 flex flex-col items-center justify-center gap-3">
      <span className="text-4xl select-none">🍞</span>
      <div className="text-center space-y-1">
        <p className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono">
          Coming soon
        </p>
        <p className="text-[11px] text-bb-text-secondary font-sans leading-relaxed max-w-[240px]">
          Tap <kbd className="px-1.5 py-0.5 rounded border-2 border-bb-border bg-bb-surface font-mono text-[10px]">Space</kbd> or the screen to keep the loaf airborne.
        </p>
      </div>
    </Card>
  );
}
