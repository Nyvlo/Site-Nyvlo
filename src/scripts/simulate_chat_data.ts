
import { DatabaseService } from '../services/database-service';
import { LogService } from '../services/log-service';
import { v4 as uuidv4 } from 'uuid';

async function simulateChat() {
    const logger = new LogService();
    const db = new DatabaseService(logger);

    try {
        await db.initialize();

        const tenantId = 'system-default';
        const instanceId = 'simulated-instance-01';

        // 1. Ensure Tenant exists (handled by initialize, but we use system-default)

        // 2. Create/Update Simulated Instance
        try {
            await db.run(
                `INSERT INTO web_instances (id, tenant_id, name, phone, status, ai_enabled) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET status = 'connected'`,
                [instanceId, tenantId, 'WhatsApp Comercial', '5511999990000', 'connected', 1]
            );
            console.log('✅ Instance simulated');
        } catch (e) {
            console.log('Instance creation note:', e);
        }

        // 3. Create Conversations
        const conversations = [
            {
                chatId: '5511988881111@s.whatsapp.net',
                name: 'João Silva',
                messages: [
                    { fromMe: false, text: 'Olá, gostaria de saber mais sobre o sistema.' },
                    { fromMe: true, text: 'Olá João! Tudo bem? Sou o assistente virtual da Nyvlo Omnichannel.' },
                    { fromMe: true, text: 'Como posso ajudar você hoje?' },
                    { fromMe: false, text: 'Qual o valor dos planos?' }
                ]
            },
            {
                chatId: '5511988882222@s.whatsapp.net',
                name: 'Maria Oliveira',
                messages: [
                    { fromMe: false, text: 'Tenho uma dúvida sobre a integração.' },
                    { fromMe: true, text: 'Oi Maria, qual seria sua dúvida?' }
                ]
            },
            {
                chatId: '5511988883333@s.whatsapp.net',
                name: 'Suporte Técnico',
                messages: [
                    { fromMe: false, text: 'Meu sistema não está conectando.' }
                ]
            }
        ];

        for (const conv of conversations) {
            const conversationId = uuidv4();

            // Create Conversation
            await db.run(
                `INSERT INTO web_conversations (id, tenant_id, instance_id, whatsapp_chat_id, name, unread_count, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(tenant_id, instance_id, whatsapp_chat_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
                [conversationId, tenantId, instanceId, conv.chatId, conv.name, 1, 'open']
            );

            // Fetch the actual ID in case of conflict (upsert doesn't return id easily in basic sql without returning)
            const storedConv = await db.get<{ id: string }>(
                `SELECT id FROM web_conversations WHERE tenant_id = ? AND instance_id = ? AND whatsapp_chat_id = ?`,
                [tenantId, instanceId, conv.chatId]
            );

            if (!storedConv) continue;

            // Insert Messages
            for (const [index, msg] of conv.messages.entries()) {
                await db.run(
                    `INSERT INTO web_messages (id, tenant_id, conversation_id, content, type, is_from_me, status_read, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        uuidv4(),
                        tenantId,
                        storedConv.id,
                        msg.text,
                        'text',
                        msg.fromMe ? 1 : 0,
                        1, // Read
                        new Date(Date.now() - (1000 * 60 * (conv.messages.length - index))).toISOString()
                    ]
                );
            }
            console.log(`✅ Conversation created for ${conv.name}`);
        }

        console.log('🚀 Simulation data injected successfully!');

    } catch (error) {
        console.error('Error simulating chat:', error);
    } finally {
        await db.close();
        process.exit(0);
    }
}

simulateChat();
