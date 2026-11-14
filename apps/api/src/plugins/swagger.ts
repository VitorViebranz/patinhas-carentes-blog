import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import type { Env } from '../config/env';

interface SwaggerOptions {
    env: Env;
}

async function swaggerPlugin(app: FastifyInstance, options: SwaggerOptions): Promise<void> {
    await app.register(swagger, {
        openapi: {
            info: {
                title: 'Patinhas Carentes API',
                description:
                    'REST API for the Patinhas Carentes Joinville website and staff panel.',
                version: '0.1.0',
            },
        },
        transform: jsonSchemaTransform,
    });

    if (options.env.NODE_ENV !== 'production') {
        await app.register(swaggerUi, { routePrefix: '/docs', staticCSP: true });
    }
}

export default fp(swaggerPlugin, { name: 'swagger' });
