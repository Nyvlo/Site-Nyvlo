import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { LogService } from './log-service';
import { DatabaseService } from './database-service';

export class TwoFactorService {
    constructor(
        private db: DatabaseService,
        private logger: LogService
    ) { }

    /**
     * Gera um segredo TOTP e a URL para QR Code
     */
    generateSecret(username: string, appName: string = 'Nyvlo Omnichannel'): { secret: string; otpauth: string } {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(username, appName, secret);
        return { secret, otpauth };
    }

    /**
     * Gera a imagem QR Code em Base64
     */
    async generateQRCode(otpauth: string): Promise<string> {
        try {
            return await QRCode.toDataURL(otpauth);
        } catch (error) {
            this.logger.error('Erro ao gerar QR Code 2FA', error as Error);
            throw new Error('Falha na geração do QR Code');
        }
    }

    /**
     * Verifica se o token informado é válido para o segredo
     */
    verifyToken(token: string, secret: string): boolean {
        try {
            return authenticator.check(token, secret);
        } catch (err) {
            return false;
        }
    }

    /**
     * Salva o segredo temporariamente ou permanentemente para o usuário
     */
    async saveTempSecret(userId: string, secret: string): Promise<void> {
        // Na prática, salvamos direto na tabela web_users mas com verified=false
        await this.db.run(
            'UPDATE web_users SET two_factor_secret = ?, two_factor_verified = FALSE, two_factor_enabled = FALSE WHERE id = ?',
            [secret, userId]
        );
    }

    /**
     * Confirma a ativação do 2FA
     */
    async activate(userId: string, token: string): Promise<boolean> {
        const user = await this.db.get<{ two_factor_secret: string }>(
            'SELECT two_factor_secret FROM web_users WHERE id = ?',
            [userId]
        );

        if (!user || !user.two_factor_secret) return false;

        const isValid = this.verifyToken(token, user.two_factor_secret);
        if (isValid) {
            await this.db.run(
                'UPDATE web_users SET two_factor_enabled = TRUE, two_factor_verified = TRUE WHERE id = ?',
                [userId]
            );
            // Log audit trail would go here
            return true;
        }
        return false;
    }

    /**
     * Desativa o 2FA
     */
    async disable(userId: string): Promise<void> {
        await this.db.run(
            'UPDATE web_users SET two_factor_enabled = FALSE, two_factor_verified = FALSE, two_factor_secret = NULL WHERE id = ?',
            [userId]
        );
    }
}
