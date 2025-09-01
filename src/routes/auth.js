import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { signupSchema, loginSchema } from '../utils/validation.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export const authRoutes = new Elysia({ prefix: '/auth' })
    .use(authPlugin)
    .use(databasePlugin)

    // Signup
    .post('/signup', async ({ body, db, signToken, cookie: { auth } }) => {
        // Validate request body
        const validatedData = signupSchema.parse(body);
        const { email, password, full_name } = validatedData;

        // Check if user exists
        const existingUser = await db.getOne(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser) {
            throw new Error('User with this email already exists');
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

        // Set cookie
        auth.set({
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return {
            id: user.id,
            email: user.email,
            role: user.role
        };
    }, {
        body: t.Object({
            email: t.String({ format: 'email' }),
            password: t.String({ minLength: 8 }),
            full_name: t.Optional(t.String())
        }),
        transform({ body }) {
            // Additional validation with Zod
            return signupSchema.parse(body);
        }
    })

    // Login
    .post('/login', async ({ body, db, signToken, cookie: { auth } }) => {
        // Validate request body
        const validatedData = loginSchema.parse(body);
        const { email, password } = validatedData;

        // Get user by email
        const user = await db.getOne(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Verify password
        const validPassword = await verifyPassword(password, user.password_hash);

        if (!validPassword) {
            throw new Error('Invalid email or password');
        }

        // Sign JWT token
        const token = await signToken(user.id, user.email);

        // Set cookie
        auth.set({
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return {
            id: user.id,
            email: user.email,
            role: user.role
        };
    }, {
        body: t.Object({
            email: t.String({ format: 'email' }),
            password: t.String()
        }),
        transform({ body }) {
            // Additional validation with Zod
            return loginSchema.parse(body);
        }
    })

    // Logout
    .post('/logout', async ({ cookie: { auth } }) => {
        auth.remove();
        return { message: 'Logged out successfully' };
    })

    // Get current user
    .get('/me', async ({ getUser }) => {
        const user = await getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        // Remove sensitive data
        delete user.password_hash;

        return user;
    }, {
        beforeHandle: ({ requireAuth }) => requireAuth(true)
    });
