import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_WEB_PORT = 5847;
const DEFAULT_API_PORT = 3847;

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '');
    const webPort = Number(env['WEB_DEV_PORT'] ?? DEFAULT_WEB_PORT);
    const apiPort = Number(env['PORT'] ?? DEFAULT_API_PORT);

    return {
        plugins: [react()],
        server: {
            port: webPort,
            strictPort: true,
            proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
        },
    };
});
