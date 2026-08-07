import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, Sun, CloudSun, CloudRain, CloudLightning, ArrowRight, Wallet, Plus, Target, Flame } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { streakEngine } from '../../../lib/streakEngine';
import { savingsEngine } from '../../../lib/savingsEngine';
import { xpEngine } from '../../../lib/xpEngine';
import { financeEngine } from '../../../lib/financeEngine';
import { subscriptionEngine, getDaysUntilDue } from '../../../lib/subscriptionEngine';
import { profileEngine } from '../../../lib/profileEngine';
import { preferencesEngine } from '../../../lib/preferencesEngine';
import { getUser } from '../../../lib/auth';
import { getStreakContext, getStreakMessage } from '../../../utils/streakUtils';
import { isBirthdayToday } from '../../../utils/dateUtils';

export interface DailyBreadModalProps {
  userId: number;
  currency: string;
  remainingCash: number;
  /** Callback to tell App that Daily Bread has now been shown. */
  onDailyBreadShown: () => void;
  onAddTransaction?: () => void;
  onOpenGoals?: () => void;
  onEditAllowance?: () => void;
}

export function DailyWelcomeModal({
  userId,
  currency,
  remainingCash,
  onDailyBreadShown,
  onAddTransaction,
  onOpenGoals,
  onEditAllowance
}: DailyBreadModalProps) {
  const user = getUser();
  const userName = user?.name || 'bestie';
  const displayName = userName.includes('@') ? userName.split('@')[0] : userName;
  const fallbackUser = user || { id: userId, email: '', name: userName, monthlyAllowance: 0, currency };

  const [isOpen, setIsOpen] = useState(() => {
    const profile = profileEngine.getProfile(userId, fallbackUser);
    if (!profile.hasSeenWelcome) return true;

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isShown = sessionStorage.getItem(`daily_bread_shown_${userId}_${today}`) === 'true';
    return !isShown;
  });
  const [isWelcomeMode] = useState(() => {
    const profile = profileEngine.getProfile(userId, fallbackUser);
    return !profile.hasSeenWelcome;
  });

  useEffect(() => {
    if (isOpen) {
      const profile = profileEngine.getProfile(userId, fallbackUser);
      if (profile.hasSeenWelcome) {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        sessionStorage.setItem(`daily_bread_shown_${userId}_${today}`, 'true');
        onDailyBreadShown();
      }
    }
  }, [isOpen, userId]);

  const handleCloseWelcome = () => {
    profileEngine.saveProfileFields(userId, { hasSeenWelcome: true });
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    sessionStorage.setItem(`daily_bread_shown_${userId}_${today}`, 'true');
    onDailyBreadShown();
    setIsOpen(false);
  };

  const handleCloseBread = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const profile = profileEngine.getProfile(userId, fallbackUser);
  const prefs = preferencesEngine.getPreferences(userId);
  const personality = prefs.aiBroPersonality || 'bestie';

  // Fetch state data
  const streak = streakEngine.getStreak(userId);
  const list = financeEngine.getTransactionsForCycle(userId);
  const goals = savingsEngine.getGoals(userId).filter(g => !g.archived);
  const subs = subscriptionEngine.getSubscriptions(userId).filter(s => s.status === 'active');
  const xpState = xpEngine.getXPState(userId);

  // Time & Date details
  const now = new Date();
  const hour = now.getHours();

  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 21;

  let timeGreeting = '';
  if (isMorning) timeGreeting = 'Good Morning';
  else if (isAfternoon) timeGreeting = 'Good Afternoon';
  else if (isEvening) timeGreeting = 'Good Evening';
  else timeGreeting = 'Burning the midnight oil?';

  const bestieGreetings = [
    `${timeGreeting === 'Burning the midnight oil?' ? 'Burning the midnight oil' : timeGreeting}`,
    `Let's see what's baking today`,
    `Hope today treats your wallet kindly`,
    `Another day. Another opportunity`
  ];
  const coachGreetings = [
    `${timeGreeting === 'Burning the midnight oil?' ? 'Late night check-in' : timeGreeting}`,
    `Let's check what's baking`,
    `Ready for another financially healthy day`,
    `Another day. Another opportunity to secure the bag`
  ];
  const calmGreetings = [
    `${timeGreeting === 'Burning the midnight oil?' ? 'Peaceful night check-in' : timeGreeting}`,
    `Let's review today gently`,
    `Hope today is treating you and your budget kindly`,
    `A new day of mindful choices`
  ];
  const professionalGreetings = [
    `${timeGreeting === 'Burning the midnight oil?' ? 'Late night review' : timeGreeting}`,
    `Reviewing today's financial snapshot`,
    `Let's analyze your metrics for today`,
    `Ready for your daily session summary`
  ];

  let heroGreeting = '';
  const dayIndex = now.getDate();
  if (personality === 'coach') {
    heroGreeting = coachGreetings[dayIndex % coachGreetings.length];
  } else if (personality === 'calm') {
    heroGreeting = calmGreetings[dayIndex % calmGreetings.length];
  } else if (personality === 'professional') {
    heroGreeting = professionalGreetings[dayIndex % professionalGreetings.length];
  } else {
    heroGreeting = bestieGreetings[dayIndex % bestieGreetings.length];
  }

  const todayMD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const streakContext = getStreakContext(streak);

  if (profile.birthday && profile.birthday.endsWith(todayMD)) {
    heroGreeting = `Happy Birthday`;
  } else if (streakContext === 'milestone_3') {
    heroGreeting = `3-Day Warm-Up`;
  } else if (streakContext === 'milestone_7') {
    heroGreeting = `Seven Straight Days`;
  } else if (streakContext === 'milestone_14') {
    heroGreeting = `Fortnight Focus`;
  } else if (streakContext === 'milestone_30') {
    heroGreeting = `Thirty Days of Consistency`;
  } else if (streakContext === 'milestone_50') {
    heroGreeting = `Half-Century Active`;
  } else if (streakContext === 'milestone_100') {
    heroGreeting = `Century Club`;
  } else if (streakContext === 'milestone_365') {
    heroGreeting = `A Full Year Active`;
  } else if (streakContext === 'comeback') {
    heroGreeting = `Welcome Back`;
  } else if (streakContext === 'personal_best') {
    heroGreeting = `New Record Streak`;
  }



  const bakeryTaglines = [
    "Freshly baked for today.",
    "Today's slice of progress.",
    "Let's see what's baking.",
    "Fresh insights, straight from the oven.",
    "Your financial recipe is ready."
  ];
  const isBirthday = isBirthdayToday(profile.birthday);
  if (isBirthday) {
    heroGreeting = "🎂 Happy Birthday! 🎉";
  }
  const selectedTagline = isBirthday
    ? "IT'S YOUR SPECIAL DAY — TAKE A MOMENT TO CELEBRATE! 🍰"
    : bakeryTaglines[dayIndex % bakeryTaglines.length];

  let activeGoal = null;
  if (goals.length > 0) {
    activeGoal = goals.reduce((acc, current) => {
      const safeAccTarget = Math.max(acc.target_amount || 1, 1);
      const safeCurrTarget = Math.max(current.target_amount || 1, 1);
      return (current.current_amount / safeAccTarget) < (acc.current_amount / safeCurrTarget) ? current : acc;
    });
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);
  const safeSpend = Math.max(0, remainingCash / remainingDays);

  const expenses = list.filter(t => t.type === 'expense');
  const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);
  const allowance = user?.monthlyAllowance || 0;

  let weatherForecast: { icon: any; title: string; desc: string; color: string } | null = null;
  if (allowance > 0 && list.length > 0) {
    const pctSpent = (totalSpent / allowance) * 100;
    if (pctSpent <= 50) {
      weatherForecast = {
        icon: Sun,
        title: "☀️ Sunny",
        desc: "You're comfortably within budget.",
        color: "text-amber-400 border-amber-500/20 bg-amber-500/10"
      };
    } else if (pctSpent <= 80) {
      weatherForecast = {
        icon: CloudSun,
        title: "⛅ Partly Cloudy",
        desc: "Watch discretionary spending.",
        color: "text-sky-400 border-sky-500/20 bg-sky-500/10"
      };
    } else if (pctSpent <= 100) {
      weatherForecast = {
        icon: CloudRain,
        title: "🌧️ Rain Ahead",
        desc: "You're approaching your budget.",
        color: "text-orange-400 border-orange-500/20 bg-orange-500/10"
      };
    } else {
      weatherForecast = {
        icon: CloudLightning,
        title: "⛈️ Storm Warning",
        desc: "Today's spending is unusually high.",
        color: "text-rose-400 border-rose-500/20 bg-rose-500/10"
      };
    }
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const yesterdayTxns = list.filter(t => t.created_at.startsWith(yesterdayDateStr) || t.date === yesterdayDateStr);
  const yesterdaySpent = yesterdayTxns.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const signOffs = [
    "— AI Bro 🍞 Bake smart.",
    "— AI Bro 💜 See you next session.",
    "— AI Bro ⚡ Keep stacking.",
    "— AI Bro 💅 Stay locked in."
  ];
  const selectedSignOff = signOffs[dayIndex % signOffs.length];

  let aiBroReflection = "";
  if (isBirthday) {
    aiBroReflection = `🎂 Happy Birthday ${displayName}! 🎉 Today is all about you! AI Bro & BreadBuddy wish you an incredible year ahead filled with happiness, good vibes, and big savings Ws! 🎂✨`;
  } else if (
    streakContext === 'milestone_3' ||
    streakContext === 'milestone_7' ||
    streakContext === 'milestone_14' ||
    streakContext === 'milestone_30' ||
    streakContext === 'milestone_50' ||
    streakContext === 'milestone_100' ||
    streakContext === 'milestone_365' ||
    streakContext === 'personal_best' ||
    streakContext === 'comeback' ||
    streakContext === 'first_day'
  ) {
    aiBroReflection = getStreakMessage(streakContext);
  } else if (yesterdayTxns.length > 0 && yesterdaySpent <= safeSpend) {
    aiBroReflection = `Yesterday you stayed under your Safe Spend. Nice work! ${getStreakMessage(streakContext)}`;
  } else if (list.filter(t => t.type === 'income').length > 0 && now.getTime() - new Date(list.filter(t => t.type === 'income')[0].created_at).getTime() < 24 * 60 * 60 * 1000) {
    aiBroReflection = `Your recent income gives you more flexibility. ${getStreakMessage(streakContext)}`;
  } else if (activeGoal && (activeGoal.current_amount / Math.max(activeGoal.target_amount || 1, 1)) >= 0.8) {
    const remaining = activeGoal.target_amount - activeGoal.current_amount;
    aiBroReflection = `You're getting closer to your ${activeGoal.title} goal. Only ${currency}${remaining.toLocaleString('en-IN')} left! ${getStreakMessage(streakContext)}`;
  } else {
    aiBroReflection = getStreakMessage(streakContext);
  }

  const completedGoals = goals.filter(g => g.current_amount >= g.target_amount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isWelcomeMode ? handleCloseWelcome : handleCloseBread}
      rawLayout
      className="!p-0 flex flex-col"
      style={{ maxHeight: 'min(85vh, 640px)' } as React.CSSProperties}
    >
      {isWelcomeMode ? (
        /* ─────────────────────────────────────────
           🌱 EXPERIENCE 1: Welcome to BreadBuddy
           ───────────────────────────────────────── */
        <>
          {/* Fixed Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="shrink-0 px-6 pt-6 pb-5 text-center space-y-2 border-b border-white/[0.06]"
          >
            <h1 className="text-xl font-black text-white tracking-tight leading-snug">
              Welcome to BreadBuddy
            </h1>
            <h2 className="text-2xl sm:text-3xl font-black text-bb-lime tracking-tight leading-snug uppercase [text-shadow:2px_2px_0px_#000] mt-2.5 select-none break-words px-2">
              {displayName}
            </h2>
            <p className="text-[10px] font-mono font-black uppercase tracking-widest text-bb-violet mt-3">
              Your financial journey starts today
            </p>
          </motion.div>

          {/* Scrollable Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
            } as React.CSSProperties}
          >
            <button 
              onClick={() => { handleCloseWelcome(); onEditAllowance?.(); }}
              className="w-full flex items-center gap-4 p-4 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border hover:border-bb-lime transition-all text-left outline-none group cursor-pointer"
            >
              <div className="w-10 h-10 shrink-0 rounded-bb-xs bg-bb-bg border-2 border-bb-border flex items-center justify-center text-bb-lime group-hover:bg-bb-lime group-hover:text-bb-lime-fg transition-colors">
                <Wallet size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-bb-text-muted font-mono font-black uppercase tracking-wider">Monthly Allowance</p>
                <p className="text-sm font-bold text-white/95 mt-0.5">Define your budget</p>
              </div>
              <ArrowRight size={16} className="text-bb-text-muted group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button 
              onClick={() => { handleCloseWelcome(); onAddTransaction?.(); }}
              className="w-full flex items-center gap-4 p-4 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border hover:border-bb-violet transition-all text-left outline-none group cursor-pointer"
            >
              <div className="w-10 h-10 shrink-0 rounded-bb-xs bg-bb-bg border-2 border-bb-border flex items-center justify-center text-bb-violet group-hover:bg-bb-violet group-hover:text-bb-violet-fg transition-colors">
                <Plus size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-bb-text-muted font-mono font-black uppercase tracking-wider">Transactions</p>
                <p className="text-sm font-bold text-white/95 mt-0.5">Log a spend</p>
              </div>
              <ArrowRight size={16} className="text-bb-text-muted group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button 
              onClick={() => { handleCloseWelcome(); onOpenGoals?.(); }}
              className="w-full flex items-center gap-4 p-4 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border hover:border-bb-coral transition-all text-left outline-none group cursor-pointer"
            >
              <div className="w-10 h-10 shrink-0 rounded-bb-xs bg-bb-bg border-2 border-bb-border flex items-center justify-center text-bb-coral group-hover:bg-bb-coral group-hover:text-bb-coral-fg transition-colors">
                <Target size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-bb-text-muted font-mono font-black uppercase tracking-wider">Savings Goal</p>
                <p className="text-sm font-bold text-white/95 mt-0.5">Target your dreams</p>
              </div>
              <ArrowRight size={16} className="text-bb-text-muted group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          {/* Fixed Footer */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="shrink-0 px-6 pb-6 pt-4 border-t border-white/[0.06]"
          >
            <Button
              variant="primary"
              className="w-full text-sm font-black uppercase tracking-wider"
              onClick={handleCloseWelcome}
            >
              Start my journey
            </Button>
          </motion.div>
        </>
      ) : (
        /* ─────────────────────────────────────────
           🍞 EXPERIENCE 2: Returning User Daily Bread
           ───────────────────────────────────────── */
        <>
          {/* Fixed Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="shrink-0 px-6 pt-6 pb-5 text-center space-y-2 border-b border-white/[0.06]"
          >
            <h1 className="text-xl font-black text-white tracking-tight leading-snug">
              {heroGreeting.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim()}
            </h1>
            <h2 className="text-2xl sm:text-3xl font-black text-bb-lime tracking-tight leading-snug uppercase [text-shadow:2px_2px_0px_#000] mt-2.5 select-none break-words px-2">
              {displayName}
            </h2>
            <p className="text-[10px] font-mono font-black uppercase tracking-widest text-bb-violet mt-3">
              {selectedTagline}
            </p>
          </motion.div>

          {/* Scrollable Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
            } as React.CSSProperties}
          >
            {/* Streak & XP row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-bb-xs bg-bb-coral/10 border border-bb-coral/30 flex items-center justify-center text-bb-coral shrink-0 mb-1.5">
                  <Flame size={15} />
                </div>
                <p className="text-[9px] text-bb-text-muted font-black uppercase tracking-wider font-mono">Streak</p>
                <p className="text-sm font-black text-white mt-0.5">
                  {streak.currentStreak > 0 ? `${streak.currentStreak} Day${streak.currentStreak > 1 ? 's' : ''}` : 'Day 1'}
                </p>
              </div>

              <div className="p-3.5 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-bb-xs bg-bb-violet/10 border border-bb-violet/30 flex items-center justify-center text-bb-violet shrink-0 mb-1.5">
                  <Trophy size={15} />
                </div>
                <p className="text-[9px] text-bb-text-muted font-black uppercase tracking-wider font-mono">{xpState.label}</p>
                <p className="text-sm font-black text-white mt-0.5">Level {xpState.level}</p>
              </div>
            </div>

            {allowance > 0 && (
              <div className="p-3.5 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-bb-text-muted font-black uppercase tracking-wider font-mono">Today's Safe Spend</p>
                  <p className="text-xs font-semibold text-white/70 mt-1">
                    Spend comfortably up to{' '}
                    <span className="text-sm font-black text-bb-lime font-mono">
                      {currency}{Math.round(safeSpend).toLocaleString('en-IN')}
                    </span>{' '}
                    today
                  </p>
                </div>
              </div>
            )}

            {weatherForecast && (
              <div className="p-3.5 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border flex items-center gap-3">
                <div className={`w-8 h-8 rounded-bb-xs bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0 ${weatherForecast.color.split(' ')[2] || 'text-white'}`}>
                  <weatherForecast.icon size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider font-mono text-bb-text-muted">Financial Forecast</p>
                  <p className="text-xs font-bold text-white/90 mt-0.5">
                    {weatherForecast.title} &mdash; {weatherForecast.desc}
                  </p>
                </div>
              </div>
            )}

            {activeGoal && (
              <div className="p-3.5 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold select-none">
                  <span className="flex items-center gap-1.5 capitalize text-white/90">
                    <span>{activeGoal.emoji}</span>
                    <span>{activeGoal.title}</span>
                  </span>
                  <span className="text-bb-text-muted font-mono">
                    {Math.min(100, Math.round((activeGoal.current_amount / Math.max(activeGoal.target_amount || 1, 1)) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-bb-border h-1.5 rounded-bb-xs overflow-hidden border border-bb-border">
                  <div
                    className="h-full bg-bb-violet transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((activeGoal.current_amount / Math.max(activeGoal.target_amount || 1, 1)) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {subs.length > 0 && (() => {
              const nearest = subs.map(s => {
                const daysLeft = getDaysUntilDue(s);
                return { sub: s, daysLeft };
              }).sort((a, b) => a.daysLeft - b.daysLeft)[0];

              if (!nearest) return null;

              const freqLabel = nearest.sub.frequency === 'custom'
                ? `${nearest.sub.interval} ${nearest.sub.intervalType}`
                : nearest.sub.frequency.replace(/_/g, ' ');

              return (
                <div className="p-3.5 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm p-1.5 bg-white/5 rounded-bb-xs border border-white/10">{nearest.sub.emoji}</span>
                    <div>
                      <p className="text-[9px] text-bb-text-muted font-black uppercase tracking-wider font-mono">Upcoming Renewal</p>
                      <p className="text-xs font-bold text-white/90 mt-0.5">{nearest.sub.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-bb-coral font-mono">{currency}{nearest.sub.amount || nearest.sub.cost}</p>
                    <p className="text-[8px] text-bb-text-muted mt-0.5 capitalize">
                      {nearest.daysLeft === 0 ? 'Renews today!' : `In ${nearest.daysLeft} day${nearest.daysLeft === 1 ? '' : 's'} (${freqLabel})`}
                    </p>
                  </div>
                </div>
              );
            })()}

            {completedGoals.length > 0 && (
              <div className="p-3.5 rounded-bb-sm bg-white/[0.02] border-2 border-bb-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-bb-xs bg-bb-lime/10 border border-bb-lime/30 flex items-center justify-center text-bb-lime shrink-0">
                  <Trophy size={16} />
                </div>
                <div>
                  <p className="text-[9px] text-bb-text-muted font-black uppercase tracking-wider font-mono">Milestone Unlocked</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    Saved up completely for {completedGoals[0].title}! 🏆
                  </p>
                </div>
              </div>
            )}

            {/* AI Bro Reflection */}
            <div className="p-3.5 rounded-bb-sm bg-white/[0.01] border-2 border-bb-border border-l-4 border-l-bb-violet flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-[9px] font-mono text-white/30 uppercase font-bold select-none">
                <Sparkles size={10} className="text-bb-violet" />
                AI Bro
              </div>
              <p className="text-xs font-bold text-white/90 leading-relaxed">
                "{aiBroReflection}"
              </p>
              <p className="text-[8px] font-mono text-white/40 text-right font-semibold select-none">
                {selectedSignOff}
              </p>
            </div>
          </motion.div>

          {/* Fixed Footer */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="shrink-0 px-6 pb-6 pt-4 border-t border-white/[0.06]"
          >
            <Button
              variant="primary"
              className="w-full text-sm font-black uppercase tracking-wider"
              onClick={handleCloseBread}
            >
              Continue
            </Button>
          </motion.div>
        </>
      )}
    </Modal>
  );
}

export const DailyBreadModal = DailyWelcomeModal;
