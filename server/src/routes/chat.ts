import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { chat, QUICK_PROMPTS } from '../ai/chatbot';

const router = Router();

const messageSchema = z.object({
  message: z.string().min(1).max(500),
});

router.post('/message', authMiddleware, (req: AuthedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Empty message bestie.' });
  const userId = req.userId!;
  const reply = chat(parsed.data.message, userId);
  db.prepare(
    'INSERT INTO chat_messages (user_id, role, content, intent) VALUES (?, ?, ?, ?)'
  ).run(userId, 'user', parsed.data.message, null);
  db.prepare(
    'INSERT INTO chat_messages (user_id, role, content, intent) VALUES (?, ?, ?, ?)'
  ).run(userId, 'bro', reply.content, reply.intent);
  res.json(reply);
});

router.get('/history', authMiddleware, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT id, role, content, intent, created_at
       FROM chat_messages WHERE user_id = ?
       ORDER BY id DESC LIMIT 100`
    )
    .all(req.userId!);
  res.json({ messages: rows.reverse() });
});

router.get('/prompts', (_req, res) => {
  res.json({ prompts: QUICK_PROMPTS });
});

export default router;
