import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'vitest/config';

loadDotenv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',

        fileParallelism: false,

        globalSetup: ['./test/global-setup.ts'],
    },
});
