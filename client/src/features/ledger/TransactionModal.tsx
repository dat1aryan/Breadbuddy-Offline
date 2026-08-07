import { useState, useEffect } from 'react';
import { Tag, Landmark, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { Transaction, financeEngine, PAYMENT_METHODS } from '../../lib/financeEngine';
import { progressionEngine } from '../../engines/progressionEngine';
import { achievementEngine } from '../../lib/achievementEngine';
import { validateFinancialInput } from '../../utils/validationUtils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currency: string;
  transactionToEdit?: Transaction | null;
  mode: 'add' | 'edit' | 'duplicate';
  onSuccess: () => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  userId,
  currency,
  transactionToEdit,
  mode,
  onSuccess,
}: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI / Card');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [recentMerchants, setRecentMerchants] = useState<string[]>([]);
  const [recentAmounts, setRecentAmounts] = useState<number[]>([]);
  const [showMore, setShowMore] = useState(false);
  
  const toast = useToast();
  const categories = financeEngine.getCategories(userId);

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit && (mode === 'edit' || mode === 'duplicate')) {
        setAmount(transactionToEdit.amount.toString());
        setType(transactionToEdit.type);
        setCategory(transactionToEdit.category);
        setTitle(transactionToEdit.title);
        setDescription(transactionToEdit.description || '');
        setDate(transactionToEdit.date);
        setTime(transactionToEdit.time);
        setPaymentMethod(transactionToEdit.paymentMethod);
        setNotes(transactionToEdit.notes || '');
        setShowMore(Boolean(transactionToEdit.description || transactionToEdit.notes));
      } else {
        setAmount('');
        setType('expense');
        setCategory('food');
        setTitle('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setTime(new Date().toTimeString().slice(0, 5));
        setNotes('');
        setShowMore(false);
      }

      const txs = financeEngine.getTransactions(userId);
      
      if (txs.length > 0 && (!transactionToEdit || mode === 'add')) {
        setPaymentMethod(txs[0].paymentMethod);
      }

      const uniqueMerchants = Array.from(new Set(txs.map(t => t.title)))
        .filter(t => t && t.trim() !== '')
        .slice(0, 5);
      setRecentMerchants(uniqueMerchants);

      const uniqueAmounts = Array.from(new Set(txs.map(t => t.amount)))
        .filter(a => a > 0)
        .slice(0, 5);
      setRecentAmounts(uniqueAmounts);
    }
  }, [transactionToEdit, mode, isOpen, userId]);

  useEffect(() => {
    const validCats = categories.filter(c => c.type === type || c.type === 'both');
    if (validCats.length > 0 && !validCats.find(c => c.value === category)) {
      setCategory(validCats[0].value);
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFinancialInput(amount);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid transaction amount.');
      return;
    }

    setLoading(true);

    const emoji = financeEngine.getCategoryEmoji(category, userId);
    const list = financeEngine.getTransactions(userId);

    const newTx: Transaction = {
      id: mode === 'edit' && transactionToEdit ? transactionToEdit.id : Date.now(),
      amount: validation.parsedValue,
      currency,
      type,
      category,
      title: title || `${type === 'income' ? 'Income' : 'Expense'} logged`,
      description,
      date,
      time,
      paymentMethod,
      notes,
      emoji,
      created_at: mode === 'edit' && transactionToEdit ? transactionToEdit.created_at : new Date(`${date}T${time}`).toISOString(),
    };

    let updatedList = [];
    if (mode === 'edit') {
      updatedList = list.map((t) => (t.id === newTx.id ? newTx : t));
      toast.success('Transaction updated.');
    } else {
      updatedList = [newTx, ...list];
      toast.success(mode === 'duplicate' ? 'Transaction duplicated.' : 'Transaction recorded.');
    }

    financeEngine.saveTransactions(userId, updatedList);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-updated'));
    }

    if (mode !== 'edit') {
      try {
        progressionEngine.processEvent({
          userId,
          type: 'log_expense',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to reward progress:', err);
      }
    }

    try {
      achievementEngine.checkAndUnlock(userId);
    } catch (err) {
      console.error('Failed to check achievements:', err);
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'edit' ? 'Edit Transaction' : mode === 'duplicate' ? 'Duplicate Transaction' : 'Add Transaction'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Flat Segmented Income/Expense Toggle */}
        <div className="flex bg-bb-surface border-2 border-bb-border p-1 rounded-bb-sm gap-1">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-bb-xs border-2 transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-bb-coral text-bb-coral-fg border-black'
                : 'bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-bb-xs border-2 transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-bb-lime text-bb-lime-fg border-black'
                : 'bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary'
            }`}
          >
            Income
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Input
              type="number"
              label={`Amount (${currency})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min={0}
            />
            {recentAmounts.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center mt-1">
                <span className="text-[9px] font-mono text-bb-text-muted">Recent:</span>
                {recentAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className="cursor-pointer"
                  >
                    <Badge variant="paper" size="sm">
                      {amt}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label text-bb-text-muted">
              Category
            </label>
            <div className="relative flex items-center">
              <Tag size={14} className="absolute left-3.5 text-bb-text-muted pointer-events-none" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-bb-text-primary text-xs font-sans outline-none cursor-pointer"
              >
                {filteredCategories.map((c) => (
                  <option key={c.value} value={c.value} className="bg-bb-surface text-bb-text-primary">
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Category Chips using Badge Primitive */}
        <div className="space-y-1">
          <label className="text-label text-bb-text-muted">
            Quick Categories
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-bb-surface border-2 border-bb-border rounded-bb-sm max-h-[90px] overflow-y-auto">
            {filteredCategories.slice(0, 10).map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className="cursor-pointer"
              >
                <Badge
                  variant={category === c.value ? 'violet' : 'neutral'}
                  size="sm"
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Input
            type="text"
            label="Title / Merchant"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {recentMerchants.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center mt-1">
              <span className="text-[9px] font-mono text-bb-text-muted">Recent:</span>
              {recentMerchants.map((merchant) => (
                <button
                  key={merchant}
                  type="button"
                  onClick={() => setTitle(merchant)}
                  className="cursor-pointer"
                >
                  <Badge variant="paper" size="sm">
                    {merchant}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Toggle details button */}
        <div className="pt-1.5">
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1.5 text-label text-bb-violet hover:text-bb-text-primary transition-colors cursor-pointer outline-none"
          >
            {showMore ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{showMore ? 'Hide Details' : 'More Details'}</span>
          </button>
        </div>

        {showMore && (
          <div className="space-y-4 border-t-2 border-bb-border pt-4">
            <Input
              type="text"
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                type="time"
                label="Time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-bb-text-muted">
                  Payment Method
                </label>
                <div className="relative flex items-center">
                  <Landmark size={14} className="absolute left-3.5 text-bb-text-muted pointer-events-none" />
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-bb-text-primary text-xs font-sans outline-none cursor-pointer"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method} className="bg-bb-surface text-bb-text-primary">
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                type="text"
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-5 mt-6 border-t border-white/10">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
