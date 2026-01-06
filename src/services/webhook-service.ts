import { LogService } from './log-service';

export class WebhookService {
    private logger: LogService;

    constructor(logger: LogService) {
        this.logger = logger;
    }

    /**
     * Dispara um webhook de forma assíncrona para não travar o fluxo do bot
     */
    async notify(url: string, event: string, payload: any): Promise<void> {
        if (!url) return;

        // Executa em "background" sem await no chamador principal se possível
        // Mas aqui retornamos a promise para controle se necessário
        try {
            this.logger.debug(`Enviando Webhook: ${event} para ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Nyvlo Omnichannel-Event': event,
                    'User-Agent': 'Nyvlo Omnichannel-Bot/1.0'
                },
                body: JSON.stringify({
                    event,
                    timestamp: new Date().toISOString(),
                    data: payload
                })
            });

            if (!response.ok) {
                this.logger.warn(`Falha ao enviar webhook: ${response.status} ${response.statusText}`);
            } else {
                this.logger.info(`Webhook enviado com sucesso: ${event}`);
            }
        } catch (error) {
            this.logger.error(`Erro ao disparar webhook para ${url}`, error as Error);
        }
    }
}
