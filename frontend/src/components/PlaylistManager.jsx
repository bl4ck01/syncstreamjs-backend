"use client";

import React, { useMemo, useState } from 'react';
import { usePlaylistStore } from '@/store/playlist';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function PlaylistManager() {
    const playlists = usePlaylistStore(s => s.playlists);
    const isLoading = usePlaylistStore(s => s.isLoading);
    const addOrUpdatePlaylistConfig = usePlaylistStore(s => s.addOrUpdatePlaylistConfig);
    const deletePlaylist = usePlaylistStore(s => s.deletePlaylist);
    const loadPlaylistData = usePlaylistStore(s => s.loadPlaylistData);

    const [form, setForm] = useState({ baseUrl: '', username: '', password: '' });
    const [editingId, setEditingId] = useState(null);

    const canSubmit = useMemo(() => form.baseUrl && form.username && form.password, [form]);

    function handleEdit(p) {
        setEditingId(p.id);
        setForm({ baseUrl: p.meta.baseUrl, username: p.meta.username, password: p.meta.password || '' });
    }

    async function handleSave(e) {
        e.preventDefault();
        const id = addOrUpdatePlaylistConfig(form);
        // Also persist last used config for auto-load if desired
        try { localStorage.setItem('xtream-config', JSON.stringify(form)); } catch {}
        setEditingId(null);
        setForm({ baseUrl: '', username: '', password: '' });
        await loadPlaylistData({ ...form });
    }

    function handleDelete(id) {
        deletePlaylist(id);
        try {
            const saved = localStorage.getItem('xtream-config');
            if (saved) {
                const c = JSON.parse(saved);
                const match = `${c.baseUrl}|${c.username}`;
                if (match === id) localStorage.removeItem('xtream-config');
            }
        } catch {}
    }

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <Card>
                <form onSubmit={handleSave} style={{ padding: 16, display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                        <Label htmlFor="baseUrl">Base URL</Label>
                        <Input id="baseUrl" placeholder="http://host:port/" value={form.baseUrl} onChange={(e) => setForm(f => ({ ...f, baseUrl: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" placeholder="username" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button type="submit" disabled={!canSubmit || isLoading}>{editingId ? 'Update & Fetch' : 'Add & Fetch'}</Button>
                        {editingId && (
                            <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm({ baseUrl: '', username: '', password: '' }); }}>Cancel</Button>
                        )}
                    </div>
                </form>
            </Card>

            <div style={{ display: 'grid', gap: 12 }}>
                {playlists.length === 0 ? (
                    <div style={{ opacity: 0.7 }}>No playlists yet.</div>
                ) : playlists.map(p => (
                    <Card key={p.id}>
                        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600 }}>{p.meta.username}@{new URL(p.meta.baseUrl).host}</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Button variant="secondary" onClick={() => handleEdit(p)}>Edit</Button>
                                    <Button variant="destructive" onClick={() => handleDelete(p.id)}>Delete</Button>
                                </div>
                            </div>
                            <Separator />
                            <div style={{ fontSize: 12, opacity: 0.8 }}>Updated: {p.meta.lastUpdatedAt ? new Date(p.meta.lastUpdatedAt).toLocaleString() : '—'}</div>
                            <div style={{ fontSize: 12 }}>
                                Live: {p?.data?.streams?.live?.length ?? 0} · VOD: {p?.data?.streams?.vod?.length ?? 0} · Series: {p?.data?.streams?.series?.length ?? 0}
                            </div>
                            <div>
                                <Button onClick={() => loadPlaylistData({ baseUrl: p.meta.baseUrl, username: p.meta.username, password: p.meta.password })} disabled={isLoading}>Refresh</Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}


