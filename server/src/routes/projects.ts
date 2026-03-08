import { Router } from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client') as { PrismaClient: new (...args: unknown[]) => unknown };

const router = Router();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma CJS/ESM interop
const prisma = new PrismaClient() as any;

router.post('/', async (req, res) => {
  try {
    const { name, data } = req.body;
    const project = await prisma.project.create({
      data: {
        name: name || 'Untitled Project',
        data: data || {},
      },
    });
    res.json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to get project' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, data } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(data && { data }),
      },
    });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export { router as projectRouter };
