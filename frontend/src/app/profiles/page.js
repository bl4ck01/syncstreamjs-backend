import ProfileList from '@/components/ProfileList';
import { getProfiles } from '@/server/actions';

export default async function Profiles() {
    // Fetch profiles from the server
    const profilesResponse = await getProfiles();

    if (!profilesResponse.success) {
        return (
            <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                <div className="text-center">
                    <h1 className="text-2xl text-white mb-4">Error Loading Profiles</h1>
                    <p className="text-gray-400">{profilesResponse.message}</p>
                </div>
            </div>
        );
    }

    return <ProfileList profiles={profilesResponse?.data} />;
}
