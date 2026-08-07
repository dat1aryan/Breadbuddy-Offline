import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { setAuth, getToken } from '../../../lib/auth';
import { User } from '../../../lib/types';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../hooks/useToast';
import { validateFinancialInput } from '../../../utils/validationUtils';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { notificationEngine } from '../../../lib/notificationEngine';

interface QuickEditAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
  onUpdateUser: (user: User) => void;
}

export function QuickEditAllowanceModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  onUpdateUser,
}: QuickEditAllowanceModalProps) {
  const [allowance, setAllowance] = useState(user.monthlyAllowance.toString());
  const [currency, setCurrency] = useState(user.currency);
  const [budgetCycle, setBudgetCycle] = useState('monthly');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setAllowance(user.monthlyAllowance.toString());
    setCurrency(user.currency);
    
    const cycle = localStorage.getItem(`budget_cycle_${user.id}`) || 'monthly';
    const effDate = localStorage.getItem(`effective_date_${user.id}`) || new Date().toISOString().split('T')[0];
    setBudgetCycle(cycle);
    setEffectiveDate(effDate);
  }, [user, isOpen]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateFinancialInput(allowance);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid financial amount.');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsConfirmOpen(false);
    setLoading(true);

    const validation = validateFinancialInput(allowance);
    if (!validation.isValid) {
      setLoading(false);
      return;
    }

    try {
      await api.updateProfile({
        monthlyAllowance: validation.parsedValue,
        currency,
      });

      localStorage.setItem(`budget_cycle_${user.id}`, budgetCycle);
      localStorage.setItem(`effective_date_${user.id}`, effectiveDate);

      const token = getToken() || '';
      const updatedUser: User = {
        ...user,
        monthlyAllowance: validation.parsedValue,
        currency,
      };
      setAuth(token, updatedUser);
      onUpdateUser(updatedUser);

      notificationEngine.addNotification(user.id, {
        title: 'Allowance Updated 💰',
        message: `Monthly allowance set to ${currency}${validation.parsedValue.toLocaleString()}. Budget cycle updated (${budgetCycle})!`,
        emoji: '💰',
      });

      toast.success('Allowance updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update allowance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Allowance & Currency">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Input
          type="number"
          label="Monthly Allowance"
          value={allowance}
          onChange={(e) => setAllowance(e.target.value)}
          min={0}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-label text-bb-text-muted">
            Currency Symbol
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-bb-text-primary text-xs font-mono outline-none"
          >
            <option value="₹" className="bg-bb-surface">₹ Indian Rupee</option>
            <option value="$" className="bg-bb-surface">$ US Dollar</option>
            <option value="€" className="bg-bb-surface">€ Euro</option>
            <option value="£" className="bg-bb-surface">£ Pound Sterling</option>
            <option value="¥" className="bg-bb-surface">¥ Japanese Yen</option>
            <option value="₩" className="bg-bb-surface">₩ Korean Won</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-label text-bb-text-muted">
            Budget Cycle
          </label>
          <select
            value={budgetCycle}
            onChange={(e) => setBudgetCycle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-bb-text-primary text-xs font-sans outline-none"
          >
            <option value="monthly" className="bg-bb-surface">Monthly</option>
            <option value="weekly" className="bg-bb-surface">Weekly</option>
          </select>
        </div>

        <Input
          type="date"
          label="Effective Date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-5 mt-6 border-t border-white/10">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Modify Budget"
        message="Are you sure you want to change your monthly allowance? This will reset your safe spend rates for the cycle."
        confirmText="Yes, change it"
        cancelText="Cancel"
      />
    </Modal>
  );
}
