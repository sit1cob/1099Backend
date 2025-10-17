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
import { assignmentsRouter } from './routes/assignments';
import { usersRouter } from './routes/users';
import { startJobWatcher } from './services/jobWatcher';
import { partsRouter } from './routes/parts';
import { uploadsRouter } from './routes/uploads';
import { logsRouter } from './routes/logs';
import textractRouter from './routes/textract';
import axios from 'axios';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://shs-1099-job-board.replit.app';

const PORT = Number(process.env.PORT || 5001);

async function main() {
  await connectMongo();
  // Start background watcher to notify on newly inserted jobs (requires Mongo replica set / Atlas)
  startJobWatcher().catch((err) => console.error('[JobWatcher] failed to start', err));

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
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/parts', partsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api/textract', textractRouter);

  // Photo proxy route - mirrors external API structure
  app.get('/uploads/photos/*', async (req, res) => {
    try {
      const photoPath = (req.params as any)[0];
      const fullPath = `/uploads/photos/${photoPath}`;
      
      console.log('[PhotoProxy] Downloading photo:', `${EXTERNAL_API_URL}${fullPath}`);

      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

      if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
      }

      const response = await axios({
        method: 'GET',
        url: `${EXTERNAL_API_URL}${fullPath}`,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'stream',
        timeout: 30000,
      });
      
      if (response.headers['content-type']) {
        res.setHeader('Content-Type', response.headers['content-type']);
      }
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      
      response.data.pipe(res);
    } catch (err: any) {
      console.error('[PhotoProxy] Error:', err.message);
      return res.status(err.response?.status || 500).json({ 
        success: false, 
        message: err.message || 'Failed to download photo' 
      });
    }
  });

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
