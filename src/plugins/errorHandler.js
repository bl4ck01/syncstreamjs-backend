import { Elysia } from 'elysia';
import env, { isDevelopment } from '../utils/env.js';
import { AppError } from '../utils/errors.js';

// Error logger
const logError = (error, context = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500,
    stack: isDevelopment() ? error.stack : undefined,
    context,
    ...error.details && { details: error.details }
  };
  
  // In production, send to monitoring service
  if (!isDevelopment() && env.SENTRY_DSN) {
    // Sentry integration would go here
    // Sentry.captureException(error, { extra: context });
  }
  
  console.error(JSON.stringify(errorLog, null, isDevelopment() ? 2 : 0));
};

// Global error handler plugin
export const errorHandlerPlugin = new Elysia({ name: 'errorHandler' })
  .onError(({ code, error, set, request, path }) => {
    // Log error with context
    const context = {
      path,
      method: request.method,
      headers: isDevelopment() ? request.headers : undefined,
      query: new URL(request.url).searchParams.toString(),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    };
    
    logError(error, context);
    
    // Handle different error types
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        message: error.message,
        data: null
      };
    }
    
    // Handle Elysia validation errors
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: 'Validation error',
        data: null
      };
    }
    
    // Handle not found errors
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        success: false,
        message: 'Resource not found',
        data: null
      };
    }
    
    // Handle parse errors
    if (code === 'PARSE') {
      set.status = 400;
      return {
        success: false,
        message: 'Invalid request format',
        data: null
      };
    }
    
    // Database errors
    if (error.code && error.code.startsWith('2') || error.code?.startsWith('5')) {
      set.status = 500;
      return {
        success: false,
        message: 'Database operation failed',
        data: null
      };
    }
    
    // Default error response
    set.status = error.statusCode || 500;
    try {
      return {
        success: false,
        message: isDevelopment() ? error.message : 'An unexpected error occurred',
        data: null
      };
    } catch {
      // Final fallback to ensure JSON content-type
      set.headers['Content-Type'] = 'application/json; charset=utf-8';
      return {
        success: false,
        message: 'An unexpected error occurred',
        data: null
      };
    }
  })
  .onBeforeHandle(({ request, set }) => {
    // Add request ID for tracking
    const requestId = crypto.randomUUID();
    set.headers['X-Request-ID'] = requestId;
    
    // Log incoming request in development
    if (isDevelopment()) {
      console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ID: ${requestId}`);
    }
  })
  .onAfterHandle(({ set, request }) => {
    // Log response in development
    if (isDevelopment() && set.headers['X-Request-ID']) {
      const requestId = set.headers['X-Request-ID'];
      console.log(`[${new Date().toISOString()}] Response for ${request.method} ${request.url} - ID: ${requestId}`);
    }
  });

export default errorHandlerPlugin;
