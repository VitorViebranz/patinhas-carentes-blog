import { createHmac, randomBytes } from 'node:crypto';
import type { Env } from '../../config/env';
import type { PrismaClient, UserRole } from '../../generated/prisma/client';

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export function hashSessionToken(secret: string, token: string): string {
    return createHmac('sha256', secret).update(token).digest('hex');
}

export function sessionCookieName(env: Env): string {
    return env.COOKIE_SECURE ? '__Host-sid' : 'sid';
}

export async function createSession(
    prisma: PrismaClient,
    env: Env,
    userId: string,
): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3_600_000);
    await prisma.session.create({
        data: { tokenHash: hashSessionToken(env.SESSION_SECRET, token), userId, expiresAt },
    });
    return { token, expiresAt };
}

export async function findSessionUser(
    prisma: PrismaClient,
    env: Env,
    token: string,
): Promise<SessionUser | null> {
    const session = await prisma.session.findUnique({
        where: { tokenHash: hashSessionToken(env.SESSION_SECRET, token) },
        include: { user: true },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;
    const { id, name, email, role } = session.user;
    return { id, name, email, role };
}

export async function deleteSession(prisma: PrismaClient, env: Env, token: string): Promise<void> {
    await prisma.session.deleteMany({
        where: { tokenHash: hashSessionToken(env.SESSION_SECRET, token) },
    });
}

export async function deleteUserSessions(prisma: PrismaClient, userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
}

export async function deleteExpiredSessions(prisma: PrismaClient): Promise<void> {
    await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
