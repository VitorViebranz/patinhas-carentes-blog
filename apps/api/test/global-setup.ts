import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TEST_DATABASE_URL } from './helpers/build-test-app';

export default function setup(): void {
    const apiDir = fileURLToPath(new URL('..', import.meta.url));

    execFileSync('npx', ['prisma', 'migrate', 'deploy', '--config', 'prisma7.config.ts'], {
        cwd: apiDir,
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdio: 'inherit',
    });
}
