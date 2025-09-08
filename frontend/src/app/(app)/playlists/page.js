import { Suspense } from 'react';
import { getPlaylistsAction, getCurrentProfileWithPlaylist } from '@/server/playlist-actions';
import PlaylistsContent from './playlists-content';
import PlaylistsSkeleton from './playlists-skeleton';

export const metadata = {
    title: 'Playlists - SyncStream',
    description: 'Manage your IPTV playlists'
};

export default async function PlaylistsPage() {
    // Fetch data in parallel
    const [playlistsResponse, profileResponse] = await Promise.all([
        getPlaylistsAction(),
        getCurrentProfileWithPlaylist()
    ]);

    // Extract data
    const playlists = playlistsResponse?.success ? playlistsResponse.data : [];
    const profile = profileResponse?.success ? profileResponse.data : null;
    const defaultPlaylistId = profile?.default_playlist_id || null;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Playlists</h1>
                    <p className="text-neutral-400">
                        Manage your IPTV playlists and streaming sources
                    </p>
                </div>
            </div>

            <Suspense fallback={<PlaylistsSkeleton />}>
                <PlaylistsContent 
                    initialPlaylists={playlists}
                    defaultPlaylistId={defaultPlaylistId}
                    profile={profile}
                />
            </Suspense>
        </div>
    );
}