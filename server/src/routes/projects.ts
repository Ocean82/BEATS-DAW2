import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory project storage (fallback when database is unavailable)
interface InMemoryProject {
  id: string;
  name: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

const inMemoryProjects: Map<string, InMemoryProject> = new Map();

// Check if database is configured
const hasDatabase = !!process.env.DATABASE_URL;
let prisma: any = null;

if (hasDatabase) {
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    console.log('Using PostgreSQL for project storage');
  } catch (e) {
    console.log('Prisma failed to initialize, using in-memory storage');
  }
} else {
  console.log('DATABASE_URL not set, using in-memory storage for projects');
}

router.post('/', async (req, res) => {
  try {
    const { name, data } = req.body;
    
    if (!prisma) {
      const project: InMemoryProject = {
        id: uuidv4(),
        name: name || 'Untitled Project',
        data: data || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryProjects.set(project.id, project);
      return res.json({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      });
    }
    
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
    if (!prisma) {
      const projects = Array.from(inMemoryProjects.values())
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return res.json(projects.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })));
    }
    
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!prisma) {
      const project = inMemoryProjects.get(req.params.id);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      return res.json({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      });
    }
    
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get project' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, data } = req.body;
    
    if (!prisma) {
      const project = inMemoryProjects.get(req.params.id);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      
      project.name = name || project.name;
      project.data = data || project.data;
      project.updatedAt = new Date();
      
      return res.json({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      });
    }
    
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(data && { data }),
      },
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!prisma) {
      if (!inMemoryProjects.has(req.params.id)) {
        return res.status(404).json({ error: 'Project not found' });
      }
      inMemoryProjects.delete(req.params.id);
      return res.json({ success: true });
    }
    
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export { router as projectRouter };
