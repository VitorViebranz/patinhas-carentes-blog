export interface ErrorDetail {
    path?: string;
    message: string;
}

export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract readonly code: string;
    readonly details: ErrorDetail[] | undefined;

    constructor(message: string, details?: ErrorDetail[]) {
        super(message);
        this.name = new.target.name;
        this.details = details;
    }
}

export class ValidationError extends AppError {
    readonly statusCode = 400;
    readonly code = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends AppError {
    readonly statusCode = 401;
    readonly code = 'UNAUTHORIZED';
}

export class NotFoundError extends AppError {
    readonly statusCode = 404;
    readonly code = 'NOT_FOUND';
}

export class ConflictError extends AppError {
    readonly statusCode = 409;
    readonly code = 'CONFLICT';
}

export class ForbiddenError extends AppError {
    readonly statusCode = 403;
    readonly code = 'FORBIDDEN';
}

export class UnprocessableError extends AppError {
    readonly statusCode = 422;
    readonly code: string;

    constructor(message: string, code = 'UNPROCESSABLE', details?: ErrorDetail[]) {
        super(message, details);
        this.code = code;
    }
}

export class TooManyRequestsError extends AppError {
    readonly statusCode = 429;
    readonly code = 'RATE_LIMITED';
}
