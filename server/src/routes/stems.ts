import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { appLogger } from '../logger.js';

const router = Router();

// Local file upload handling
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
    }
  }
});

// Python stem service (default port 5000)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL ?? 'http://localhost:5000';
// Base URL for links returned to the client (default: Node API on 3001)
const PUBLIC_API_BASE = process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;

router.post('/split', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    appLogger.info('Stem split request', { file: req.file.originalname, sizeMb: (req.file.size / 1024 / 1024).toFixed(1) });

    const stemsParam = (req.body as { stems?: string }).stems || '4';
    const quality = (req.body as { quality?: string }).quality || 'high';

    // Forward to Python service
    const formData = new FormData();
    const fileStream = await fs.readFile(req.file.path);
    formData.append('file', fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append('stems', stemsParam);
    formData.append('quality', quality);

    appLogger.info('Forwarding to Python service for stem separation', { stems: stemsParam, quality });

    const response = await fetch(`${PYTHON_SERVICE_URL}/split`, {
      method: 'POST',
      body: formData as unknown as BodyInit,
    });

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Python service error: ${error}`);
    }

    interface SplitResponse {
      job_id: string;
      status: string;
      stems: Array<{ name: string; size: number }>;
    }
    const result = (await response.json()) as SplitResponse;

    const stems = result.stems.map((stem) => ({
      name: stem.name,
      url: `${PUBLIC_API_BASE}/api/stems/download/${result.job_id}/${stem.name}.wav`,
      size: stem.size,
    }));

    res.json({
      jobId: result.job_id,
      status: result.status,
      stems,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    appLogger.errorStack('Stem split error', error instanceof Error ? error : new Error(message));
    res.status(500).json({
      error: 'Failed to split stems',
      details: message,
      hint: 'Make sure Python service is running: cd server && python python_service/stem_splitter.py'
    });
  }
});

router.get('/download/:jobId/:stemName', async (req, res) => {
  try {
    const { jobId, stemName } = req.params;

    const response = await fetch(`${PYTHON_SERVICE_URL}/download/${jobId}/${stemName}`);

    if (!response.ok) {
      return res.status(404).json({ error: 'Stem not found' });
    }

    const contentType = response.headers.get('Content-Type') || 'audio/wav';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${stemName}"`);
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const buffer = await response.arrayBuffer();
    res.end(Buffer.from(buffer), 'binary');
  } catch (error: unknown) {
    appLogger.errorStack('Stem download error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to download stem' });
  }
});

router.delete('/cleanup/:jobId', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/cleanup/${req.params.jobId}`, {
      method: 'DELETE',
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error: unknown) {
    appLogger.errorStack('Stem cleanup error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to cleanup' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`);
    const health = await response.json();
    res.json({ 
      status: 'ok',
      pythonService: health,
      nodeService: 'running'
    });
  } catch (error: unknown) {
    appLogger.warn('Stems health check failed: Python service unavailable', { error: String(error) });
    res.status(503).json({
      status: 'error',
      pythonService: 'unavailable',
      nodeService: 'running',
      hint: 'Start Python service: cd server && python python_service/stem_splitter.py'
    });
  }
});

export { router as stemRouter };
