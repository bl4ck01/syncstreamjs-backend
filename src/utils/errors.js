// Custom error classes for better error handling

export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT_ERROR');
    }
}

export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

export class PaymentError extends AppError {
    constructor(message = 'Payment required', details = null) {
        super(message, 402, 'PAYMENT_ERROR', details);
    }
}

export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
    }
}

export class StripeError extends AppError {
    constructor(message = 'Payment processing failed', stripeError = null) {
        super(message, 500, 'STRIPE_ERROR');
        this.stripeError = stripeError;
    }
}

export class ExternalServiceError extends AppError {
    constructor(service, message = 'External service error', originalError = null) {
        super(`${service}: ${message}`, 503, 'EXTERNAL_SERVICE_ERROR');
        this.service = service;
        this.originalError = originalError;
    }
}

// Error handler utility
export const handleError = (error, context = '') => {
    // Log error with context
    console.error(`[${new Date().toISOString()}] Error in ${context}:`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
        details: error.details
    });

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        // Sentry integration would go here
    }

    // Return appropriate error response
    if (error.isOperational) {
        return {
            success: false,
            error: {
                message: error.message,
                code: error.code,
                details: error.details
            }
        };
    }

    // For non-operational errors, return generic message
    return {
        success: false,
        error: {
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        }
    };
};

// Database error handler
export const handleDatabaseError = (error) => {
    // PostgreSQL error codes
    const pgErrorCodes = {
        '23505': 'Duplicate entry',
        '23503': 'Foreign key violation',
        '23502': 'Not null violation',
        '23514': 'Check constraint violation',
        '42P01': 'Table does not exist',
        '42703': 'Column does not exist',
        '08003': 'Connection does not exist',
        '08006': 'Connection failure',
        '57P03': 'Database is starting up',
        '53300': 'Too many connections'
    };

    const code = error.code;
    const message = pgErrorCodes[code] || 'Database operation failed';

    throw new DatabaseError(message, error);
};

// Stripe error handler
export const handleStripeError = (error) => {
    const stripeErrorTypes = {
        'card_error': 'Card was declined',
        'invalid_request_error': 'Invalid request to payment processor',
        'api_connection_error': 'Payment service connection failed',
        'api_error': 'Payment service error',
        'authentication_error': 'Payment authentication failed',
        'rate_limit_error': 'Too many payment requests',
        'validation_error': 'Payment validation failed'
    };

    const message = stripeErrorTypes[error.type] || error.message || 'Payment processing failed';

    throw new StripeError(message, error);
};
