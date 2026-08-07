import { Router } from 'express';
import { db } from '../db/database';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();

// GET /api/fidget - retrieve user's current score
router.get('/', authMiddleware, (req: AuthedRequest, res) => {
  try {
    const user = db.prepare('SELECT fidget_score FROM users WHERE id = ?').get(req.userId!) as { fidget_score: number } | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found bestie 🫠' });
    }
    res.json({ fidget_score: user.fidget_score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database oof 💀' });
  }
});

// POST /api/fidget - increment user's score
router.post('/', authMiddleware, (req: AuthedRequest, res) => {
  try {
    const { points } = req.body;
    const increment = Number(points);
    
    if (isNaN(increment) || increment <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number bestie.' });
    }

    // Limit single update increments to prevent sanity breaks (max 500 per request)
    const sanitizedPoints = Math.min(increment, 500);

    db.prepare('UPDATE users SET fidget_score = fidget_score + ? WHERE id = ?').run(sanitizedPoints, req.userId!);
    
    const user = db.prepare('SELECT fidget_score FROM users WHERE id = ?').get(req.userId!) as { fidget_score: number };
    res.json({ fidget_score: user.fidget_score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database oof 💀' });
  }
});

export default router;
