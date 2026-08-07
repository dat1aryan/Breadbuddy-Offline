import { useState, useEffect } from 'react';
import { Edit3, Plus, ShieldAlert, Calendar, Heart, MessageSquare } from 'lucide-react';
import { User, Summary } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatBlock } from '../../components/ui/StatBlock';
import { Badge } from '../../components/ui/Badge';
import { TransactionModal } from '../ledger/TransactionModal';
import { financeEngine } from '../../lib/financeEngine';
import { subscriptionEngine, getDaysUntilDue } from '../../lib/subscriptionEngine';
import { preferencesEngine } from '../../lib/preferencesEngine';
import { profileEngine } from '../../lib/profileEngine';
import { settingsEngine } from '../../lib/settingsEngine';
import { formatCurrency } from '../../utils/currencyUtils';
import { isBirthdayToday } from '../../utils/dateUtils';

// Import sub-widgets
import { BudgetRing } from './components/BudgetRing';
import { QuickEditAllowanceModal } from './components/QuickEditAllowanceModal';
import { FinancialHealth } from './components/FinancialHealth';
import { TodaySafeSpend } from './components/TodaySafeSpend';
import { DashboardRecentTransactions } from './components/DashboardRecentTransactions';
import { SavingsSnapshot } from './components/SavingsSnapshot';
import { SubscriptionHubModal } from './components/SubscriptionHubModal';
import { MoneyStory } from './components/MoneyStory';
import { JourneyProgressionBar } from '../../components/ui/JourneyProgressionBar';

interface DashboardOverviewProps {
  user: User;
  summary: Summary | null;
  loading: boolean;
  onRefresh: () => void;
  onUpdateUser: (user: User) => void;
  onNavigateTab?: (tabId: 'dashboard' | 'transactions' | 'aibro' | 'chill' | 'goals') => void;
}

interface AIInsightProps {
  userId: number;
  allowance: number;
}

function AIInsight({ userId, allowance }: AIInsightProps) {
  const transactions = financeEngine.getTransactionsForCycle(userId);
  const expenses = transactions.filter((t) => t.type === 'expense');
  const spent = expenses.reduce((acc, t) => acc + t.amount, 0);
  const pct = allowance > 0 ? Math.round((spent / allowance) * 100) : 0;

  const getInsightText = () => {
    if (allowance <= 0) {
      return "Set your monthly allowance to enable spending pace tracking.";
    }
    if (transactions.length === 0) {
      return "Log your first transaction to begin receiving customized financial companion insights.";
    }
    if (pct <= 25) {
      return `You've used ${pct}% of your monthly allowance. Excellent pacing, your savings are well on track!`;
    }
    if (pct <= 70) {
      return `You've used ${pct}% of your monthly allowance. Pacing is steady and healthy.`;
    }
    return `You've used ${pct}% of your monthly allowance. We recommend slowing down your spending for the rest of the cycle.`;
  };

  return (
    <Card accent="violet" glassy className="p-5 flex flex-col h-full">
      <div className="flex justify-between items-center mb-3 select-none shrink-0">
        <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
          <MessageSquare className="text-bb-lime" size={14} />
          <span>AI Companion Insight</span>
        </h3>
        <Badge variant="violet" size="sm">Active</Badge>
      </div>
      <div className="flex-1 flex items-center justify-center py-2">
        <p className="text-xs text-bb-text-secondary font-semibold leading-relaxed font-sans text-center italic max-w-[90%]">
          {getInsightText()}
        </p>
      </div>
    </Card>
  );
}

export function DashboardOverview({ user, summary, loading: _loading, onRefresh, onUpdateUser, onNavigateTab }: DashboardOverviewProps) {
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isSubHubOpen, setIsSubHubOpen] = useState(false);
  const [settings, setSettings] = useState(() => settingsEngine.getSettings(user.id));

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings(settingsEngine.getSettings(user.id));
    };
    window.addEventListener('breadbuddy-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('breadbuddy-settings-updated', handleSettingsUpdate);
  }, [user.id]);

  const pctSpent = summary && summary.allowance > 0 ? (summary.spent / summary.allowance) * 100 : 0;
  const isOverBudget = summary ? summary.remaining < 0 : false;
  const remainingPocketCash = summary ? summary.remaining : 0;
  const currencySymbol = summary ? summary.currency : '₹';

  const subsTotal = subscriptionEngine.getMonthlyTotal(user.id);
  const activeSubs = subscriptionEngine.getSubscriptions(user.id).filter(s => s.status === 'active');

  const quotes = [
    "Finance is important, bestie.",
    "Small habits build big wealth. Future You is cheering!",
    "Future You says thank you for keeping track today.",
    "Every expense tells a story. Let's make it a bestseller.",
    "Tiny savings today become big dreams tomorrow.",
    "Progress beats perfection. Keep logging, keep growing!",
    "Consistency wins the game. You're building healthy money habits.",
  ];
  const todayQuote = quotes[new Date().getDate() % quotes.length];
  const prefs = preferencesEngine.getPreferences(user.id);
  const nameToHighlight = user.name || 'bestie';
  const companionGreeting = preferencesEngine.getPersonalityGreeting(nameToHighlight, prefs.aiBroPersonality);
  const greetingParts = companionGreeting.title.split(nameToHighlight);

  return (
    <div className="space-y-6">
      {/* 1. Greeting Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none mb-2">
        <div>
          <h1 className="text-xl font-display font-extrabold text-bb-text-primary tracking-tight leading-none">
            {greetingParts.length === 2 ? (
              <>
                {greetingParts[0]}
                <span className="gradient-text">{nameToHighlight}</span>
                {greetingParts[1]}
              </>
            ) : (
              companionGreeting.title
            )}
          </h1>
          <p className="text-xs text-bb-text-secondary mt-1.5 font-semibold">
            {companionGreeting.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => setIsAllowanceModalOpen(true)}
            leftIcon={<Edit3 size={12} />}
          >
            Edit Allowance
          </Button>
          <Button 
            size="sm" 
            variant="primary"
            onClick={() => setIsAddExpenseModalOpen(true)}
            leftIcon={<Plus size={12} />}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Birthday Banner if today is user's birthday */}
      {isBirthdayToday(profileEngine.getProfile(user.id, user).birthday) && (
        <div className="p-4 rounded-bb-sm bg-gradient-to-r from-purple-900/60 via-bb-violet/40 to-pink-900/60 border-2 border-bb-violet flex items-center justify-between shadow-bb-violet">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🎂</span>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                HAPPY BIRTHDAY, <span className="text-bb-lime uppercase">{user.name || 'BESTIE'}</span>! 🎉
              </div>
              <p className="text-xs text-white/80 font-medium">
                BreadBuddy & AI Bro wish you an amazing day full of joy, cake & extra savings! 🎂✨
              </p>
            </div>
          </div>
          <Badge variant="violet" size="sm" className="hidden sm:inline-flex">
            Special Day 🎈
          </Badge>
        </div>
      )}

      {/* 2. Streak & Progression Info */}
      <JourneyProgressionBar userId={user.id} />

      {/* Dynamic Widget Layout */}
      {settings.dashboardLayout.map((widget) => {
        if (!widget.visible) return null;
        switch (widget.id) {
          case 'overview':
            return (
              <div key="overview" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Core Financial Hero (Spans 2 cols) */}
                <div className="lg:col-span-2 flex flex-col justify-between">
                  <Card 
                    accent={isOverBudget ? 'coral' : 'violet'}
                    glassy
                    className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 h-full"
                  >
                    <div className="space-y-6 flex-1 w-full">
                      <StatBlock
                        label="Remaining Pocket Cash"
                        value={summary ? formatCurrency(remainingPocketCash, currencySymbol) : '...'}
                        sub={isOverBudget ? "Over budget limit" : undefined}
                        accent={isOverBudget ? 'coral' : 'violet'}
                        size="xl"
                        valueClassName={isOverBudget ? undefined : 'gradient-text'}
                        icon={isOverBudget ? <ShieldAlert size={20} className="inline text-bb-coral" /> : undefined}
                      />

                      {/* Sub Stats Row */}
                      <div className="grid grid-cols-2 gap-4 border-t-2 border-bb-border pt-4">
                        <StatBlock
                          label="Monthly Allowance"
                          value={summary ? formatCurrency(summary.allowance, currencySymbol) : '...'}
                          size="sm"
                        />
                        <StatBlock
                          label="Total Spent"
                          value={summary ? formatCurrency(summary.spent, currencySymbol) : '...'}
                          size="sm"
                          accent="coral"
                        />
                      </div>
                    </div>

                    {/* Hero Right Budget Ring */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <BudgetRing percentage={pctSpent} size={110} />
                      <span className="text-label text-bb-text-muted mt-3">
                        {isOverBudget ? 'Over budget' : 'Budget Status'}
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Right Column: Safe Spend & Health */}
                <div className="space-y-6 flex flex-col justify-between">
                  <FinancialHealth userId={user.id} allowance={user.monthlyAllowance} />
                  <TodaySafeSpend userId={user.id} allowance={user.monthlyAllowance} remainingCash={remainingPocketCash} currency={currencySymbol} />
                </div>
              </div>
            );
          case 'goals':
            return (
              <div key="goals" className="grid grid-cols-1 gap-6">
                <SavingsSnapshot currency={currencySymbol} onViewGoals={() => onNavigateTab?.('goals')} userId={user.id} />
              </div>
            );

          case 'subscriptions':
            return (
              <div key="subscriptions" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Subscription Summary */}
                <Card accent="lime" className="p-5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-center mb-4 select-none">
                      <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                        <Calendar className="text-bb-lime" size={14} />
                        Subscription Summary
                      </h3>
                      <button
                        onClick={() => setIsSubHubOpen(true)}
                        className="text-label text-bb-violet hover:text-bb-text-primary transition-colors cursor-pointer outline-none font-mono uppercase tracking-wider"
                      >
                        Manage Hub
                      </button>
                    </div>

                    <div className="flex justify-between items-center py-2 select-none">
                      <div>
                        <p className="text-label text-bb-text-muted">Monthly Subscription Spend</p>
                        <p className="text-stat-sm font-mono font-black text-bb-coral mt-1">{formatCurrency(subsTotal, currencySymbol)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-label text-bb-text-muted">Upcoming Renewals</p>
                        <p className="text-stat-sm font-mono font-black text-bb-text-primary mt-1">
                          {(() => {
                            if (activeSubs.length === 0) return 'None';
                            const sorted = [...activeSubs].sort((a, b) => getDaysUntilDue(a) - getDaysUntilDue(b));
                            return sorted[0].name;
                          })()}
                        </p>
                      </div>
                    </div>

                    {activeSubs.length > 0 ? (
                      <div className="mt-3 space-y-2 max-h-[100px] overflow-y-auto pr-1">
                        {(() => {
                          const sorted = [...activeSubs].sort((a, b) => getDaysUntilDue(a) - getDaysUntilDue(b));
                          return sorted.slice(0, 2).map((s) => {
                            const daysLeft = getDaysUntilDue(s);
                            return (
                              <div key={s.id} className="flex justify-between items-center p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs shadow-xs">
                                <span className="flex items-center gap-1.5 font-bold text-bb-text-primary">
                                  <span>{s.emoji}</span>
                                  <span>{s.name}</span>
                                </span>
                                <span className="font-mono text-bb-text-secondary font-bold">
                                  {currencySymbol}{s.amount || s.cost} ({daysLeft === 0 ? 'due today' : `in ${daysLeft}d`})
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className="text-xs text-bb-text-muted mt-3 font-semibold text-center py-2 leading-relaxed">
                        Track your subscriptions so auto-pay never surprises you.
                      </p>
                    )}
                  </div>
                </Card>

                <Card accent="violet" className="p-5 flex flex-col justify-center h-full select-none">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-bb-violet text-bb-violet-fg flex items-center justify-center flex-shrink-0 shadow-md shadow-bb-violet/10">
                      <Heart size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-label text-bb-text-muted">Daily Motivation</p>
                      <h4 className="text-sm font-display font-extrabold text-bb-text-primary leading-snug">
                        "{todayQuote}"
                      </h4>
                    </div>
                  </div>
                </Card>
              </div>
            );
          case 'expenses':
            return (
              <div key="expenses" className="grid grid-cols-1 gap-6">
                <DashboardRecentTransactions
                  expenses={summary?.recent || []}
                  currency={currencySymbol}
                  onViewAll={() => onNavigateTab?.('transactions')}
                />
              </div>
            );
          case 'aibro':
            return (
              <div key="aibro" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2">
                  <MoneyStory userId={user.id} allowance={user.monthlyAllowance} />
                </div>
                <div>
                  <AIInsight userId={user.id} allowance={user.monthlyAllowance} />
                </div>
              </div>
            );
          default:
            return null;
        }
      })}

      {/* Edit Allowance Modal */}
      <QuickEditAllowanceModal
        isOpen={isAllowanceModalOpen}
        onClose={() => setIsAllowanceModalOpen(false)}
        user={user}
        onSuccess={onRefresh}
        onUpdateUser={onUpdateUser}
      />

      {/* Add Expense Modal */}
      <TransactionModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        userId={user.id}
        currency={currencySymbol}
        mode="add"
        onSuccess={onRefresh}
      />

      {/* Subscription Hub management modal */}
      <SubscriptionHubModal
        isOpen={isSubHubOpen}
        onClose={() => setIsSubHubOpen(false)}
        userId={user.id}
        currency={currencySymbol}
        onSuccess={onRefresh}
      />

    </div>
  );
}
