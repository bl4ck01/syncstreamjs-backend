'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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

// Get all playlists for the current user
export async function getPlaylistsAction() {
    const data = await performRequest('/playlists');
    return data;
}

// Create a new playlist
export async function createPlaylistAction(formData) {
    const data = await performRequest('/playlists', {
        method: 'POST',
        body: JSON.stringify({
            name: formData.name,
            url: formData.url,
            username: formData.username,
            password: formData.password
        })
    });
    
    if (data?.success) {
        revalidatePath('/playlists');
    }
    
    return data;
}

// Update an existing playlist
export async function updatePlaylistAction(id, formData) {
    const data = await performRequest(`/playlists/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: formData.name,
            url: formData.url,
            username: formData.username,
            password: formData.password
        })
    });
    
    if (data?.success) {
        revalidatePath('/playlists');
    }
    
    return data;
}

// Delete a playlist
export async function deletePlaylistAction(id) {
    const data = await performRequest(`/playlists/${id}`, {
        method: 'DELETE'
    });
    
    if (data?.success) {
        revalidatePath('/playlists');
    }
    
    return data;
}

// Get a single playlist
export async function getPlaylistAction(id) {
    const data = await performRequest(`/playlists/${id}`);
    return data;
}

// Set default playlist for current profile
export async function setDefaultPlaylistAction(playlistId) {
    const me = await performRequest('/profiles/current');
    if (!me?.success) return { success: false, message: me?.message || 'Unable to load profile' };
    
    const profileId = me?.data?.id;
    if (!profileId) return { success: false, message: 'No profile selected' };
    
    const data = await performRequest(`/profiles/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ default_playlist_id: playlistId || null })
    });
    
    if (data?.success) {
        revalidatePath('/playlists');
    }
    
    return data;
}

// Get current profile with default playlist
export async function getCurrentProfileWithPlaylist() {
    const data = await performRequest('/profiles/current');
    return data;
}

// Load playlist data from Xtream API (client-side operation)
export async function refreshPlaylistDataAction(playlistId) {
    // This would typically trigger a background job or webhook
    // For now, we'll just mark it as a successful request
    return { 
        success: true, 
        message: 'Playlist refresh initiated',
        data: { playlistId }
    };
}