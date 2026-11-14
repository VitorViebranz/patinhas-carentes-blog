import { z } from 'zod';

const PLACEHOLDER_SECRET = /^change-?me/i;

const envSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        HOST: z.string().min(1).default('0.0.0.0'),
        PORT: z.coerce.number().int().min(1).max(65535).default(3000),
        LOG_LEVEL: z
            .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
            .default('info'),
        DATABASE_URL: z.string().min(1),

        SESSION_SECRET: z.string().min(32),

        TRUST_PROXY: z.stringbool().default(false),
        RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),

        ALLOWED_ORIGINS: z
            .string()
            .default('')
            .transform((value) =>
                value
                    .split(',')
                    .map((origin) => origin.trim())
                    .filter(Boolean),
            ),
        SESSION_TTL_HOURS: z.coerce.number().int().min(1).default(24),

        COOKIE_SECURE: z.stringbool().optional(),
        AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
        HELP_REQUEST_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
        GEOCODE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
        UPLOAD_DIR: z.string().min(1).default('./uploads'),
        UPLOAD_MAX_BYTES: z.coerce.number().int().min(1).default(5_242_880),
        VIACEP_URL: z.url().default('https://viacep.com.br'),
        NOMINATIM_URL: z.url().default('https://nominatim.openstreetmap.org'),

        GEOCODER_USER_AGENT: z.string().min(1).default('PatinhasCarentesJoinville/1.0'),
    })
    .superRefine((env, context) => {
        if (env.NODE_ENV === 'production' && PLACEHOLDER_SECRET.test(env.SESSION_SECRET)) {
            context.addIssue({
                code: 'custom',
                path: ['SESSION_SECRET'],
                message: 'Replace the example value with a random secret (openssl rand -hex 32)',
            });
        }
    })
    .transform((env) => ({
        ...env,

        COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    }));

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
    const result = envSchema.safeParse(source);
    if (!result.success) {
        const problems = result.error.issues
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; ');
        throw new Error(`Invalid environment: ${problems}`);
    }
    return result.data;
}
