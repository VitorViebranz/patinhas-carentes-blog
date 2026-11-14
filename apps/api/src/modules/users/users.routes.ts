import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { compact } from '../../lib/compact';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { hashPassword } from '../../lib/password';
import { paginationMeta, paginationMetaSchema, paginationQuery } from '../../lib/pagination';
import { deleteUserSessions } from '../auth/session.service';
import { emailField, passwordField, toUserDto, userSchema } from './user.schemas';

const idParams = z.object({ id: z.uuid() });
const roleSchema = z.enum(['ADMIN', 'EDITOR']);

export async function usersRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();
    const tags = ['admin: users'];
    const guard = { onRequest: app.requireAdmin };

    route.get(
        '/admin/users',
        {
            ...guard,
            schema: {
                tags,
                querystring: paginationQuery,
                response: {
                    200: z.object({ items: z.array(userSchema), meta: paginationMetaSchema }),
                },
            },
        },
        async (request) => {
            const { page, pageSize } = request.query;
            const [items, total] = await Promise.all([
                app.prisma.user.findMany({
                    orderBy: { createdAt: 'asc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                app.prisma.user.count(),
            ]);
            return { items: items.map(toUserDto), meta: paginationMeta(page, pageSize, total) };
        },
    );

    route.get(
        '/admin/users/:id',
        { ...guard, schema: { tags, params: idParams, response: { 200: userSchema } } },
        async (request) => {
            const user = await app.prisma.user.findUnique({ where: { id: request.params.id } });
            if (!user) throw new NotFoundError('User not found');
            return toUserDto(user);
        },
    );

    route.post(
        '/admin/users',
        {
            ...guard,
            schema: {
                tags,
                body: z.strictObject({
                    name: z.string().trim().min(1).max(120),
                    email: emailField,
                    password: passwordField,
                    role: roleSchema.default('EDITOR'),
                }),
                response: { 201: userSchema },
            },
        },
        async (request, reply) => {
            const { name, email, password, role } = request.body;
            if (await app.prisma.user.findUnique({ where: { email } })) {
                throw new ConflictError('E-mail already in use');
            }
            const user = await app.prisma.user.create({
                data: { name, email, role, passwordHash: await hashPassword(password) },
            });
            return reply.code(201).send(toUserDto(user));
        },
    );

    route.patch(
        '/admin/users/:id',
        {
            ...guard,
            schema: {
                tags,
                params: idParams,
                body: z.strictObject({
                    name: z.string().trim().min(1).max(120).optional(),
                    email: emailField.optional(),
                    password: passwordField.optional(),
                    role: roleSchema.optional(),
                    isActive: z.boolean().optional(),
                }),
                response: { 200: userSchema },
            },
        },
        async (request) => {
            const { id } = request.params;
            const { password, ...rest } = request.body;
            const actor = request.user as NonNullable<typeof request.user>;

            if (id === actor.id && (rest.role === 'EDITOR' || rest.isActive === false)) {
                throw new ConflictError('You cannot remove your own administrator access');
            }

            const existing = await app.prisma.user.findUnique({ where: { id } });
            if (!existing) throw new NotFoundError('User not found');
            if (rest.email && rest.email !== existing.email) {
                if (await app.prisma.user.findUnique({ where: { email: rest.email } })) {
                    throw new ConflictError('E-mail already in use');
                }
            }

            const user = await app.prisma.user.update({
                where: { id },
                data: {
                    ...compact(rest),
                    ...(password ? { passwordHash: await hashPassword(password) } : {}),
                },
            });

            if (password || rest.isActive === false || (rest.role && rest.role !== existing.role))
                await deleteUserSessions(app.prisma, id);
            return toUserDto(user);
        },
    );

    route.delete(
        '/admin/users/:id',
        { ...guard, schema: { tags, params: idParams } },
        async (request, reply) => {
            const { id } = request.params;
            if (id === request.user?.id)
                throw new ConflictError('You cannot delete your own account');
            const existing = await app.prisma.user.findUnique({ where: { id } });
            if (!existing) throw new NotFoundError('User not found');
            await app.prisma.user.delete({ where: { id } });
            return reply.code(204).send();
        },
    );
}
