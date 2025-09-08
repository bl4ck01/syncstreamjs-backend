"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Splash from '@/components/Splash';
import { usePlaylistStore } from '@/store/playlist';
import PlaylistManager from '@/components/PlaylistManager';

export default function Playlists() {
    const isLoading = usePlaylistStore(s => s.isLoading);
    const isHydrated = usePlaylistStore(s => s.isHydrated);
    const playlists = usePlaylistStore(s => s.playlists);
    const loadPlaylistData = usePlaylistStore(s => s.loadPlaylistData);
    const getPlaylistById = usePlaylistStore(s => s.getPlaylistById);

    const [showSplash, setShowSplash] = useState(false);

    console.log(playlists);

    // Example: read playlist creds from localStorage or prompt in future.
    const defaultConfig = useMemo(() => {
        // In a real app, this would come from profile defaults or user input
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem('xtream-config') : null;
        if (cached) {
            try { return JSON.parse(cached); } catch {}
        }
        return null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            // If no config, never show splash
            if (!defaultConfig) return;

            // Wait for hydration to check if data already exists
            if (!isHydrated) return;

            const id = `${defaultConfig.baseUrl}|${defaultConfig.username}`;
            const existing = getPlaylistById(id);
            if (existing) return;

            setShowSplash(true);
            await loadPlaylistData(defaultConfig);
            if (!cancelled) setShowSplash(false);
        };
        run();
        return () => { cancelled = true; };
    }, [isHydrated, defaultConfig, loadPlaylistData, getPlaylistById]);

    return (
        <div style={{ padding: 16 }}>
            <Splash visible={isLoading || showSplash} title="Loading playlists" subtitle="Fetching from Xtream..." />

            <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Playlists</h1>
            <PlaylistManager />
        </div>
    );
}