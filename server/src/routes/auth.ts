import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/database';
import { signToken, AuthedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(60).trim(),
  monthlyAllowance: z.number().nonnegative().optional(),
  currency: z.string().min(1).max(4).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/signup', (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid signup data bestie.', details: parsed.error.flatten() });
  }
  const { email, password, name, monthlyAllowance, currency } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered. Try logging in 🫠' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      'INSERT INTO users (email, password_hash, name, monthly_allowance, currency) VALUES (?, ?, ?, ?, ?)'
    )
    .run(normalizedEmail, hash, name, monthlyAllowance ?? 0, currency ?? '₹');

  const id = Number(info.lastInsertRowid);
  const token = signToken({ id, email: normalizedEmail });
  res.json({
    token,
    user: { id, email, name, monthlyAllowance: monthlyAllowance ?? 0, currency: currency ?? '₹' },
  });
});

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad login input.' });
  }
  const { email, password } = parsed.data;
  const row = db
    .prepare('SELECT id, email, password_hash, name, monthly_allowance, currency, vibe FROM users WHERE email = ?')
    .get(email.toLowerCase()) as
    | { id: number; email: string; password_hash: string; name: string; monthly_allowance: number; currency: string; vibe: string }
    | undefined;
  if (!row) {
    return res.status(401).json({ error: 'No account with that email bestie.' });
  }
  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Wrong password 💀' });
  }
  const token = signToken({ id: row.id, email: row.email });
  res.json({
    token,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      monthlyAllowance: row.monthly_allowance,
      currency: row.currency,
      vibe: row.vibe,
    },
  });
});

router.get('/me', authMiddleware, (req: AuthedRequest, res) => {
  const row = db
    .prepare('SELECT id, email, name, monthly_allowance, currency, vibe FROM users WHERE id = ?')
    .get(req.userId!) as
    | { id: number; email: string; name: string; monthly_allowance: number; currency: string; vibe: string }
    | undefined;
  if (!row) return res.status(404).json({ error: 'User gone.' });
  res.json({
    id: row.id,
    email: row.email,
    name: row.name,
    monthlyAllowance: row.monthly_allowance,
    currency: row.currency,
    vibe: row.vibe,
  });
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  monthlyAllowance: z.number().nonnegative().optional(),
  currency: z.string().min(1).max(4).optional(),
  vibe: z.enum(['toast', 'roast']).optional(),
});

router.patch('/me', authMiddleware, (req: AuthedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid profile data.' });
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (parsed.data.name !== undefined) {
    updates.push('name = ?');
    values.push(parsed.data.name);
  }
  if (parsed.data.monthlyAllowance !== undefined) {
    updates.push('monthly_allowance = ?');
    values.push(parsed.data.monthlyAllowance);
  }
  if (parsed.data.currency !== undefined) {
    updates.push('currency = ?');
    values.push(parsed.data.currency);
  }
  if (parsed.data.vibe !== undefined) {
    updates.push('vibe = ?');
    values.push(parsed.data.vibe);
  }
  if (updates.length === 0) return res.json({ ok: true });
  values.push(req.userId!);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

export default router;
