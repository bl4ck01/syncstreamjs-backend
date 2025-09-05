import { t } from 'elysia';

// User schemas
export const signupSchema = t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
    full_name: t.Optional(t.String())
});

export const loginSchema = t.Object({
    email: t.String({ format: 'email' }),
    password: t.String()
});

// Profile schemas
export const createProfileSchema = t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    avatar_url: t.Optional(t.String({ format: 'url' })),
    parental_pin: t.Optional(t.String({ pattern: '^\\d{4}$' })),
    is_kids_profile: t.Optional(t.Boolean())
});

export const updateProfileSchema = t.Object({
    name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
    avatar_url: t.Optional(t.String({ format: 'url' })),
    parental_pin: t.Optional(t.String({ pattern: '^\\d{4}$' })),
    is_kids_profile: t.Optional(t.Boolean())
});

export const selectProfileSchema = t.Object({
    pin: t.Optional(t.String({ pattern: '^\\d{4}$' }))
});

// Playlist schemas
export const createPlaylistSchema = t.Object({
    name: t.String({ minLength: 1, maxLength: 255 }),
    url: t.String({ format: 'url' }),
    username: t.String({ minLength: 1 }),
    password: t.String({ minLength: 1 })
});

export const updatePlaylistSchema = t.Object({
    name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
    url: t.Optional(t.String({ format: 'url' })),
    username: t.Optional(t.String({ minLength: 1 })),
    password: t.Optional(t.String({ minLength: 1 })),
    is_active: t.Optional(t.Boolean())
});

// Favorites schemas
export const addFavoriteSchema = t.Object({
    item_id: t.String({ minLength: 1 }),
    item_type: t.Union([
        t.Literal('channel'),
        t.Literal('movie'),
        t.Literal('series')
    ]),
    item_name: t.Optional(t.String()),
    item_logo: t.Optional(t.String({ format: 'url' })),
    metadata: t.Optional(t.Object({}))
});

// Watch progress schemas
export const updateProgressSchema = t.Object({
    item_id: t.String({ minLength: 1 }),
    item_type: t.Union([
        t.Literal('movie'),
        t.Literal('episode')
    ]),
    progress_seconds: t.Number({ minimum: 0 }),
    duration_seconds: t.Optional(t.Number({ minimum: 0 })),
    completed: t.Optional(t.Boolean()),
    metadata: t.Optional(t.Object({}))
});

// Subscription schemas
export const checkoutSchema = t.Object({
    plan_id: t.String()
});

export const changePlanSchema = t.Object({
    new_plan_id: t.String()
});

// Reseller schemas
export const createClientSchema = t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
    full_name: t.Optional(t.String()),
    plan_stripe_price_id: t.String()
});

// Admin schemas
export const adminAddCreditsSchema = t.Object({
    user_id: t.String(),
    amount: t.Number({ minimum: 1 }),
    description: t.Optional(t.String())
});

export const createPlanSchema = t.Object({
    name: t.String(),
    stripe_price_id: t.Optional(t.String()),
    stripe_price_id_annual: t.Optional(t.String()),
    price_monthly: t.Number(),
    price_annual: t.Optional(t.Number()),
    max_profiles: t.Number(),
    max_playlists: t.Number(),
    max_favorites: t.Number(),
    trial_days: t.Optional(t.Number()),
    cine_party: t.Optional(t.Boolean()),
    cine_party_voice_chat: t.Optional(t.Boolean()),
    sync_data_across_devices: t.Optional(t.Boolean()),
    record_live_tv: t.Optional(t.Boolean()),
    download_offline_viewing: t.Optional(t.Boolean()),
    parental_controls: t.Optional(t.Boolean()),
    multi_screen_viewing: t.Optional(t.Number()),
    support_level: t.Optional(t.String()),
    is_active: t.Optional(t.Boolean())
});

export const updatePlanSchema = t.Object({
    name: t.Optional(t.String()),
    stripe_price_id: t.Optional(t.String()),
    stripe_price_id_annual: t.Optional(t.String()),
    price_monthly: t.Optional(t.Number()),
    price_annual: t.Optional(t.Number()),
    max_profiles: t.Optional(t.Number()),
    max_playlists: t.Optional(t.Number()),
    max_favorites: t.Optional(t.Number()),
    trial_days: t.Optional(t.Number()),
    cine_party: t.Optional(t.Boolean()),
    cine_party_voice_chat: t.Optional(t.Boolean()),
    sync_data_across_devices: t.Optional(t.Boolean()),
    record_live_tv: t.Optional(t.Boolean()),
    download_offline_viewing: t.Optional(t.Boolean()),
    parental_controls: t.Optional(t.Boolean()),
    multi_screen_viewing: t.Optional(t.Number()),
    support_level: t.Optional(t.String()),
    is_active: t.Optional(t.Boolean())
});

// Common ID param schema
export const idParamSchema = t.Object({
    id: t.String()
});

// Common query schemas
export const paginationSchema = t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
});

export const searchPaginationSchema = t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    search: t.Optional(t.String())
});
