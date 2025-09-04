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
                message: undefined,
                data: response
            };
        }

        // Empty successful response
        set.status = set.status || 200;
        return {
            success: true,
            message: undefined,
            data: null
        };
    });
