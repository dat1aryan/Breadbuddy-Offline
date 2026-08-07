import { BookOpen } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { financeEngine, DEFAULT_CATEGORIES } from '../../../lib/financeEngine';
import { savingsEngine } from '../../../lib/savingsEngine';

interface MoneyStoryProps {
  userId: number;
  allowance: number;
}

export function MoneyStory({ userId, allowance }: MoneyStoryProps) {
  const goals = savingsEngine.getGoals(userId).filter((g) => !g.archived);
  const transactions = financeEngine.getTransactionsForCycle(userId);
  const expenses = transactions.filter((t) => t.type === 'expense');
  const incomes = transactions.filter((t) => t.type === 'income');

  if (transactions.length === 0) {
    return (
      <Card accent="violet" glassy className="p-5 flex flex-col justify-between h-full">
        <div>
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
              <BookOpen className="text-bb-lime" size={14} />
              Money Story
            </h3>
            <span className="text-label text-bb-violet font-mono uppercase tracking-wider font-bold">Summary</span>
          </div>
          <EmptyState
            accent="violet"
            title="No story yet bestie"
            description="Your Money Story will begin after you log a few transactions."
            icon={<BookOpen size={32} className="text-bb-lime" />}
          />
        </div>
      </Card>
    );
  }

  const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
  const totalBudget = allowance + totalIncome;
  const spentPercent = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : '0';

  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  let topCategory = '';
  let topAmount = 0;
  Object.entries(categoryTotals).forEach(([cat, amt]) => {
    if (amt > topAmount) {
      topAmount = amt;
      topCategory = cat;
    }
  });

  const catInfo = DEFAULT_CATEGORIES.find((c) => c.value === topCategory);
  const catLabel = catInfo ? catInfo.label : topCategory;
  const catEmoji = catInfo ? catInfo.emoji : '✨';
  const topCatPercent = totalSpent > 0 ? ((topAmount / totalSpent) * 100).toFixed(0) : '0';

  const storyPoints = [
    {
      text: `You have spent ${spentPercent}% of your monthly allowance so far. Keep an eye on it!`,
      emoji: '🪙'
    },
    {
      text: `${catLabel} is your top splurge category, taking up ${topCatPercent}% of your total spending.`,
      emoji: catEmoji
    }
  ];

  if (goals.length > 0) {
    const goal = goals[0];
    const safeTarget = Math.max(goal.target_amount || 1, 1);
    const progress = Math.min((goal.current_amount / safeTarget) * 100, 100);
    storyPoints.push({
      text: `Nice job setting aside money for ${goal.title}! You are ${progress.toFixed(0)}% of the way to your target.`,
      emoji: '🎯'
    });
  }

  return (
    <Card accent="violet" glassy className="p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-4 select-none">
          <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
            <BookOpen className="text-bb-lime" size={14} />
            Money Story
          </h3>
          <span className="text-label text-bb-violet font-mono uppercase tracking-wider font-bold">Summary</span>
        </div>

        <div className="space-y-3">
          {storyPoints.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-bb-sm bg-bb-bg border-2 border-bb-border">
              <span className="text-xl select-none flex-shrink-0">{pt.emoji}</span>
              <p className="text-xs text-bb-text-secondary leading-relaxed font-sans">
                {pt.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
