"use client";

import React, { useMemo, useState } from 'react';
import { usePlaylistStore } from '@/store/playlist';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Film, Tv } from 'lucide-react';
import { z } from 'zod';

export default function PlaylistManager() {
    const playlists = usePlaylistStore(s => s.playlists);
    const isLoading = usePlaylistStore(s => s.isLoading);
    const addOrUpdatePlaylistConfig = usePlaylistStore(s => s.addOrUpdatePlaylistConfig);
    const deletePlaylist = usePlaylistStore(s => s.deletePlaylist);
    const loadPlaylistData = usePlaylistStore(s => s.loadPlaylistData);
    const defaultPlaylistId = usePlaylistStore(s => s.defaultPlaylistId);
    const setDefaultPlaylist = usePlaylistStore(s => s.setDefaultPlaylist);

    const [form, setForm] = useState({ name: '', baseUrl: '', username: '', password: '' });
    const playlistConfigSchema = z.object({
        name: z.string().trim().min(1, 'Name is required').max(200),
        baseUrl: z.string().trim().url({ message: 'Base URL must be a valid URL (e.g. http://host:port/)' }),
        username: z.string().trim().min(1, 'Username is required'),
        password: z.string().trim().min(1, 'Password is required'),
    });
    const [editingId, setEditingId] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const canSubmit = useMemo(() => form.baseUrl && form.username && form.password, [form]);
    const [formError, setFormError] = useState('');

    function handleEdit(p) {
        setEditingId(p.id);
        setForm({ name: p.meta.name || '', baseUrl: p.meta.baseUrl, username: p.meta.username, password: p.meta.password || '' });
    }

    async function handleSave(e) {
        e.preventDefault();
        setFormError('');
        const parsed = playlistConfigSchema.safeParse(form);
        if (!parsed.success) {
            setFormError(parsed.error.issues?.[0]?.message || 'Invalid playlist details');
            return;
        }
        const id = addOrUpdatePlaylistConfig(form);
        // Also persist last used config for auto-load if desired
        try { localStorage.setItem('xtream-config', JSON.stringify(form)); } catch { }
        setEditingId(null);
        setForm({ name: '', baseUrl: '', username: '', password: '' });
        await loadPlaylistData({ ...form });
        setDialogOpen(false);
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
        } catch { }
    }

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingId(null); setForm({ name: '', baseUrl: '', username: '', password: '' }); }}>Add Playlist</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] bg-neutral-950 text-neutral-200 border border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl text-neutral-100">{editingId ? 'Edit Playlist' : 'Add Playlist'}</DialogTitle>
                            <DialogDescription className="text-neutral-400">Enter your Xtream credentials to fetch content.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-neutral-300">Name</Label>
                                <Input id="name" placeholder="Give a friendly name (e.g. Provider name)" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-neutral-900 border-white/10 text-neutral-100 placeholder:text-neutral-500" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="baseUrl" className="text-neutral-300">Base URL</Label>
                                <Input id="baseUrl" placeholder="http://host:port/" value={form.baseUrl} onChange={(e) => setForm(f => ({ ...f, baseUrl: e.target.value }))} className="bg-neutral-900 border-white/10 text-neutral-100 placeholder:text-neutral-500" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="username" className="text-neutral-300">Username</Label>
                                <Input id="username" placeholder="username" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} className="bg-neutral-900 border-white/10 text-neutral-100 placeholder:text-neutral-500" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-neutral-300">Password</Label>
                                <Input id="password" type="password" placeholder="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className="bg-neutral-900 border-white/10 text-neutral-100 placeholder:text-neutral-500" />
                            </div>
                            {formError ? <div className="text-sm text-red-500">{formError}</div> : null}
                            <div className="flex gap-2 justify-end pt-2">
                                <Button type="button" className="bg-neutral-900 text-neutral-200 border border-white/20 hover:bg-neutral-800 focus:bg-neutral-800 active:bg-neutral-700 transition-colors" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={!canSubmit || isLoading} className="bg-rose-600 hover:bg-rose-500 text-white">{editingId ? 'Update & Fetch' : 'Add & Fetch'}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
                <AnimatePresence>
                    {playlists.length === 0 ? (
                        isLoading ? null : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ opacity: 0.7 }}>No playlists yet.</motion.div>
                    ) : (
                        <motion.div
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: { opacity: 1, transition: { staggerChildren: 0.06, when: 'beforeChildren' } }
                            }}
                        >
                            {playlists.map((p, index) => (
                                <motion.div
                                    key={p.id}
                                    initial="hidden"
                                    animate="visible"
                                    transition={{ duration: 0.5, delay: 0.25 + index * 0.09 }}
                                    variants={{ hidden: { filter: 'blur(10px)', opacity: 0 }, visible: { filter: 'blur(0px)', opacity: 1 } }}
                                >
                                    <Card>
                                        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'grid' }}>
                                                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.meta.name}</div>
                                                    <div style={{ fontSize: 12, opacity: 0.8 }}>{p.meta.username}@{p.meta.baseUrl}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <Button size="icon" title="Refresh" onClick={() => loadPlaylistData({ baseUrl: p.meta.baseUrl, username: p.meta.username, password: p.meta.password })} disabled={isLoading}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 5.36A9 9 0 0020.49 15" /></svg>
                                                        </Button>
                                                    </div>
                                                    <Button size="icon" variant="secondary" title="Edit" onClick={() => { handleEdit(p); setDialogOpen(true); }}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                                                    </Button>
                                                    <Button size="icon" variant="destructive" title="Delete" onClick={() => handleDelete(p.id)}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                    </Button>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ fontSize: 12, opacity: 0.8 }}>
                                                    {p?.data?.userInfo?.user_info?.exp_date ? `Expires: ${new Date(Number(p.data.userInfo.user_info.exp_date) * 1000).toDateString()}` : ''}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                                                    <Radio className="w-4 h-4 text-rose-600" />
                                                    <span style={{ fontSize: 12 }}>{p?.data?.streams?.live?.length ?? 0}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                                                    <Film className="w-4 h-4 text-rose-600" />
                                                    <span style={{ fontSize: 12 }}>{p?.data?.streams?.vod?.length ?? 0}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                                                    <Tv className="w-4 h-4 text-rose-600" />
                                                    <span style={{ fontSize: 12 }}>{p?.data?.streams?.series?.length ?? 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ padding: 12, borderTop: '1px solid #27272a' }}>
                                            <Button style={{ width: '100%' }} className={defaultPlaylistId === p.id ? 'bg-neutral-800 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'} title="Set as default" onClick={() => setDefaultPlaylist(p.id)} disabled={isLoading}>
                                                {defaultPlaylistId === p.id ? 'Default' : 'Set as Default'}
                                            </Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}


