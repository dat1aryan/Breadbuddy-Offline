import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import './db/database';
import authRoutes from './routes/auth';
import expenseRoutes, { EXPENSE_CATEGORIES } from './routes/expenses';
import chatRoutes from './routes/chat';
import fidgetRoutes from './routes/fidget';
import goalsRoutes from './routes/goals';

dotenv.config();

const app = express();
const PORT = Number(process.env.BREADBUDDY_PORT || process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts bestie, chill for a bit 🧊' },
});

app.use('/api/auth', authLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'BreadBuddy', vibes: 'immaculate' });
});

app.get('/api/categories', (_req, res) => {
  res.json({ categories: EXPENSE_CATEGORIES });
});

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/fidget', fidgetRoutes);
app.use('/api/goals', goalsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found bestie 🫠' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🚨 server error:', err);
  res.status(500).json({ error: err.message || 'Server oof 💀' });
});

const startServer = (port: number) => {
  app.listen(port, () => {
    console.log(`🍞 BreadBuddy server listening on http://localhost:${port}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`🚨 Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('🚨 server error:', err);
      process.exit(1);
    }
  });
};

startServer(PORT);
