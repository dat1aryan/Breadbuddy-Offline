import React, { useState, useEffect } from 'react';
import { Target, Trash2, PiggyBank, Calendar, PlusCircle, Award, Archive, RotateCcw, Edit2, Check } from 'lucide-react';
import { User } from '../../lib/types';
import { Goal, savingsEngine } from '../../lib/savingsEngine';
import { financeEngine } from '../../lib/financeEngine';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../hooks/useToast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { formatCurrency } from '../../utils/currencyUtils';

interface GoalsZoneProps {
  user: User;
}

export function GoalsZone({ user }: GoalsZoneProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  
  // Creation state
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
 
  const [customFundAmounts, setCustomFundAmounts] = useState<Record<number, string>>({});
  const toast = useToast();
  const userId = user.id;

  const fetchGoals = () => {
    const list = savingsEngine.getGoals(userId);
    setGoals(list);
  };

  useEffect(() => {
    fetchGoals();
  }, [userId]);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    try {
      const newGoal = savingsEngine.createGoal(
        userId,
        title,
        emoji,
        Number(targetAmount),
        targetDate || null
      );
      setGoals((prev) => [...prev, newGoal]);
      setTitle('');
      setEmoji('🎯');
      setTargetAmount('');
      setTargetDate('');
      toast.success('Goal created.');
    } catch (err) {
      toast.error('Failed to create goal');
    }
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDeleteGoalConfirm = () => {
    if (deleteTargetId === null) return;
    try {
      savingsEngine.deleteGoal(userId, deleteTargetId);
      setGoals((prev) => prev.filter((g) => g.id !== deleteTargetId));
      toast.success('Goal deleted');
    } catch (err) {
      toast.error('Failed to delete goal');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleArchiveGoal = (id: number) => {
    try {
      savingsEngine.archiveGoal(userId, id);
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, archived: true } : g)));
      toast.success('Goal archived.');
    } catch (err) {
      toast.error('Failed to archive goal');
    }
  };

  const handleUnarchiveGoal = (id: number) => {
    try {
      savingsEngine.unarchiveGoal(userId, id);
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, archived: false } : g)));
      toast.success('Goal restored!');
    } catch (err) {
      toast.error('Failed to restore goal');
    }
  };

  const startEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditEmoji(goal.emoji);
    setEditTargetAmount(String(goal.target_amount));
    setEditTargetDate(goal.target_date || '');
  };

  const saveEdit = (id: number) => {
    if (!editTitle || !editTargetAmount) return;
    try {
      const updated = savingsEngine.updateGoal(userId, id, {
        title: editTitle,
        emoji: editEmoji,
        target_amount: Number(editTargetAmount),
        target_date: editTargetDate || null
      });
      if (updated) {
        setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
        setEditingId(null);
        toast.success('Goal updated.');
      }
    } catch {
      toast.error('Failed to update goal');
    }
  };

  const handleFundGoal = (id: number, amount: number) => {
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid deposit amount.');
      return;
    }

    const summary = financeEngine.getSummary(userId, user.monthlyAllowance, user.currency || '₹');
    const availableBalance = summary.remaining;

    if (amount > availableBalance) {
      toast.error(`Insufficient budget balance. Available: ${formatCurrency(availableBalance, user.currency || '₹', false)}`);
      return;
    }

    try {
      const goalBefore = goals.find((g) => g.id === id);
      if (!goalBefore) return;

      const updated = savingsEngine.fundGoal(userId, id, amount);
      if (updated) {
        const isCompletedNow = updated.current_amount >= updated.target_amount;

        if (isCompletedNow) {
          toast.success(`Goal completed! ${formatCurrency(amount, user.currency || '₹', false)} deposited.`);
        } else {
          toast.success(`Deposited ${formatCurrency(amount, user.currency || '₹', false)}.`);
        }
        setGoals(savingsEngine.getGoals(userId));
        setCustomFundAmounts((prev) => ({ ...prev, [id]: '' }));
      }
    } catch (err) {
      toast.error('Failed to fund goal');
    }
  };

  const filteredGoals = goals.filter((g) => 
    viewMode === 'active' ? !g.archived : g.archived
  );

  const emojiOptions = ['🎯', '🎮', '✈️', '📱', '💻', '🚗', '🏠', '🎁', '🎓', '👟', '🍕', '✨'];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-black text-bb-text-primary flex items-center gap-2 tracking-tight">
            <Target className="text-bb-violet" size={20} />
            Saving Goals
          </h2>
          <p className="text-xs text-bb-text-secondary">Track and fund your long-term saving goals.</p>
        </div>

        {/* 6. View mode toggle using Phase 0 tokens */}
        <div className="flex bg-bb-surface border-2 border-bb-border p-1 rounded-bb-sm gap-1">
          <button
            onClick={() => setViewMode('active')}
            className={`px-3 py-1.5 rounded-bb-xs text-xs font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
              viewMode === 'active' 
                ? 'bg-bb-violet text-bb-violet-fg border-black shadow-[2px_2px_0px_#000]' 
                : 'bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary'
            }`}
          >
            Active Goals
          </button>
          <button
            onClick={() => setViewMode('archived')}
            className={`px-3 py-1.5 rounded-bb-xs text-xs font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
              viewMode === 'archived' 
                ? 'bg-bb-lime text-bb-lime-fg border-black shadow-[2px_2px_0px_#000]' 
                : 'bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary'
            }`}
          >
            Archived Goals
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Column */}
        {viewMode === 'active' && (
          <div className="lg:col-span-1">
            {/* 1. Create-goal form container */}
            <Card accent="violet" glassy className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                <PlusCircle size={14} className="text-bb-violet" />
                Manifest New Goal
              </h3>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                 <Input
                   label="Goal Title"
                   type="text"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   required
                 />

                {/* 2. Emoji Selector Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-bb-text-muted font-mono">
                    Select Icon
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-2.5 rounded-bb-sm bg-bb-bg border-2 border-bb-border">
                    {emojiOptions.map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => setEmoji(emo)}
                        className={`text-xl sm:text-2xl p-2.5 rounded-bb-xs border-2 transition-all flex items-center justify-center cursor-pointer ${
                          emoji === emo
                            ? 'border-black bg-bb-violet text-white shadow-[2px_2px_0px_0px_#000] scale-105'
                            : 'border-bb-border bg-bb-surface hover:border-bb-violet'
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>

                 <Input
                   label={`Target Amount (${user.currency || '₹'})`}
                   type="number"
                   value={targetAmount}
                   onChange={(e) => setTargetAmount(e.target.value)}
                   required
                   min={1}
                 />

                {/* 3. Create-goal target-date input */}
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-label text-bb-text-muted">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary placeholder-bb-text-muted outline-none rounded-bb-sm cursor-pointer"
                  />
                </div>

                {/* 4. Create-goal submit button */}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                >
                  Add Goal
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Goals Listing Column */}
        <div className={viewMode === 'active' ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {filteredGoals.length === 0 ? (
            /* 13. EmptyState implementation */
            <EmptyState
              accent={viewMode === 'active' ? 'violet' : 'neutral'}
              title={viewMode === 'active' ? "What's your next dream purchase?" : "No archived goals"}
              description={viewMode === 'active' ? "Small goals become big achievements. Manifest your savings era!" : "Goals you achieve and archive will show up here."}
              icon={<PiggyBank size={32} className={viewMode === 'active' ? 'text-bb-violet' : 'text-bb-lime'} />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGoals.map((goal) => {
                const safeTarget = Math.max(goal.target_amount || 1, 1);
                const percent = Math.min(
                  Math.round((goal.current_amount / safeTarget) * 100),
                  100
                );
                const isAchieved = goal.current_amount >= goal.target_amount;
                const isEditing = editingId === goal.id;

                return (
                  /* 5. Achieved/completed card accent lime */
                  <Card
                    key={goal.id}
                    accent={isAchieved ? 'lime' : 'none'}
                    glassy
                    className="p-5 flex flex-col justify-between transition-all duration-300 overflow-hidden relative"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 border-b-2 border-bb-border pb-2.5">
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="space-y-2 py-1">
                              {/* 10. Inline-editing inputs */}
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={editEmoji}
                                  onChange={(e) => setEditEmoji(e.target.value)}
                                  className="w-8 p-1.5 bg-bb-surface border-2 border-bb-border text-center text-xs text-bb-text-primary rounded-bb-sm outline-none"
                                />
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="flex-1 p-1.5 bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary rounded-bb-sm outline-none"
                                />
                              </div>
                            </div>
                          ) : (
                            <h4 className="font-black text-bb-text-primary text-base sm:text-lg capitalize flex items-center gap-2.5 select-none">
                              <span className="text-xl">{goal.emoji}</span>
                              <span className="truncate">{goal.title}</span>
                              {isAchieved && (
                                /* 11. Met tag uses Badge as-is */
                                <Badge variant="lime" className="flex items-center gap-1.5 text-xs px-2 py-0.5 font-black">
                                  <Award size={12} />
                                  MET
                                </Badge>
                              )}
                            </h4>
                          )}
                          
                          {isEditing ? (
                            /* 10. Inline-editing inputs */
                            <div className="flex gap-2 items-center mt-2">
                              <input
                                type="number"
                                value={editTargetAmount}
                                onChange={(e) => setEditTargetAmount(e.target.value)}
                                className="w-28 p-2 bg-bb-surface border-2 border-bb-border text-sm text-bb-text-primary font-mono rounded-bb-sm outline-none"
                              />
                              <input
                                type="date"
                                value={editTargetDate}
                                onChange={(e) => setEditTargetDate(e.target.value)}
                                className="flex-1 p-2 bg-bb-surface border-2 border-bb-border text-sm text-bb-text-primary rounded-bb-sm outline-none cursor-pointer"
                              />
                            </div>
                          ) : (
                            goal.target_date && (
                              <p className="text-xs text-bb-text-muted flex items-center gap-1 mt-1 font-mono">
                                <Calendar size={12} />
                                Target: {new Date(goal.target_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            )
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {isEditing ? (
                            <button
                              onClick={() => saveEdit(goal.id)}
                              className="p-2 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-bb-lime hover:bg-bb-bg transition-colors cursor-pointer"
                            >
                              <Check size={14} />
                            </button>
                          ) : (
                            <>
                              {!goal.archived && (
                                <button
                                  onClick={() => startEdit(goal)}
                                  className="p-2 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-bb-text-muted hover:text-bb-text-primary hover:bg-bb-bg transition-colors cursor-pointer"
                                  title="Edit Goal"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              {isAchieved && !goal.archived && (
                                <button
                                  onClick={() => handleArchiveGoal(goal.id)}
                                  className="p-2 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-bb-violet hover:bg-bb-bg transition-colors cursor-pointer"
                                  title="Archive Goal"
                                >
                                  <Archive size={14} />
                                </button>
                              )}
                              {goal.archived && (
                                <button
                                  onClick={() => handleUnarchiveGoal(goal.id)}
                                  className="p-2 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-bb-violet hover:bg-bb-bg transition-colors cursor-pointer"
                                  title="Restore Goal"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setDeleteTargetId(goal.id);
                                  setIsDeleteConfirmOpen(true);
                                }}
                                className="p-2 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-bb-coral hover:bg-bb-bg transition-colors cursor-pointer"
                                title="Delete Goal"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="mt-4 flex items-baseline justify-between select-none">
                        <span className="text-xs text-bb-text-muted font-mono font-medium">
                          {formatCurrency(goal.current_amount, user.currency || '₹', false)} saved
                        </span>
                        <span className="text-sm font-mono font-black text-bb-text-primary">
                          Target: {formatCurrency(goal.target_amount, user.currency || '₹', false)}
                        </span>
                      </div>

                      {/* 12. Progress Bar */}
                      <ProgressBar
                        percentage={percent}
                        color={isAchieved ? 'lime' : 'violet'}
                        height={14}
                        showLabel={false}
                        className="mt-3"
                      />
                      <div className="flex justify-between items-center mt-1.5 select-none">
                        <span className="text-[10px] text-bb-text-muted font-mono font-bold uppercase">progress</span>
                        <span className="text-xs font-mono font-black text-bb-text-primary">{percent}%</span>
                      </div>
                    </div>

                    {/* Funding Actions */}
                    {!isAchieved && !goal.archived && (
                      <div className="mt-5 pt-4 border-t-2 border-bb-border space-y-3">
                        {/* 8. Quick Fund Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          {[100, 500, 1000].map((amt) => (
                            <Button
                              key={amt}
                              variant="secondary"
                              size="sm"
                              onClick={() => handleFundGoal(goal.id, amt)}
                              className="w-full text-xs font-black py-2 border-2 border-black shadow-[2px_2px_0px_0px_#000] whitespace-nowrap overflow-hidden text-ellipsis leading-none flex items-center justify-center"
                            >
                              +{user.currency || '₹'}{amt}
                            </Button>
                          ))}
                        </div>

                        {/* 9. Custom deposit input */}
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="number"
                            value={customFundAmounts[goal.id] || ''}
                            onChange={(e) =>
                              setCustomFundAmounts((prev) => ({
                                  ...prev,
                                  [goal.id]: e.target.value,
                                }))
                            }
                            placeholder="Enter amount..."
                            className="flex-1 min-w-0 px-3 py-2 bg-bb-surface border-2 border-bb-border text-xs font-mono text-bb-text-primary placeholder-bb-text-muted outline-none rounded-bb-sm focus:border-bb-violet h-10"
                            min={1}
                          />
                          <Button
                            onClick={() =>
                              handleFundGoal(goal.id, Number(customFundAmounts[goal.id]))
                            }
                            variant="primary"
                            size="sm"
                            className="px-4 h-10 text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] shrink-0"
                          >
                            Fund
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteGoalConfirm}
        title="Delete Goal"
        message="Are you sure you want to bin this goal? Any progress saved towards it will be returned to your general savings."
        confirmText="Yes, bin it"
        cancelText="Cancel"
      />
    </div>
  );
}
