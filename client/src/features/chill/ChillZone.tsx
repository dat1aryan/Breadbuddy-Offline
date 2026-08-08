import { useState } from 'react';
import { Gamepad2, Hand, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FidgetZone } from './FidgetZone';
import { FlappyBread } from './FlappyBread';
import { DoodleZone } from './DoodleZone';

type ChillSection = 'fidgets' | 'flappy' | 'doodle';

const TABS: {
  id: ChillSection;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
  iconColor: string;
}[] = [
  {
    id: 'fidgets',
    label: 'Fidgets',
    icon: <Hand size={14} />,
    activeClass: 'bg-bb-lime text-bb-lime-fg border-black shadow-[2px_2px_0px_#000]',
    iconColor: 'text-bb-lime',
  },
  {
    id: 'flappy',
    label: 'Flappy Bread',
    icon: <Gamepad2 size={14} />,
    activeClass: 'bg-bb-coral text-bb-coral-fg border-black shadow-[2px_2px_0px_#000]',
    iconColor: 'text-bb-coral',
  },
  {
    id: 'doodle',
    label: 'Doodle',
    icon: <Pencil size={14} />,
    activeClass: 'bg-bb-violet text-bb-violet-fg border-black shadow-[2px_2px_0px_#000]',
    iconColor: 'text-bb-violet',
  },
];

export function ChillZone() {
  const [active, setActive] = useState<ChillSection>('fidgets');

  const currentTab = TABS.find((t) => t.id === active) || TABS[0];

  return (
    <div className={active === 'flappy' ? 'space-y-2' : 'space-y-6'}>

      {/* ── Page header ── */}
      <div className="flex flex-row justify-between items-center gap-2 select-none">
        <div>
          <h2 className="text-lg md:text-xl font-display font-black text-bb-text-primary flex items-center gap-2 tracking-tight">
            <Gamepad2 className={currentTab.iconColor} size={18} />
            Chill Zone
          </h2>
          {active !== 'flappy' && (
            <p className="text-xs text-bb-text-secondary mt-0.5 hidden sm:block">
              Take a quick break with mini-games and fidgets to destress and lock back in.
            </p>
          )}
        </div>

        {/* ── Section switcher — balanced vibrant hero colors ── */}
        <div className="flex bg-bb-surface border-2 border-bb-border p-1 rounded-bb-sm gap-1 shrink-0">
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={[
                  'relative flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5',
                  'rounded-bb-xs text-[11px] sm:text-xs font-bold uppercase tracking-wider border-2',
                  'transition-all cursor-pointer select-none',
                  isActive
                    ? tab.activeClass
                    : 'bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary',
                ].join(' ')}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {active === 'fidgets' && <FidgetZone />}
          {active === 'flappy'  && <FlappyBread />}
          {active === 'doodle'  && <DoodleZone />}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
