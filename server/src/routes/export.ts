import { Router } from 'express';
import { renderProject } from '../services/audioRenderer.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const router = Router();

router.post('/render', async (req, res) => {
  try {
    const { project, duration = 60 } = req.body;
    
    if (!project) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    console.log(`Starting render job for ${duration}s`);

    // Use the real audio renderer
    const result = await renderProject(project, duration);

    res.json({
      jobId: uuidv4(),
      status: 'completed',
      downloadUrl: result.downloadUrl,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).json({ error: 'Failed to render audio' });
  }
});

router.get('/download/:filename', async (req, res) => {
  try {
    const exportPath = path.join(process.cwd(), 'exports', req.params.filename);
    if (!fs.existsSync(exportPath)) {
      return res.status(404).json({ error: 'Export not found' });
    }
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    fs.createReadStream(exportPath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download export' });
  }
});

router.get('/status/:jobId', async (req, res) => {
  res.json({ jobId: req.params.jobId, status: 'completed' });
});

export { router as exportRouter };
