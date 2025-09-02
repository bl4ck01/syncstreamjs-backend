import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import pool from '../db/connection.js';

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      exp: '7d'
    })
  )
  .derive({ as: 'global' }, ({ jwt, headers }) => {
    return {
      // Get user ID from JWT token
      getUserId: async () => {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        
        const token = authHeader.substring(7);
        
        try {
          const payload = await jwt.verify(token);
          return payload?.userId || null;
        } catch {
          return null;
        }
      },
      
      // Get full user from database
      getUser: async () => {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        
        const token = authHeader.substring(7);
        
        try {
          const payload = await jwt.verify(token);
          if (!payload?.userId) return null;
          
          const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [payload.userId]
          );
          
          return result.rows[0] || null;
        } catch {
          return null;
        }
      },
      
      // Get current profile ID from JWT
      getCurrentProfileId: async () => {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        
        const token = authHeader.substring(7);
        
        try {
          const payload = await jwt.verify(token);
          return payload?.current_profile_id || null;
        } catch {
          return null;
        }
      },
      
      // Sign a new JWT token
      signToken: async (userId, email, profileId = null) => {
        return await jwt.sign({
          userId,
          email,
          current_profile_id: profileId
        });
      }
    };
  })
  .decorate('requireAuth', function(includeUser = false) {
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
