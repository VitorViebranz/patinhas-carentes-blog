import { buildApp } from './app';
import { loadEnv } from './config/env';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
    const env = loadEnv();
    const app = await buildApp({ env });

    let shuttingDown = false;
    const shutdown = async (signal: string): Promise<void> => {
        if (shuttingDown) return;
        shuttingDown = true;
        app.log.info({ signal }, 'Shutting down');

        const forceExit = setTimeout(() => {
            app.log.error('Shutdown timed out, forcing exit');
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
        forceExit.unref();

        try {
            await app.close();
            process.exit(0);
        } catch (error) {
            app.log.error({ err: error }, 'Error during shutdown');
            process.exit(1);
        }
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    await app.listen({ host: env.HOST, port: env.PORT });
}

main().catch((error: unknown) => {
    process.stderr.write(
        `Failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
});
