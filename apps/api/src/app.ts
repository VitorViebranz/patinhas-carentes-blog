import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { Env } from './config/env';
import { buildLoggerOptions } from './lib/logger';
import { CachedGeocoder, NominatimGeocoder, type Geocoder } from './lib/geocoder';
import { ViaCepLookup, type PostalLookup } from './lib/postal-code';
import { addressesRoutes } from './modules/addresses/addresses.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { adminPointsRoutes } from './modules/collection-points/admin-points.routes';
import { publicPointsRoutes } from './modules/collection-points/points.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { featuresRoutes } from './modules/features/features.routes';
import { healthRoutes } from './modules/health/health.routes';
import { helpRequestsRoutes } from './modules/help-requests/help-requests.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { reportsRoutes } from './modules/monthly-reports/reports.routes';
import { neighborhoodsRoutes } from './modules/neighborhoods/neighborhoods.routes';
import { pickupsRoutes } from './modules/pickups/pickups.routes';
import { settingsRoutes } from './modules/site-settings/settings.routes';
import { storiesRoutes } from './modules/stories/stories.routes';
import { usersRoutes } from './modules/users/users.routes';
import auth from './plugins/auth';
import csrf from './plugins/csrf';
import db from './plugins/db';
import errorHandler from './plugins/error-handler';
import security from './plugins/security';
import swagger from './plugins/swagger';

const REQUEST_TIMEOUT_MS = 30_000;

export interface BuildAppOptions {
    env: Env;

    logStream?: { write(message: string): void };

    geocoder?: Geocoder;

    postalLookup?: PostalLookup;
}

export async function buildApp({
    env,
    logStream,
    geocoder,
    postalLookup,
}: BuildAppOptions): Promise<FastifyInstance> {
    const app = Fastify({
        logger: { ...buildLoggerOptions(env), ...(logStream ? { stream: logStream } : {}) },
        trustProxy: env.TRUST_PROXY,
        requestTimeout: REQUEST_TIMEOUT_MS,
        forceCloseConnections: 'idle',
    });

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(swagger, { env });
    await app.register(security, { env });
    await app.register(errorHandler);
    await app.register(db, { env });
    await app.register(auth, { env });
    await app.register(csrf, { env });

    const activeGeocoder =
        geocoder ??
        new CachedGeocoder(
            new NominatimGeocoder({
                baseUrl: env.NOMINATIM_URL,
                userAgent: env.GEOCODER_USER_AGENT,
            }),
            app.prisma,
        );

    const activePostalLookup = postalLookup ?? new ViaCepLookup({ baseUrl: env.VIACEP_URL });

    await app.register(
        async (api) => {
            await api.register(healthRoutes);
            await api.register(authRoutes, { env });
            await api.register(usersRoutes);
            await api.register(publicPointsRoutes);
            await api.register(adminPointsRoutes, { env, geocoder: activeGeocoder });
            await api.register(addressesRoutes, {
                env,
                geocoder: activeGeocoder,
                postalLookup: activePostalLookup,
            });
            await api.register(neighborhoodsRoutes);
            await api.register(settingsRoutes);
            await api.register(featuresRoutes);
            await api.register(helpRequestsRoutes, { env });
            await api.register(reportsRoutes);
            await api.register(pickupsRoutes);
            await api.register(storiesRoutes);
            await api.register(mediaRoutes, { env });
            await api.register(dashboardRoutes);
        },
        { prefix: '/api/v1' },
    );

    return app;
}
