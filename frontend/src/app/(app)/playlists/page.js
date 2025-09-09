import { Suspense } from 'react';
import { getPlaylists, getCurrentProfile } from '@/server/actions';
import PlaylistsContent from '@/components/playlists-content';

export const metadata = {
    title: 'Playlists - SyncStream',
    description: 'Manage your IPTV playlists'
};

export default async function PlaylistsPage() {
    // Fetch data in parallel
    const [playlistsResponse, profileResponse] = await Promise.all([
        getPlaylists(),
        getCurrentProfile()
    ]);

    // Extract data
    const playlists = playlistsResponse?.success ? playlistsResponse.data : [];
    const profile = profileResponse?.success ? profileResponse.data : null;
    const defaultPlaylistId = profile?.default_playlist_id || null;
    const canAddPlaylist = playlistsResponse?.can_add_playlist ?? true;

    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <PlaylistsContent 
                initialPlaylists={playlists}
                defaultPlaylistId={defaultPlaylistId}
                profile={profile}
                canAddPlaylist={canAddPlaylist}
            />
        </Suspense>
    );
}