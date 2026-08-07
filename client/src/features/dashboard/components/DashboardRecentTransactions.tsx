import { Receipt, ArrowUpRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Expense } from '../../../lib/types';

interface DashboardRecentTransactionsProps {
  expenses: Expense[];
  currency: string;
  onViewAll: () => void;
}

export function DashboardRecentTransactions({
  expenses,
  currency,
  onViewAll,
}: DashboardRecentTransactionsProps) {
  const latestThree = expenses.slice(0, 3);

  return (
    <Card accent="violet" className="p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-4 select-none">
          <h2 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
            <Receipt className="text-bb-violet" size={14} />
            Recent Transactions
          </h2>
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-label text-bb-lime hover:text-bb-text-primary transition-colors cursor-pointer outline-none font-mono uppercase tracking-wider"
          >
            View All <ArrowUpRight size={12} />
          </button>
        </div>

        {latestThree.length === 0 ? (
          <EmptyState
            accent="violet"
            title="No transactions logged"
            description="Log your first expense or allowance deposit to see it listed here."
            icon={<Receipt size={32} className="text-bb-violet" />}
          />
        ) : (
          <div className="space-y-2">
            {latestThree.map((exp) => {
              const isIncome = exp.type === 'income';
              return (
                <div
                  key={exp.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1.5 rounded-lg bg-white/[0.04] border border-white/10 select-none">
                      {exp.emoji || '💸'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-bb-text-primary capitalize">
                        {exp.note || exp.category}
                      </p>
                      <span className="text-[10px] font-mono text-bb-text-muted capitalize">
                        {exp.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-mono font-bold ${isIncome ? 'text-bb-lime' : 'text-bb-coral'}`}>
                      {isIncome ? '+' : '-'}{currency}{exp.amount.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] font-mono text-bb-text-muted block">
                      {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
