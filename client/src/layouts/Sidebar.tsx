import { motion } from 'framer-motion';
import { LayoutDashboard, Receipt, MessageSquare, Gamepad2, Target, LogOut } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { User } from '../lib/types';

interface SidebarProps {
  user: User;
  activeTab: 'dashboard' | 'transactions' | 'aibro' | 'chill' | 'goals' | 'profile' | 'settings';
  onChangeTab: (tabId: 'dashboard' | 'transactions' | 'aibro' | 'chill' | 'goals' | 'profile' | 'settings') => void;
  onLogout: () => void;
}

export function Sidebar({ user, activeTab, onChangeTab, onLogout }: SidebarProps) {
  const items = [
    { id: 'dashboard',    label: 'Overview',     icon: <LayoutDashboard size={18} /> },
    { id: 'transactions', label: 'Transactions',  icon: <Receipt size={18} /> },
    { id: 'aibro',        label: 'AI Bro',       icon: <MessageSquare size={18} /> },
    { id: 'chill',        label: 'Chill Zone',   icon: <Gamepad2 size={18} /> },
    { id: 'goals',        label: 'Saving Goals', icon: <Target size={18} /> },
  ] as const;

  return (
    // Flat surface, hard 3px right border separating sidebar from content — no blur, no translucency
    <aside className="hidden md:flex flex-col h-screen flex-shrink-0 bg-bb-surface border-r-[3px] border-black z-20 w-16 lg:w-64">
      {/* ── Top section: branding + user + nav ──────────────────────── */}
      <div className="flex flex-col gap-6 lg:gap-8 p-4 lg:p-5 overflow-hidden">

        {/* Branding — flat lime wordmark, no gradient/glow */}
        <div className="flex items-center gap-3 px-1 lg:px-1.5 shrink-0">
          <span className="text-2xl lg:text-3xl select-none">🍞</span>
          <div className="hidden lg:block select-none">
            <h1 className="text-sm lg:text-base font-display font-black gradient-text leading-tight tracking-tight">
              BreadBuddy
            </h1>
            <p className="text-[9px] text-bb-text-muted font-mono font-bold tracking-wider uppercase">
              Money Bestie
            </p>
          </div>
        </div>

        {/* User Card — flat hover, no translucent fill */}
        <button
          onClick={() => onChangeTab('profile')}
          className="flex items-center gap-3 px-1 lg:px-1.5 py-2 rounded-bb-sm hover:bg-bb-bg transition-colors duration-100 shrink-0 w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-bb-violet/50"
        >
          <Avatar name={user.name || 'bestie'} userId={user.id} size="sm" />
          <div className="hidden lg:block overflow-hidden">
            <p className="text-[9px] text-bb-text-muted font-mono font-bold uppercase tracking-wider">Account Profile</p>
            <p className="text-xs font-bold text-bb-text-primary truncate capitalize">
              {user.name || 'bestie'}
            </p>
          </div>
        </button>

        {/* Navigation Items */}
        <nav className="space-y-0.5">
          {items.map((tab) => {
            const isActive = activeTab === tab.id;

            const btn = (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={[
                  'relative w-full flex items-center justify-center lg:justify-start gap-3.5',
                  'px-3 lg:px-4 py-3',
                  'rounded-bb-sm',
                  'font-mono text-xs font-bold uppercase tracking-[0.05em]',
                  'select-none transition-colors duration-100 outline-none',
                  'focus-visible:ring-2 focus-visible:ring-bb-violet/50',
                  isActive
                    ? 'text-bb-lime bg-bb-bg'
                    : 'text-bb-text-muted hover:text-bb-text-secondary hover:bg-bb-bg',
                ].join(' ')}
              >
                {/*
                 * Blocky active indicator: a solid 3px lime bar pinned to the
                 * left edge of the nav item. Animated with layoutId so it slides
                 * smoothly between items on tab change. Hard edge, zero blur.
                 */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 top-2 bottom-2 w-[3px] bg-bb-lime"
                    style={{ borderRadius: '0 2px 2px 0' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="flex-shrink-0">{tab.icon}</span>
                <span className="hidden lg:block truncate">{tab.label}</span>
              </button>
            );

            return (
              <div key={tab.id}>
                {/* Icon-only (w-16) with tooltip */}
                <div className="block lg:hidden">
                  <Tooltip content={tab.label} position="right">{btn}</Tooltip>
                </div>
                {/* Full label (lg+) — no tooltip needed */}
                <div className="hidden lg:block">{btn}</div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Flexible spacer — pushes logout to the bottom */}
      <div className="flex-1" />

      {/* Logout — Phase 1 Button (danger variant) */}
      <div className="shrink-0 p-4 lg:p-5">
        <Button
          variant="danger"
          size="sm"
          onClick={onLogout}
          className="w-full justify-center lg:justify-start"
          leftIcon={<LogOut size={14} className="flex-shrink-0" />}
        >
          <span className="hidden lg:inline">Log Out</span>
        </Button>
      </div>
    </aside>
  );
}
