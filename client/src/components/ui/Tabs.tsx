import { motion } from 'framer-motion';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] dark:bg-white/[0.02] light:bg-black/5 border border-white/5 dark:border-white/5 light:border-black/5 backdrop-blur-xl ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors select-none z-10 ${
              isActive 
                ? 'text-white dark:text-white light:text-gray-900' 
                : 'text-white/40 dark:text-white/40 light:text-gray-500 hover:text-white/70 dark:hover:text-white/70 light:hover:text-gray-700'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-white/[0.06] dark:bg-white/[0.06] light:bg-white border border-white/10 dark:border-white/10 light:border-black/10 rounded-lg -z-10 shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
