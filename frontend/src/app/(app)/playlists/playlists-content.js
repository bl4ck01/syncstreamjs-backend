'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Search, 
    Plus,
    Filter,
    Grid3X3,
    List,
    LayoutGrid
} from 'lucide-react';
import PlaylistCard from './playlist-card';
import PlaylistDialog from './playlist-dialog';
import { deletePlaylistAction, setDefaultPlaylistAction } from '@/server/playlist-actions';
import { toast } from 'sonner';

export default function PlaylistsContent({ 
    initialPlaylists, 
    defaultPlaylistId,
    profile 
}) {
    // State management
    const [playlists, setPlaylists] = useState(initialPlaylists);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // grid, list, compact
    const [sortBy, setSortBy] = useState('name'); // name, date, status
    const [filterActive, setFilterActive] = useState('all'); // all, active, inactive
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState(null);
    
    // Transitions for server actions
    const [isPending, startTransition] = useTransition();
    const [optimisticPlaylists, setOptimisticPlaylists] = useOptimistic(playlists);
    const [optimisticDefaultId, setOptimisticDefaultId] = useOptimistic(defaultPlaylistId);

    // Filter and sort playlists
    const filteredPlaylists = optimisticPlaylists
        .filter(playlist => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    playlist.name?.toLowerCase().includes(query) ||
                    playlist.url?.toLowerCase().includes(query) ||
                    playlist.username?.toLowerCase().includes(query)
                );
            }
            return true;
        })
        .filter(playlist => {
            // Active filter
            if (filterActive === 'active') return playlist.is_active;
            if (filterActive === 'inactive') return !playlist.is_active;
            return true;
        })
        .sort((a, b) => {
            // Sorting
            switch (sortBy) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'date':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'status':
                    return b.is_active - a.is_active;
                default:
                    return 0;
            }
        });

    // Handle playlist deletion with optimistic update
    const handleDelete = async (playlistId) => {
        startTransition(async () => {
            // Optimistic update
            setOptimisticPlaylists(prev => 
                prev.filter(p => p.id !== playlistId)
            );

            const result = await deletePlaylistAction(playlistId);
            
            if (result.success) {
                toast.success('Playlist deleted successfully');
                setPlaylists(prev => prev.filter(p => p.id !== playlistId));
            } else {
                // Revert optimistic update
                setPlaylists(initialPlaylists);
                toast.error(result.message || 'Failed to delete playlist');
            }
        });
    };

    // Handle setting default playlist with optimistic update
    const handleSetDefault = async (playlistId) => {
        startTransition(async () => {
            // Optimistic update
            setOptimisticDefaultId(playlistId);

            const result = await setDefaultPlaylistAction(playlistId);
            
            if (result.success) {
                toast.success('Default playlist updated');
            } else {
                // Revert optimistic update
                toast.error(result.message || 'Failed to set default playlist');
            }
        });
    };

    // Handle playlist edit
    const handleEdit = (playlist) => {
        setEditingPlaylist(playlist);
        setDialogOpen(true);
    };

    // Handle dialog success
    const handleDialogSuccess = (updatedPlaylist) => {
        if (editingPlaylist) {
            // Update existing playlist
            setPlaylists(prev => 
                prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p)
            );
        } else {
            // Add new playlist
            setPlaylists(prev => [...prev, updatedPlaylist]);
        }
        setDialogOpen(false);
        setEditingPlaylist(null);
    };

    return (
        <>
            {/* Search and Filters Bar */}
            <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            placeholder="Search playlists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-neutral-800/50 border-white/10 text-white placeholder:text-neutral-500"
                        />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex gap-2">
                        {/* View Mode */}
                        <div className="flex bg-neutral-800/50 rounded-md p-1">
                            <Button
                                size="sm"
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                className="px-2"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                className="px-2"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                                className="px-2"
                                onClick={() => setViewMode('compact')}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Sort Dropdown */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-1.5 bg-neutral-800/50 border border-white/10 rounded-md text-sm text-white"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="date">Sort by Date</option>
                            <option value="status">Sort by Status</option>
                        </select>

                        {/* Filter Dropdown */}
                        <select
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value)}
                            className="px-3 py-1.5 bg-neutral-800/50 border border-white/10 rounded-md text-sm text-white"
                        >
                            <option value="all">All Playlists</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>

                        {/* Add Playlist Button */}
                        <Button
                            onClick={() => {
                                setEditingPlaylist(null);
                                setDialogOpen(true);
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white"
                            disabled={isPending}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Playlist
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{filteredPlaylists.length}</div>
                    <div className="text-sm text-neutral-400">Total Playlists</div>
                </div>
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                        {filteredPlaylists.filter(p => p.is_active).length}
                    </div>
                    <div className="text-sm text-neutral-400">Active</div>
                </div>
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                        {profile?.name || 'No Profile'}
                    </div>
                    <div className="text-sm text-neutral-400">Current Profile</div>
                </div>
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                        {optimisticDefaultId ? 'Set' : 'None'}
                    </div>
                    <div className="text-sm text-neutral-400">Default Playlist</div>
                </div>
            </div>

            {/* Playlists Grid/List */}
            {filteredPlaylists.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-full mb-4">
                        <LayoutGrid className="w-8 h-8 text-neutral-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No playlists found</h3>
                    <p className="text-neutral-400 mb-6">
                        {searchQuery 
                            ? "Try adjusting your search or filters"
                            : "Get started by adding your first playlist"
                        }
                    </p>
                    {!searchQuery && (
                        <Button
                            onClick={() => setDialogOpen(true)}
                            className="bg-rose-600 hover:bg-rose-500 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Playlist
                        </Button>
                    )}
                </motion.div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={
                            viewMode === 'grid' 
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                : viewMode === 'list'
                                ? "space-y-4"
                                : "grid grid-cols-1 md:grid-cols-2 gap-4"
                        }
                    >
                        {filteredPlaylists.map((playlist, index) => (
                            <motion.div
                                key={playlist.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <PlaylistCard
                                    playlist={playlist}
                                    isDefault={optimisticDefaultId === playlist.id}
                                    viewMode={viewMode}
                                    onEdit={() => handleEdit(playlist)}
                                    onDelete={() => handleDelete(playlist.id)}
                                    onSetDefault={() => handleSetDefault(playlist.id)}
                                    isPending={isPending}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Add/Edit Dialog */}
            <PlaylistDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                playlist={editingPlaylist}
                onSuccess={handleDialogSuccess}
            />
        </>
    );
}
