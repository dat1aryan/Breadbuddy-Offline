import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();

const createGoalSchema = z.object({
  title: z.string().min(1).max(100),
  target_amount: z.number().positive(),
  target_date: z.string().max(10).optional(),
});

const fundGoalSchema = z.object({
  amount: z.number().positive(),
});

router.post('/', authMiddleware, (req: AuthedRequest, res) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid goal details. Need title and positive target amount bestie!' });
  const { title, target_amount, target_date } = parsed.data;
  
  const info = db
    .prepare('INSERT INTO goals (user_id, title, target_amount, current_amount, target_date) VALUES (?, ?, ?, 0, ?)')
    .run(req.userId!, title, target_amount, target_date ?? null);
    
  res.json({
    id: Number(info.lastInsertRowid),
    title,
    target_amount,
    current_amount: 0,
    target_date: target_date ?? null,
    created_at: new Date().toISOString()
  });
});

router.get('/', authMiddleware, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT id, title, target_amount, current_amount, target_date, created_at FROM goals WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.userId!);
  res.json(rows);
});

router.delete('/:id', authMiddleware, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, req.userId!);
  if (result.changes === 0) return res.status(404).json({ error: 'Goal not found bestie 🫠' });
  res.json({ ok: true });
});

router.post('/:id/fund', authMiddleware, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = fundGoalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please enter a valid deposit amount!' });
  const { amount } = parsed.data;

  const result = db
    .prepare('UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?')
    .run(amount, id, req.userId!);

  if (result.changes === 0) return res.status(404).json({ error: 'Goal not found bestie 🫠' });

  const updated = db
    .prepare('SELECT id, title, target_amount, current_amount, target_date, created_at FROM goals WHERE id = ?')
    .get(id);

  res.json(updated);
});

export default router;
