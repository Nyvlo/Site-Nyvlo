import { Router } from 'express';
import { DatabaseService } from '../services/database-service';
import { LogService } from '../services/log-service';
import { createAuthRoutes } from './routes/auth.routes';
import { createUsersRoutes } from './routes/users.routes';
import { createInstancesRoutes } from './routes/instances.routes';
import { createConversationsRoutes } from './routes/conversations.routes';
import { createContactsRoutes } from './routes/contacts.routes';
import { createMediaRouter } from './routes/media.routes';
import { createQuickMessagesRoutes } from './routes/quick-messages.routes';
import { createLabelsRoutes } from './routes/labels.routes';
import { createRatingsRoutes } from './routes/ratings.routes';
import { createTenantsRoutes } from './routes/tenants.routes';
import { createPlansRouter } from './routes/plans.routes';
import { createFinanceRouter } from './routes/finance.routes';
import { createPaymentRoutes } from './routes/payments.routes';
import { createCustomersRoutes } from './routes/customers.routes';
import { EmailService } from '../services/email-service';
import { SchedulingService } from '../services/scheduling-service';
import { createSchedulingRoutes } from './routes/scheduling.routes';
import { tenantActiveMiddleware } from './middleware/auth.middleware';

export function createApiRouter(
  database: DatabaseService,
  logger: LogService,
  getWhatsAppManager: () => any,
  getSocketIO: () => any,
  emailService?: EmailService,
  schedulingService?: SchedulingService
): Router {
  const router = Router();

  // Mount routes
  router.use('/auth', createAuthRoutes(database, logger, emailService));
  router.use('/plans', createPlansRouter(database, logger));
  router.use('/tenants', createTenantsRoutes(database, logger));
  router.use('/payments', createPaymentRoutes(database, logger));

  // Protect all other routes with tenant status check
  router.use(tenantActiveMiddleware);

  router.use('/users', createUsersRoutes(database, logger, getSocketIO));
  router.use('/instances', createInstancesRoutes(database, logger, getWhatsAppManager));
  router.use('/media', createMediaRouter(logger, getWhatsAppManager));
  router.use('/instances', createConversationsRoutes(database, logger, getWhatsAppManager, getSocketIO));
  router.use('/instances', createContactsRoutes(database, logger, getWhatsAppManager));
  router.use('/quick-messages', createQuickMessagesRoutes(database, logger));
  router.use('/labels', createLabelsRoutes(database, logger));
  router.use('/ratings', createRatingsRoutes(database, logger, getSocketIO));
  router.use('/finance', createFinanceRouter(database, logger));
  router.use('/customers', createCustomersRoutes(database, logger));

  // Scheduling Module
  const schedService = schedulingService || new SchedulingService(database, logger);
  router.use('/scheduling', createSchedulingRoutes(schedService));

  return router;
}
