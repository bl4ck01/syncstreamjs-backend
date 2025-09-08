'use client';

import { useState, useEffect } from 'react';
import ProfileList from '@/components/ProfileList';
import { getProfiles } from '@/server/actions';

export default function Profiles() {
    const [profiles, setProfiles] = useState([]);
    const [canAddProfile, setCanAddProfile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfiles = async () => {
        try {
            const profilesResponse = await getProfiles();
            
            if (profilesResponse.success) {
                setProfiles(profilesResponse.data || []);
                setCanAddProfile(profilesResponse.can_add_profile || false);
                setError(null);
            } else {
                setError(profilesResponse.message || 'Failed to load profiles');
            }
        } catch (err) {
            setError('An error occurred while loading profiles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleProfilesUpdate = () => {
        // Refresh profiles when a new one is created
        fetchProfiles();
    };

    if (loading) {
        return (
            <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                <div className="text-center">
                    <div className="text-gray-400">Loading profiles...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                <div className="text-center">
                    <h1 className="text-2xl text-white mb-4">Error Loading Profiles</h1>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <ProfileList 
            profiles={profiles} 
            canAddProfile={canAddProfile}
            onProfilesUpdate={handleProfilesUpdate}
        />
    );
}
