import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectMongo } from './mongo/connection';
import { authRouter } from './routes/auth';
import { vendorsRouter } from './routes/vendors';
import { jobsRouter } from './routes/jobs';
import { usersRouter } from './routes/users';

const PORT = Number(process.env.PORT || 5001);

async function main() {
  await connectMongo();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'job-board-mongo-api' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/users', usersRouter);

  // Not found handler
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[ERROR]', err);
    res.status(500).json({ success: false, message: err?.message || 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
