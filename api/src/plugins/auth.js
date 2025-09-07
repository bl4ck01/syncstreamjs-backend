import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import pool from '../db/connection.js';

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      exp: process.env.JWT_EXPIRY || '7d'
    })
  )
  .derive({ as: 'global' }, ({ jwt, headers }) => {
    // Cache the JWT payload to avoid multiple verifications
    let cachedPayload = null;
    let cacheChecked = false;

    const getJWTPayload = async () => {
      if (cacheChecked) return cachedPayload;

      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        cacheChecked = true;
        return null;
      }

      const token = authHeader.substring(7);

      try {
        cachedPayload = await jwt.verify(token);
        cacheChecked = true;
        return cachedPayload;
      } catch {
        cacheChecked = true;
        return null;
      }
    };

    return {
      // Get user ID from JWT token (optimized with caching)
      getUserId: async () => {
        const payload = await getJWTPayload();
        return payload?.userId || null;
      },

      // Get full user from database (DEPRECATED - use userContextMiddleware instead)
      getUser: async () => {
        console.warn('[AUTH] getUser() is deprecated. Use userContextMiddleware for optimized queries.');
        const payload = await getJWTPayload();
        if (!payload?.userId) return null;

        const result = await pool.query(
          'SELECT * FROM users WHERE id = $1',
          [payload.userId]
        );

        return result.rows[0] || null;
      },

      // Sign a new JWT token
      signToken: async (userId, email) => {
        return await jwt.sign({
          userId,
          email
        });
      },

      // Sign a profile selection JWT token
      signProfileToken: async (userId, profileId) => {
        return await jwt.sign({
          userId,
          profileId,
          type: 'profile'
        });
      },

      // Verify any JWT token string and return payload or null
      verifyAnyToken: async (token) => {
        try {
          return await jwt.verify(token);
        } catch {
          return null;
        }
      }
    };
  })
  .decorate('requireAuth', function (includeUser = false) {
    console.warn('[AUTH] requireAuth() decorator is deprecated. Use authMiddleware and userContextMiddleware instead.');
    return async ({ getUserId, getUser, set }) => {
      const userId = await getUserId();

      if (!userId) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized - Invalid or missing authentication token',
          data: null
        };
      }

      if (includeUser) {
        const user = await getUser();
        if (!user) {
          set.status = 401;
          return {
            success: false,
            message: 'Unauthorized - User not found',
            data: null
          };
        }
      }
    };
  });
