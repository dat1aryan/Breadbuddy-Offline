import { ShieldCheck, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { financeEngine } from '../../../lib/financeEngine';

interface FinancialHealthProps {
  userId: number;
  allowance: number;
}

export function FinancialHealth({ userId, allowance }: FinancialHealthProps) {
  const transactions = financeEngine.getTransactionsForCycle(userId);
  const expenses = transactions.filter((t) => t.type === 'expense');

  if (allowance <= 0) {
    return (
      <Card accent="violet" glassy className="p-5 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">
              Financial Health
            </h3>
            <Badge variant="neutral" size="sm">
              <HelpCircle size={10} /> Setup Needed
            </Badge>
          </div>
          <div className="py-4 text-center">
            <p className="text-xs text-bb-text-secondary leading-relaxed font-sans max-w-[220px] mx-auto">
              Configure your monthly allowance to activate health score tracking.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);
  const spentPercent = allowance > 0 ? (totalSpent / allowance) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - spentPercent)));

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const last7DaysStart = now - 7 * dayMs;
  const prev7DaysStart = now - 14 * dayMs;

  let last7Spent = 0;
  let prev7Spent = 0;

  expenses.forEach((e) => {
    const time = new Date(e.date).getTime();
    if (time >= last7DaysStart) {
      last7Spent += e.amount;
    } else if (time >= prev7DaysStart) {
      prev7Spent += e.amount;
    }
  });

  let trend = 0;
  if (prev7Spent > 0) {
    trend = Math.round(((last7Spent - prev7Spent) / prev7Spent) * 100);
  }

  const isSpendingIncreased = trend > 0;

  let statusText = 'Excellent';
  let badgeVariant: BadgeVariant = 'violet';
  let description = 'Your spending pace is healthy and well within limits.';

  if (transactions.length === 0) {
    statusText = 'Healthy';
    badgeVariant = 'violet';
    description = 'No transactions recorded this month.';
  } else if (score <= 50 && score > 20) {
    statusText = 'Moderate';
    badgeVariant = 'paper';
    description = 'Spend pace is moderate. Watch your budget limits.';
  } else if (score <= 20) {
    statusText = 'Critical';
    badgeVariant = 'coral';
    description = 'Spending pace is high. Actions required to stay within limits.';
  }

  return (
    <Card accent={score > 50 ? 'violet' : score > 20 ? 'paper' : 'coral'} glassy className="p-5 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">
              Financial Health
            </h3>
            <div className="mt-1.5">
              <Badge variant={badgeVariant} size="sm">
                <ShieldCheck size={10} /> {statusText}
              </Badge>
            </div>
          </div>

          {prev7Spent > 0 && (
            <Badge variant={isSpendingIncreased ? 'coral' : 'violet'} size="sm">
              {isSpendingIncreased ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(trend)}% vs last week
            </Badge>
          )}
        </div>

        <ProgressBar
          percentage={score}
          color={score > 50 ? 'lime' : score > 20 ? 'violet' : 'coral'}
          height={12}
          showLabel
          label="Health Score"
          valueLabel={`${score}/100`}
        />

        <p className="text-xs text-bb-text-secondary leading-relaxed font-sans">
          {description}
        </p>
      </div>
    </Card>
  );
}
