export interface User {
  id: number;
  email: string;
  name: string;
  monthlyAllowance: number;
  currency: string;
  vibe?: 'toast' | 'roast';
  fidgetScore?: number;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  note: string | null;
  emoji: string;
  created_at: string;
  type?: 'income' | 'expense';
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  emoji: string;
}

export interface Summary {
  month: string;
  currency: string;
  allowance: number;
  spent: number;
  remaining: number;
  byCategory: CategorySummary[];
  dailyBurn: { day: string; total: number }[];
  recent: Expense[];
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'bro';
  content: string;
  intent?: string;
  created_at?: string;
}

export interface Goal {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
}
