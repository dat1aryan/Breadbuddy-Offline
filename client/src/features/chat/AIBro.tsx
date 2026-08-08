import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, Sparkles, TrendingUp, AlertCircle, HelpCircle, ArrowRight, User as UserIcon } from 'lucide-react';
import { User, ChatMessage } from '../../lib/types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatBlock } from '../../components/ui/StatBlock';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../hooks/useToast';
import { aiBroEngine } from '../../lib/aiBroEngine';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { financeEngine } from '../../lib/financeEngine';
import { streakEngine } from '../../lib/streakEngine';
import { savingsEngine } from '../../lib/savingsEngine';
import { subscriptionEngine } from '../../lib/subscriptionEngine';
import { preferencesEngine } from '../../lib/preferencesEngine';
import { notificationEngine } from '../../lib/notificationEngine';

interface AIBroProps {
  user: User;
}

export function AIBro({ user }: AIBroProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const userId = user.id;
  const userVibe = user.vibe || 'toast';
  const currency = user.currency || '₹';

  // Local personality state — allows mid-chat switching without prop changes.
  // Separate from `userVibe` (toast/roast), which drives aiBroEngine reply tone.
  const [activePersonality, setActivePersonality] = useState(
    () => preferencesEngine.getPreferences(userId).aiBroPersonality || 'bestie'
  );

  // Load chat history from localStorage (supporting old key as fallback)
  useEffect(() => {
    const newKey = `breadbuddy_aibro_history_${userId}`;
    const oldKey = `breadbuddy_chat_history_${userId}`;
    const savedNew = localStorage.getItem(newKey);
    const savedOld = localStorage.getItem(oldKey);

    if (savedNew) {
      try {
        setMessages(JSON.parse(savedNew));
      } catch (unknown) {
        initializeWelcomeMessage();
      }
    } else if (savedOld) {
      try {
        const history = JSON.parse(savedOld);
        setMessages(history);
        localStorage.setItem(newKey, savedOld);
      } catch (unknown) {
        initializeWelcomeMessage();
      }
    } else {
      initializeWelcomeMessage();
    }
  }, [userId]);

  const initializeWelcomeMessage = () => {
    const streak = streakEngine.getStreak(userId);
    const goals = savingsEngine.getGoals(userId);
    const completedGoalsCount = goals.filter((g: any) => g.current_amount >= g.target_amount).length;
    const subsCount = subscriptionEngine.getSubscriptions(userId).filter((s: any) => s.status === 'active').length;

    let milestoneText = '';
    if (streak.currentStreak >= 3) {
      milestoneText += ` You've maintained a consistency streak of ${streak.currentStreak} days.`;
    }
    if (completedGoalsCount >= 1) {
      milestoneText += " You've successfully completed a savings goal.";
    }
    if (subsCount >= 1) {
      milestoneText += " You have also configured active subscriptions.";
    }

    const prefs = preferencesEngine.getPreferences(userId);
    const name = user.name || 'user';
    let baseIntro = `Hello ${name}. I am your AI Companion. Ask me anything about your allowance, what you spent, or your savings goals.`;

    if (prefs.aiBroPersonality === 'professional') {
      baseIntro = `Hello, ${name}. I am your financial analyst. You can query me regarding your monthly allowance limits, transactions, or savings goal progress metrics. Let's optimize your balance.`;
    } else if (prefs.aiBroPersonality === 'coach') {
      baseIntro = `Let's work together, ${name}. I am your financial coach. Ask me anything about your cashflow, spending habits, or goal progress.`;
    } else if (prefs.aiBroPersonality === 'calm') {
      baseIntro = `Welcome, ${name}. I am your financial companion, here to help you navigate your allowance, transactions, and savings goals peacefully.`;
    }

    const welcome: ChatMessage = {
      role: 'bro',
      content: `${baseIntro}${milestoneText}`,
      created_at: new Date().toISOString(),
    };
    setMessages([welcome]);
    localStorage.setItem(`breadbuddy_aibro_history_${userId}`, JSON.stringify([welcome]));
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: text, created_at: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      try {
        const reply = aiBroEngine.generateReply(text, userId, userVibe);
        const newMsg: ChatMessage = {
          role: 'bro',
          content: reply.content,
          intent: reply.intent,
          created_at: new Date().toISOString(),
        };
        const finalMessages = [...updatedMessages, newMsg];
        setMessages(finalMessages);
        localStorage.setItem(`breadbuddy_aibro_history_${userId}`, JSON.stringify(finalMessages));

        notificationEngine.addNotification(userId, {
          title: 'AI Bro Insight 💡',
          message: reply.content,
          emoji: '💡',
        });
      } catch (err) {
        const errorMsg: ChatMessage = {
          role: 'bro',
          content: "I'm unable to process that request right now. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages([...updatedMessages, errorMsg]);
        toast.error('Failed to get a response from your companion');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const clearHistoryConfirm = () => {
    localStorage.removeItem(`breadbuddy_aibro_history_${userId}`);
    localStorage.removeItem(`breadbuddy_chat_history_${userId}`);
    initializeWelcomeMessage();
    toast.success('AI Bro memory cleared!');
    setIsClearConfirmOpen(false);
  };

  // Calculations for UI panels
  const summary = financeEngine.getSummary(userId, user.monthlyAllowance || 0, currency);
  const spent = summary.spent;
  const allowance = summary.allowance;
  const remaining = summary.remaining;
  const pct = allowance > 0 ? Math.round((spent / allowance) * 100) : 0;

  const list = financeEngine.getTransactionsForCycle(userId);
  const hasEnoughData = list.length >= 3;
  const insights = aiBroEngine.getPersonalizedInsights(userId);
  const patterns = aiBroEngine.getSpendingPatterns(userId);

  const allItems = [...insights, ...patterns];
  const top3Insights = allItems.slice(0, 3);

  const suggestedQuestions = [
    'Where did I spend the most this month? 💸',
    'Can I afford this purchase? 🤔',
    'Help me save more money. ✨',
    'What are my spending habits? 📊',
    'Which category costs me the most? 🍕',
    'Summarize this month\'s spending. 📈',
  ];

  // Budget status evaluation
  let statusText = '';
  let statusColor = '';
  let statusDotClass = '';
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - pct)));
  const isCritical = pct >= 80 || healthScore <= 20;

  if (isCritical) {
    statusText = "Allowance almost exhausted! Slow down!";
    statusColor = 'text-bb-coral border-bb-coral/40 bg-bb-coral/10';
    statusDotClass = 'w-3 h-3 rounded-full bg-gradient-to-b from-[#FCA5A5] via-[#EF4444] to-[#B91C1C] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] flex-shrink-0';
  } else if (pct > 50) {
    statusText = 'Watch your spending this week.';
    statusColor = 'text-amber-400 border-amber-400/40 bg-amber-400/10';
    statusDotClass = 'w-3 h-3 rounded-full bg-gradient-to-b from-[#FDE047] via-[#EAB308] to-[#CA8A04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] flex-shrink-0';
  } else {
    statusText = "You're comfortably within budget.";
    statusColor = 'text-bb-lime border-bb-lime/30 bg-bb-lime/10';
    statusDotClass = 'w-3 h-3 rounded-full bg-gradient-to-b from-[#6EE7B7] via-[#34D399] to-[#047857] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] flex-shrink-0';
  }

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner - Rebuilt to flat Card */}
      <Card accent="violet" glassy className="p-6 md:p-8 select-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-black tracking-tight text-bb-text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-bb-violet/20 border border-bb-violet/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-bb-violet" />
              </span>
              AI Bro
            </h1>
            <p className="text-xs md:text-sm text-bb-text-secondary mt-1.5 max-w-xl font-semibold leading-relaxed">
              Your AI money buddy. Ask questions, track spending, and build smart money habits.
            </p>
          </div>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => setIsClearConfirmOpen(true)} 
            className="self-start md:self-center font-mono"
          >
            clear memory
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* LEFT: AI Chat Interface */}
        <Card accent="none" glassy className="lg:col-span-7 p-6 flex flex-col h-[550px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-bb-border pb-4 mb-4 select-none">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-bb-violet" />
              <h2 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono">Chat Room</h2>
            </div>
          </div>

          {/* Personality Switcher — compact row below header, above suggested questions */}
          <div className="flex gap-1.5 mb-3 flex-shrink-0 flex-wrap">
            {(['bestie', 'professional', 'coach', 'calm'] as const).map((p) => {
              const labels: Record<string, string> = { bestie: '💅', professional: '💼', coach: '🚀', calm: '🧘' };
              return (
                <Button
                  key={p}
                  variant={activePersonality === p ? 'danger' : 'secondary'}
                  size="sm"
                  className="text-[9px] px-2 py-1"
                  onClick={() => {
                    setActivePersonality(p);
                    preferencesEngine.savePreferences(userId, { aiBroPersonality: p });
                  }}
                >
                  {labels[p]} {p}
                </Button>
              );
            })}
          </div>

          {/* Suggested Questions — above message list */}
          {messages.length <= 2 && (
            <div className="mb-3 flex-shrink-0">
              <p className="text-[9px] text-bb-text-muted font-bold uppercase tracking-wider mb-2 font-mono select-none">Suggested Questions</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    size="sm"
                    onClick={() => sendMessage(q.replace(/\s*[\u{1F300}-\u{1F9FF}]/gu, '').trim())}
                    className="text-[10px]"
                    rightIcon={<ArrowRight size={10} />}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 animate-bb-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* 2. Message avatars & bubbles */}
                <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-bb-border text-xs font-black select-none ${
                  msg.role === 'user' 
                    ? 'bg-bb-violet text-bb-violet-fg' 
                    : 'bg-bb-lime text-bb-lime-fg'
                }`}>
                  {msg.role === 'user' ? <UserIcon size={12} /> : '🍞'}
                </div>
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-bb-sm text-xs font-semibold tracking-wide leading-relaxed border-2 ${
                    msg.role === 'user'
                      ? 'bg-bb-surface border-bb-violet text-bb-text-primary rounded-tr-none'
                      : 'bg-bb-surface border-bb-border text-bb-text-primary rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              /* 3. Typing Indicator */
              <div className="flex gap-3 animate-bb-slide-up">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-bb-border bg-bb-lime text-bb-lime-fg text-xs select-none">
                  🍞
                </div>
                <div className="bg-bb-surface border-2 border-bb-border px-4 py-3 rounded-bb-sm rounded-tl-none text-xs font-semibold text-bb-text-muted flex items-center gap-2">
                  <Sparkles size={12} className="text-bb-violet" />
                  <span>AI Bro is typing...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex gap-2 border-t-2 border-bb-border pt-4 flex-shrink-0">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder=""
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              variant="primary"
              className="px-4"
            >
              <Send size={12} />
            </Button>
          </form>
        </Card>

        {/* RIGHT: Budget Recommendations & Categorized Insights */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:h-[550px]">
          {/* Budget Card — flex-shrink-0: fixed height, no internal scroll needed */}
          <Card accent="none" glassy className="p-6 flex-shrink-0">
            <h3 className="text-label text-bb-text-muted mb-4 flex items-center gap-1.5 select-none">
              <TrendingUp size={14} className="text-bb-violet" />
              Budget Status
            </h3>
            {allowance === 0 ? (
              <div className="p-4 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-center select-none">
                <AlertCircle className="mx-auto mb-2 text-bb-violet" size={20} />
                <p className="text-xs font-semibold text-bb-text-primary">Allowance not set</p>
                <p className="text-[10px] text-bb-text-muted mt-1">Configure your allowance in Settings to activate tracker.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Indicator Banner */}
                <div className={`p-3 rounded-bb-sm border-2 text-[11px] font-bold flex items-center gap-2.5 select-none ${statusColor}`}>
                  <span className={statusDotClass} />
                  <span>{statusText}</span>
                </div>

                {/* 5. Budget status blocks */}
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock
                    label="Allowance Used"
                    value={`${pct}%`}
                    sub={`${currency}${spent.toLocaleString('en-IN')} spent`}
                    accent="violet"
                    size="sm"
                  />
                  <StatBlock
                    label="Remaining Budget"
                    value={`${currency}${remaining.toLocaleString('en-IN')}`}
                    sub={`of ${currency}${allowance.toLocaleString('en-IN')}`}
                    accent={remaining < 0 ? 'coral' : 'lime'}
                    size="sm"
                  />
                </div>

                {/* 6. Progress bar */}
                <ProgressBar
                  percentage={pct}
                  color={pct >= 80 ? 'coral' : pct >= 50 ? 'violet' : 'lime'}
                  height={12}
                  showLabel={false}
                />
              </div>
            )}
          </Card>

          {/* Grouped Insights Card — flex-1 min-h-0 so it fills remaining height */}
          <Card accent="none" glassy className="p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-label text-bb-text-muted mb-4 flex items-center gap-1.5 select-none flex-shrink-0">
              <Sparkles size={14} className="text-bb-violet" />
              Financial Intelligence
            </h3>

            {!hasEnoughData ? (
              /* 7. Onboarding EmptyState primitive */
              <EmptyState
                accent="neutral"
                title="Log transactions to activate insights"
                description="Log at least 3 transactions to reveal patterns, weekly averages, and spending spikes."
                icon={<Sparkles size={24} className="text-bb-lime" />}
                className="flex-1 min-h-0"
              />
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                {top3Insights.map((item, idx) => (
                  <InsightItem key={idx} item={item} />
                ))}

                {top3Insights.length === 0 && (
                  /* 7. Onboarding EmptyState primitive alternative fallback */
                  <EmptyState
                    accent="neutral"
                    title="No pattern detected yet"
                    description="Keep logging daily transactions. I'm watching closely! 👀"
                    icon={<HelpCircle size={32} className="text-bb-text-muted" />}
                  />
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={clearHistoryConfirm}
        title="Clear Memory"
        message="Are you sure you want to clear the conversation history? This will permanently wipe all chat logs."
        confirmText="Yes, clear history"
        cancelText="Cancel"
      />
    </div>
  );
}

/* 5. Insight list items migrated to StatBlock */
function InsightItem({ item }: { item: { title: string; description: string; emoji: string } }) {
  return (
    <StatBlock
      label=""
      value={item.title}
      sub={item.description}
      icon={<span className="text-xl select-none">{item.emoji}</span>}
      accent="lime"
      size="xs"
      font="display"
      className="bg-bb-lime/10 border-bb-lime/20"
      subClassName="text-bb-violet font-semibold"
    />
  );
}
