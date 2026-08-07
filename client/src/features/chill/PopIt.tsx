import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const BUBBLE_COLORS = [
  'bg-bb-lime text-black',
  'bg-bb-coral text-white',
  'bg-bb-violet text-white',
  'bg-bb-violet text-white',
  'bg-bb-lime text-black',
  'bg-bb-coral text-white',
  'bg-bb-coral text-white',
  'bg-bb-violet text-white',
  'bg-bb-lime text-black',
];

export function PopIt() {
  const [bubbles, setBubbles]     = useState<boolean[]>(Array(9).fill(false));
  const [justReset, setJustReset] = useState(false);

  const handlePop = (index: number) => {
    if (bubbles[index]) return;
    const next = [...bubbles];
    next[index] = true;
    setBubbles(next);
    if (next.every(Boolean)) {
      setTimeout(() => {
        setJustReset(true);
        setBubbles(Array(9).fill(false));
        setTimeout(() => setJustReset(false), 600);
      }, 700);
    }
  };

  const resetPopIt = () => setBubbles(Array(9).fill(false));

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <div
        className={[
          'grid grid-cols-3 gap-2.5 p-3 border-2 border-bb-border rounded-bb-sm bg-bb-surface',
          'transition-all duration-300',
          justReset ? 'scale-95 opacity-40' : '',
        ].join(' ')}
      >
        {bubbles.map((popped, idx) => (
          <button
            key={idx}
            onClick={() => handlePop(idx)}
            className={[
              'w-11 h-11 rounded-full flex items-center justify-center',
              'transition-all duration-150 cursor-pointer focus:outline-none border-2',
              popped
                ? 'bg-bb-bg border-bb-border scale-90'
                : `${BUBBLE_COLORS[idx]} border-black active:scale-95 hover:scale-105`,
            ].join(' ')}
          >
            <span className={`text-[9px] font-extrabold font-mono ${popped ? 'text-bb-text-muted/30' : ''}`}>
              {popped ? '·' : 'pop'}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={resetPopIt}
          leftIcon={<RefreshCw size={12} />}
          className="font-mono"
        >
          Reset
        </Button>
        <p className="text-[10px] text-bb-text-muted font-mono">
          {bubbles.filter(Boolean).length}/9 popped
        </p>
      </div>
    </div>
  );
}
