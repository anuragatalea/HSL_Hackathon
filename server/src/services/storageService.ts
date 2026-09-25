import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
}

interface UploadResult {
  url: string;
  storage: 'S3' | 'LOCAL';
  s3Key?: string;
  filename: string;
}

// Check if AWS S3 credentials are configured
const isS3Configured = () => {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET
  );
};

// Initialize S3 client if credentials exist
let s3Client: S3Client | null = null;
if (isS3Configured()) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  });
}

/**
 * Upload an image (base64 Data URL or Buffer) to AWS S3,
 * with automatic, graceful fallback to local /uploads/ directory.
 */
export async function uploadImage(
  data: string | Buffer,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const folder = options.folder || 'residents';
  const ext = options.contentType === 'image/png' ? 'png' : 'jpg';
  const filename = options.filename || `${folder}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const contentType = options.contentType || (ext === 'png' ? 'image/png' : 'image/jpeg');

  // Convert base64 data URL to Buffer if string provided
  let buffer: Buffer;
  if (typeof data === 'string') {
    const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    buffer = data;
  }

  // 1. Attempt AWS S3 upload if configured
  if (s3Client && process.env.S3_BUCKET) {
    try {
      const s3Key = `${folder}/${filename}`;
      const bucket = process.env.S3_BUCKET;
      const region = process.env.AWS_REGION || 'us-east-1';

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: contentType
        })
      );

      const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
      console.log(`☁️ [StorageService] Successfully uploaded to AWS S3: ${s3Url}`);

      return {
        url: s3Url,
        storage: 'S3',
        s3Key,
        filename
      };
    } catch (err: any) {
      console.warn(`⚠️ [StorageService] AWS S3 upload failed (${err.message}). Falling back to local storage.`);
    }
  }

  // 2. Local disk fallback (served statically via Express /uploads)
  const uploadsDir = path.join(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const localFilePath = path.join(uploadsDir, filename);
  fs.writeFileSync(localFilePath, buffer);

  const localUrl = `/uploads/${folder}/${filename}`;
  console.log(`💾 [StorageService] Saved to local storage: ${localUrl}`);

  return {
    url: localUrl,
    storage: 'LOCAL',
    filename
  };
}
