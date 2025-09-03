import { Elysia } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { signupSchema, loginSchema } from '../utils/schemas.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export const authRoutes = new Elysia({ prefix: '/auth' })
    .use(authPlugin)
    .use(databasePlugin)

    // Signup
    .post('/signup', async ({ body, db, signToken, set }) => {
        // Body is already validated by Elysia
        const { email, password, full_name } = body;

        // Simple logging
        console.log(`[AUTH] Signup attempt for ${email}`);

        // Check if user exists
        const existingUser = await db.getOne(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser) {
            console.log(`[AUTH] Signup failed - Email already exists: ${email}`);
            set.status = 409;
            return { success: false, message: 'User with this email already exists', data: null };
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const user = await db.insert('users', {
            email,
            password_hash: passwordHash,
            full_name,
            role: 'user',
            has_used_trial: false,
            credits_balance: 0
        });

        // Create default profile
        await db.insert('profiles', {
            user_id: user.id,
            name: 'Default',
            is_kids_profile: false
        });

        // Sign JWT token
        const token = await signToken(user.id, user.email);

        // Log successful registration
        console.log(`[AUTH] User registered successfully: ${user.email}`);

        return {
            success: true,
            message: 'User registered successfully',
            data: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                token
            }
        };
    }, {
        body: signupSchema
    })

    // Login
    .post('/login', async ({ body, db, signToken, set }) => {
        // Body is already validated by Elysia
        const { email, password } = body;

        console.log(`[AUTH] Login attempt for ${email}`);

        // Get user by email
        const user = await db.getOne(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (!user) {
            console.log(`[AUTH] Login failed - User not found: ${email}`);
            set.status = 401;
            return { success: false, message: 'Invalid email or password', data: null };
        }

        // Verify password
        const validPassword = await verifyPassword(password, user.password_hash);

        if (!validPassword) {
            console.log(`[AUTH] Login failed - Invalid password for: ${email}`);
            set.status = 401;
            return { success: false, message: 'Invalid email or password', data: null };
        }

        // Sign JWT token
        const token = await signToken(user.id, user.email);

        console.log(`[AUTH] Login successful for: ${user.email}`);

        return {
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                token
            }
        };
    }, {
        body: loginSchema
    })

    // Logout
    .post('/logout', async ({ getUserId }) => {
        const userId = await getUserId();
        
        if (userId) {
            console.log(`[AUTH] User logged out: ${userId}`);
        }
        // With token-based auth, logout is handled client-side by removing the token
        return {
            success: true,
            message: 'Logged out successfully',
            data: null
        };
    })

    // Get current user
    .get('/me', async ({ getUser, set, getUserId }) => {
        // Manual auth check
        const userId = await getUserId();
        if (!userId) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        const user = await getUser();
        if (!user) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - User not found',
                data: null
            };
        }

        // Remove sensitive data
        delete user.password_hash;

        return {
            success: true,
            message: null,
            data: user
        };
    });
