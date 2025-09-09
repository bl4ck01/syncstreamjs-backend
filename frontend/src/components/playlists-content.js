'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { toast } from 'sonner';

import PlaylistDialog from '@/components/playlist-dialog';
import PlaylistMagicBento from '@/components/PlaylistMagicBento';
import LoadingBlob from '@/components/LoadingBlob';
import RadialHalftone from '@/components/ui/radial-halftone';

import { usePlaylistStore } from '@/store/playlist';
import { deletePlaylist as deletePlaylistAction } from '@/server/actions';
import { setDefaultPlaylistAction } from '@/server/playlist-actions';

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-400">Something went wrong</h2>
                {/* <p className="text-gray-400">{error.message}</p> */}
                <button 
                    onClick={resetErrorBoundary}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}

function PlaylistsContentInner({
    initialPlaylists,
    defaultPlaylistId,
    profile,
    canAddPlaylist = true
}) {
    const router = useRouter();
    
    // Store state
    const {
        playlists: storePlaylists,
        isHydrated,
        isLoading: storeIsLoading,
        loadPlaylistData,
        refreshPlaylistData,
        hasPlaylistData,
        getPlaylistData,
        removePlaylist,
        cleanupOrphanedPlaylists,
        isReady
    } = usePlaylistStore();

    // Local state - minimal
    const [isDataReady, setIsDataReady] = useState(false);
    const [dialogState, setDialogState] = useState({ open: false, editing: null });
    const [operationLoading, setOperationLoading] = useState(null);
    
    // Server actions
    const [isPending, startTransition] = useTransition();

    // Check if we have enough data to show the interface
    const checkDataReadiness = useCallback(() => {
        if (!isHydrated) return false;
        
        // If we have playlists from server, check if we have their data in store
        if (initialPlaylists?.length > 0) {
            const hasAnyData = initialPlaylists.some(playlist => {
                const playlistId = `${playlist.url}|${playlist.username}`;
                return hasPlaylistData(playlistId);
            });
            return true;
        }
        
        // No server playlists, but store is hydrated - we can show interface
        return true;
    }, [isHydrated, initialPlaylists, hasPlaylistData]);

    // Effect to check data readiness and load missing data
    useEffect(() => {
        if (!isHydrated) return;

        const ready = checkDataReadiness();
        
        if (ready) {
            setIsDataReady(true);
        } else if (initialPlaylists?.length > 0) {
            // We have server playlists but no local data - need to load
            setIsDataReady(false);
            
            // Load data for playlists that don't have it
            const loadMissingData = async () => {
                const promises = initialPlaylists
                    .filter(playlist => {
                        const playlistId = `${playlist.url}|${playlist.username}`;
                        return !hasPlaylistData(playlistId);
                    })
                    .map(playlist => {
                        console.log(`Loading data for playlist: ${playlist.name}`);
                        return loadPlaylistData({
                            name: playlist.name,
                            baseUrl: playlist.url,
                            username: playlist.username,
                            password: playlist.password
                        });
                    });

                try {
                    await Promise.all(promises);
                    setIsDataReady(true);
                } catch (error) {
                    console.error('Failed to load playlist data:', error);
                    // Still show interface even if some loads failed
                    setIsDataReady(true);
                }
            };

            loadMissingData();
        } else {
            // No playlists at all - show interface immediately
            setIsDataReady(true);
        }

        // Cleanup orphaned playlists
        if (initialPlaylists) {
            cleanupOrphanedPlaylists(initialPlaylists);
        }
    }, [isHydrated, initialPlaylists, hasPlaylistData, loadPlaylistData, cleanupOrphanedPlaylists, checkDataReadiness]);

    // Event handlers
    const handleAddPlaylist = useCallback(() => {
        setDialogState({ open: true, editing: null });
    }, []);

    const handleEdit = useCallback((playlist) => {
        setDialogState({ open: true, editing: playlist });
    }, []);

    const handleCloseDialog = useCallback(() => {
        setDialogState({ open: false, editing: null });
    }, []);

    const handleDelete = useCallback((playlistId) => {
        const playlist = initialPlaylists?.find(p => p.id === playlistId);
        if (!playlist) return;

        startTransition(async () => {
            try {
                const result = await deletePlaylistAction(playlistId);
                if (result.success) {
                    // Remove from store
                    const storeId = `${playlist.url}|${playlist.username}`;
                    removePlaylist(storeId);
                    
                    // Refresh router
                    router.refresh();
                    toast.success('Playlist deleted successfully');
                } else {
                    throw new Error(result.message || 'Failed to delete playlist');
                }
            } catch (error) {
                toast.error(error.message);
            }
        });
    }, [initialPlaylists, removePlaylist, router, startTransition]);

    const handleSetDefault = useCallback((playlistId) => {
        startTransition(async () => {
            try {
                const result = await setDefaultPlaylistAction(playlistId);
                if (result.success) {
                    router.refresh();
                    toast.success('Default playlist updated');
                } else {
                    throw new Error(result.message || 'Failed to set default playlist');
                }
            } catch (error) {
                toast.error(error.message);
            }
        });
    }, [startTransition, router]);

    const handleRefresh = useCallback(async (card) => {
        const playlist = initialPlaylists?.find(p => p.id === card.id);
        if (!playlist) return;

        const playlistId = `${playlist.url}|${playlist.username}`;
        setOperationLoading(playlistId);

        try {
            const result = await refreshPlaylistData(playlistId);
            if (result.success) {
                toast.success('Playlist data refreshed successfully');
            } else {
                throw new Error(result.message || 'Failed to refresh playlist data');
            }
        } catch (error) {
            toast.error(`Error refreshing playlist: ${error.message}`);
        } finally {
            setOperationLoading(null);
        }
    }, [initialPlaylists, refreshPlaylistData]);

    const handleDialogSuccess = useCallback(async (updatedPlaylist) => {
        try {
            if (!dialogState.editing) {
                // New playlist - load data immediately
                setOperationLoading('new-playlist');
                
                const result = await loadPlaylistData({
                    name: updatedPlaylist.name,
                    baseUrl: updatedPlaylist.url,
                    username: updatedPlaylist.username,
                    password: updatedPlaylist.password
                });

                if (result.success) {
                    toast.success('Playlist created and data loaded successfully');
                } else {
                    toast.warning('Playlist created but failed to load data');
                }
                
                setOperationLoading(null);
            } else {
                toast.success('Playlist updated successfully');
            }
            
            handleCloseDialog();
            router.refresh();
        } catch (error) {
            setOperationLoading(null);
            toast.error(`Failed to ${dialogState.editing ? 'update' : 'create'} playlist: ${error.message}`);
        }
    }, [dialogState.editing, loadPlaylistData, handleCloseDialog, router]);

    // Calculate expiration info from stored data
    const calculateExpirationInfo = useCallback((playlist) => {
        try {
            const playlistId = `${playlist.url}|${playlist.username}`;
            const storeData = getPlaylistData(playlistId);
            const userInfo = storeData?.data?.userInfo;

            if (userInfo?.exp_date) {
                const expirationDate = new Date(userInfo.exp_date * 1000);
                const now = new Date();
                const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

                return {
                    daysRemaining: Math.max(0, daysRemaining),
                    expirationDate: expirationDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                };
            }

            // Fallback to creation date + 30 days
            const created = new Date(playlist.created_at);
            const now = new Date();
            const daysSinceCreation = Math.floor((now - created) / (1000 * 60 * 60 * 24));
            const daysRemaining = 30 - daysSinceCreation;

            const expirationDate = new Date(created);
            expirationDate.setDate(expirationDate.getDate() + 30);

            return {
                daysRemaining: Math.max(0, daysRemaining),
                expirationDate: expirationDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                })
            };
        } catch (error) {
            console.warn('Error calculating expiration info:', error);
            return {
                daysRemaining: 0,
                expirationDate: 'Unknown'
            };
        }
    }, [getPlaylistData]);

    // Prepare card data for MagicBento
    const cardData = (() => {
        const playlistCards = (initialPlaylists || []).map(playlist => {
            const expirationInfo = calculateExpirationInfo(playlist);
            const playlistId = `${playlist.url}|${playlist.username}`;
            const storeData = getPlaylistData(playlistId);
            const streamsData = storeData?.data?.streams || null;

            return {
                id: playlist.id,
                color: '#060010',
                title: playlist.name,
                description: playlist.url,
                label: playlist.is_active ? 'Active' : 'Inactive',
                isDefault: defaultPlaylistId === playlist.id,
                isActive: playlist.is_active,
                username: playlist.username,
                url: playlist.url,
                daysRemaining: expirationInfo.daysRemaining,
                expirationDate: expirationInfo.expirationDate,
                streamsData: streamsData,
                hasStreamingData: !!streamsData,
                needsRefresh: !streamsData,
                type: 'playlist'
            };
        });

        // Add button for new playlist
        if (canAddPlaylist && (initialPlaylists?.length || 0) < 3) {
            playlistCards.push({
                id: 'add-playlist',
                color: '#060010',
                title: 'Add New Playlist',
                description: 'Create a new IPTV playlist to start streaming',
                label: 'New',
                type: 'add'
            });
        }

        return playlistCards;
    })();

    // Show loading while waiting for data
    if (!isDataReady || storeIsLoading || operationLoading) {
        const message = operationLoading === 'new-playlist' 
            ? 'Fetching new playlist...'
            : operationLoading 
                ? 'Refreshing playlist...'
                : storeIsLoading 
                    ? 'Loading playlist...'
                    : 'Preparing your playlists...';
        
        return <LoadingBlob message={message} />;
    }

    return (
        <div className='relative min-h-screen flex flex-col items-center justify-center overflow-hidden py-8'>
            {/* Background Pattern */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-screen z-[1]">
                <div className="relative w-full h-full rounded-3xl overflow-hidden">
                    <RadialHalftone
                        widthPercent={100}
                        heightPercent={100}
                        dotColor="#9CA3AF60"
                        backgroundColor="#000000"
                        centerX={0.4}
                        centerY={-0.1}
                        innerRadius={0.2}
                        outerRadius={1.5}
                        dotSize={2}
                        dotSpacing={8}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center space-y-8">
                <div className="text-center space-y-2">
                    <motion.h1
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.4, delay: 0.2 }}
                        variants={{
                            hidden: { filter: "blur(10px)", opacity: 0 },
                            visible: { filter: "blur(0px)", opacity: 1 },
                        }}
                        className="text-5xl sm:text-6xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold"
                    >
                        Your Playlists
                    </motion.h1>
                    <motion.p
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.4, delay: 0.3 }}
                        variants={{
                            hidden: { filter: "blur(10px)", opacity: 0 },
                            visible: { filter: "blur(0px)", opacity: 1 },
                        }}
                        className="text-neutral-500 text-sm md:text-base lg:text-lg text-center"
                    >
                        Select a playlist to manage or create a new one
                    </motion.p>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key="playlist-grid"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <PlaylistMagicBento
                            cards={cardData}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onSetDefault={handleSetDefault}
                            onRefresh={handleRefresh}
                            onAddPlaylist={handleAddPlaylist}
                            isPending={isPending}
                            glowColor="132, 0, 255"
                            particleCount={12}
                            enableSpotlight={true}
                            enableBorderGlow={true}
                            enableStars={true}
                            enableTilt={true}
                            enableMagnetism={true}
                            clickEffect={true}
                            spotlightRadius={300}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Add/Edit Dialog */}
            <PlaylistDialog
                open={dialogState.open}
                onOpenChange={handleCloseDialog}
                playlist={dialogState.editing}
                onSuccess={handleDialogSuccess}
            />
        </div>
    );
}

// Main component with error boundary
export default function PlaylistsContent(props) {
    return (
        <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => window.location.reload()}
            onError={(error) => {
                console.error('PlaylistsContent Error:', error);
            }}
        >
            <PlaylistsContentInner {...props} />
        </ErrorBoundary>
    );
}