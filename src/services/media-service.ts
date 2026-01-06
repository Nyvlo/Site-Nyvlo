import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { LogService } from './log-service';

interface MediaFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  thumbnailPath?: string;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
}

interface UploadOptions {
  generateThumbnail?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export class MediaService {
  private uploadDir: string;
  private logger: LogService;
  private maxFileSize: number = 50 * 1024 * 1024; // 50MB

  private allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  private allowedAudioTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'];
  private allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  constructor(logger: LogService, uploadDir: string = 'uploads') {
    this.logger = logger;
    this.uploadDir = path.resolve(uploadDir);
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    this.ensureTenantDirectories('system-default');
  }

  private ensureTenantDirectories(tenantId: string): void {
    const tenantDir = path.join(this.uploadDir, tenantId);
    const dirs = [
      tenantDir,
      path.join(tenantDir, 'thumbnails'),
      path.join(tenantDir, 'images'),
      path.join(tenantDir, 'videos'),
      path.join(tenantDir, 'audio'),
      path.join(tenantDir, 'documents')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private generateId(): string {
    return `media_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private getMediaType(mimetype: string): 'image' | 'video' | 'audio' | 'document' | 'unknown' {
    if (this.allowedImageTypes.includes(mimetype)) return 'image';
    if (this.allowedVideoTypes.includes(mimetype)) return 'video';
    if (this.allowedAudioTypes.includes(mimetype)) return 'audio';
    if (this.allowedDocTypes.includes(mimetype)) return 'document';
    return 'unknown';
  }

  isAllowedType(mimetype: string): boolean {
    return this.getMediaType(mimetype) !== 'unknown';
  }

  async processUpload(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    tenantId: string = 'system-default',
    options: UploadOptions = {}
  ): Promise<MediaFile> {
    if (buffer.length > this.maxFileSize) {
      throw new Error(`Arquivo muito grande. Máximo: ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (!this.isAllowedType(mimetype)) {
      throw new Error(`Tipo de arquivo não permitido: ${mimetype}`);
    }

    this.ensureTenantDirectories(tenantId);
    const mediaType = this.getMediaType(mimetype);
    const id = this.generateId();
    const ext = path.extname(originalName) || this.getExtension(mimetype);
    const filename = `${id}${ext}`;
    const subDir = mediaType === 'unknown' ? 'documents' : `${mediaType}s`;
    const filePath = path.join(this.uploadDir, tenantId, subDir, filename);

    let processedBuffer = buffer;
    let width: number | undefined;
    let height: number | undefined;
    let thumbnailPath: string | undefined;

    // Process images
    if (mediaType === 'image') {
      const result = await this.processImage(buffer, options);
      processedBuffer = result.buffer;
      width = result.width;
      height = result.height;

      if (options.generateThumbnail !== false) {
        thumbnailPath = await this.generateThumbnail(buffer, id, tenantId);
      }
    }

    // Save file
    fs.writeFileSync(filePath, processedBuffer);

    const mediaFile: MediaFile = {
      id,
      originalName,
      filename,
      mimetype,
      size: processedBuffer.length,
      path: filePath,
      thumbnailPath,
      width,
      height,
      createdAt: new Date().toISOString()
    };

    this.logger.info('Arquivo de mídia processado', {
      id,
      type: mediaType,
      size: processedBuffer.length,
      originalName
    });

    return mediaFile;
  }


  private async processImage(
    buffer: Buffer,
    options: UploadOptions
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    const { maxWidth = 1920, maxHeight = 1920, quality = 85 } = options;

    const image = sharp(buffer);
    const metadata = await image.metadata();

    let processedImage = image;

    // Resize if needed
    if (metadata.width && metadata.height) {
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        processedImage = processedImage.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    // Compress
    const format = metadata.format || 'jpeg';
    if (format === 'jpeg' || format === 'jpg') {
      processedImage = processedImage.jpeg({ quality });
    } else if (format === 'png') {
      processedImage = processedImage.png({ quality });
    } else if (format === 'webp') {
      processedImage = processedImage.webp({ quality });
    }

    const outputBuffer = await processedImage.toBuffer();
    const outputMetadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      width: outputMetadata.width || 0,
      height: outputMetadata.height || 0
    };
  }

  private async generateThumbnail(buffer: Buffer, id: string, tenantId: string): Promise<string> {
    const thumbnailFilename = `${id}_thumb.jpg`;
    const thumbnailPath = path.join(this.uploadDir, tenantId, 'thumbnails', thumbnailFilename);

    await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  private getExtension(mimetype: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
      'audio/mp4': '.m4a',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt',
      'application/zip': '.zip'
    };

    return extensions[mimetype] || '';
  }

  getFilePath(id: string, tenantId?: string): string | null {
    const subTypes = ['images', 'videos', 'audio', 'documents'];

    if (tenantId) {
      const tenantDir = path.join(this.uploadDir, tenantId);
      if (!fs.existsSync(tenantDir)) return null;

      for (const subType of subTypes) {
        const dirPath = path.join(tenantDir, subType);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          const file = files.find(f => f.startsWith(id));
          if (file) return path.join(dirPath, file);
        }
      }
    } else {
      // Search across all tenant directories
      const tenants = fs.readdirSync(this.uploadDir);
      for (const tenant of tenants) {
        const tenantDir = path.join(this.uploadDir, tenant);
        if (fs.statSync(tenantDir).isDirectory()) {
          for (const subType of subTypes) {
            const dirPath = path.join(tenantDir, subType);
            if (fs.existsSync(dirPath)) {
              const files = fs.readdirSync(dirPath);
              const file = files.find(f => f.startsWith(id));
              if (file) return path.join(dirPath, file);
            }
          }
        }
      }
    }

    return null;
  }

  getThumbnailPath(id: string, tenantId?: string): string | null {
    if (tenantId) {
      const thumbnailPath = path.join(this.uploadDir, tenantId, 'thumbnails', `${id}_thumb.jpg`);
      return fs.existsSync(thumbnailPath) ? thumbnailPath : null;
    } else {
      const tenants = fs.readdirSync(this.uploadDir);
      for (const tenant of tenants) {
        const thumbnailPath = path.join(this.uploadDir, tenant, 'thumbnails', `${id}_thumb.jpg`);
        if (fs.existsSync(thumbnailPath)) return thumbnailPath;
      }
    }
    return null;
  }

  async deleteFile(id: string, tenantId: string = 'system-default'): Promise<boolean> {
    const filePath = this.getFilePath(id, tenantId);
    const thumbnailPath = this.getThumbnailPath(id, tenantId);

    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
      this.logger.info('Arquivo de mídia deletado', { id });
      return true;
    } catch (error) {
      this.logger.error('Erro ao deletar arquivo de mídia', { error: error as Error, id });
      return false;
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getStats(tenantId: string = 'system-default'): { totalFiles: number; totalSize: number; byType: Record<string, number> } {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: {
        images: 0,
        videos: 0,
        audio: 0,
        documents: 0
      }
    };

    const dirs = ['images', 'videos', 'audio', 'documents'] as const;
    const tenantDir = path.join(this.uploadDir, tenantId);

    if (!fs.existsSync(tenantDir)) return stats;

    for (const dir of dirs) {
      const dirPath = path.join(tenantDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        stats.byType[dir] = files.length;
        stats.totalFiles += files.length;

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const fileStat = fs.statSync(filePath);
          stats.totalSize += fileStat.size;
        }
      }
    }

    return stats;
  }
}
