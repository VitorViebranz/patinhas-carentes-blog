import { describe, expect, it } from 'vitest';
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
    type AppError,
} from './errors';

describe('domain errors', () => {
    it.each([
        [new ValidationError('bad'), 400, 'VALIDATION_ERROR'],
        [new UnauthorizedError('no'), 401, 'UNAUTHORIZED'],
        [new NotFoundError('gone'), 404, 'NOT_FOUND'],
        [new ConflictError('dup'), 409, 'CONFLICT'],
    ] as [AppError, number, string][])(
        '%s maps to a status and a stable code',
        (error, status, code) => {
            expect(error.statusCode).toBe(status);
            expect(error.code).toBe(code);
        },
    );

    it('keeps the class name and the details it was created with', () => {
        const error = new ValidationError('bad', [{ path: 'email', message: 'Required' }]);

        expect(error.name).toBe('ValidationError');
        expect(error.details).toEqual([{ path: 'email', message: 'Required' }]);
    });
});
