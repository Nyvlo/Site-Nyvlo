import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from './database-service';
import { Document } from '../types/database';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class DocumentService {
  private database: DatabaseService;
  private uploadDir: string;

  constructor(database: DatabaseService, uploadDir: string = 'uploads') {
    this.database = database;
    this.uploadDir = uploadDir;
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  validateFormat(fileName: string): { valid: boolean; error?: string } {
    const ext = path.extname(fileName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Formato não suportado. Formatos aceitos: ${ALLOWED_EXTENSIONS.join(', ')}`
      };
    }

    return { valid: true };
  }

  validateSize(size: number): { valid: boolean; error?: string } {
    if (size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    return { valid: true };
  }

  async saveDocument(userId: string, fileName: string, buffer: Buffer): Promise<Document> {
    const id = uuidv4();
    const ext = path.extname(fileName).toLowerCase();

    // Create user directory
    const userDir = path.join(this.uploadDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Save file
    const savedFileName = `${id}${ext}`;
    const filePath = path.join(userDir, savedFileName);
    fs.writeFileSync(filePath, buffer);

    // Save to database
    await this.database.run(`
      INSERT INTO documents (id, user_id, file_name, file_path, file_type)
      VALUES (?, ?, ?, ?, ?)
    `, [id, userId, fileName, filePath, ext.substring(1)]);

    return {
      id,
      userId,
      fileName,
      filePath,
      fileType: ext.substring(1),
      uploadedAt: new Date()
    };
  }

  async getDocuments(userId: string): Promise<Document[]> {
    const rows = await this.database.query<any>(`
      SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC
    `, [userId]);

    return rows.map(row => this.mapRowToDocument(row));
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const row = await this.database.get<any>(`
      SELECT * FROM documents WHERE id = ?
    `, [id]);

    if (!row) return null;

    return this.mapRowToDocument(row);
  }

  async deleteDocument(id: string): Promise<boolean> {
    const doc = await this.getDocumentById(id);

    if (!doc) return false;

    // Delete file
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    // Delete from database
    const result = await this.database.run(`
      DELETE FROM documents WHERE id = ?
    `, [id]);

    return result.changes > 0;
  }

  formatDocumentsMenu(): string {
    return `📄 *Documentos*\n\n` +
      `1️⃣ Enviar documento\n` +
      `2️⃣ Solicitar segunda via\n\n` +
      `Digite o número da opção ou 0 para voltar.`;
  }

  formatUploadInstructions(): string {
    return `📤 *Enviar Documento*\n\n` +
      `Envie o documento como anexo.\n\n` +
      `📋 *Formatos aceitos:* PDF, JPG, PNG\n` +
      `📏 *Tamanho máximo:* 10MB\n\n` +
      `Digite 0 para cancelar.`;
  }

  formatUploadSuccess(doc: Document): string {
    return `✅ Documento recebido com sucesso!\n\n` +
      `📄 *Arquivo:* ${doc.fileName}\n` +
      `🆔 *ID:* ${doc.id}\n\n` +
      `Digite 0 para voltar ao menu.`;
  }

  formatDocumentsList(documents: Document[]): string {
    if (documents.length === 0) {
      return `📂 Você não possui documentos enviados.\n\nDigite 0 para voltar.`;
    }

    let message = `📂 *Seus Documentos*\n\n`;

    documents.forEach((doc, index) => {
      message += `${index + 1}. ${doc.fileName}\n`;
      message += `   📅 ${doc.uploadedAt.toLocaleDateString('pt-BR')}\n\n`;
    });

    message += `Digite o número para baixar ou 0 para voltar.`;
    return message;
  }

  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type,
      uploadedAt: new Date(row.uploaded_at)
    };
  }
}
