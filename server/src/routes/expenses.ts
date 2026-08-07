import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();

const categoryEmojis: Record<string, string> = {
  sustenance: '🍱',
  munchies: '🍕',
  vibes: '🎉',
  drip: '👟',
  commute: '🛺',
  subs: '📺',
  academia: '📚',
  oops: '🫠',
  other: '✨',
};

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).max(40),
  note: z.string().max(200).optional(),
});

router.post('/', authMiddleware, (req: AuthedRequest, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid expense.' });
  const { amount, category, note } = parsed.data;
  const emoji = categoryEmojis[category.toLowerCase()] || '✨';
  const info = db
    .prepare('INSERT INTO expenses (user_id, amount, category, note, emoji) VALUES (?, ?, ?, ?, ?)')
    .run(req.userId!, amount, category.toLowerCase(), note ?? null, emoji);
  res.json({ id: Number(info.lastInsertRowid), amount, category: category.toLowerCase(), note, emoji });
});

router.get('/', authMiddleware, (req: AuthedRequest, res) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const rows = db
    .prepare(
      `SELECT id, amount, category, note, emoji, created_at
       FROM expenses
       WHERE user_id = ? AND substr(created_at, 1, 7) = ?
       ORDER BY created_at DESC`
    )
    .all(req.userId!, month);
  res.json({ month, expenses: rows });
});

router.delete('/:id', authMiddleware, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, req.userId!);
  if (result.changes === 0) return res.status(404).json({ error: 'Expense not found.' });
  res.json({ ok: true });
});

router.get('/summary', authMiddleware, (req: AuthedRequest, res) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const user = db
    .prepare('SELECT monthly_allowance, currency FROM users WHERE id = ?')
    .get(req.userId!) as { monthly_allowance: number; currency: string } | undefined;
  const allowance = user?.monthly_allowance || 0;
  const currency = user?.currency || '₹';

  const total = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND substr(created_at, 1, 7) = ?')
    .get(req.userId!, month) as { total: number };

  const byCategory = db
    .prepare(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count, MAX(emoji) AS emoji
       FROM expenses WHERE user_id = ? AND substr(created_at, 1, 7) = ?
       GROUP BY category ORDER BY total DESC`
    )
    .all(req.userId!, month);

  const dailyBurn = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, SUM(amount) AS total
       FROM expenses WHERE user_id = ? AND substr(created_at, 1, 7) = ?
       GROUP BY day ORDER BY day ASC`
    )
    .all(req.userId!, month);

  const recent = db
    .prepare(
      `SELECT id, amount, category, note, emoji, created_at
       FROM expenses WHERE user_id = ? AND substr(created_at, 1, 7) = ?
       ORDER BY created_at DESC LIMIT 5`
    )
    .all(req.userId!, month);

  res.json({
    month,
    currency,
    allowance,
    spent: total.total,
    remaining: allowance - total.total,
    byCategory,
    dailyBurn,
    recent,
  });
});

export const EXPENSE_CATEGORIES = categoryEmojis;

export default router;
