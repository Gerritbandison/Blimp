/**
 * Document upload routes.
 *
 * POST /documents/upload?assetId=x | appId=x | personId=x
 * GET  /documents/:id/download
 * DELETE /documents/:id
 *
 * Files are stored on disk in UPLOAD_DIR (default: ./uploads).
 * In production, swap the local disk strategy for S3/MinIO.
 */

import { Router } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// ─── Configuration ─────────────────────────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/msword',
  'text/plain',
]);

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// ─── POST /documents/upload ────────────────────────────────────────────────

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { assetId, appId, personId } = req.query as Record<string, string | undefined>;

  if (!assetId && !appId && !personId) {
    res.status(400).json({ error: 'Provide one of assetId, appId, or personId as a query parameter' });
    return;
  }

  const doc = await prisma.document.create({
    data: {
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      uploadedBy: req.user!.email,
      url: `/documents/${file.filename}`,
      assetId: assetId || null,
      appId: appId || null,
      personId: personId || null,
    },
  });

  res.status(201).json(doc);
});

// ─── GET /documents/:filename ──────────────────────────────────────────────

router.get('/:filename', authenticate, (req, res) => {
  const filePath = join(UPLOAD_DIR, req.params.filename);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.sendFile(filePath);
});

// ─── DELETE /documents/:id ─────────────────────────────────────────────────

router.delete('/:id', authenticate, async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  await prisma.document.delete({ where: { id: doc.id } });

  // Best-effort file cleanup — don't fail if already deleted
  try {
    const { unlink } = await import('fs/promises');
    const filename = doc.url?.split('/').pop();
    if (filename) await unlink(join(UPLOAD_DIR, filename));
  } catch {
    // file already removed or inaccessible
  }

  res.status(204).end();
});

export default router;
