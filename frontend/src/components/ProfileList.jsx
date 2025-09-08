"use client";

import { motion } from "motion/react";
import RadialHalftone from '@/components/ui/radial-halftone';
import React, { useState } from 'react'
import { LockKeyhole } from 'lucide-react';
import PinModal from './PinModal';
import { useRouter } from 'next/navigation';
import { selectProfile } from '@/server/actions';
import { toast } from 'sonner';
import { AddProfileDialog } from './AddProfileDialog';

export default function ProfileList({ profiles, canAddProfile, onProfilesUpdate }) {
    const [showPinModal, setShowPinModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);

    const router = useRouter();

    const handleProfileCreated = () => {
        if (typeof onProfilesUpdate === 'function') {
            onProfilesUpdate();
        } else {
            router.refresh();
        }
    };

    const handleProfileClick = async (profile) => {
        if (profile.has_pin) {
            setSelectedProfile(profile);
            setShowPinModal(true);
        } else {
            // Handle profile selection without PIN
            const result = await selectProfile(profile.id);

            if (result.success) {
                // Successfully selected profile
                // toast.success('Profile selected successfully!');
                router.push('/');
                // You might want to redirect or update the UI here
            } else {
                // Handle error from backend
                toast.error(result.message || 'Invalid PIN. Please try again.');
            }
        }
    };

    const closePinModal = () => {
        setShowPinModal(false);
        setSelectedProfile(null);
    };

    return (
        <div className='relative h-screen flex flex-col items-center justify-center overflow-hidden'>
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-screen z-[1]">
                <div className="relative w-full h-full rounded-3xl overflow-hidden">
                    <RadialHalftone
                        widthPercent={100}
                        heightPercent={100}
                        dotColor="#9CA3AF60"   // gray-400/30 color
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

            <div className="relative flex flex-col items-center justify-center z-10">
                <motion.h1
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.4, delay: 0.2 }}
                    variants={{
                        hidden: { filter: "blur(10px)", opacity: 0 },
                        visible: { filter: "blur(0px)", opacity: 1 },
                    }}
                    className="text-5xl sm:text-6xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold"
                >
                    Who&apos;s watching?
                </motion.h1>
                <motion.p
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.4, delay: 0.3 }}
                    variants={{
                        hidden: { filter: "blur(10px)", opacity: 0 },
                        visible: { filter: "blur(0px)", opacity: 1 },
                    }}
                    className="text-neutral-500 my-2 text-sm md:text-base lg:text-lg text-center"
                >
                    Select a profile to continue or create a new one
                </motion.p>

                <div className="mt-16 mx-10 px-4 flex flex-wrap justify-center items-center gap-6 sm:gap-8">
                    {profiles.map((profile, index) => (
                        <motion.div
                            key={profile.id}
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.5, delay: 0.25 + index * 0.09 }}
                            variants={{
                                hidden: { filter: "blur(10px)", opacity: 0 },
                                visible: { filter: "blur(0px)", opacity: 1 },
                            }}
                            className="flex flex-col items-center cursor-pointer group"
                            onClick={() => handleProfileClick(profile)}
                        >
                            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-md border border-gray-800 hover:border-2 hover:border-gray-400 transition-transform duration-300 hover:scale-105 relative overflow-hidden"
                                style={{
                                    backgroundImage: `url(${profile.avatar_url || '/avatars/default-avatar.jpeg'})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            >
                            </div>
                            <div className="flex items-center gap-2 mt-5 text-white font-medium text-sm sm:text-base text-center">
                                {profile.has_pin && (
                                    <LockKeyhole className="w-4 h-4" />
                                )}
                                {profile.name}
                            </div>
                        </motion.div>
                    ))}

                    {/* Add Profile Button */}
                    {canAddProfile && (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.5, delay: 0.25 + profiles.length * 0.09 }}
                            variants={{
                                hidden: { filter: "blur(10px)", opacity: 0 },
                                visible: { filter: "blur(0px)", opacity: 1 },
                            }}
                        >
                            <AddProfileDialog onProfileCreated={handleProfileCreated} />
                        </motion.div>
                    )}
                </div>

                {/* Manage Profiles Button */}
                <motion.button
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.5, delay: 0.5 }}
                    variants={{
                        hidden: { filter: "blur(10px)", opacity: 0 },
                        visible: { filter: "blur(0px)", opacity: 1 },
                    }}
                    className="mt-12 px-8 py-3 border border-white/30 text-white font-medium text-sm hover:border-white/50 hover:bg-white/5 transition-all duration-300 rounded-md"
                >
                    Manage Profiles
                </motion.button>
            </div>

            {/* PIN Modal */}
            {showPinModal && selectedProfile && (
                <PinModal
                    profile={selectedProfile}
                    onClose={closePinModal}
                />
            )}
        </div>
    );
}
