import { z } from 'zod';

// Schemas de validação para as principais entidades

export const SignupSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
});

export const LoginSchema = z.object({
    username: z.string().min(1, 'Usuário é obrigatório'),
    password: z.string().min(1, 'Senha é obrigatória')
});

export const CreateTenantSchema = z.object({
    name: z.string().min(2, 'Nome é obrigatório'),
    plan_id: z.string().optional(),
    max_instances: z.number().int().positive().optional(),
    max_agents: z.number().int().positive().optional(),
    expires_at: z.string().optional(),
    industry_type: z.string().optional()
});

export const UpdateBrandingSchema = z.object({
    name: z.string().min(2).optional(),
    primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor primária inválida').optional(),
    secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor secundária inválida').optional(),
    logo_url: z.string().url('URL do logo inválida').optional(),
    industry_type: z.string().optional()
});

export const SendMessageSchema = z.object({
    to: z.string().regex(/^\d{10,15}$/, 'Número de telefone inválido'),
    message: z.string().min(1, 'Mensagem não pode estar vazia'),
    mediaUrl: z.string().url().optional()
});

export const CreatePaymentSchema = z.object({
    planId: z.string().min(1, 'ID do plano é obrigatório')
});

export const WebhookPayloadSchema = z.object({
    event: z.string(),
    payment: z.object({
        id: z.string(),
        value: z.number(),
        externalReference: z.string().optional()
    })
});

export const CreateInstanceSchema = z.object({
    name: z.string().min(2, 'Nome da instância deve ter pelo menos 2 caracteres'),
    ai_enabled: z.boolean().optional(),
    ai_provider: z.enum(['openai', 'anthropic', 'groq', 'ollama']).optional(),
    ai_model: z.string().optional()
});

export const UpdateUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.enum(['admin', 'agent', 'supervisor']).optional(),
    active: z.boolean().optional()
});

export const BotSettingsSchema = z.object({
    company: z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional()
    }).optional(),
    messages: z.object({
        welcome: z.string().optional(),
        goodbye: z.string().optional(),
        invalidOption: z.string().optional(),
        outsideHours: z.string().optional(),
        transferToHuman: z.string().optional()
    }).optional(),
    ai: z.object({
        enabled: z.boolean().optional(),
        provider: z.string().optional(),
        model: z.string().optional(),
        apiKey: z.string().optional()
    }).optional(),
    bot: z.object({
        catalogLabel: z.string().optional(),
        sessionTimeout: z.number().int().positive().optional()
    }).optional()
});

// Helper para validar dados
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    } else {
        const errors = (result.error as any).errors.map((err: any) => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
    }
}

// Tipos TypeScript derivados dos schemas
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateBrandingInput = z.infer<typeof UpdateBrandingSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type CreateInstanceInput = z.infer<typeof CreateInstanceSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type BotSettingsInput = z.infer<typeof BotSettingsSchema>;
