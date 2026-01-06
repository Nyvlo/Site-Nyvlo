import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { MediaService } from '../../services/media-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

export function createMediaRouter(logger: LogService, getWhatsAppManager: () => any): Router {
  const router = Router();
  const mediaService = new MediaService(logger);

  // Upload single file
  router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
      }

      const { generateThumbnail, maxWidth, maxHeight, quality } = req.body;

      const mediaFile = await mediaService.processUpload(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.tenantId || 'system-default',
        {
          generateThumbnail: generateThumbnail !== 'false',
          maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
          maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
          quality: quality ? parseInt(quality) : undefined
        }
      );

      res.json({
        success: true,
        media: {
          id: mediaFile.id,
          originalName: mediaFile.originalName,
          filename: mediaFile.filename,
          mimetype: mediaFile.mimetype,
          size: mediaFile.size,
          width: mediaFile.width,
          height: mediaFile.height,
          url: `/api/media/${mediaFile.id}`,
          thumbnailUrl: mediaFile.thumbnailPath ? `/api/media/${mediaFile.id}/thumbnail` : null
        }
      });
    } catch (error) {
      logger.error('Erro no upload de mídia', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Upload multiple files
  router.post('/upload/multiple', authMiddleware, upload.array('files', 10), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
      }

      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const mediaFile = await mediaService.processUpload(
              file.buffer,
              file.originalname,
              file.mimetype,
              req.tenantId || 'system-default'
            );

            return {
              success: true,
              media: {
                id: mediaFile.id,
                originalName: mediaFile.originalName,
                filename: mediaFile.filename,
                mimetype: mediaFile.mimetype,
                size: mediaFile.size,
                width: mediaFile.width,
                height: mediaFile.height,
                url: `/api/media/${mediaFile.id}`,
                thumbnailUrl: mediaFile.thumbnailPath ? `/api/media/${mediaFile.id}/thumbnail` : null
              }
            };
          } catch (error) {
            return {
              success: false,
              originalName: file.originalname,
              error: (error as Error).message
            };
          }
        })
      );

      res.json({ results });
    } catch (error) {
      logger.error('Erro no upload múltiplo de mídia', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Tunnel/Proxy media from WhatsApp (LGPD/Zero-Storage mode)
  router.get('/tunnel/:instanceId/:chatId/:messageId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, chatId, messageId } = req.params;
      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.status(500).json({ error: 'WhatsApp Manager não disponível' });
        return;
      }

      // Find message in store
      const msg = await whatsappManager.findMessage(instanceId, chatId, messageId);

      if (!msg) {
        res.status(404).json({ error: 'Mensagem não encontrada na memória' });
        return;
      }

      // Download media
      const buffer = await whatsappManager.downloadMedia(instanceId, msg);

      if (!buffer) {
        res.status(500).json({ error: 'Falha ao baixar mídia do WhatsApp' });
        return;
      }

      // Determine mimetype
      const media = msg.message?.imageMessage ||
        msg.message?.videoMessage ||
        msg.message?.audioMessage ||
        msg.message?.documentMessage;

      const mimetype = media?.mimetype || 'application/octet-stream';

      res.setHeader('Content-Type', mimetype);
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour locally
      res.send(buffer);

    } catch (error) {
      logger.error('Erro no túnel de mídia', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get media file
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const filePath = mediaService.getFilePath(id);

      if (!filePath) {
        res.status(404).json({ error: 'Arquivo não encontrado' });
        return;
      }

      res.sendFile(filePath);
    } catch (error) {
      logger.error('Erro ao obter mídia', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get thumbnail
  router.get('/:id/thumbnail', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const thumbnailPath = mediaService.getThumbnailPath(id);

      if (!thumbnailPath) {
        res.status(404).json({ error: 'Thumbnail não encontrado' });
        return;
      }

      res.sendFile(thumbnailPath);
    } catch (error) {
      logger.error('Erro ao obter thumbnail', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Download media file
  router.get('/:id/download', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const filePath = mediaService.getFilePath(id);

      if (!filePath) {
        res.status(404).json({ error: 'Arquivo não encontrado' });
        return;
      }

      const filename = path.basename(filePath);
      res.download(filePath, filename);
    } catch (error) {
      logger.error('Erro ao baixar mídia', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Delete media file
  router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = await mediaService.deleteFile(id, req.tenantId || 'system-default');

      if (success) {
        res.json({ success: true, message: 'Arquivo deletado' });
      } else {
        res.status(404).json({ error: 'Arquivo não encontrado' });
      }
    } catch (error) {
      logger.error('Erro ao deletar mídia', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get media stats
  router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const stats = mediaService.getStats(req.tenantId || 'system-default');
      res.json(stats);
    } catch (error) {
      logger.error('Erro ao obter estatísticas de mídia', error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
