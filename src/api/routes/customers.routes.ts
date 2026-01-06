import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import multer from 'multer';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createCustomersRoutes(
    database: DatabaseService,
    logger: LogService
): Router {
    const router = Router();
    const upload = multer({ dest: 'uploads/' });

    router.use(authMiddleware);

    // GET /api/customers - List customers
    router.get('/', async (req: AuthRequest, res: Response) => {
        try {
            const { search, limit = '50', offset = '0' } = req.query;

            let query = `
        SELECT * FROM web_customers
        WHERE tenant_id = ?
      `;
            const params: any[] = [req.tenantId];

            if (search) {
                query += ' AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ? OR whatsapp_id LIKE ? OR document LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
            }

            query += ' ORDER BY last_interaction DESC NULLS LAST, created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit as string), parseInt(offset as string));

            const customers = await database.all(query, params);

            // Get total count for pagination
            const countQuery = `
        SELECT COUNT(*) as total FROM web_customers
        WHERE tenant_id = ? ${search ? 'AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ? OR whatsapp_id LIKE ? OR document LIKE ?)' : ''}
      `;
            const countParams = search ? [req.tenantId, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [req.tenantId];
            const totalCount = await database.get<any>(countQuery, countParams);

            res.json({
                success: true,
                customers,
                total: totalCount?.total || 0
            });
        } catch (error) {
            logger.error('Erro ao listar clientes', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // POST /api/customers - Create manual customer
    router.post('/', async (req: AuthRequest, res: Response) => {
        try {
            const { name, phone, email, document, type, notes } = req.body;

            if (!name || !phone) {
                return res.status(400).json({ success: false, error: 'Nome e telefone são obrigatórios' });
            }

            const cleanPhone = phone.replace(/\D/g, '');
            const cleanDocument = document ? document.replace(/\D/g, '') : null;
            const whatsappId = `${cleanPhone}@s.whatsapp.net`;

            // Check if exists
            const existing = await database.get('SELECT id FROM web_customers WHERE tenant_id = ? AND (whatsapp_id = ? OR (document = ? AND document IS NOT NULL))', [req.tenantId, whatsappId, cleanDocument]);

            if (existing) {
                return res.status(400).json({ success: false, error: 'Cliente já cadastrado com este telefone ou documento' });
            }

            const id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            await database.run(`
                INSERT INTO web_customers (
                    id, tenant_id, whatsapp_id, name, phone_number, email, document, customer_type, notes, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [id, req.tenantId, whatsappId, name, cleanPhone, email || null, cleanDocument, type || 'personal', notes || null]);

            res.status(201).json({ success: true, customerId: id });
        } catch (error) {
            logger.error('Erro ao criar cliente manual', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // POST /api/customers/import - Bulk import customers
    router.post('/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Arquivo não fornecido' });
            }

            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (data.length === 0) {
                return res.status(400).json({ success: false, error: 'Arquivo vazio' });
            }

            const results = { success: 0, errors: [] as string[] };

            for (const row of data) {
                try {
                    // Mapeamento flexível de colunas
                    const name = row['Nome'] || row['nome'] || row['Name'];
                    const phone = String(row['Telefone'] || row['telefone'] || row['Phone'] || "").replace(/\D/g, '');
                    const email = row['Email'] || row['email'] || row['E-mail'];
                    const document = String(row['Documento'] || row['documento'] || row['CPF/CNPJ'] || row['cpf'] || row['cnpj'] || "").replace(/\D/g, '');

                    if (!name || !phone) {
                        results.errors.push(`Linha ignorada: Nome ou Telefone ausente.`);
                        continue;
                    }

                    const whatsappId = `${phone}@s.whatsapp.net`;
                    const customerType = document.length > 11 ? 'company' : 'personal';

                    // Upsert logic
                    const existing = await database.get('SELECT id FROM web_customers WHERE tenant_id = ? AND (whatsapp_id = ? OR (document = ? AND document IS NOT NULL))', [req.tenantId, whatsappId, document]);

                    if (existing) {
                        await database.run(`
                            UPDATE web_customers SET
                                name = COALESCE(?, name),
                                email = COALESCE(?, email),
                                document = COALESCE(?, document),
                                customer_type = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [name, email || null, document || null, customerType, (existing as any).id]);
                    } else {
                        const id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        await database.run(`
                            INSERT INTO web_customers (
                                id, tenant_id, whatsapp_id, name, phone_number, email, document, customer_type, status, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        `, [id, req.tenantId, whatsappId, name, phone, email || null, document || null, customerType]);
                    }

                    results.success++;
                } catch (err: any) {
                    results.errors.push(`Erro ao processar linha: ${err.message}`);
                }
            }

            res.json({ success: true, summary: results });
        } catch (error) {
            logger.error('Erro na importação de clientes', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno na importação' });
        }
    });

    // GET /api/customers/:customerId - Get customer details with history
    router.get('/:customerId', async (req: AuthRequest, res: Response) => {
        try {
            const { customerId } = req.params;

            const customer = await database.get<any>(`
        SELECT * FROM web_customers WHERE id = ? AND tenant_id = ?
      `, [customerId, req.tenantId]);

            if (!customer) {
                res.status(404).json({ success: false, error: 'Cliente não encontrado' });
                return;
            }

            // Get conversation history summary
            const conversations = await database.all(`
        SELECT 
          c.id, c.instance_id, c.status, c.created_at, c.updated_at,
          (SELECT COUNT(*) FROM web_messages WHERE conversation_id = c.id) as message_count,
          r.rating,
          r.comment as rating_comment
        FROM web_conversations c
        LEFT JOIN web_conversation_ratings r ON r.conversation_id = c.id
        WHERE c.whatsapp_chat_id = ? AND c.tenant_id = ?
        ORDER BY c.updated_at DESC
      `, [customer.whatsapp_id, req.tenantId]);

            res.json({
                success: true,
                customer: {
                    ...customer,
                    history: conversations
                }
            });
        } catch (error) {
            logger.error('Erro ao buscar detalhes do cliente', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // PUT /api/customers/:customerId - Update customer info
    router.put('/:customerId', async (req: AuthRequest, res: Response) => {
        try {
            const { customerId } = req.params;
            const { name, email, notes, status, document, type } = req.body;

            const cleanDocument = document ? document.replace(/\D/g, '') : undefined;

            await database.run(`
        UPDATE web_customers 
        SET 
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          document = COALESCE(?, document),
          customer_type = COALESCE(?, customer_type),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `, [name, email, notes, status, cleanDocument, type, customerId, req.tenantId]);

            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao atualizar cliente', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // POST /api/customers/:customerId/rate - Submit a rating
    router.post('/:customerId/rate', async (req: AuthRequest, res: Response) => {
        try {
            const { customerId } = req.params;
            const { rating, conversationId, comment } = req.body;

            const customer = await database.get<any>(`
                SELECT whatsapp_id FROM web_customers WHERE id = ? AND tenant_id = ?
            `, [customerId, req.tenantId]);

            if (!customer) {
                res.status(404).json({ success: false, error: 'Cliente não encontrado' });
                return;
            }

            // Save individual rating
            const ratingId = `rate_${Date.now()}`;
            await database.run(`
                INSERT INTO web_conversation_ratings (
                    id, tenant_id, conversation_id, instance_id, rating, comment, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [ratingId, req.tenantId, conversationId || 'manual', 'manual', rating, comment]);

            // Update average rating
            await database.updateCustomerRating(req.tenantId!, customer.whatsapp_id, rating);

            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao avaliar cliente', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    return router;
}
