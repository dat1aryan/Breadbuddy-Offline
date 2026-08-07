import { Calendar } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { financeEngine } from '../../../lib/financeEngine';

interface UpcomingSubscriptionsProps {
  userId: number;
  currency: string;
}

export function UpcomingSubscriptions({ userId, currency }: UpcomingSubscriptionsProps) {
  const transactions = financeEngine.getTransactions(userId);
  
  const subscriptions = transactions.filter(
    (t) => t.category === 'bills' || t.category === 'subs'
  );

  return (
    <Card accent="violet" className="p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-4 select-none">
          <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
            <Calendar className="text-bb-violet" size={14} />
            Subscriptions
          </h3>
          <Badge variant="violet" size="sm">Upcoming</Badge>
        </div>

        {subscriptions.length === 0 ? (
          <EmptyState
            accent="violet"
            title="Nothing recurring yet 🎉"
            description="Any bills or subscription categories you log will show up here."
            icon={<Calendar size={32} className="text-bb-violet" />}
          />
        ) : (
          <div className="space-y-2.5">
            {subscriptions.map((sub) => (
              <div 
                key={sub.id} 
                className="flex justify-between items-center p-3 rounded-bb-sm bg-bb-bg border-2 border-bb-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl select-none">{sub.emoji || '📺'}</span>
                  <div>
                    <p className="text-xs font-bold text-bb-text-primary truncate max-w-[120px]">{sub.title}</p>
                    <span className="text-[10px] font-mono text-bb-text-muted">{sub.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-bb-text-primary">
                    {currency}{sub.amount}
                  </span>
                  <span className="text-[9px] block text-bb-text-muted font-mono">auto-debit</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
