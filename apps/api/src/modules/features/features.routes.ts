import { FEATURE_KEYS, isFeatureKey, type FeatureKey } from '@patinhas/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { setFeatureVisible } from './features.service';

const keyParams = z.object({
    key: z.string().refine(isFeatureKey, `Use one of: ${FEATURE_KEYS.join(', ')}`),
});

export async function featuresRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.put(
        '/admin/features/:key',
        {
            onRequest: app.requireAdmin,
            schema: {
                tags: ['admin: features'],
                params: keyParams,
                body: z.strictObject({ visible: z.boolean() }),
                response: {
                    200: z.object({
                        key: z.string(),
                        visible: z.boolean(),
                        hiddenFeatures: z.array(z.string()),
                    }),
                },
            },
        },
        async (request) => {
            const key = request.params.key as FeatureKey;
            const { visible } = request.body;
            const hiddenFeatures = await setFeatureVisible(app.prisma, key, visible);
            return { key, visible, hiddenFeatures };
        },
    );
}
