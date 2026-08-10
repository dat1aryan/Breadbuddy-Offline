import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { User, Summary } from '../lib/types';
import { clearAuth } from '../lib/auth';
import { AppLayout } from '../layouts/AppLayout';
import { Card } from './ui/Card';
import { DashboardOverview } from '../features/dashboard/DashboardOverview';
import { ExpenseList } from '../features/transaction/ExpenseList';
import { AIBro } from '../features/chat/AIBro';
import { ChillZone } from '../features/chill/ChillZone';
import { GoalsZone } from '../features/goals/GoalsZone';
import { UserProfile } from '../features/profile/UserProfile';
import { Settings } from '../features/settings/Settings';
import { DailyWelcomeModal } from '../features/dashboard/components/DailyWelcomeModal';
import { financeEngine } from '../lib/financeEngine';

interface DashboardProps {
  user: User;
  onDailyBreadShown: () => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

type TabType = 'dashboard' | 'transactions' | 'aibro' | 'chill' | 'goals' | 'profile' | 'settings';

export function Dashboard({ user, onDailyBreadShown, onLogout, onUpdateUser }: DashboardProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab navigation derived directly from URL search param to prevent state synchronization race conditions
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['dashboard', 'transactions', 'aibro', 'chill', 'goals', 'profile', 'settings'];
  const activeTab: TabType = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'dashboard';

  const handleTabChange = (tabId: TabType) => {
    if (tabId === 'dashboard') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tab');
      setSearchParams(newParams, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  };

  const fetchSummary = async () => {
    try {
      const data = financeEngine.getSummary(user.id, user.monthlyAllowance, user.currency);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [refreshKey, user.monthlyAllowance, user.name]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchSummary();
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('finance-updated', handleUpdate);
    return () => {
      window.removeEventListener('finance-updated', handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    onLogout();
  };

  return (
    <AppLayout
      user={user}
      activeTab={activeTab}
      onChangeTab={handleTabChange}
      onLogout={handleLogout}
    >
      {/* Workspace panel selection */}
      {activeTab === 'dashboard' && (
        <DashboardOverview
          user={user}
          summary={summary}
          loading={loading}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          onUpdateUser={onUpdateUser}
          onNavigateTab={handleTabChange}
        />
      )}

      {activeTab === 'transactions' && (
        <Card glassy className="p-6 border-white/10 space-y-4">
          <div className="border-b border-white/5 pb-4 select-none flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bb-lime/10 border border-bb-lime/20 flex items-center justify-center text-bb-lime shadow-sm shadow-bb-lime/10 flex-shrink-0">
              <Receipt size={18} />
            </div>
            <h2 className="text-xl md:text-2xl font-display font-black tracking-tight text-bb-text-primary uppercase">
              Transactions
            </h2>
          </div>
          <ExpenseList refreshKey={refreshKey} user={user} onRefresh={() => setRefreshKey((k) => k + 1)} />
        </Card>
      )}

      {activeTab === 'aibro' && (
        <AIBro user={user} />
      )}

      {activeTab === 'chill' && (
        <ChillZone />
      )}

      {activeTab === 'goals' && (
        <GoalsZone user={user} />
      )}

      {activeTab === 'profile' && (
        <UserProfile user={user} onUpdateUser={onUpdateUser} />
      )}

      {activeTab === 'settings' && (
        <Settings user={user} onUpdateUser={onUpdateUser} />
      )}

      {/* 🍞 Daily Bread Experience Modal */}
      <DailyWelcomeModal
        userId={user.id}
        currency={user.currency || '₹'}
        remainingCash={summary ? summary.remaining : 0}
        onDailyBreadShown={onDailyBreadShown}
      />
    </AppLayout>
  );
}
