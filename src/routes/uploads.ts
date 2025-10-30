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
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || 'https://d1kq8vno1fudyz.cloudfront.net';
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

// Helper function to handle image upload
async function handleImageUpload(req: Request, res: any) {
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

    // Use CloudFront URL instead of direct S3 URL
    const url = `${CLOUDFRONT_URL}/${key}`;

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      url, // Top-level url for client compatibility
      data: {
        url, // Also in data.url
        imageUrl: url, // Alternative field name
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to upload image' });
  }
}

// POST /api/uploads/image
// Accepts multipart/form-data with field "file" or "photo"; uploads to S3 and returns public URL
// No authentication required
uploadsRouter.post('/image', (req, res, next) => {
  // Use multer's any() to accept any field name, then validate
  const anyUpload = upload.any();
  anyUpload(req, res, async (err) => {
    if (err) {
      console.error('[Upload] Multer error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    
    // Check if we got files
    const files = (req as any).files as Express.Multer.File[];
    console.log('[Upload] Received files:', files?.length || 0);
    
    if (!files || files.length === 0) {
      console.error('[Upload] No files received');
      return res.status(400).json({ success: false, message: 'file is required' });
    }
    
    // Take the first file and attach it as req.file
    (req as any).file = files[0];
    console.log('[Upload] Processing file:', files[0].originalname, 'Field:', files[0].fieldname);
    
    return handleImageUpload(req, res);
  });
});
