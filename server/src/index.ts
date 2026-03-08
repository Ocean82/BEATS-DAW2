import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileRouter } from './routes/files.js';
import { projectRouter } from './routes/projects.js';
import { exportRouter } from './routes/export.js';
import { stemRouter } from './routes/stems.js';
import { appLogger } from './logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/files', fileRouter);
app.use('/api/projects', projectRouter);
app.use('/api/export', exportRouter);
app.use('/api/stems', stemRouter);

app.use((err: Error, req: express.Request, res: express.Response) => {
  appLogger.errorStack('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  appLogger.info(`BEATS-DAW Backend running on port ${PORT}`);
});
