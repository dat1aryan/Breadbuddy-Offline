import { useEffect, useState } from 'react';
import { Trash2, Search, Plus, Edit2, Copy, Tag, SlidersHorizontal, X } from 'lucide-react';
import { User } from '../../lib/types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Chip } from '../../components/ui/Chip';
import { StatBlock } from '../../components/ui/StatBlock';
import { SkeletonLoader } from '../../components/feedback/SkeletonLoader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../hooks/useToast';
import { Transaction, financeEngine, CategoryInfo, PAYMENT_METHODS } from '../../lib/financeEngine';
import { achievementEngine } from '../../lib/achievementEngine';
import { TransactionModal } from './TransactionModal';
import { settingsEngine } from '../../lib/settingsEngine';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { formatAmountNumber } from '../../utils/currencyUtils';

interface ExpenseListProps {
  refreshKey: number;
  user: User;
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Date grouping helper — pure UI utility, no engine call
// ---------------------------------------------------------------------------
function getDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function ExpenseList({ refreshKey, user, onRefresh }: ExpenseListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [visibleCount, setVisibleCount] = useState(20);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'alpha-asc'>('date-desc');

  // Row 2 filter panel collapsed by default
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, typeFilter, categoryFilter, paymentFilter, startDate, endDate, sortBy, transactions]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'duplicate'>('add');

  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('✨');
  const [newCatType, setNewCatType] = useState<'income' | 'expense' | 'both'>('both');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const toast = useToast();
  const categories = financeEngine.getCategories(user.id);
  const currencySymbol = user.currency || '₹';

  const loadTransactions = () => {
    setLoading(true);
    try {
      const data = financeEngine.getTransactions(user.id);
      setTransactions(data);
    } catch (err) {
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [refreshKey]);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteTargetId === null) return;
    try {
      const list = transactions.filter((t) => t.id !== deleteTargetId);
      financeEngine.saveTransactions(user.id, list);
      setTransactions(list);
      achievementEngine.checkAndUnlock(user.id);
      toast.success('Transaction deleted');
      onRefresh();
    } catch (err) {
      toast.error('Failed to delete transaction');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleOpenAdd = () => {
    setSelectedTx(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setSelectedTx(tx);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenDuplicate = (tx: Transaction) => {
    setSelectedTx(tx);
    setModalMode('duplicate');
    setIsModalOpen(true);
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;

    const value = newCatLabel.toLowerCase().trim().replace(/\s+/g, '-');
    const exists = categories.find((c) => c.value === value);
    if (exists) {
      toast.error('Category already exists.');
      return;
    }

    const newCat: CategoryInfo = {
      value,
      label: newCatLabel,
      emoji: newCatEmoji || '✨',
      type: newCatType
    };

    const updated = [...categories, newCat];
    financeEngine.saveCategories(user.id, updated);
    setNewCatLabel('');
    setNewCatEmoji('✨');
    setShowAddCategory(false);
    toast.success(`Category "${newCatLabel}" created.`);
    onRefresh();
  };

  // ---------------------------------------------------------------------------
  // Filter pipeline — logic unchanged
  // ---------------------------------------------------------------------------
  const filteredTransactions = transactions
    .filter((t) => {
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const matchesPayment = paymentFilter === 'all' || t.paymentMethod === paymentFilter;
      
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && t.date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && t.date <= endDate;
      }

      return matchesSearch && matchesType && matchesCategory && matchesPayment && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date-asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      if (sortBy === 'alpha-asc') return a.title.localeCompare(b.title);
      return 0;
    });

  // ---------------------------------------------------------------------------
  // Summary bar values — computed from filteredTransactions
  // ---------------------------------------------------------------------------
  const totalIn  = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOut = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net      = totalIn - totalOut;

  // Row 2 active filter count
  const activeRow2Count = [
    categoryFilter !== 'all',
    paymentFilter !== 'all',
    !!startDate,
    !!endDate,
  ].filter(Boolean).length;

  // ---------------------------------------------------------------------------
  // Date grouping — only for date sorts
  // ---------------------------------------------------------------------------
  const useDateGrouping = sortBy === 'date-desc' || sortBy === 'date-asc';

  const slicedTransactions = filteredTransactions.slice(0, visibleCount);

  const grouped = useDateGrouping
    ? slicedTransactions.reduce((acc, tx) => {
        const key = tx.date;
        if (!acc[key]) acc[key] = [];
        acc[key].push(tx);
        return acc;
      }, {} as Record<string, Transaction[]>)
    : null;

  const sortedDates = grouped
    ? Object.keys(grouped).sort((a, b) =>
        sortBy === 'date-asc' ? a.localeCompare(b) : b.localeCompare(a)
      )
    : null;

  if (loading) {
    return (
      <div className="py-4 space-y-3">
        <SkeletonLoader variant="list" count={5} />
      </div>
    );
  }

  // Transaction row — shared render so we don't duplicate markup
  const renderTxRow = (tx: Transaction) => (
    <div
      key={tx.id}
      className="flex items-center justify-between p-3.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border hover:border-black transition-colors group"
    >
      <div className="flex items-center gap-3.5">
        <span className="text-2xl p-1.5 rounded-bb-xs bg-bb-bg border border-bb-border select-none">
          {tx.emoji}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-extrabold capitalize text-xs text-bb-text-primary">
              {tx.title}
            </p>
            <Badge
              variant={tx.type === 'income' ? 'lime' : 'coral'}
              size="sm"
            >
              {tx.type}
            </Badge>
            <span className="text-[10px] text-bb-text-muted font-mono">({tx.paymentMethod})</span>
          </div>
          <p className="text-[11px] text-bb-text-secondary capitalize mt-0.5 font-sans">
            {tx.category} {tx.description && ` • ${tx.description}`}
          </p>
          <p className="text-[9px] text-bb-text-muted font-mono tracking-wider">
            {settingsEngine.formatDate(tx.date, settingsEngine.getSettings(user.id).dateFormat)} @ {tx.time}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className={`font-mono font-black text-sm ${
          tx.type === 'income' ? 'text-bb-lime' : 'text-bb-coral'
        }`}>
          {tx.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmountNumber(tx.amount, currencySymbol)}
        </span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleOpenDuplicate(tx)}
            className="p-1.5 rounded-bb-xs bg-bb-surface border border-bb-border hover:bg-bb-bg text-bb-text-muted hover:text-bb-text-primary transition-colors"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => handleOpenEdit(tx)}
            className="p-1.5 rounded-bb-xs bg-bb-surface border border-bb-border hover:bg-bb-bg text-bb-text-muted hover:text-bb-text-primary transition-colors"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => {
              setDeleteTargetId(tx.id);
              setIsDeleteConfirmOpen(true);
            }}
            className="p-1.5 rounded-bb-xs bg-bb-surface border border-bb-border hover:bg-bb-coral hover:text-bb-coral-fg hover:border-black text-bb-text-muted transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Header — title + count only; actions move into Row 1 filter bar ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">
          Transaction History ({filteredTransactions.length})
        </h3>
      </div>

      {/* ── Section A: Summary Bar — only when filtered results exist ── */}
      {filteredTransactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            label="Total In"
            value={`${currencySymbol}${formatAmountNumber(totalIn, currencySymbol)}`}
            accent="lime"
            size="sm"
          />
          <StatBlock
            label="Total Out"
            value={`${currencySymbol}${formatAmountNumber(totalOut, currencySymbol)}`}
            accent="coral"
            size="sm"
          />
          <StatBlock
            label="Net"
            value={`${net >= 0 ? '+' : ''}${currencySymbol}${formatAmountNumber(Math.abs(net), currencySymbol)}`}
            accent={net >= 0 ? 'lime' : 'coral'}
            size="sm"
          />
        </div>
      )}

      {/* ── Section B Row 1: Search · Type chips · Sort · Add Record ── */}
      <div className="flex flex-wrap items-end gap-3 bg-bb-surface border-2 border-bb-border p-3 rounded-bb-sm">
        {/* Search — flex-1 */}
        <div className="flex-1 min-w-[160px]">
          <Input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={12} />}
          />
        </div>

        {/* Type chips — inline, compact */}
        <div className="flex gap-1.5">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <Chip
              key={t}
              label={t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              selected={typeFilter === t}
              activeVariant="violet"
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>

        {/* Sort select — right side */}
        <div className="flex-shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
          >
            <option value="date-desc" className="bg-bb-surface">Latest First</option>
            <option value="date-asc" className="bg-bb-surface">Oldest First</option>
            <option value="amount-desc" className="bg-bb-surface">Highest Price</option>
            <option value="amount-asc" className="bg-bb-surface">Lowest Price</option>
            <option value="alpha-asc" className="bg-bb-surface">Alphabetical</option>
          </select>
        </div>

        {/* Filters toggle with active count */}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-bb-sm border-2 text-xs font-bold font-mono uppercase tracking-wide transition-colors
            bg-bb-surface border-bb-border text-bb-text-muted hover:border-bb-violet hover:text-bb-text-primary"
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeRow2Count > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-bb-xs bg-bb-coral text-bb-coral-fg border border-black text-[9px] font-black">
              {activeRow2Count}
            </span>
          )}
        </button>

        {/* Add Record — always visible here */}
        <Button
          size="sm"
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<Plus size={12} />}
        >
          Add Record
        </Button>
      </div>

      {/* ── Section B Row 2: Advanced filters (collapsed) ── */}
      {filtersOpen && (
        <div className="bg-bb-surface border-2 border-bb-border p-4 rounded-bb-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-bb-text-muted">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
            >
              <option value="all" className="bg-bb-surface">All Categories</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value} className="bg-bb-surface">
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-bb-text-muted">Payment Method</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
            >
              <option value="all" className="bg-bb-surface">All Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m} className="bg-bb-surface">{m}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-bb-text-muted">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-bb-text-muted">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          {/* Custom Category — moved from header into Row 2 panel */}
          <div className="md:col-span-2 lg:col-span-4 border-t-2 border-bb-border pt-3 mt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAddCategory(!showAddCategory)}
              leftIcon={<Tag size={12} />}
            >
              Custom Category
            </Button>

            {/* Clear all filters shortcut */}
            {activeRow2Count > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-2"
                onClick={() => {
                  setCategoryFilter('all');
                  setPaymentFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                leftIcon={<X size={12} />}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Category Form */}
      {showAddCategory && (
        <form onSubmit={handleAddCustomCategory} className="p-4 rounded-bb-sm bg-bb-surface border-2 border-bb-border grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Input
            type="text"
            label="Category Name"
            value={newCatLabel}
            onChange={(e) => setNewCatLabel(e.target.value)}
            required
          />
          <Input
            type="text"
            label="Emoji (Optional)"
            value={newCatEmoji}
            onChange={(e) => setNewCatEmoji(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-bb-text-muted">
              Apply to Type
            </label>
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
            >
              <option value="both" className="bg-bb-surface">Both</option>
              <option value="expense" className="bg-bb-surface">Expense Only</option>
              <option value="income" className="bg-bb-surface">Income Only</option>
            </select>
          </div>
          <Button type="submit" size="sm" variant="primary" className="w-full">
            Save Category
          </Button>
        </form>
      )}

      {/* ── Transaction List: grouped by date (date sorts) or flat (other sorts) ── */}
      <div className="space-y-2 max-h-[36rem] overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            accent="neutral"
            title={transactions.length === 0 ? "Let's log your first money move 🚀" : "No matching transactions found 🔍"}
            description={
              transactions.length === 0 
                ? "Your money story starts here. Click 'Add Record' above to begin!" 
                : "No transactions match your search query or active category filters. Try clearing filters."
            }
            icon={<Tag size={24} className="text-bb-violet" />}
          />
        ) : useDateGrouping && grouped && sortedDates ? (
          // Date-grouped view
          <div className="space-y-4">
            {sortedDates.map((dateStr) => {
              const group = grouped[dateStr];
              const dayIn  = group.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
              const dayOut = group.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              const dayNet = dayIn - dayOut;
              return (
                <div key={dateStr} className="space-y-2">
                  {/* Date group header */}
                  <div className="flex items-center justify-between pb-1.5 border-b-2 border-bb-border">
                    <span className="text-[10px] font-black uppercase font-mono text-bb-text-muted tracking-wider">
                      {getDateLabel(dateStr)}
                    </span>
                    <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-bb-xs border ${
                      dayNet >= 0
                        ? 'bg-bb-lime text-bb-lime-fg border-black'
                        : 'bg-bb-coral text-bb-coral-fg border-black'
                    }`}>
                      {dayNet >= 0 ? '+' : ''}{currencySymbol}{formatAmountNumber(Math.abs(dayNet), currencySymbol)}
                    </span>
                  </div>
                  {/* Rows for this date */}
                  {group.map((tx) => renderTxRow(tx))}
                </div>
              );
            })}
          </div>
        ) : (
          // Flat list (amount/alpha sorts)
          slicedTransactions.map((tx) => renderTxRow(tx))
        )}
      </div>

      {/* Progressive Load More Controls */}
      {filteredTransactions.length > 0 && (
        <div className="pt-4 flex flex-col items-center justify-center gap-2 border-t-2 border-bb-border select-none text-center">
          <p className="text-[10px] text-bb-text-muted font-mono">
            Showing {Math.min(visibleCount, filteredTransactions.length)} of {filteredTransactions.length} Transactions
          </p>
          {visibleCount < filteredTransactions.length ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVisibleCount((prev) => prev + 20)}
            >
              Load More ↓
            </Button>
          ) : null}
        </div>
      )}

      {/* Modal block */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={user.id}
        currency={currencySymbol}
        transactionToEdit={selectedTx}
        mode={modalMode}
        onSuccess={() => {
          loadTransactions();
          onRefresh();
        }}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message="Are you sure you want to drop this transaction? This will permanently delete it and update your budget stats."
        confirmText="Yes, drop it"
        cancelText="Cancel"
      />
    </div>
  );
}
