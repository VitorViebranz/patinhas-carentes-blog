import { z } from 'zod';
import type { User } from '../../generated/prisma/client';
import { iso, isoOrNull } from '../../lib/dates';
import { MIN_PASSWORD_LENGTH } from '../../lib/password';

export const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['ADMIN', 'EDITOR']),
    isActive: z.boolean(),
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
});

export function toUserDto(user: User): z.infer<typeof userSchema> {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: isoOrNull(user.lastLoginAt),
        createdAt: iso(user.createdAt),
    };
}

export const emailField = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const passwordField = z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must have at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200);
