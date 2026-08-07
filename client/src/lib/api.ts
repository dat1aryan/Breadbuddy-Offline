import { getToken, clearAuth } from './auth';
import { User, Summary, Expense, ChatMessage, Goal } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    clearAuth();
    window.location.href = '/';
    throw new Error(data.error || 'Session expired. Please sign in again.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  signup: (body: { email: string; password: string; name: string; monthlyAllowance?: number }) =>
    request<{ token: string; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<User>('/auth/me'),

  updateProfile: (body: Partial<User>) =>
    request<{ ok: boolean }>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  getSummary: () => request<Summary>('/expenses/summary'),

  getExpenses: (month?: string) =>
    request<{ month: string; expenses: Expense[] }>(`/expenses${month ? `?month=${month}` : ''}`),

  createExpense: (body: { amount: number; category: string; note?: string }) =>
    request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) }),

  deleteExpense: (id: number) => request<{ ok: boolean }>(`/expenses/${id}`, { method: 'DELETE' }),

  sendChat: (message: string) => request<{ content: string; intent: string }>('/chat/message', { method: 'POST', body: JSON.stringify({ message }) }),

  getChatHistory: () => request<{ messages: ChatMessage[] }>('/chat/history'),

  getPrompts: () => request<{ prompts: string[] }>('/chat/prompts'),

  getCategories: () => request<{ categories: Record<string, string> }>('/categories'),

  getFidgetScore: () => request<{ fidget_score: number }>('/fidget'),

  incrementFidgetScore: (points: number) =>
    request<{ fidget_score: number }>('/fidget', { method: 'POST', body: JSON.stringify({ points }) }),

  getGoals: () => request<Goal[]>('/goals'),

  createGoal: (body: { title: string; target_amount: number; target_date?: string }) =>
    request<Goal>('/goals', { method: 'POST', body: JSON.stringify(body) }),

  deleteGoal: (id: number) => request<{ ok: boolean }>(`/goals/${id}`, { method: 'DELETE' }),

  fundGoal: (id: number, amount: number) =>
    request<Goal>(`/goals/${id}/fund`, { method: 'POST', body: JSON.stringify({ amount }) }),
};
