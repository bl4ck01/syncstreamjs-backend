import { Elysia } from 'elysia';

export const formatPlugin = new Elysia({ name: 'format' })
  .mapResponse(({ response, set }) => {
    // Skip if already formatted
    if (response && typeof response === 'object' && 'success' in response) {
      return response;
    }
    
    // Format successful responses
    if (response !== undefined && response !== null) {
      set.status = set.status || 200;
      return {
        success: true,
        data: response
      };
    }
    
    // Empty successful response
    set.status = set.status || 200;
    return {
      success: true,
      data: null
    };
  })
  .onError(({ code, error, set }) => {
    // Handle different error types
    let status = 500;
    let message = error.message || 'Internal server error';
    
    switch (code) {
      case 'VALIDATION':
        status = 400;
        message = 'Validation error: ' + message;
        break;
      case 'NOT_FOUND':
        status = 404;
        break;
      case 'PARSE':
        status = 400;
        message = 'Invalid request format';
        break;
      case 'INTERNAL_SERVER_ERROR':
        status = 500;
        break;
      default:
        // Custom error handling
        if (error.message.includes('Unauthorized')) {
          status = 401;
        } else if (error.message.includes('Forbidden')) {
          status = 403;
        } else if (error.message.includes('not found')) {
          status = 404;
        } else if (error.message.includes('limit reached') || 
                   error.message.includes('Insufficient')) {
          status = 402; // Payment Required
        }
    }
    
    set.status = status;
    
    return {
      success: false,
      message: message
    };
  });