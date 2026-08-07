import { financeEngine } from './financeEngine';
import { streakEngine } from './streakEngine';
import { savingsEngine } from './savingsEngine';

export interface ChatReply {
  content: string;
  intent: string;
}

export interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  emoji: string;
}

export interface Pattern {
  title: string;
  description: string;
  emoji: string;
}

interface IntentDef {
  name: string;
  keywords: Record<string, number>;
  threshold: number;
}

const INTENTS: IntentDef[] = [
  {
    name: 'afford_check',
    keywords: {
      afford: 3, 'can i': 2, enough: 2, short: 2, budget: 2, broke: 2, brokeaf: 2,
      survival: 1, survive: 1, treat: 2, buy: 2, purchase: 2, splurge: 2,
    },
    threshold: 3,
  },
  {
    name: 'spending_summary',
    keywords: {
      'how much': 3, spent: 3, total: 2, summary: 3, status: 1, recap: 2, overview: 2,
      'where did': 3, 'so far': 1, balance: 1, breakdown: 2,
    },
    threshold: 3,
  },
  {
    name: 'category_breakdown',
    keywords: {
      food: 1, munchies: 2, swiggy: 3, zomato: 3, cafe: 2, party: 2, club: 2, vibes: 1,
      transport: 2, uber: 2, metro: 2, auto: 2, drip: 2, clothes: 2, shoes: 2, shop: 2,
      subs: 2, netflix: 3, spotify: 3, books: 2, hostel: 1, mess: 1, groceries: 2,
    },
    threshold: 2,
  },
  {
    name: 'prediction',
    keywords: {
      'run out': 3, 'last till': 3, 'how long': 3, 'end of month': 3, survive: 2,
      prediction: 2, predict: 2, 'zero by': 3, 'when will': 2, burn: 2, projection: 2,
    },
    threshold: 3,
  },
  {
    name: 'tips',
    keywords: {
      tips: 3, advice: 3, save: 2, saving: 2, hack: 2, hacks: 2, tip: 2, suggest: 2,
      ideas: 1, reduce: 2, cut: 2, cheaper: 2, frugal: 2, budget: 2,
    },
    threshold: 3,
  },
  {
    name: 'motivation',
    keywords: {
      hype: 3, motivate: 3, mood: 2, feeling: 1, sad: 2, depress: 2, anxious: 2,
      stress: 2, 'am i': 1, doing: 1, okay: 1, 'going great': 2, 'i did it': 2,
      proud: 2, encourage: 3, 'lock in': 2, vibes: 2,
    },
    threshold: 3,
  },
  {
    name: 'girl_math',
    keywords: {
      'girl math': 4, 'boy math': 4, justify: 3, worth: 2, 'per day': 3, 'cost per': 3,
      'how much per': 4, rationalize: 3, convince: 3, treat: 1,
    },
    threshold: 4,
  },
  {
    name: 'streak',
    keywords: {
      streak: 3, day: 1, days: 1, record: 2, 'no spend': 4, 'no-spend': 4, 'days left': 2,
    },
    threshold: 3,
  },
  {
    name: 'income_summary',
    keywords: {
      income: 3, salary: 3, earned: 3, earnings: 3, pocket: 2, parents: 2, freelance: 3, gain: 2, deposit: 1,
    },
    threshold: 2,
  },
  {
    name: 'savings_summary',
    keywords: {
      saved: 3, savings: 3, goal: 2, goals: 2, fund: 2, funded: 2,
    },
    threshold: 2,
  },
  {
    name: 'transaction_count',
    keywords: {
      transactions: 3, logged: 2, count: 2, records: 2, entries: 2, history: 2,
    },
    threshold: 3,
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['food', 'mess', 'groceries', 'hostel', 'meals', 'tiffin', 'chai', 'breakfast', 'lunch', 'dinner', 'munchies', 'snack', 'snacks', 'cafe', 'coffee', 'starbucks', 'zomato', 'swiggy', 'restaurant', 'boba'],
  transport: ['uber', 'ola', 'auto', 'metro', 'bus', 'train', 'petrol', 'fuel', 'rapido', 'commute', 'transport'],
  shopping: ['drip', 'clothes', 'shoes', 'shopping', 'mall', 'fashion', 'makeup', 'skincare', 'zara', 'h&m'],
  entertainment: ['vibes', 'club', 'clubs', 'party', 'parties', 'bar', 'movie', 'movies', 'concert', 'outing', 'hangout', 'entertainment'],
  bills: ['subs', 'subscription', 'netflix', 'spotify', 'prime', 'disney', 'hotstar', 'youtube', 'apple', 'icloud', 'gym', 'bills'],
  education: ['books', 'notes', 'stationery', 'printing', 'project', 'society', 'fest', 'course', 'tuition', 'education'],
};

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^\w\s\u20B9]/g, ' ').split(/\s+/).filter(Boolean);
}

function detectIntent(message: string): { intent: string | null; score: number } {
  const tokens = new Set(tokenize(message));
  const lower = message.toLowerCase();
  let best = { intent: null as string | null, score: 0 };
  for (const def of INTENTS) {
    let score = 0;
    for (const [kw, weight] of Object.entries(def.keywords)) {
      if (tokens.has(kw) || lower.includes(kw)) score += weight;
    }
    if (score > best.score && score >= def.threshold) {
      best = { intent: def.name, score };
    }
  }
  return best;
}

function detectCategory(message: string): string | null {
  const lower = message.toLowerCase();
  let best = { cat: null as string | null, hits: 0 };
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    let hits = 0;
    for (const w of words) if (lower.includes(w)) hits++;
    if (hits > best.hits) best = { cat, hits };
  }
  return best.cat;
}

function extractAmount(message: string): number | null {
  const m = message.match(/(?:\u20B9|rs\.?|inr|\$|€|£|usd)?\s*(\d+(?:[,]\d+)*(?:\.\d+)?)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt(n: number, currency: string): string {
  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  return `${currency}${Math.round(n).toLocaleString(locale)}`;
}

export const aiBroEngine = {
  generateReply(message: string, userId: number, userVibe: 'toast' | 'roast' = 'toast'): ChatReply {
    const list = financeEngine.getTransactionsForCycle(userId);
    const expenses = list.filter((t) => t.type === 'expense');
    const user = JSON.parse(localStorage.getItem('breadbuddy_user') || '{}');
    const allowance = user.monthlyAllowance || 0;
    const currency = user.currency || '₹';
    const spent = expenses.reduce((acc, t) => acc + t.amount, 0);
    const remaining = allowance - spent;

    // Group expenses by category
    const byCategoryMap: Record<string, { total: number; count: number; emoji: string }> = {};
    expenses.forEach((e) => {
      const catVal = e.category;
      const emoji = e.emoji || financeEngine.getCategoryEmoji(catVal, userId);
      if (!byCategoryMap[catVal]) {
        byCategoryMap[catVal] = { total: 0, count: 0, emoji };
      }
      byCategoryMap[catVal].total += e.amount;
      byCategoryMap[catVal].count += 1;
    });

    const byCategory = Object.entries(byCategoryMap).map(([category, info]) => ({
      category,
      total: info.total,
      count: info.count,
      emoji: info.emoji,
    })).sort((a, b) => b.total - a.total);

    const ctx = {
      userId,
      currency,
      allowance,
      spent,
      remaining,
      byCategory,
      recent: expenses.slice(0, 10),
    };

    const trimmed = message.trim();
    if (!trimmed) return { content: this.fallback(ctx, userVibe), intent: 'fallback' };

    const { intent } = detectIntent(trimmed);
    let content = '';

    switch (intent) {
      case 'spending_summary':
        content = this.handleSpendingSummary(ctx);
        break;
      case 'category_breakdown':
        content = this.handleCategoryBreakdown(ctx, trimmed);
        break;
      case 'afford_check':
        content = this.handleAfford(ctx, trimmed, userVibe);
        break;
      case 'prediction':
        content = this.handlePrediction(ctx);
        break;
      case 'tips':
        content = this.handleTips(ctx, userVibe);
        break;
      case 'motivation':
        content = this.handleMotivation(ctx, userVibe);
        break;
      case 'girl_math':
        content = this.handleGirlMath(ctx, trimmed, userVibe);
        break;
      case 'streak':
        content = this.handleStreak(userId);
        break;
      case 'income_summary':
        content = this.handleIncomeSummary(ctx);
        break;
      case 'savings_summary':
        content = this.handleSavingsSummary(ctx);
        break;
      case 'transaction_count':
        content = this.handleTransactionCount(ctx);
        break;
      default:
        content = this.fallback(ctx, userVibe);
    }

    return { content, intent: intent || 'fallback' };
  },

  handleSpendingSummary(ctx: any): string {
    if (ctx.allowance === 0) {
      return pick([
        `Bestie, you've dropped ${fmt(ctx.spent, ctx.currency)} this month but you haven't set your allowance yet. Set it in settings so I can keep you in check 💅`,
      ]);
    }
    const pct = Math.round((ctx.spent / ctx.allowance) * 100);
    if (pct < 25) return pick([`You're only at ${pct}% of your allowance bestie. This is your savings era ✨ keep going fr.`]);
    if (pct < 50) return pick([`Halfway-ish, you've spent ${fmt(ctx.spent, ctx.currency)} (${pct}%). Pace yourself bestie, no cap 📈`]);
    if (pct < 75) return pick([`Babe 👀 you've burned ${pct}% (${fmt(ctx.spent, ctx.currency)}). Vibey but 🚨 chill a little.`]);
    if (pct < 95) return pick([`RED ALERT 🚨 ${pct}% gone. ${fmt(ctx.remaining, ctx.currency)} left. Lock in bestie.`]);
    return pick([`BFFR 💀 you've spent ${fmt(ctx.spent, ctx.currency)} of ${fmt(ctx.allowance, ctx.currency)}. We're basically on our last hope.`]);
  },

  handleCategoryBreakdown(ctx: any, message: string): string {
    const cat = detectCategory(message);
    if (!cat) return this.handleSpendingSummary(ctx);
    const found = ctx.byCategory.find((c: any) => c.category.toLowerCase() === cat.toLowerCase());
    if (!found) return pick([
      `No ${cat} spends this month bestie, slay ✨`,
      `You haven't spent on ${cat} yet this month. Manifesting it or staying strong?? 💅`,
    ]);
    return pick([
      `On ${found.category}: ${fmt(found.total, ctx.currency)} across ${found.count} txns. ${found.emoji} Main character energy honestly.`,
      `You've dropped ${fmt(found.total, ctx.currency)} on ${found.category} (${found.count} times). ${found.emoji} Let's keep tabs 🫣`,
      `${found.category.charAt(0).toUpperCase() + found.category.slice(1)} cost you ${fmt(found.total, ctx.currency)} this month, bestie. ${found.emoji}`,
    ]);
  },

  handleAfford(ctx: any, message: string, vibe: string): string {
    const amount = extractAmount(message);
    if (amount === null) {
      return `Tell me the price bestie — like "can I afford ₹500?" and I'll do the math 💅`;
    }
    if (ctx.allowance === 0) {
      return `Set your allowance in settings first and I'll be the bestie that maths it out 🧮`;
    }

    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);
    const dailyBudget = Math.max(0, ctx.remaining / remainingDays);

    if (amount <= ctx.remaining && amount <= dailyBudget * 2) {
      const verdicts = vibe === 'roast' ? [
        `Sure 😭 go for it. ${fmt(amount, ctx.currency)} is fine, you have ${fmt(ctx.remaining, ctx.currency)} left. Treat yourself queen 👑`,
        `You CAN secure the bag. ${fmt(amount, ctx.currency)} out of remaining ${fmt(ctx.remaining, ctx.currency)}. Go off bestie ✨`,
      ] : [
        `Yes bestie ✨ ${fmt(amount, ctx.currency)} is within budget. Manifesting! 💅`,
        `Fr you can afford it. ${fmt(amount, ctx.currency)} is chill given your remaining ${fmt(ctx.remaining, ctx.currency)} 💸`,
        `Girl math says yes 🧮 ${fmt(amount, ctx.currency)} fits.`,
      ];
      return pick(verdicts);
    }
    if (amount <= ctx.remaining) {
      return pick(vibe === 'roast' ? [
        `You can technically afford it (${fmt(ctx.remaining, ctx.currency)} left) but your daily budget is only ${fmt(dailyBudget, ctx.currency)}. Are you trying to starve 💀`,
        `BFFR you have ₹${ctx.remaining} but you're hitting ₹0 by month-end at this rate 🛑`,
      ] : [
        `Hmm, technically yes — ${fmt(amount, ctx.currency)} fits in your remaining ${fmt(ctx.remaining, ctx.currency)} — but your daily budget is just ${fmt(dailyBudget, ctx.currency)}. Cautious yes ⚠️`,
        `Borderline bestie 🫣 Daily budget is ${fmt(dailyBudget, ctx.currency)}. Take it slow.`,
      ]);
    }
    return pick(vibe === 'roast' ? [
      `LMAOOO 💀 you're ${fmt(amount - ctx.remaining, ctx.currency)} short. Absolute delusion. Skip it or compute later 💅`,
      `Girl NO 😭 ${fmt(amount, ctx.currency)} when you only have ${fmt(ctx.remaining, ctx.currency)}? Skibidi toilet paper math 🧻`,
      `Hard no bestie. You're ${fmt(amount - ctx.remaining, ctx.currency)} short. Keep your coins 🪙`,
    ] : [
      `Bestie, hard pass 💔 you only have ${fmt(ctx.remaining, ctx.currency)} and that's ${fmt(amount - ctx.remaining, ctx.currency)} short. Save it for next month 🫶`,
      `Not happening 💫 you need ${fmt(amount - ctx.remaining, ctx.currency)} more. C'est la vie.`,
    ]);
  },

  handlePrediction(ctx: any): string {
    if (ctx.allowance === 0 || ctx.spent === 0) {
      return `Start logging some spends bestie, then I'll vibe-check your burn rate ✨`;
    }
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (dayOfMonth < 2) {
      const dailyBurn = ctx.spent;
      const projected = dailyBurn * daysInMonth;
      return `Kinda early to predict but at this pace you'll spend ${fmt(projected, ctx.currency)} by month-end. Stay woke 👀`;
    }
    const dailyBurn = ctx.spent / dayOfMonth;
    if (ctx.remaining <= 0) {
      return `You're already over budget bestie 💀 consider going into savings mode immediately.`;
    }
    const daysLeft = Math.floor(ctx.remaining / Math.max(1, dailyBurn));
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysLeft);
    return pick([
      `At this burn rate (${fmt(dailyBurn, ctx.currency)}/day), you're hitting ₹0 by ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Lock in 🛑`,
      `Bestie math: ${fmt(dailyBurn, ctx.currency)}/day × the rest of the month = bad vibes. Hit zero around ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} unless we chill 📉`,
      `Your bread goes bye-bye around ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} 🪙 Time to vibe slower.`,
    ]);
  },

  handleTips(ctx: any, vibe: string): string {
    const top = ctx.byCategory[0];
    const tips = vibe === 'roast' ? [
      `Cancel something you don't use fr 📺 subscriptions add up silently.`,
      `Cook once a week, save your coins on munchies 🍳`,
      `Cap Uber, walk or take the metro when possible 🛺 no cap.`,
      `Set a "no spend day" challenge 2x a week 🧊`,
      `Girl math is great but real math is better 🧮 track before you tap.`,
    ] : [
      `Try the 50/30/20 rule — needs, wants, savings. Vibes 💅`,
      `Cap your top category this week and revisit Sunday ✨`,
      `Round-up savings: every time you spend ${fmt(50, ctx.currency)}, auto-put the spare change away 🐷`,
      `Cancel one sub you forgot about. Future you says thanks 🫶`,
      `Meal-prep once a week, future-you locks in 🔐`,
    ];
    const intro = top ? `You spent the most on ${top.category} (${fmt(top.total, ctx.currency)}). Maybe trim there ✂️. ` : `Vibes `;
    return intro + pick(tips);
  },

  handleMotivation(ctx: any, vibe: string): string {
    const pct = ctx.allowance > 0 ? (ctx.spent / ctx.allowance) * 100 : 0;
    if (pct < 30) return pick([
      `You're absolutely in your savings era ✨ keep going bestie, no cap 💅`,
      `Main character financial arc 🎬 you're locked in.`,
      `W vibes only. Keep this energy 🦋`,
    ]);
    if (pct < 70) return pick([
      `Honestly? You're doing fine bestie 👏 just stay consistent.`,
      `Golden retriever energy rn — keep going you got this 🐶💛`,
    ]);
    return vibe === 'roast'
      ? pick([
          `Babe we're in mid-spend territory 🫠 it's not too late to back off Swiggy.`,
          `Delulu is not the solulu here. Lock in for the rest of the month 💅`,
        ])
      : pick([
          `Don't stress bestie, awareness is half the battle 🤍 you'll know better next month.`,
          `It's okay, every month is a vibe check. Reset and try again 💖`,
        ]);
  },

  handleGirlMath(ctx: any, message: string, vibe: string): string {
    const amount = extractAmount(message);
    if (!amount) {
      return pick([
        `Hit me with a price bestie and I'll do the girl math ✨ e.g. "girl math a ₹2000 bag"`,
        `Drop the amount like "justify ₹1500" and watch me cook 🧮💅`,
      ]);
    }
    const cat = detectCategory(message) || ctx.byCategory[0]?.category || 'thing';
    const usesMap: Record<string, number> = {
      outfit: 30, dress: 30, shoes: 50, bag: 100, watch: 365, sub: 365, subscription: 365,
      snack: 7, coffee: 30, munchies: 7, cafe: 15, movie: 4,
    };
    const uses = usesMap[cat] ?? 30;
    const perDay = amount / uses;
    return vibe === 'roast'
      ? `Girl math-ing it: ${fmt(amount, ctx.currency)} ÷ ${uses} uses = ${fmt(perDay, ctx.currency)}/day. Still cap 🧢 bestie.`
      : `Girl math activated 🧮 ${fmt(amount, ctx.currency)} ÷ ${uses} uses = ${fmt(perDay, ctx.currency)} per day. Basically free, treat yourself ✨`;
  },

  handleStreak(userId?: number): string {
    if (!userId) {
      return pick([
        `Build a no-spend streak bestie 🔥 even 2 days/week compounds.`,
        `Try a 7-day no-spend challenge. Quiet luxury unlocked 🤫`,
        `Streaks = dopamine. Day 1 starts now, go 🧊`,
      ]);
    }
    const streakState = streakEngine.getStreak(userId);
    if (streakState.currentStreak === 0) {
      return `You don't have an active streak yet bestie 🧊 Open BreadBuddy daily or log a transaction to start your streak!`;
    }
    return `You're currently on a 🔥 ${streakState.currentStreak}-day active streak! Your all-time record is ${streakState.longestStreak} days. Keep it rolling! ✨`;
  },

  handleIncomeSummary(ctx: any): string {
    const allList = financeEngine.getTransactionsForCycle(ctx.userId);
    const incomes = allList.filter((t) => t.type === 'income');
    if (incomes.length === 0) {
      return pick([
        `No additional income logged yet this cycle bestie 💸. Base allowance is ${fmt(ctx.allowance, ctx.currency)}. Log salary or pocket money anytime!`,
        `You haven't logged any income entries this month. Your base allowance is ${fmt(ctx.allowance, ctx.currency)} ✨.`,
      ]);
    }
    const totalInc = incomes.reduce((acc, t) => acc + t.amount, 0);
    const count = incomes.length;
    return pick([
      `You've logged ${fmt(totalInc, ctx.currency)} in income across ${count} transaction${count === 1 ? '' : 's'} this cycle! 💸 Secure that bag!`,
      `Income recap: ${fmt(totalInc, ctx.currency)} total incoming flow from ${count} entry/entries. Total effective allowance is ${fmt(ctx.allowance + totalInc, ctx.currency)} ✨`,
    ]);
  },

  handleSavingsSummary(ctx: any): string {
    const goals = savingsEngine.getGoals(ctx.userId);
    const totalSavedInGoals = goals.reduce((acc, g) => acc + g.current_amount, 0);
    const allList = financeEngine.getTransactions(ctx.userId);
    const savingsTxs = allList.filter((t) => t.category === 'savings');
    const savingsTxCount = savingsTxs.length;

    if (goals.length === 0 && savingsTxCount === 0) {
      return pick([
        `No savings goals or deposits logged yet bestie 🎯. Set up a goal in the Goals section to start your savings era!`,
      ]);
    }
    return pick([
      `You've set aside ${fmt(totalSavedInGoals, ctx.currency)} across your savings goals with ${savingsTxCount} deposit transaction${savingsTxCount === 1 ? '' : 's'}! 🎯 Keep stacking that dough!`,
      `Savings check: ${fmt(totalSavedInGoals, ctx.currency)} accumulated in savings goals so far ✨. That's true main character energy!`,
    ]);
  },

  handleTransactionCount(ctx: any): string {
    const allList = financeEngine.getTransactions(ctx.userId);
    const totalCount = allList.length;
    const expensesCount = allList.filter((t) => t.type === 'expense').length;
    const incomeCount = allList.filter((t) => t.type === 'income').length;

    if (totalCount === 0) {
      return `You haven't logged any transactions yet bestie 🚀. Click "Add Record" to log your first expense, income, or goal savings move!`;
    }

    return pick([
      `You've logged ${totalCount} total transaction${totalCount === 1 ? '' : 's'} (${expensesCount} expense${expensesCount === 1 ? '' : 's'}, ${incomeCount} income${incomeCount === 1 ? '' : 's'})! 📊 Keep up the tracking streak!`,
      `Transaction count: ${totalCount} total entries in your ledger (${expensesCount} outgoing, ${incomeCount} incoming). Organized king/queen behavior 💅`,
    ]);
  },

  fallback(_ctx: any, vibe: string): string {
    return vibe === 'roast'
      ? pick([
          `No thoughts just vibes 💀 try asking about spending, "afford ₹X", "tips", or "burn rate" bestie.`,
          `404 brain cells, ask me about your spends fr 🧠`,
          `I'm Bro, your money's bestie. Ask: "where did my money go" / "can I afford ₹500" / "give me tips" 💅`,
        ])
      : pick([
          `I can help with: spending summary, category breakdowns, "can I afford X", and savings tips ✨ try one!`,
          `Hey bestie 💖 ask: "how much have I spent", "can I afford ₹500", or "give me tips"`,
          `Energy matched, but no thoughts just empty vibes 🫠 try: "summary" or "tips"`,
        ]);
  },

  getPersonalizedInsights(userId: number): Insight[] {
    const list = financeEngine.getTransactionsForCycle(userId);
    const expenses = list.filter((t) => t.type === 'expense');
    if (expenses.length < 3) return [];

    const user = JSON.parse(localStorage.getItem('breadbuddy_user') || '{}');
    const currency = user.currency || '₹';

    const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);
    const insights: Insight[] = [];

    // Biggest spending category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
      const [topCat, topVal] = sortedCategories[0];
      const pct = Math.round((topVal / totalSpent) * 100);
      insights.push({
        type: 'warning',
        title: `Category Heavyweight: ${topCat.toUpperCase()}`,
        description: `You've dropped ${fmt(topVal, currency)} here, which is ${pct}% of your total spending.`,
        emoji: financeEngine.getCategoryEmoji(topCat, userId),
      });
    }

    // Top merchants
    const merchantTotals: Record<string, { total: number; count: number }> = {};
    expenses.forEach((e) => {
      const title = e.title.trim().toLowerCase();
      if (!merchantTotals[title]) {
        merchantTotals[title] = { total: 0, count: 0 };
      }
      merchantTotals[title].total += e.amount;
      merchantTotals[title].count += 1;
    });
    const sortedMerchants = Object.entries(merchantTotals).sort((a, b) => b[1].total - a[1].total);
    if (sortedMerchants.length > 0 && sortedMerchants[0][1].count >= 2) {
      const [name, info] = sortedMerchants[0];
      insights.push({
        type: 'info',
        title: `Top Merchant: ${name.charAt(0).toUpperCase() + name.slice(1)}`,
        description: `You spent ${fmt(info.total, currency)} here across ${info.count} transactions.`,
        emoji: '🏪',
      });
    }

    // Average daily spending
    const daysWithSpend = new Set(expenses.map((e) => e.date)).size;
    if (daysWithSpend > 1) {
      const dailyAvg = totalSpent / daysWithSpend;
      insights.push({
        type: 'info',
        title: 'Average Daily Spend',
        description: `On days you spend, you average about ${fmt(dailyAvg, currency)} per day.`,
        emoji: '💸',
      });
    }

    return insights;
  },

  getSpendingPatterns(userId: number): Pattern[] {
    const list = financeEngine.getTransactions(userId);
    const expenses = list.filter((t) => t.type === 'expense');
    if (expenses.length < 3) return [];

    const user = JSON.parse(localStorage.getItem('breadbuddy_user') || '{}');
    const currency = user.currency || '₹';

    const patterns: Pattern[] = [];

    // Weekend overspending detection
    const weekendExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      const day = d.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    const weekdayExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      const day = d.getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    });

    const weekendDays = new Set(weekendExpenses.map((e) => e.date)).size;
    const weekdayDays = new Set(weekdayExpenses.map((e) => e.date)).size;

    if (weekendDays >= 1 && weekdayDays >= 2) {
      const weekendTotal = weekendExpenses.reduce((acc, e) => acc + e.amount, 0);
      const weekdayTotal = weekdayExpenses.reduce((acc, e) => acc + e.amount, 0);

      const weekendAvg = weekendTotal / weekendDays;
      const weekdayAvg = weekdayTotal / weekdayDays;

      if (weekendAvg > weekdayAvg * 1.3) {
        patterns.push({
          title: 'Weekend Spend Spike 🍹',
          description: `You average ${fmt(weekendAvg, currency)} on weekends compared to ${fmt(weekdayAvg, currency)} on weekdays.`,
          emoji: '🎉',
        });
      }
    }

    // Category concentration (accounts for > 40%)
    const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val / totalSpent > 0.4) {
        patterns.push({
          title: `Category Concentration: ${cat.toUpperCase()}`,
          description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} accounts for ${Math.round((val / totalSpent) * 100)}% of your monthly outflows.`,
          emoji: financeEngine.getCategoryEmoji(cat, userId),
        });
      }
    });

    // Frequent Purchases
    const titleCounts: Record<string, number> = {};
    expenses.forEach((e) => {
      const title = e.title.trim().toLowerCase();
      titleCounts[title] = (titleCounts[title] || 0) + 1;
    });
    Object.entries(titleCounts).forEach(([title, count]) => {
      if (count > 3) {
        patterns.push({
          title: `Frequent Purchase: ${title.charAt(0).toUpperCase() + title.slice(1)}`,
          description: `You bought this ${count} times this month alone.`,
          emoji: '🔄',
        });
      }
    });

    // Spending Spikes
    const avgTxn = totalSpent / expenses.length;
    expenses.forEach((e) => {
      if (e.amount > avgTxn * 3) {
        patterns.push({
          title: `Spending Spike`,
          description: `Transaction "${e.title}" of ${fmt(e.amount, currency)} is more than 3x your average transaction of ${fmt(avgTxn, currency)}.`,
          emoji: '⚡',
        });
      }
    });

    return patterns;
  },
};
