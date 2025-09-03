import { Elysia } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { signupSchema, loginSchema } from '../utils/schemas.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createLogger, SECURITY_EVENTS } from '../services/logger.js';

export const authRoutes = new Elysia({ prefix: '/auth' })
    .use(authPlugin)
    .use(databasePlugin)
    .derive(({ db }) => ({
        logger: createLogger(db)
    }))

    // Signup
    .post('/signup', async ({ body, db, signToken, set, logger, request }) => {
        // Body is already validated by Elysia
        const { email, password, full_name } = body;

        // Log signup attempt
        await logger.logSecurityEvent({
            event_type: SECURITY_EVENTS.REGISTER_ATTEMPT,
            email,
            success: true,
            request
        });

        // Check if user exists
        const existingUser = await db.getOne(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser) {
            await logger.logSecurityEvent({
                event_type: SECURITY_EVENTS.REGISTER_FAILED,
                email,
                success: false,
                failure_reason: 'Email already exists',
                request
            });
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
        await logger.logSecurityEvent({
            event_type: SECURITY_EVENTS.REGISTER_SUCCESS,
            user_id: user.id,
            email: user.email,
            success: true,
            request
        });

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
    .post('/login', async ({ body, db, signToken, set, logger, request }) => {
        // Body is already validated by Elysia
        const { email, password } = body;

        // Check for too many failed attempts
        const failedAttempts = await logger.getRecentFailedLogins(email, 15);
        if (failedAttempts >= 5) {
            await logger.logSecurityEvent({
                event_type: SECURITY_EVENTS.LOGIN_BLOCKED,
                email,
                success: false,
                failure_reason: 'Too many failed attempts',
                metadata: { failed_attempts: failedAttempts },
                request
            });
            set.status = 429;
            return { success: false, message: 'Too many failed login attempts. Please try again later.', data: null };
        }

        // Log login attempt
        await logger.logSecurityEvent({
            event_type: SECURITY_EVENTS.LOGIN_ATTEMPT,
            email,
            success: true,
            request
        });

        // Get user by email
        const user = await db.getOne(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (!user) {
            await logger.logSecurityEvent({
                event_type: SECURITY_EVENTS.LOGIN_FAILED,
                email,
                success: false,
                failure_reason: 'User not found',
                request
            });
            set.status = 401;
            return { success: false, message: 'Invalid email or password', data: null };
        }

        // Verify password
        const validPassword = await verifyPassword(password, user.password_hash);

        if (!validPassword) {
            await logger.logSecurityEvent({
                event_type: SECURITY_EVENTS.LOGIN_FAILED,
                user_id: user.id,
                email,
                success: false,
                failure_reason: 'Invalid password',
                request
            });
            set.status = 401;
            return { success: false, message: 'Invalid email or password', data: null };
        }

        // Check for suspicious activity
        const clientInfo = logger.extractClientInfo(request);
        await logger.checkSuspiciousActivity(user.id, clientInfo.ip_address);

        // Sign JWT token
        const token = await signToken(user.id, user.email);

        // Log successful login
        await logger.logSecurityEvent({
            event_type: SECURITY_EVENTS.LOGIN_SUCCESS,
            user_id: user.id,
            email: user.email,
            success: true,
            request
        });

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
    .post('/logout', async ({ getUserId, logger, request }) => {
        const userId = await getUserId();
        
        if (userId) {
            await logger.logSecurityEvent({
                event_type: SECURITY_EVENTS.LOGOUT,
                user_id: userId,
                success: true,
                request
            });
        }
        // With token-based auth, logout is handled client-side by removing the token
        return {
            success: true,
            message: 'Logged out successfully',
            data: null
        };
    })

    // Get current user
    .get('/me', async ({ getUser, set, getUserId, logger, request }) => {
        // Manual auth check
        const userId = await getUserId();
        if (!userId) {
            await logger.logSecurityEvent({
                event_type: SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
                success: false,
                failure_reason: 'Invalid or missing authentication token',
                metadata: { endpoint: '/auth/me' },
                request
            });
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
