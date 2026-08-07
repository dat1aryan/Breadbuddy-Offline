import { User } from './types';

const TOKEN_KEY = 'breadbuddy_token';
const USER_KEY = 'breadbuddy_user';

export function setAuth(token: string, user: User): void {
  const currentToken = localStorage.getItem(TOKEN_KEY);
  if (token !== currentToken) {
    // New login or signup: clear daily bread shown flags for this session
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('daily_bread_shown_')) {
        sessionStorage.removeItem(key);
      }
    }
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Clear daily bread shown flags for this session on logout
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('daily_bread_shown_')) {
      sessionStorage.removeItem(key);
    }
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
