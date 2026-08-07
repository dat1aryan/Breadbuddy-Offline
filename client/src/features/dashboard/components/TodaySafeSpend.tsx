import { ShieldCheck, HelpCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { StatBlock } from '../../../components/ui/StatBlock';

interface TodaySafeSpendProps {
  userId: number;
  allowance: number;
  remainingCash: number;
  currency: string;
}

export function TodaySafeSpend({ allowance, remainingCash, currency }: TodaySafeSpendProps) {
  if (allowance <= 0) {
    return (
      <Card accent="lime" glassy className="p-5 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">
              Today's Safe Spend
            </h3>
            <Badge variant="neutral" size="sm">
              <HelpCircle size={10} /> Setup Required
            </Badge>
          </div>

          <div className="py-2 text-center">
            <p className="text-xs text-bb-text-secondary leading-relaxed font-sans max-w-[240px] mx-auto">
              Please configure your monthly allowance to calculate safe daily spending.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(lastDay - today.getDate() + 1, 1);
  
  const rawSafeSpend = remainingCash > 0 ? remainingCash / remainingDays : 0;
  const safeSpendAmount = Math.max(Math.floor(rawSafeSpend), 0);

  return (
    <Card accent="lime" glassy className="p-5 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">
            Today's Safe Spend
          </h3>
          <Badge variant="violet" size="sm">
            <ShieldCheck size={10} /> Safe Zone
          </Badge>
        </div>

        <StatBlock
          label="Recommended Daily Budget"
          value={`${currency}${safeSpendAmount.toLocaleString('en-IN')}`}
          sub={`${remainingDays} days remaining in current cycle.`}
          accent="lime"
          size="md"
        />
      </div>
    </Card>
  );
}
