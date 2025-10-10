import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import mime from 'mime-types';
import type { Request } from 'express';

export const uploadsRouter = Router();
// No authentication required for image uploads

// Multer memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only image files are allowed'));
  },
});

// S3 client
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2';
const BUCKET = process.env.S3_BUCKET || 'sears-1099';
const s3 = new S3Client({
  region: REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
    : undefined,
});

function buildKey(filename: string) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const ext = (mime.extension(mime.lookup(filename) || '') || filename.split('.').pop() || 'bin').toLowerCase();
  return `uploads/${yyyy}/${mm}/${dd}/${randomUUID()}.${ext}`;
}

// POST /api/uploads/image
// Accepts multipart/form-data with field "file"; uploads to S3 and returns public URL
// No authentication required
uploadsRouter.post('/image', upload.single('file'), async (req: Request, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });

    const key = buildKey(req.file.originalname);
    const contentType = req.file.mimetype || 'application/octet-stream';

    const put = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: contentType,
      // If your bucket blocks public ACLs, keep ACL undefined and serve via CloudFront or signed URLs
      // ACL: 'public-read',
    });
    await s3.send(put);

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    return res.status(201).json({
      success: true,
      data: {
        bucket: BUCKET,
        key,
        url,
        contentType,
        size: req.file.size,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to upload image' });
  }
});
