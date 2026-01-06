import { LogService } from './log-service';
import * as nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor(private logger: LogService) {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            this.logger.info('[EmailService] Transporter Nodemailer inicializado');
        } else {
            this.logger.warn('[EmailService] SMTP não configurado. Usando modo SIMULAÇÃO.');
        }
    }

    async sendWelcomeEmail(to: string, name: string) {
        this.logger.info(`[EmailService] Enviando e-mail de boas-vindas para ${to}`, { name });

        const html = `
            <div style="font-family: sans-serif; color: #333;">
                <h1>Bem-vindo ao Nyvlo Omnichannel, ${name}!</h1>
                <p>Sua conta foi criada com sucesso. Comece agora conectando sua primeira instância do WhatsApp.</p>
                <p>Atenciosamente,<br>Equipe Nyvlo Omnichannel</p>
            </div>
        `;

        await this.send(to, 'Bem-vindo ao Nyvlo Omnichannel', html);
    }

    async sendPaymentConfirmation(to: string, planName: string) {
        this.logger.info(`[EmailService] Enviando confirmação de pagamento para ${to}`, { planName });

        const html = `
            <div style="font-family: sans-serif; color: #333;">
                <h1>Pagamento Confirmado!</h1>
                <p>Seu plano <strong>${planName}</strong> foi ativado com sucesso em sua conta.</p>
                <p>Obrigado pela confiança!</p>
            </div>
        `;

        await this.send(to, 'Pagamento Confirmado - Nyvlo Omnichannel', html);
    }

    async sendExpiryWarning(to: string, daysLeft: number) {
        this.logger.info(`[EmailService] Enviando aviso de expiração para ${to}`, { daysLeft });

        const html = `
            <div style="font-family: sans-serif; color: #333;">
                <h1>Sua assinatura expira em breve</h1>
                <p>Sua assinatura do Nyvlo Omnichannel vence em ${daysLeft} dias. Renove agora para evitar interrupções.</p>
            </div>
        `;

        await this.send(to, 'Aviso de Expiração - Nyvlo Omnichannel', html);
    }

    private async send(to: string, subject: string, html: string) {
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Nyvlo Omnichannel" <noreply@nyvlo.com.br>',
                    to,
                    subject,
                    html,
                });
                return;
            } catch (error) {
                this.logger.error('[EmailService] Erro ao enviar e-mail real, caindo para simulação', error as Error);
            }
        }

        return this.mockSend(to, subject, html);
    }

    private async mockSend(to: string, subject: string, html: string) {
        this.logger.info(`--- SIMULAÇÃO DE E-MAIL ---`);
        this.logger.info(`Para: ${to}`);
        this.logger.info(`Assunto: ${subject}`);
        this.logger.info(`---------------------------`);

        return new Promise(resolve => setTimeout(resolve, 500));
    }
}

