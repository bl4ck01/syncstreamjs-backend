"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import { fetchXtreamAllData } from '@/lib/xtream';
import * as duckdb from '@duckdb/duckdb-wasm';
import * as arrow from 'apache-arrow';

// Persisted playlist store using localforage
export const usePlaylistStore = create(
    persist(
        (set, get) => ({
            playlists: [], // Array of playlist metadata and fetched data
            currentPlaylist: null,
            isLoading: false,
            isHydrated: false,
            error: null,

            // DuckDB instance and load tracking
            db: null, // duckdb.AsyncDuckDB | null
            conn: null, // connection
            loadedContent: { live: false, vod: false, series: false },

            // Internal: initialize DuckDB WASM once in browser
            _ensureDb: async () => {
                const state = get();
                if (state.db && state.conn) return state;
                try {
                    const bundles = duckdb.getJsDelivrBundles();
                    const bundle = await duckdb.selectBundle(bundles);
                    const worker = new Worker(bundle.mainWorker);
                    const logger = new duckdb.ConsoleLogger();
                    const db = new duckdb.AsyncDuckDB(logger, worker);
                    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
                    const conn = await db.connect();
                    set({ db, conn });
                    return { db, conn };
                } catch (e) {
                    set({ error: e?.message || 'Failed to initialize DuckDB' });
                    throw e;
                }
            },

            setPlaylists: (playlists) => set({ playlists }),

            addOrUpdatePlaylistConfig: (playlistConfig) => {
                const playlistId = `${playlistConfig.baseUrl}|${playlistConfig.username}`;
                const existing = get().playlists || [];
                const next = [...existing.filter(p => p.id !== playlistId), {
                    id: playlistId,
                    meta: {
                        baseUrl: playlistConfig.baseUrl,
                        username: playlistConfig.username,
                        password: playlistConfig.password || existing.find(p => p.id === playlistId)?.meta?.password || '',
                        lastUpdatedAt: existing.find(p => p.id === playlistId)?.meta?.lastUpdatedAt || 0,
                    },
                    data: existing.find(p => p.id === playlistId)?.data || null,
                }];
                set({ playlists: next });
                return playlistId;
            },

            deletePlaylist: (id) => {
                const next = (get().playlists || []).filter(p => p.id !== id);
                set({ playlists: next });
            },

            // New API: addPlaylist (alias of addOrUpdatePlaylistConfig without id in arg)
            addPlaylist: (playlist) => {
                return get().addOrUpdatePlaylistConfig(playlist);
            },

            // Select a playlist by id and prepare DB
            selectPlaylist: async (id) => {
                const pl = (get().playlists || []).find(p => p.id === id) || null;
                set({ currentPlaylist: pl });
                await get()._ensureDb();
            },

            // Load playlists data via Xtream Codes for a given playlist config
            loadPlaylistData: async (playlistConfig) => {
                if (!playlistConfig || !playlistConfig.baseUrl || !playlistConfig.username || !playlistConfig.password) {
                    set({ error: 'Missing playlist configuration', isLoading: false });
                    return { success: false, message: 'Missing playlist configuration' };
                }

                try {
                    set({ isLoading: true, error: null });
                    const data = await fetchXtreamAllData(playlistConfig);

                    // Merge or insert playlist by a deterministic id (baseUrl+username)
                    const playlistId = `${playlistConfig.baseUrl}|${playlistConfig.username}`;

                    const existing = get().playlists || [];
                    const next = [...existing.filter(p => p.id !== playlistId), {
                        id: playlistId,
                        meta: {
                            baseUrl: playlistConfig.baseUrl,
                            username: playlistConfig.username,
                            // Do not persist password in cleartext beyond what is needed for refresh
                            // We include it to allow background refresh. In a production app, encrypt at rest.
                            password: playlistConfig.password,
                            lastUpdatedAt: Date.now(),
                        },
                        data,
                    }];

                    set({ playlists: next, isLoading: false });
                    return { success: true, data };
                } catch (e) {
                    set({ error: e?.message || 'Failed to load playlist', isLoading: false });
                    return { success: false, message: e?.message || 'Failed to load playlist' };
                }
            },

            // Process content: fetch for current playlist and load into DuckDB (WIP: placeholder loads)
            processContent: async () => {
                const { currentPlaylist } = get();
                if (!currentPlaylist || !currentPlaylist.meta) return { success: false, message: 'No playlist selected' };
                await get()._ensureDb();
                // For now, rely on already-fetched data; later we can create DuckDB tables
                set({ loadedContent: { live: true, vod: true, series: true } });
                return { success: true };
            },

            // Refresh content from server for the current playlist
            refreshContent: async () => {
                const { currentPlaylist } = get();
                if (!currentPlaylist || !currentPlaylist.meta) return { success: false, message: 'No playlist selected' };
                const { baseUrl, username, password } = currentPlaylist.meta;
                const res = await get().loadPlaylistData({ baseUrl, username, password });
                if (res?.success) {
                    // Bump currentPlaylist reference
                    const updated = (get().playlists || []).find(p => p.id === currentPlaylist.id) || null;
                    set({ currentPlaylist: updated });
                }
                return res;
            },

            // Simple JS-based search over current playlist data; can be replaced by DuckDB queries
            searchContent: async (type, query) => {
                const { currentPlaylist } = get();
                if (!currentPlaylist?.data?.streams) return [];
                const q = (query || '').toLowerCase();
                const list = type === 'live' ? (currentPlaylist.data.streams.live || [])
                    : type === 'vod' ? (currentPlaylist.data.streams.vod || [])
                    : (currentPlaylist.data.streams.series || []);
                return list.filter(item => {
                    const name = String(item?.name || item?.title || '').toLowerCase();
                    return name.includes(q);
                });
            },

            // Simple JS-based filtering
            filterContent: async (type, filters) => {
                const { currentPlaylist } = get();
                if (!currentPlaylist?.data?.streams) return [];
                const list = type === 'live' ? (currentPlaylist.data.streams.live || [])
                    : type === 'vod' ? (currentPlaylist.data.streams.vod || [])
                    : (currentPlaylist.data.streams.series || []);
                return list.filter(row => {
                    return Object.entries(filters || {}).every(([k, v]) => {
                        if (v == null || v === '') return true;
                        const rv = row?.[k];
                        if (typeof v === 'string') return String(rv || '').toLowerCase().includes(v.toLowerCase());
                        if (Array.isArray(v)) return v.includes(rv);
                        return rv === v;
                    });
                });
            },

            // Helper to find a playlist by id
            getPlaylistById: (id) => {
                return (get().playlists || []).find(p => p.id === id) || null;
            },
        }),
        {
            name: 'playlist-store',
            storage: createJSONStorage(() => localforage),
            onRehydrateStorage: () => (state) => {
                // Mark store as hydrated after rehydration completes
                state && state.setState({ isHydrated: true });
            }
        }
    )
);

export default usePlaylistStore;


