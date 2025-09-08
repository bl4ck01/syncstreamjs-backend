"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Splash from '@/components/Splash';
import { usePlaylistStore } from '@/store/playlist';
import PlaylistManager from '@/components/PlaylistManager';

export default function Playlists() {
    const isLoading = usePlaylistStore(s => s.isLoading);
    const hydratedFromStorage = usePlaylistStore(s => s.hydratedFromStorage);
    const isHydrated = usePlaylistStore(s => s.isHydrated);
    const playlists = usePlaylistStore(s => s.playlists);
    const loadPlaylistData = usePlaylistStore(s => s.loadPlaylistData);
    const getPlaylistById = usePlaylistStore(s => s.getPlaylistById);
    const fetchDefaultPlaylist = usePlaylistStore(s => s.fetchDefaultPlaylist);
    const defaultPlaylistId = usePlaylistStore(s => s.defaultPlaylistId);

    const [showSplash, setShowSplash] = useState(true);
    const splashStartRef = useRef(Date.now());
    const splashTimerRef = useRef(null);

    // Example: read playlist creds from localStorage or prompt in future.
    const defaultConfig = useMemo(() => {
        // In a real app, this would come from profile defaults or user input
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem('xtream-config') : null;
        if (cached) {
            try { return JSON.parse(cached); } catch { }
        }
        return null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            // If no config, never show splash
            if (!defaultConfig) {
                // still attempt to pull default playlist id for badge
                await fetchDefaultPlaylist().catch(() => { });
                // ensure splash stays for at least 500ms even when nothing to fetch
                const elapsed = Date.now() - splashStartRef.current;
                const remaining = Math.max(0, 500 - elapsed);
                if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
                splashTimerRef.current = setTimeout(() => setShowSplash(false), remaining);
                return;
            }

            // Wait for hydration to check if data already exists
            if (!isHydrated) return;

            const id = `${defaultConfig.baseUrl}|${defaultConfig.username}`;
            const existing = getPlaylistById(id);
            if (existing) {
                const elapsed = Date.now() - splashStartRef.current;
                const remaining = Math.max(0, 500 - elapsed);
                if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
                splashTimerRef.current = setTimeout(() => setShowSplash(false), remaining);
                return;
            }

            // Do not show splash for network fetch; splash is only for hydration UX
            await loadPlaylistData(defaultConfig);
            if (!cancelled) {
                const elapsed = Date.now() - splashStartRef.current;
                const remaining = Math.max(0, 500 - elapsed);
                if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
                splashTimerRef.current = setTimeout(() => setShowSplash(false), remaining);
            }
        };
        run();
        return () => { cancelled = true; if (splashTimerRef.current) { clearTimeout(splashTimerRef.current); splashTimerRef.current = null; } };
    }, [isHydrated, defaultConfig, loadPlaylistData, getPlaylistById, fetchDefaultPlaylist]);

    // Failsafe: when hydration is done and not loading, auto-hide splash with min duration
    useEffect(() => {
        if (!isHydrated) return;
        // Hide as soon as we know storage hydration finished; if it hydrated from storage, we still honor min 500ms
        if (isLoading && hydratedFromStorage) return; // let network fetch continue without keeping splash
        const elapsed = Date.now() - splashStartRef.current;
        const remaining = Math.max(0, 500 - elapsed);
        if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
        splashTimerRef.current = setTimeout(() => setShowSplash(false), remaining);
        return () => { if (splashTimerRef.current) { clearTimeout(splashTimerRef.current); splashTimerRef.current = null; } };
    }, [isHydrated, isLoading, hydratedFromStorage]);

    return (
        <div style={{ padding: 16 }}>
            <Splash visible={showSplash} title="Loading playlists" subtitle="Fetching from storage..." />

            {/* Delay rendering list until splash exits to allow full-screen animation */}
            {!showSplash && (
                <>
                    <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Playlists {defaultPlaylistId ? `(default set)` : ''}</h1>
                    <PlaylistManager />
                </>
            )}
        </div>
    );
}