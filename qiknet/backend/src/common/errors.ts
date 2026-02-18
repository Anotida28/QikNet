export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code?: string) {
    super(400, message, code);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code?: string) {
    super(404, message, code);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(401, message, code);
    this.name = 'UnauthorizedError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string, code?: string) {
    super(502, message, code);
    this.name = 'PaymentError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
