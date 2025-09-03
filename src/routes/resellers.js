import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { createClientSchema, paginationSchema } from '../utils/schemas.js';
import { hashPassword } from '../utils/password.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const resellerRoutes = new Elysia({ prefix: '/reseller' })
    .use(authPlugin)
    .use(databasePlugin)
    .guard({
        beforeHandle: async ({ getUser, set }) => {
            const user = await getUser();
            if (!user || user.role !== 'reseller') {
                set.status = 403;
                throw new Error('Forbidden: Reseller access required');
            }
        }
    })

    // Get reseller dashboard data
    .get('/dashboard', async ({ getUserId, db }) => {
        const resellerId = await getUserId();
        
        // Get reseller info
        const reseller = await db.getOne(
            'SELECT email, full_name, credits_balance FROM users WHERE id = $1',
            [resellerId]
        );
        
        // Get client stats
        const clientStats = await db.getOne(`
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_clients
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE u.parent_reseller_id = $1
        `, [resellerId]);
        
        // Get recent transactions
        const recentTransactions = await db.getMany(`
            SELECT * FROM credits_transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [resellerId]);
        
        return {
            reseller: {
                email: reseller.email,
                full_name: reseller.full_name,
                credits_balance: reseller.credits_balance
            },
            stats: {
                total_clients: parseInt(clientStats.total_clients),
                active_clients: parseInt(clientStats.active_clients)
            },
            recent_transactions: recentTransactions
        };
    })

    // Get reseller's clients
    .get('/clients', async ({ getUserId, db, query }) => {
        const resellerId = await getUserId();
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;
        
        const clients = await db.getMany(`
            SELECT 
                u.id, u.email, u.full_name, u.created_at,
                s.status as subscription_status,
                p.name as plan_name
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE u.parent_reseller_id = $1
            ORDER BY u.created_at DESC
            LIMIT $2 OFFSET $3
        `, [resellerId, limit, offset]);
        
        const totalResult = await db.getOne(
            'SELECT COUNT(*) as total FROM users WHERE parent_reseller_id = $1',
            [resellerId]
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

    // Create client account
    .post('/clients', async ({ body, getUserId, db }) => {
        const resellerId = await getUserId();
        const { email, password, full_name, plan_stripe_price_id } = body;
        
        // Get plan details and cost
        const plan = await db.getOne(
            'SELECT id, name, price_monthly FROM plans WHERE stripe_price_id = $1',
            [plan_stripe_price_id]
        );
        
        if (!plan) {
            throw new Error('Invalid plan selected');
        }
        
        // Calculate credit cost (e.g., 100 credits per dollar)
        const creditCost = Math.ceil(plan.price_monthly * 100);
        
        // Use transaction to ensure atomicity
        const result = await db.transaction(async (tx) => {
            // Lock reseller row and check credits
            const reseller = await tx.query(
                'SELECT id, credits_balance, stripe_customer_id FROM users WHERE id = $1 FOR UPDATE',
                [resellerId]
            );
            
            if (reseller.rows.length === 0) {
                throw new Error('Reseller not found');
            }
            
            const currentBalance = reseller.rows[0].credits_balance;
            
            if (currentBalance < creditCost) {
                throw new Error(`Insufficient credits. Required: ${creditCost}, Available: ${currentBalance}`);
            }
            
            // Check if client email already exists
            const existingUser = await tx.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
            
            if (existingUser.rows.length > 0) {
                throw new Error('User with this email already exists');
            }
            
            // Hash password
            const passwordHash = await hashPassword(password);
            
            // Create client user
            const newClient = await tx.query(`
                INSERT INTO users (email, password_hash, full_name, role, parent_reseller_id, has_used_trial, credits_balance)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, email, full_name
            `, [email, passwordHash, full_name, 'user', resellerId, true, 0]); // No trial for reseller clients
            
            const clientId = newClient.rows[0].id;
            
            // Create default profile for client
            await tx.query(
                'INSERT INTO profiles (user_id, name, is_kids_profile) VALUES ($1, $2, $3)',
                [clientId, 'Default', false]
            );
            
            // Create subscription using reseller's Stripe customer
            if (reseller.rows[0].stripe_customer_id) {
                try {
                    const subscription = await stripe.subscriptions.create({
                        customer: reseller.rows[0].stripe_customer_id,
                        items: [{ price: plan_stripe_price_id }],
                        metadata: {
                            user_id: clientId,
                            plan_id: plan.id,
                            created_by_reseller: resellerId
                        }
                    });
                    
                    // Record subscription in database
                    await tx.query(`
                        INSERT INTO subscriptions 
                        (user_id, stripe_subscription_id, stripe_price_id, status, plan_id)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [clientId, subscription.id, plan_stripe_price_id, subscription.status, plan.id]);
                } catch (stripeError) {
                    console.error('Stripe subscription creation failed:', stripeError);
                    // Continue without Stripe subscription - reseller handles billing
                }
            }
            
            // Deduct credits from reseller
            const newBalance = currentBalance - creditCost;
            await tx.query(
                'UPDATE users SET credits_balance = $1 WHERE id = $2',
                [newBalance, resellerId]
            );
            
            // Record transaction
            await tx.query(`
                INSERT INTO credits_transactions 
                (user_id, amount, balance_after, transaction_type, description, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                resellerId,
                -creditCost,
                newBalance,
                'client_created',
                `Created client account: ${email} with ${plan.name} plan`,
                { client_id: clientId, plan_id: plan.id }
            ]);
            
            return {
                client: newClient.rows[0],
                credits_used: creditCost,
                remaining_balance: newBalance
            };
        });
        
        return result;
    }, {
        body: createClientSchema
    })

    // Get credit transactions
    .get('/transactions', async ({ getUserId, db, query }) => {
        const resellerId = await getUserId();
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;
        
        const transactions = await db.getMany(`
            SELECT * FROM credits_transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `, [resellerId, limit, offset]);
        
        const totalResult = await db.getOne(
            'SELECT COUNT(*) as total FROM credits_transactions WHERE user_id = $1',
            [resellerId]
        );
        
        return {
            transactions,
            total: parseInt(totalResult.total),
            page,
            limit,
            pages: Math.ceil(totalResult.total / limit)
        };
    }, {
        query: paginationSchema
    });
