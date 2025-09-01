import { z } from 'zod';

// User schemas
export const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(3).max(50),
    full_name: z.string().optional()
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

// Profile schemas
export const createProfileSchema = z.object({
    name: z.string().min(1).max(100),
    avatar_url: z.string().url().optional(),
    parental_pin: z.string().length(4).regex(/^\d+$/).optional(),
    is_kids_profile: z.boolean().optional()
});

export const selectProfileSchema = z.object({
    pin: z.string().length(4).regex(/^\d+$/).optional()
});

// Playlist schemas
export const createPlaylistSchema = z.object({
    name: z.string().min(1).max(255),
    url: z.string().url(),
    username: z.string().min(1),
    password: z.string().min(1)
});

export const updatePlaylistSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    url: z.string().url().optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    is_active: z.boolean().optional()
});

// Favorites schemas
export const addFavoriteSchema = z.object({
    item_id: z.string().min(1),
    item_type: z.enum(['channel', 'movie', 'series']),
    item_name: z.string().optional(),
    item_logo: z.string().url().optional(),
    metadata: z.object({}).optional()
});

// Watch progress schemas
export const updateProgressSchema = z.object({
    item_id: z.string().min(1),
    item_type: z.enum(['movie', 'episode']),
    progress_seconds: z.number().int().min(0),
    duration_seconds: z.number().int().min(0).optional(),
    completed: z.boolean().optional(),
    metadata: z.object({}).optional()
});

// Subscription schemas
export const createCheckoutSchema = z.object({
    price_id: z.string().min(1),
    success_url: z.string().url(),
    cancel_url: z.string().url()
});

export const changePlanSchema = z.object({
    new_price_id: z.string().min(1)
});

// Reseller schemas
export const createClientSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(3).max(50),
    full_name: z.string().optional(),
    plan_stripe_price_id: z.string().min(1)
});

// Credits schemas
export const purchaseCreditsSchema = z.object({
    package_id: z.string().min(1),
    success_url: z.string().url(),
    cancel_url: z.string().url()
});

export const adminAddCreditsSchema = z.object({
    user_id: z.string().uuid(),
    amount: z.number().int().positive(),
    description: z.string().optional()
});
