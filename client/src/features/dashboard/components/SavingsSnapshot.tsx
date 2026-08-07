import { useState, useEffect } from 'react';
import { Target, ArrowUpRight, Plus, PiggyBank } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../hooks/useToast';
import { Goal, savingsEngine } from '../../../lib/savingsEngine';
import { getUser } from '../../../lib/auth';
import { financeEngine } from '../../../lib/financeEngine';

interface SavingsSnapshotProps {
  currency: string;
  onViewGoals: () => void;
  userId: number;
}

export function SavingsSnapshot({ currency, onViewGoals, userId }: SavingsSnapshotProps) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchPrimaryGoal = () => {
    const goals = savingsEngine.getGoals(userId).filter((g) => !g.archived);
    if (goals.length > 0) {
      const sorted = [...goals].sort((a, b) => {
        const aPercent = a.current_amount / a.target_amount;
        const bPercent = b.current_amount / b.target_amount;
        if (aPercent !== bPercent) return aPercent - bPercent;
        
        const aDate = a.target_date ? new Date(a.target_date).getTime() : Infinity;
        const bDate = b.target_date ? new Date(b.target_date).getTime() : Infinity;
        return aDate - bDate;
      });
      setGoal(sorted[0]);
    } else {
      setGoal(null);
    }
  };

  useEffect(() => {
    fetchPrimaryGoal();
  }, [userId]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchPrimaryGoal();
    };
    window.addEventListener('finance-updated', handleUpdate);
    return () => {
      window.removeEventListener('finance-updated', handleUpdate);
    };
  }, [userId]);

  const fundGoalAndSync = (fundVal: number) => {
    if (!goal) return;

    if (isNaN(fundVal) || fundVal <= 0) {
      toast.error('Please enter a valid deposit amount.');
      return;
    }

    const user = getUser();
    if (!user) return;

    const summary = financeEngine.getSummary(userId, user.monthlyAllowance, user.currency || '₹');
    const availableBalance = summary.remaining;

    if (fundVal > availableBalance) {
      toast.error(`Not enough bread! You only have ${user.currency || '₹'}${availableBalance.toLocaleString('en-IN')} left in your allowance. 💀`);
      return;
    }

    try {
      const updated = savingsEngine.fundGoal(userId, goal.id, fundVal);
      if (updated) {
        const isCompletedNow = updated.current_amount >= updated.target_amount;

        if (isCompletedNow) {
          toast.success(`Goal 100% completed! ${user.currency || '₹'}${fundVal.toLocaleString('en-IN')} deposited. 🏆`);
          fetchPrimaryGoal();
        } else {
          setGoal(updated);
          toast.success(`Deposited ${user.currency || '₹'}${fundVal.toLocaleString('en-IN')}! 🪙`);
        }
      }
    } catch (err) {
      toast.error('Failed to update savings goal.');
    }
  };

  const handleFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !amount) return;
    setLoading(true);
    fundGoalAndSync(Number(amount));
    setAmount('');
    setLoading(false);
  };

  const safeTarget = Math.max(goal?.target_amount || 1, 1);
  const progress = goal ? (goal.current_amount / safeTarget) * 100 : 0;

  return (
    <Card accent="violet" glassy className="p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-4 select-none">
          <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
            <Target className="text-bb-violet" size={14} />
            Saving Snapshot
          </h3>
          <button
            onClick={onViewGoals}
            className="flex items-center gap-1 text-label text-bb-violet hover:text-bb-text-primary transition-colors cursor-pointer outline-none"
          >
            Saving Goals <ArrowUpRight size={12} />
          </button>
        </div>

        {!goal ? (
          <EmptyState
            accent="violet"
            title="No active saving goals"
            description="Create a saving goal to start tracking progress."
            icon={<PiggyBank size={32} className="text-bb-violet" />}
            action={
              <Button size="sm" variant="primary" onClick={onViewGoals}>
                <Plus size={14} /> Create Goal
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-bb-text-primary">
              <span className="flex items-center gap-2">
                <span>{goal.emoji}</span>
                <span className="truncate max-w-[140px]">{goal.title}</span>
              </span>
              <span className="font-mono text-xs text-bb-text-secondary">
                {currency}{goal.current_amount.toLocaleString('en-IN')} / {currency}{goal.target_amount.toLocaleString('en-IN')}
              </span>
            </div>

            <ProgressBar
              percentage={progress}
              color="violet"
              height={14}
              showLabel
              label="Goal Completion"
              valueLabel={`${progress.toFixed(0)}%`}
            />

            {/* Quick deposit form */}
            <form onSubmit={handleFund} className="flex gap-2 pt-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button type="submit" size="sm" variant="primary" loading={loading}>
                Deposit
              </Button>
            </form>
          </div>
        )}
      </div>
    </Card>
  );
}
