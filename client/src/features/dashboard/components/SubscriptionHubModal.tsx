import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Pause, Calendar } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { StatBlock } from '../../../components/ui/StatBlock';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../hooks/useToast';
import { Subscription, subscriptionEngine, getDaysUntilDue } from '../../../lib/subscriptionEngine';
import { progressionEngine } from '../../../engines/progressionEngine';

interface SubscriptionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currency: string;
  onSuccess: () => void;
}

export function SubscriptionHubModal({ isOpen, onClose, userId, currency, onSuccess }: SubscriptionHubModalProps) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [adding, setAdding] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [emoji, setEmoji] = useState('📺');

  // Recurrence Fields
  const [frequency, setFrequency] = useState<Subscription['frequency']>('monthly');
  const [interval, setIntervalVal] = useState('1');
  const [intervalType, setIntervalType] = useState<'days' | 'months'>('months');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setSubs(subscriptionEngine.getSubscriptions(userId));
    }
  }, [isOpen, userId]);

  const triggerEngagement = () => {
    try {
      progressionEngine.processEvent({
        userId,
        type: 'create_goal', // keep existing type mapping
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to reward subscription progress:', err);
    }
  };

  const calculateFirstNextDueDate = (freq: string, val: number, unit: 'days' | 'months'): string => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    switch (freq) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'every_2_weeks':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'every_2_months':
        date.setMonth(date.getMonth() + 2);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'every_6_months':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'custom':
        if (unit === 'days') {
          date.setDate(date.getDate() + val);
        } else {
          date.setMonth(date.getMonth() + val);
        }
        break;
      default:
        date.setMonth(date.getMonth() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost) return;

    try {
      const computedNextDueDate = calculateFirstNextDueDate(
        frequency,
        frequency === 'custom' ? Number(interval) : 1,
        frequency === 'custom' ? intervalType : 'months'
      );

      const newSub = subscriptionEngine.createSubscription(userId, {
        name,
        cost: Number(cost),
        amount: Number(cost),
        billingDate: new Date(computedNextDueDate + 'T00:00:00').getDate(),
        category,
        emoji,
        status: 'active',
        frequency,
        interval: frequency === 'custom' ? Number(interval) : undefined,
        intervalType: frequency === 'custom' ? intervalType : undefined,
        nextDueDate: computedNextDueDate,
        reminderEnabled,
      });
      setSubs((prev) => [...prev, newSub]);
      setName('');
      setCost('');
      setCategory('Entertainment');
      setEmoji('📺');
      setFrequency('monthly');
      setIntervalVal('1');
      setIntervalType('months');
      setReminderEnabled(false);
      setAdding(false);
      toast.success(`Tracked subscription: ${name}! 📺`);
      triggerEngagement();
      onSuccess();
    } catch {
      toast.error('Failed to add subscription');
    }
  };

  const handleToggleStatus = (id: number, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
      const updated = subscriptionEngine.updateSubscription(userId, id, { status: nextStatus });
      if (updated) {
        setSubs((prev) => prev.map((s) => (s.id === id ? updated : s)));
        toast.success(`Subscription ${nextStatus === 'active' ? 'activated' : 'paused'}!`);
        onSuccess();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = (id: number) => {
    try {
      subscriptionEngine.deleteSubscription(userId, id);
      setSubs((prev) => prev.filter((s) => s.id !== id));
      toast.success('Subscription deleted');
      onSuccess();
    } catch {
      toast.error('Failed to delete subscription');
    }
  };

  const categories = ['Entertainment', 'Music', 'Utilities', 'Software', 'Gym', 'Other'];
  const emojis = ['🍿', '🎵', '📺', '💻', '🏋️', '⚡', '📦', '✨'];

  const monthlyTotal = subscriptionEngine.getMonthlyTotal(userId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Subscription Hub">
      <div className="space-y-5 py-1">
        {/* 2. Monthly Summary Box - migrated to StatBlock */}
        <div className="p-4 rounded-bb-sm bg-bb-surface border-2 border-bb-border flex justify-between items-center select-none">
          <StatBlock
            label="Monthly Recurring Cost"
            value={`${currency}${monthlyTotal.toLocaleString('en-IN')}`}
            accent="violet"
            size="md"
          />
          {/* 1. Header/empty-state trigger button */}
          <Button size="sm" variant="primary" onClick={() => setAdding(!adding)} leftIcon={<Plus size={14} />}>
            Add Sub
          </Button>
        </div>



        {/* Add Form Panel Expansion */}
        {adding && (
          <form onSubmit={handleAdd} className="animate-bb-slide-up">
            {/* 3. Add Form Panel container */}
            <Card accent="violet" className="p-4 space-y-4">
              <div className="flex justify-between items-center border-b-2 border-bb-border pb-2">
                <h4 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">Track New Subscription</h4>
                <button type="button" onClick={() => setAdding(false)} className="text-[10px] text-bb-text-muted hover:text-bb-text-primary font-bold font-mono cursor-pointer">Cancel</button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Subscription Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Amount"
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                  min={1}
                />
              </div>

              {/* 4. Recurrence and Category select dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-bb-text-muted">Recurrence Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
                  >
                    <option value="weekly" className="bg-bb-surface">Weekly</option>
                    <option value="every_2_weeks" className="bg-bb-surface">Every 2 Weeks</option>
                    <option value="monthly" className="bg-bb-surface">Monthly</option>
                    <option value="every_2_months" className="bg-bb-surface">Every 2 Months</option>
                    <option value="quarterly" className="bg-bb-surface">Quarterly (3 Months)</option>
                    <option value="every_6_months" className="bg-bb-surface">Every 6 Months</option>
                    <option value="yearly" className="bg-bb-surface">Yearly</option>
                    <option value="custom" className="bg-bb-surface">Custom Interval</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-bb-text-muted">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-bb-surface">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Custom interval panel */}
              {frequency === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Repeat Every (Interval)"
                    type="number"
                    value={interval}
                    onChange={(e) => setIntervalVal(e.target.value)}
                    required
                    min={1}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-bb-text-muted">Interval Scale</label>
                    <select
                      value={intervalType}
                      onChange={(e) => setIntervalType(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
                    >
                      <option value="days" className="bg-bb-surface">Days</option>
                      <option value="months" className="bg-bb-surface">Months</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="reminderEnabled"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded-bb-xs border-2 border-bb-border bg-bb-surface text-bb-violet focus:ring-bb-violet cursor-pointer"
                />
                <label htmlFor="reminderEnabled" className="text-label text-bb-text-muted cursor-pointer select-none">
                  Enable Reminders
                </label>
              </div>

              {/* 7. Icon Picker badge chips */}
              <div className="space-y-1.5">
                <label className="text-label text-bb-text-muted font-bold font-mono uppercase tracking-wider">
                  Choose Icon
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 p-3 bg-bb-surface border-2 border-bb-border rounded-bb-sm">
                  {emojis.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setEmoji(emo)}
                      className={`h-11 w-full text-xl sm:text-2xl flex items-center justify-center rounded-bb-sm border-2 transition-all cursor-pointer select-none ${
                        emoji === emo
                          ? 'border-black bg-bb-violet text-bb-violet-fg shadow-[2px_2px_0px_0px_#000]'
                          : 'border-bb-border bg-bb-bg hover:border-bb-violet text-bb-text-primary'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full mt-2">
                Save Subscription
              </Button>
            </Card>
          </form>
        )}

        {/* Subscription list */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {subs.length === 0 ? (
            /* 11. Empty state component primitive */
            <EmptyState
              accent="neutral"
              title="Nothing recurring yet"
              description="Track your subscriptions so auto-pay never surprises you."
              icon={<Calendar size={32} className="text-bb-violet" />}
              action={
                <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
                  Add Your First Subscription
                </Button>
              }
            />
          ) : (
            subs.map((sub) => {
              const isActive = sub.status === 'active';
              const daysLeft = getDaysUntilDue(sub);
              return (
                /* 8. Subscription List Cards */
                <Card 
                  key={sub.id} 
                  accent={isActive ? 'violet' : 'none'}
                  className={`p-3 flex justify-between items-center transition-all ${
                    isActive ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1 rounded-bb-xs bg-bb-bg border border-bb-border select-none">{sub.emoji || '📺'}</span>
                    <div>
                      <h4 className="text-xs font-bold text-bb-text-primary flex items-center gap-2 capitalize">
                        {sub.name}
                        {/* 9. Paused status tag Badge variant neutral */}
                        {!isActive && <Badge variant="neutral" size="sm">paused</Badge>}
                      </h4>
                      <p className="text-[10px] text-bb-text-secondary font-mono flex flex-wrap items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        Due: {sub.nextDueDate} ({daysLeft} day{daysLeft === 1 ? '' : 's'} left) • <span className="capitalize">{sub.frequency === 'custom' ? `Every ${sub.interval} ${sub.intervalType}` : sub.frequency.replace(/_/g, ' ')}</span> • {sub.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right mr-1">
                      <p className="text-xs font-bold font-mono text-bb-text-primary">{currency}{sub.amount || sub.cost}</p>
                      <p className="text-[9px] text-bb-text-muted font-mono capitalize">
                        {sub.frequency === 'custom' ? `Every ${sub.interval} ${sub.intervalType}` : sub.frequency.replace(/_/g, ' ')}
                      </p>
                    </div>

                    {/* 10. Action buttons pause/resume (secondary) and delete (danger) */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleToggleStatus(sub.id, sub.status)}
                      title={isActive ? "Pause Subscription" : "Resume Subscription"}
                      className="p-1.5 min-w-0"
                    >
                      {isActive ? <Pause size={12} /> : <Play size={12} />}
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(sub.id)}
                      title="Delete Subscription"
                      className="p-1.5 min-w-0"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
