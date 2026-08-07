import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Spinner } from './Spinner';
import { Squishy } from './Squishy';
import { PopIt } from './PopIt';

type FidgetTab = 'spinner' | 'squishy' | 'popit';

const FIDGET_TABS: {
  id: FidgetTab;
  label: string;
  activeClass: string;
}[] = [
  {
    id: 'spinner',
    label: 'Spinner 🌀',
    activeClass: 'bg-white text-black border-black shadow-[2px_2px_0px_#000]',
  },
  {
    id: 'squishy',
    label: 'Squishy Loaf 🍞',
    activeClass: 'bg-white text-black border-black shadow-[2px_2px_0px_#000]',
  },
  {
    id: 'popit',
    label: 'Pop It 🫧',
    activeClass: 'bg-white text-black border-black shadow-[2px_2px_0px_#000]',
  },
];

export function FidgetZone() {
  const [activeTab, setActiveTab] = useState<FidgetTab>('spinner');

  return (
    <div className="space-y-4">
      {/* Inner tab row */}
      <div className="flex bg-bb-surface border-2 border-bb-border p-1 rounded-bb-sm gap-1">
        {FIDGET_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 py-2 rounded-bb-xs text-xs font-bold uppercase tracking-wider border-2',
                'transition-all cursor-pointer select-none',
                isActive
                  ? tab.activeClass
                  : 'bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Play area */}
      <Card
        accent={activeTab === 'spinner' ? 'lime' : activeTab === 'squishy' ? 'coral' : 'violet'}
        className={[
          'flex flex-col items-center justify-center relative p-6 transition-all duration-300',
          activeTab === 'squishy' ? 'min-h-[480px]' : 'min-h-80',
        ].join(' ')}
      >
        {activeTab === 'spinner' && <Spinner />}
        {activeTab === 'squishy' && <Squishy />}
        {activeTab === 'popit' && <PopIt />}
      </Card>
    </div>
  );
}
