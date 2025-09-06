'use server';

import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000/api/v1';

async function performRequest(path, options = {}) {
    const url = `${API_URL}${path}`;
    const controller = new AbortController();
    const timeoutMs = 15000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        // Get token from cookies for authenticated requests
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add Authorization header if token exists and not explicitly excluded
        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal
        });

        let data = null;
        try {
            data = await response.json();
        } catch (_) {
            data = null;
        }

        if (!response.ok) {
            if (data && typeof data === 'object' && 'success' in data) {
                return data;
            }
            return data;
        }

        if (data == null) {
            return { success: false, message: 'Aucune réponse de l\'API' };
        }

        return data;
    } catch (e) {
        return { success: false, message: 'Le serveur est inaccessible. Veuillez réessayer plus tard.' };
    } finally {
        clearTimeout(timer);
    }
}

export async function login(email, password) {
    const data = await performRequest('/auth/login', {
        method: 'POST',
        skipAuth: true, // Skip auth for login request
        body: JSON.stringify({ email, password })
    });

    if (data?.success) {
        const cookieStore = await cookies();
        cookieStore.set('token', data?.data?.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7
        });
        return { success: true, message: 'Connexion réussie', shouldRedirect: true, redirectTo: '/' };
    }
    return data;
}

export async function register(full_name, email, password) {
    const data = await performRequest('/auth/signup', {
        method: 'POST',
        skipAuth: true, // Skip auth for register request
        body: JSON.stringify({ full_name, email, password })
    });

    if (data?.success) {
        const cookieStore = await cookies();
        cookieStore.set('token', data?.data?.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7
        });
        return { success: true, message: 'Inscription réussie', shouldRedirect: true, redirectTo: '/' };
    }
    return data;
}


export async function getUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
        return {
            success: false,
            message: 'Aucune session trouvée'
        };
    }

    const data = await performRequest('/auth/me');
    // Do not mutate cookies here (render time). Middleware will clear invalid tokens.
    if (!data?.success && data?.message === 'Invalid or expired token') {
        return { success: false, message: 'Jeton invalide ou expiré' };
    }
    return data;
}


export async function getPlans() {
    const data = await performRequest('/subscriptions/plans/public');
    return data;
}

export async function createCheckoutSession(planId) {
    const data = await performRequest('/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId })
    });
    return data;
}