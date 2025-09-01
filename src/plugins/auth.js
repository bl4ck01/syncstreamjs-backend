import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cookie } from '@elysiajs/cookie';
import pool from '../db/connection.js';

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      exp: '7d'
    })
  )
  .use(cookie())
  .derive({ as: 'global' }, ({ jwt, cookie: { auth } }) => {
    return {
      // Get user ID from JWT token
      getUserId: async () => {
        if (!auth?.value) return null;
        
        try {
          const payload = await jwt.verify(auth.value);
          return payload?.userId || null;
        } catch {
          return null;
        }
      },
      
      // Get full user from database
      getUser: async () => {
        if (!auth?.value) return null;
        
        try {
          const payload = await jwt.verify(auth.value);
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
        if (!auth?.value) return null;
        
        try {
          const payload = await jwt.verify(auth.value);
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
  .macro(({ onBeforeHandle }) => ({
    // Require authentication macro
    requireAuth: (includeUser = false) => {
      onBeforeHandle(async ({ getUserId, getUser, set }) => {
        const userId = await getUserId();
        
        if (!userId) {
          set.status = 401;
          throw new Error('Unauthorized');
        }
        
        if (includeUser) {
          const user = await getUser();
          if (!user) {
            set.status = 401;
            throw new Error('Unauthorized');
          }
        }
      });
    }
  }));