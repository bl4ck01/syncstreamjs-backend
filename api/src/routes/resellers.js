import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, userContextMiddleware, roleMiddleware } from '../middleware/auth.js';
import { createClientSchema, paginationSchema } from '../utils/schemas.js';
import { hashPassword } from '../utils/password.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const resellerRoutes = new Elysia({ prefix: '/reseller' })
    .use(authPlugin)
    .use(databasePlugin)
    .use(authMiddleware)
    .use(userContextMiddleware)
    .use(roleMiddleware(['reseller'])) // Apply role check to all reseller routes

    // Get reseller dashboard data - OPTIMIZED
    .get('/dashboard', async ({ user, db }) => {
        // User info already loaded in middleware
        
        // Get client stats
        const clientStats = await db.getOne(`
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as active_clients
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'trialing')
            WHERE u.parent_reseller_id = $1
        `, [user.id]);
        
        // Get recent transactions
        const recentTransactions = await db.getMany(`
            SELECT * FROM credits_transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [user.id]);
        
        return {
            reseller: {
                email: user.email,
                full_name: user.full_name,
                credits_balance: user.credits_balance
            },
            stats: {
                total_clients: parseInt(clientStats.total_clients),
                active_clients: parseInt(clientStats.active_clients)
            },
            recent_transactions: recentTransactions
        };
    })

    // Get reseller's clients - OPTIMIZED with single query
    .get('/clients', async ({ user, db, query }) => {
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;
        
        // Get clients with subscription info in one query
        const clients = await db.getMany(`
            SELECT 
                u.id, u.email, u.full_name, u.created_at,
                s.status as subscription_status,
                p.name as plan_name
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'trialing')
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE u.parent_reseller_id = $1
            ORDER BY u.created_at DESC
            LIMIT $2 OFFSET $3
        `, [user.id, limit, offset]);
        
        const totalResult = await db.getOne(
            'SELECT COUNT(*) as total FROM users WHERE parent_reseller_id = $1',
            [user.id]
        );
        
        return {
            clients,
            total: parseInt(totalResult.total),
            page,
            limit,
            pages: Math.ceil(totalResult.total / limit)
        };
    }, {
        query: paginationSchema
    })

    // Create client account - OPTIMIZED with transaction
    .post('/clients', async ({ body, user, db, set }) => {
        const { email, password, full_name, plan_id } = body;
        
        // Get the plan
        const plan = await db.getOne(
            'SELECT * FROM plans WHERE id = $1 AND is_active = true',
            [plan_id]
        );
        
        if (!plan) {
            set.status = 400;
            return {
                success: false,
                message: 'Invalid plan ID',
                data: null
            };
        }
        
        // Calculate credits needed (monthly price)
        const creditsNeeded = plan.price_monthly;
        
        // Use transaction for atomic operation
        const result = await db.transaction(async (client) => {
            // Lock reseller row and check credits
            const reseller = await client.query(
                'SELECT credits_balance FROM users WHERE id = $1 FOR UPDATE',
                [user.id]
            );
            
            if (reseller.rows[0].credits_balance < creditsNeeded) {
                throw new Error(`Insufficient credits. Required: ${creditsNeeded}, Available: ${reseller.rows[0].credits_balance}`);
            }
            
            // Check if email already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
            
            if (existingUser.rows.length > 0) {
                throw new Error('User with this email already exists');
            }
            
            // Create client user
            const passwordHash = await hashPassword(password);
            const newUser = await client.query(
                `INSERT INTO users (email, password_hash, full_name, role, parent_reseller_id, created_by_reseller) 
                 VALUES ($1, $2, $3, 'user', $4, true) 
                 RETURNING id, email, full_name`,
                [email, passwordHash, full_name, user.id]
            );
            
            const clientUser = newUser.rows[0];
            
            // Create Stripe subscription for the client
            let stripeCustomer;
            if (user.stripe_customer_id) {
                // Create subscription under reseller's Stripe account
                stripeCustomer = await stripe.customers.create({
                    email: clientUser.email,
                    metadata: {
                        user_id: clientUser.id,
                        created_by_reseller: user.id
                    }
                });
                
                // Update client with Stripe customer ID
                await client.query(
                    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
                    [stripeCustomer.id, clientUser.id]
                );
                
                // Create subscription
                const stripeSubscription = await stripe.subscriptions.create({
                    customer: stripeCustomer.id,
                    items: [{ price: plan.stripe_price_id }],
                    metadata: {
                        user_id: clientUser.id,
                        plan_id: plan.id,
                        created_by_reseller: user.id
                    }
                });
                
                // Record subscription in database
                await client.query(
                    `INSERT INTO subscriptions 
                     (user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        clientUser.id,
                        plan.id,
                        stripeSubscription.id,
                        stripeCustomer.id,
                        stripeSubscription.status,
                        new Date(stripeSubscription.current_period_start * 1000),
                        new Date(stripeSubscription.current_period_end * 1000)
                    ]
                );
            }
            
            // Deduct credits from reseller
            await client.query(
                'UPDATE users SET credits_balance = credits_balance - $1 WHERE id = $2',
                [creditsNeeded, user.id]
            );
            
            // Record credit transaction
            await client.query(
                `INSERT INTO credits_transactions 
                 (user_id, amount, type, description, balance_after)
                 VALUES ($1, $2, 'debit', $3, $4)`,
                [
                    user.id,
                    -creditsNeeded,
                    `Client account created: ${email}`,
                    reseller.rows[0].credits_balance - creditsNeeded
                ]
            );
            
            return {
                client: clientUser,
                plan: plan.name,
                credits_used: creditsNeeded
            };
        });
        
        console.log(`[RESELLER] Client created by ${user.email}: ${result.client.email}`);
        
        return {
            success: true,
            message: 'Client account created successfully',
            data: result
        };
    }, {
        body: createClientSchema
    })

    // Get credit balance - Already loaded in middleware
    .get('/credits', async ({ user }) => {
        return {
            success: true,
            data: {
                credits_balance: user.credits_balance
            }
        };
    })

    // Get credit transactions
    .get('/credits/transactions', async ({ user, db, query }) => {
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;
        
        const transactions = await db.getMany(
            `SELECT * FROM credits_transactions 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [user.id, limit, offset]
        );
        
        const totalResult = await db.getOne(
            'SELECT COUNT(*) as total FROM credits_transactions WHERE user_id = $1',
            [user.id]
        );
        
        return {
            success: true,
            data: {
                transactions,
                total: parseInt(totalResult.total),
                page,
                limit,
                pages: Math.ceil(totalResult.total / limit)
            }
        };
    }, {
        query: paginationSchema
    });