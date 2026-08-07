import { LayoutDashboard, Receipt, MessageSquare, Gamepad2, Target } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'dashboard' | 'transactions' | 'aibro' | 'chill' | 'goals' | 'profile' | 'settings';
  onChangeTab: (tabId: 'dashboard' | 'transactions' | 'aibro' | 'chill' | 'goals' | 'profile' | 'settings') => void;
}

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const items = [
    { id: 'dashboard',    label: 'Home',      icon: <LayoutDashboard size={16} /> },
    { id: 'transactions', label: 'Txns',      icon: <Receipt size={16} /> },
    { id: 'aibro',        label: 'AI Bro',    icon: <MessageSquare size={16} /> },
    { id: 'chill',        label: 'Chill',     icon: <Gamepad2 size={16} /> },
    { id: 'goals',        label: 'Goals',     icon: <Target size={16} /> },
  ] as const;

  return (
    // Flat surface, hard 3px top border — no blur, no translucency
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bb-surface border-t-[3px] border-black py-2 px-3 flex items-center justify-around">
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className="flex flex-col items-center gap-1 px-2 select-none outline-none"
          >
            {/*
             * Blocky active indicator: solid lime chip wrapping the icon.
             * Mirrors the sidebar's left-bar active language, adapted for
             * bottom-nav layout — filled box rather than a colour/glow swap.
             */}
            <span
              className={[
                'flex items-center justify-center w-9 h-7 rounded-bb-sm border-2 transition-colors duration-100',
                isActive
                  ? 'bg-bb-lime border-black text-bb-lime-fg'
                  : 'bg-transparent border-transparent text-bb-text-muted',
              ].join(' ')}
            >
              {tab.icon}
            </span>
            <span
              className={`font-mono text-[9px] font-bold uppercase tracking-[0.08em] transition-colors duration-100 ${
                isActive ? 'text-bb-lime' : 'text-bb-text-muted'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
