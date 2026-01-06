import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware genérico de validação usando Zod
 */
export function validateRequest(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((err: any) => ({
                field: err.path.join('.'),
                message: err.message
            }));

            res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: errors
            });
            return;
        }

        // Substitui req.body pelos dados validados e tipados
        req.body = result.data;
        next();
    };
}

/**
 * Middleware para validar query params
 */
export function validateQuery(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            const errors = result.error.issues.map((err: any) => ({
                field: err.path.join('.'),
                message: err.message
            }));

            res.status(400).json({
                success: false,
                error: 'Parâmetros de consulta inválidos',
                details: errors
            });
            return;
        }

        req.query = result.data as any;
        next();
    };
}

/**
 * Middleware para validar params de rota
 */
export function validateParams(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const errors = result.error.issues.map((err: any) => ({
                field: err.path.join('.'),
                message: err.message
            }));

            res.status(400).json({
                success: false,
                error: 'Parâmetros de rota inválidos',
                details: errors
            });
            return;
        }

        req.params = result.data as any;
        next();
    };
}
