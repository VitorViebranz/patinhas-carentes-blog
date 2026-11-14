import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError, NotFoundError, type ErrorDetail } from '../lib/errors';

interface ErrorBody {
    error: {
        code: string;
        message: string;
        details?: ErrorDetail[];
    };
}

function body(code: string, message: string, details?: ErrorDetail[]): ErrorBody {
    return { error: { code, message, ...(details ? { details } : {}) } };
}

function hasClientStatus(error: unknown): error is FastifyError {
    if (typeof error !== 'object' || error === null) return false;
    const status = (error as { statusCode?: unknown }).statusCode;
    return typeof status === 'number' && status >= 400 && status < 500;
}

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
    app.setNotFoundHandler({ preHandler: app.rateLimit() }, async (request, reply) => {
        const error = new NotFoundError(`Route ${request.method} ${request.url} not found`);
        return reply.code(error.statusCode).send(body(error.code, error.message));
    });

    app.setErrorHandler(async (error, request, reply) => {
        if (error instanceof AppError) {
            return reply
                .code(error.statusCode)
                .send(body(error.code, error.message, error.details));
        }

        if (hasZodFastifySchemaValidationErrors(error)) {
            const details = error.validation.map((issue) => ({
                path: issue.instancePath.replace(/^\//, '').replace(/\//g, '.'),
                message: issue.message ?? 'Invalid value',
            }));
            return reply
                .code(400)
                .send(body('VALIDATION_ERROR', 'Request validation failed', details));
        }

        if (hasClientStatus(error)) {
            const code = error.statusCode === 429 ? 'RATE_LIMITED' : 'BAD_REQUEST';
            return reply.code(error.statusCode ?? 400).send(body(code, error.message));
        }

        request.log.error({ err: error }, 'Unhandled error');
        return reply.code(500).send(body('INTERNAL_ERROR', 'Something went wrong'));
    });
}

export default fp(errorHandlerPlugin, { name: 'error-handler', dependencies: ['security'] });
