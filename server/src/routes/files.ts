import { Router } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client') as { PrismaClient: new (...args: unknown[]) => unknown };

const router = Router();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma CJS/ESM interop
const prisma = new PrismaClient() as any;

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY || '',
    secretAccessKey: process.env.R2_SECRET_KEY || '',
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'beats-daw-audio';

router.post('/presign-upload', async (req, res) => {
  try {
    const { filename, mimeType } = req.body;
    if (!filename || !mimeType) {
      return res.status(400).json({ error: 'filename and mimeType required' });
    }

    const key = `uploads/${uuidv4()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    const fileRecord = await prisma.audioFile.create({
      data: {
        filename: key,
        originalName: filename,
        mimeType,
        size: 0,
        s3Key: key,
        s3Url: `${process.env.R2_PUBLIC_URL}/${key}`,
      },
    });

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

router.get('/:id', async (req, res) => {
  try {
    const file = await prisma.audioFile.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch {
    res.status(500).json({ error: 'Failed to get file' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const file = await prisma.audioFile.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3Key }));
    await prisma.audioFile.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export { router as fileRouter };
