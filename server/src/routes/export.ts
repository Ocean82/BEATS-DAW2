import { Router } from 'express';
import { renderProject } from '../services/audioRenderer.js';
import { v4 as uuidv4 } from 'uuid';

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

router.get('/status/:jobId', async (req, res) => {
  res.json({ jobId: req.params.jobId, status: 'completed' });
});

export { router as exportRouter };
