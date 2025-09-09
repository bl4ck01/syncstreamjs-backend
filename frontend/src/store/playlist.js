"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import { fetchXtreamAllData } from '@/lib/xtream';
import * as duckdb from '@duckdb/duckdb-wasm';

// Simplified playlist store using localforage
export const usePlaylistStore = create(
    persist(
        (set, get) => ({
            // Core state - simplified using plain object instead of Map for better persistence
            playlists: {}, // Record<playlistId, playlistData>
            isHydrated: false,
            isLoading: false,
            error: null,

            // DuckDB instance for data processing
            db: null,
            conn: null,

            // Initialize DuckDB once (disabled for now due to CORS issues with CDN)
            _ensureDb: async () => {
                const state = get();
                if (state.db && state.conn) return { db: state.db, conn: state.conn };

                // TODO: Setup DuckDB with local workers instead of CDN
                console.log('DuckDB initialization skipped - using in-memory data storage');
                const mockDb = { initialized: true };
                const mockConn = { connected: true };
                set({ db: mockDb, conn: mockConn });
                return { db: mockDb, conn: mockConn };
            },

            // Check if we have data for a playlist
            hasPlaylistData: (playlistId) => {
                const playlists = get().playlists || {};
                return playlists[playlistId]?.data?.streams;
            },

            // Get playlist data
            getPlaylistData: (playlistId) => {
                const playlists = get().playlists || {};
                return playlists[playlistId] || null;
            },

            // Check if store is ready with data
            isReady: () => {
                const state = get();
                // Just check if hydrated - don't require having playlists
                return state.isHydrated;
            },

            // Load playlist data from Xtream API and store in DuckDB
            loadPlaylistData: async (playlistConfig) => {
                if (!playlistConfig?.baseUrl || !playlistConfig?.username || !playlistConfig?.password) {
                    set({ error: 'Missing playlist configuration' });
                    return { success: false, message: 'Missing playlist configuration' };
                }

                const playlistId = `${playlistConfig.baseUrl}|${playlistConfig.username}`;

                try {
                    set({ isLoading: true, error: null });

                    console.log(`Loading playlist data for: ${playlistConfig.name || playlistId}`);

                    // Fetch data from Xtream API
                    const data = await fetchXtreamAllData(playlistConfig);

                    // Store in plain object
                    const playlists = { ...get().playlists };
                    playlists[playlistId] = {
                        id: playlistId,
                        meta: {
                            name: playlistConfig.name || '',
                            baseUrl: playlistConfig.baseUrl,
                            username: playlistConfig.username,
                            password: playlistConfig.password, // Note: encrypt in production
                            lastUpdatedAt: Date.now(),
                        },
                        data,
                    };

                    // Initialize DuckDB and store data
                    await get()._ensureDb();

                    set({ playlists, isLoading: false });

                    console.log(`Successfully loaded playlist data for: ${playlistConfig.name || playlistId}`);
                    console.log(`- Live channels: ${data?.streams?.live?.length || 0}`);
                    console.log(`- VOD content: ${data?.streams?.vod?.length || 0}`);
                    console.log(`- Series: ${data?.streams?.series?.length || 0}`);

                    return { success: true, data };
                } catch (e) {
                    console.error('Failed to load playlist:', e);

                    // Provide more user-friendly error messages
                    let userMessage = e?.message || 'Failed to load playlist';

                    if (userMessage.includes('404')) {
                        userMessage = 'IPTV server endpoint not found. Please check your server URL.';
                    } else if (userMessage.includes('401') || userMessage.includes('403')) {
                        userMessage = 'Invalid credentials. Please check your username and password.';
                    } else if (userMessage.includes('429') || userMessage.includes('Rate limited')) {
                        userMessage = 'Too many requests. Please wait a moment and try again.';
                    } else if (userMessage.includes('Network error')) {
                        userMessage = 'Cannot connect to IPTV server. Please check your internet connection.';
                    } else if (userMessage.includes('Server error')) {
                        userMessage = 'IPTV server is experiencing issues. Please try again later.';
                    }

                    set({ error: userMessage, isLoading: false });
                    return { success: false, message: userMessage };
                }
            },

            // Refresh playlist data
            refreshPlaylistData: async (playlistId) => {
                const playlistData = get().getPlaylistData(playlistId);
                if (!playlistData?.meta) {
                    return { success: false, message: 'Playlist not found' };
                }

                return get().loadPlaylistData(playlistData.meta);
            },

            // Remove playlist from store
            removePlaylist: (playlistId) => {
                const playlists = { ...get().playlists };
                delete playlists[playlistId];
                set({ playlists });
            },

            // Clean up orphaned playlists that don't exist on server
            // TODO: is really needed?
            cleanupOrphanedPlaylists: (validServerPlaylists) => {
                const validIds = new Set(validServerPlaylists.map(p => `${p.url}|${p.username}`));
                const currentPlaylists = get().playlists || {};
                const playlists = { ...currentPlaylists };

                let removed = 0;
                Object.keys(playlists).forEach(id => {
                    if (!validIds.has(id)) {
                        delete playlists[id];
                        removed++;
                    }
                });

                if (removed > 0) {
                    console.log(`Cleaned up ${removed} orphaned playlists`);
                    set({ playlists });
                }

                return Object.keys(playlists).length;
            },
        }),
        {
            name: 'playlist-store',
            storage: createJSONStorage(() => localforage),
            onRehydrateStorage: () => (rehydratedState) => {
                // Set hydrated flag when storage is loaded
                if (rehydratedState) {
                    rehydratedState.isHydrated = true;
                    // Ensure playlists is an object
                    if (!rehydratedState.playlists || typeof rehydratedState.playlists !== 'object') {
                        rehydratedState.playlists = {};
                    }
                }
            }
        }
    )
);

export default usePlaylistStore;


