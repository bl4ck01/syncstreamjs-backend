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

        // Add profile token from cookie if present
        const profileToken = cookieStore.get('profile')?.value;
        if (profileToken) {
            headers['X-Profile-Token'] = profileToken;
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
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
        return { success: true, message: 'Inscription réussie', shouldRedirect: true, redirectTo: '/pricing' };
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

export async function getCurrentProfile() {
    const data = await performRequest('/profiles/current');
    return data;
}


export async function getPlans() {
    const data = await performRequest('/subscriptions/plans/public');
    return data;
}

export async function createCheckoutSession(planId, billingPeriod = 'monthly') {
    const data = await performRequest('/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({
            plan_id: planId,
            billing_period: billingPeriod
        })
    });
    return data;
}

// Profile management actions
export async function getProfiles() {
    const data = await performRequest('/profiles');
    return data;
}

export async function selectProfile(profileId, pin = null) {
    const requestBody = {};

    // Only include pin in request body if it's provided
    if (pin && pin.trim()) {
        requestBody.pin = pin;
    }

    const data = await performRequest(`/profiles/${profileId}/select`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
    });

    if (data?.success && data?.data?.profile) {
        // Also set/update the 'profile' cookie with token for subsequent requests
        const cookieStore = await cookies();
        if (data?.data?.profile_token) {
            cookieStore.set('profile', data.data.profile_token, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7
            });
        }
        return {
            ...data,
            profileData: data.data.profile
        };
    }

    return data;
}

export async function createProfile(name, avatarUrl = null, parentalPin = null, isKidsProfile = false) {
    const requestBody = {
        name,
        is_kids_profile: isKidsProfile
    };

    // Only include optional fields if they have values
    if (avatarUrl) {
        requestBody.avatar_url = avatarUrl;
    }

    if (parentalPin) {
        requestBody.parental_pin = parentalPin;
    }

    const data = await performRequest('/profiles', {
        method: 'POST',
        body: JSON.stringify(requestBody)
    });
    return data;
}

export async function updateProfile(profileId, updates) {
    const data = await performRequest(`/profiles/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
    return data;
}

export async function deleteProfile(profileId) {
    const data = await performRequest(`/profiles/${profileId}`, {
        method: 'DELETE'
    });
    return data;
}

export async function getAvatarList() {
    try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Try multiple possible paths for the avatars directory
        const possiblePaths = [
            path.join(process.cwd(), 'frontend', 'public', 'avatars'), // From project root
            path.join(process.cwd(), 'public', 'avatars'), // From frontend directory
            path.join(process.cwd(), 'avatars') // Direct avatars directory
        ];
        
        let avatarsDir = null;
        for (const dirPath of possiblePaths) {
            if (fs.existsSync(dirPath)) {
                avatarsDir = dirPath;
                break;
            }
        }
        
        if (!avatarsDir) {
            return {
                success: false,
                message: 'Avatars directory not found in any expected location'
            };
        }
        
        // Read all files in the avatars directory
        const files = fs.readdirSync(avatarsDir);
        
        // Filter only image files and create links
        const avatarLinks = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpeg', '.jpg', '.png', '.gif', '.webp'].includes(ext);
            })
            .map(file => `/avatars/${file}`);
        
        return {
            success: true,
            data: avatarLinks,
            message: `Found ${avatarLinks.length} avatar files`
        };
    } catch (error) {
        return {
            success: false,
            message: 'Error reading avatars directory',
            error: error.message
        };
    }
}