import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { broadcast } from '../socket.js';
import { uploadImage } from '../services/storageService.js';
import { logAuditEvent } from '../services/auditService.js';
import { ActorType } from '@prisma/client';

export const mediaRouter = Router();

// GET all media assets with optional residentId filter
mediaRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { residentId, limit } = req.query;

    const where: any = {};
    if (residentId && typeof residentId === 'string') {
      where.residentId = residentId;
    }

    const take = limit ? parseInt(limit as string, 10) : 50;

    const assets = await prisma.mediaAsset.findMany({
      where,
      include: {
        resident: {
          select: {
            id: true,
            name: true,
            roomNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: isNaN(take) ? 50 : take
    });

    res.json({ success: true, data: assets });
  } catch (err: any) {
    console.error('Error fetching media assets:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST upload media asset (base64 Data URL or raw base64 string)
mediaRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const { imageBase64, residentId, caption, source, type } = req.body;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        error: 'imageBase64 payload is required.'
      });
      return;
    }

    // Determine content type if data URL
    let contentType = 'image/jpeg';
    if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/png')) {
      contentType = 'image/png';
    }

    // Upload to S3 or local /uploads fallback
    const uploadResult = await uploadImage(imageBase64, {
      folder: residentId ? `residents/${residentId}` : 'general',
      contentType
    });

    // Save to database
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        residentId: residentId || null,
        url: uploadResult.url,
        s3Key: uploadResult.s3Key || null,
        type: type || 'PHOTO',
        caption: caption || null,
        source: source || 'UPLOAD'
      },
      include: {
        resident: {
          select: {
            id: true,
            name: true,
            roomNumber: true
          }
        }
      }
    });

    // Broadcast real-time event
    broadcast('media:created', { mediaAsset });

    // Audit log
    await logAuditEvent(prisma, {
      actorType: ActorType.SYSTEM,
      actorId: source || 'MediaService',
      event: 'MEDIA_UPLOADED',
      metadata: {
        mediaAssetId: mediaAsset.id,
        storage: uploadResult.storage,
        url: uploadResult.url,
        residentId
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...mediaAsset,
        storage: uploadResult.storage
      }
    });
  } catch (err: any) {
    console.error('Error uploading media:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE media asset
mediaRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.mediaAsset.delete({
      where: { id }
    });

    broadcast('media:deleted', { id });
    res.json({ success: true, message: 'Media asset deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
