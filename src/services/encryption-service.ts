import * as crypto from 'crypto';

export class EncryptionService {
    private algorithm = 'aes-256-cbc';
    private key: Buffer;

    constructor() {
        // Usa a chave do ENV ou uma fallback (apenas para dev)
        const secret = process.env.ENCRYPTION_KEY || 'nyvlo-super-secret-encryption-key-32chars';
        // Garante que a chave tenha 32 bytes
        this.key = crypto.scryptSync(secret, 'salt', 32);
    }

    encrypt(text: string): string {
        if (!text) return '';

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return `${iv.toString('hex')}:${encrypted}`;
    }

    decrypt(text: string): string {
        if (!text || !text.includes(':')) return text;

        try {
            const [ivHex, encryptedText] = text.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            // Se falhar, assume que o texto não estava criptografado (migração)
            return text;
        }
    }
}
