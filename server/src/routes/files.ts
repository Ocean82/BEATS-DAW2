import { Router } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const router = Router();

// Check if S3 is configured
const hasS3 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY);

// In-memory file storage fallback
interface InMemoryFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Url: string;
  createdAt: Date;
}

const inMemoryFiles: Map<string, InMemoryFile> = new Map();
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

let s3: any = null;
let prisma: any = null;

if (hasS3) {
  try {
    s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY || '',
        secretAccessKey: process.env.R2_SECRET_KEY || '',
      },
    });
    console.log('Using S3/R2 for file storage');
    
    // Try to load Prisma for metadata
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch (e) {
      console.log('Prisma not available for file metadata');
    }
  } catch (e) {
    console.log('S3 not configured, using local file storage');
  }
} else {
  console.log('S3 not configured, using local file storage');
}

const BUCKET = process.env.R2_BUCKET_NAME || 'beats-daw-audio';

router.post('/presign-upload', async (req, res) => {
  try {
    const { filename, mimeType } = req.body;
    if (!filename || !mimeType) {
      return res.status(400).json({ error: 'filename and mimeType required' });
    }

    const fileId = uuidv4();
    const key = `uploads/${fileId}-${filename}`;
    
    // Use local storage if S3 not available
    if (!s3) {
      const localPath = path.join(LOCAL_UPLOAD_DIR, `${fileId}-${filename}`);
      const fileRecord: InMemoryFile = {
        id: fileId,
        filename: key,
        originalName: filename,
        mimeType,
        size: 0,
        s3Key: localPath,
        s3Url: `/api/files/local/${fileId}`,
        createdAt: new Date(),
      };
      inMemoryFiles.set(fileId, fileRecord);
      
      return res.json({
        uploadUrl: `data:${mimeType};base64,`,
        fileId: fileRecord.id,
        fileUrl: fileRecord.s3Url,
        isLocal: true,
        localPath,
      });
    }

    // S3 upload
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    let fileRecord;
    if (prisma) {
      fileRecord = await prisma.audioFile.create({
        data: {
          filename: key,
          originalName: filename,
          mimeType,
          size: 0,
          s3Key: key,
          s3Url: `${process.env.R2_PUBLIC_URL}/${key}`,
        },
      });
    } else {
      fileRecord = { id: fileId, s3Url: `${process.env.R2_PUBLIC_URL}/${key}` };
    }

    res.json({
      uploadUrl: presignedUrl,
      fileId: fileRecord.id,
      fileUrl: fileRecord.s3Url,
    });
  } catch (error) {
    console.error('Presign error:', error);
    res.status(500).json({ error: 'Failed to create upload URL' });
  }
});

router.get('/local/:id', async (req, res) => {
  try {
    const file = inMemoryFiles.get(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    const filePath = file.s3Key;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get file' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!prisma) {
      const file = inMemoryFiles.get(req.params.id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      return res.json(file);
    }
    
    const file = await prisma.audioFile.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch {
    res.status(500).json({ error: 'Failed to get file' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!prisma) {
      const file = inMemoryFiles.get(req.params.id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      
      // Try to delete local file
      try {
        if (fs.existsSync(file.s3Key)) {
          fs.unlinkSync(file.s3Key);
        }
      } catch (e) {}
      
      inMemoryFiles.delete(req.params.id);
      return res.json({ success: true });
    }
    
    const file = await prisma.audioFile.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (s3) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3Key }));
    }
    await prisma.audioFile.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export { router as fileRouter };
