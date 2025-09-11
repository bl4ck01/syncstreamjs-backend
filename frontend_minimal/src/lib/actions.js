'use server';

import { cookies } from "next/headers";
import { revalidatePath } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000/api/v1';

async function performRequest(path, options = {}) {
    const url = `${API_URL}${path}`;
    const controller = new AbortController();
    const timeoutMs = 15000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const profileToken = cookieStore.get('profile')?.value;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (profileToken) {
            headers['x-profile-token'] = profileToken;
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
            return { success: false, message: data?.message || 'Request failed' };
        }

        return data || { success: false, message: 'No response from API' };
    } catch (e) {
        if (e.name === 'AbortError') {
            return { success: false, message: 'Request timed out' };
        }
        return { success: false, message: 'Server is unavailable. Please try again later.' };
    } finally {
        clearTimeout(timer);
    }
}

// Get current profile with default playlist
export async function getCurrentProfileWithPlaylist() {
    const data = await performRequest('/profiles/current');
    return data;
}

// Get a single playlist
export async function getPlaylistAction(id) {
    const data = await performRequest(`/playlists/${id}`);
    return data;
}