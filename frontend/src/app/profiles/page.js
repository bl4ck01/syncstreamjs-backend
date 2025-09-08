import ProfileList from '@/components/ProfileList';
import { getProfiles } from '@/server/actions';

export default async function Profiles() {
    const profilesResponse = await getProfiles();

    if (!profilesResponse?.success) {
        return (
            <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                <div className="text-center">
                    <h1 className="text-2xl text-white mb-4">Error Loading Profiles</h1>
                    <p className="text-gray-400">{profilesResponse?.message || 'Failed to load profiles'}</p>
                </div>
            </div>
        );
    }

    const profiles = profilesResponse.data || [];
    const canAddProfile = profilesResponse.can_add_profile || false;

    return (
        <ProfileList
            profiles={profiles}
            canAddProfile={canAddProfile}
        />
    );
}
