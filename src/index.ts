import * as dotenv from 'dotenv';
dotenv.config();

import { BotApplication } from './app';
import { ConfigLoader } from './config/config-loader';
import { LogService } from './services/log-service';

async function main(): Promise<void> {
  const logger = new LogService();

  // Validação de Segredos Críticos
  const requiredEnvVars = ['JWT_SECRET', 'POSTGRES_URL'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    // Em desenvolvimento, podemos tolerar o fallback, mas logamos um aviso forte.
    if (process.env.NODE_ENV === 'production') {
      logger.error(`FATAL: Variáveis de ambiente críticas ausentes: ${missingVars.join(', ')}`);
      process.exit(1);
    } else {
      logger.warn(`AVISO: Variáveis de ambiente ausentes: ${missingVars.join(', ')}. Usando defaults inseguros (apenas para desenvolvimento).`);
    }
  }

  try {
    logger.info('Iniciando Nyvlo Omnichannel...');

    const config = ConfigLoader.load();
    logger.info('Configuração carregada com sucesso');

    const app = new BotApplication(config, logger);
    await app.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Encerrando bot...');
      await app.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Encerrando bot...');
      await app.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Erro fatal ao iniciar bot', error as Error);
    process.exit(1);
  }
}

main();
