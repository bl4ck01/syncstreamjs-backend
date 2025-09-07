"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfiles, selectProfile } from "@/server/actions";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, User, Shield, Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileSwitcher() {
    const { currentProfile, selectProfile: setCurrentProfile, clearProfile } = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pin, setPin] = useState("");
    const [selectedProfileId, setSelectedProfileId] = useState(null);
    const router = useRouter();

    const loadProfiles = async () => {
        setLoading(true);
        try {
            const response = await getProfiles();
            if (response.success) {
                setProfiles(response.data || []);
            }
        } catch (error) {
            toast.error("Failed to load profiles");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSelect = async (profile) => {
        if (profile.parental_pin && !pin) {
            setSelectedProfileId(profile.id);
            return;
        }

        try {
            const response = await selectProfile(profile.id, pin || null);
            if (response.success) {
                setCurrentProfile(response.profileData);
                setIsOpen(false);
                setPin("");
                setSelectedProfileId(null);
                toast.success("Profile switched successfully");
            } else {
                toast.error(response.message || "Failed to switch profile");
                if (response.message === "Invalid PIN") {
                    setPin("");
                }
            }
        } catch (error) {
            toast.error("Failed to switch profile");
        }
    };

    const handleLogout = () => {
        clearProfile();
        router.push("/auth/login");
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            loadProfiles();
        }
        setIsOpen(!isOpen);
    };

    if (!currentProfile) {
        return null;
    }

    return (
        <div className="relative">
            <Button
                onClick={toggleDropdown}
                variant="ghost"
                className="flex items-center gap-3 p-2 h-auto bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">
                    {currentProfile.avatar_url ? (
                        <img
                            src={currentProfile.avatar_url}
                            alt={currentProfile.name}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        currentProfile.name.charAt(0).toUpperCase()
                    )}
                </div>
                <div className="text-left">
                    <div className="text-white text-sm font-medium">
                        {currentProfile.name}
                    </div>
                    <div className="text-gray-400 text-xs">
                        {currentProfile.is_kids_profile ? "Kids Profile" : "Adult Profile"}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50"
                    >
                        <div className="p-4">
                            <h3 className="text-white font-semibold mb-3">Switch Profile</h3>
                            
                            {loading ? (
                                <div className="text-gray-400 text-center py-4">
                                    Loading profiles...
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {profiles.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                profile.id === currentProfile.id
                                                    ? 'bg-rose-600/20 border border-rose-600/30'
                                                    : 'bg-zinc-800 hover:bg-zinc-700'
                                            }`}
                                            onClick={() => handleProfileSelect(profile)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">
                                                    {profile.avatar_url ? (
                                                        <img
                                                            src={profile.avatar_url}
                                                            alt={profile.name}
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        profile.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-white font-medium">
                                                        {profile.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        {profile.is_kids_profile && (
                                                            <span className="flex items-center gap-1">
                                                                <Shield className="w-3 h-3" />
                                                                Kids
                                                            </span>
                                                        )}
                                                        {profile.parental_pin && (
                                                            <span className="flex items-center gap-1">
                                                                <Lock className="w-3 h-3" />
                                                                Protected
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {profile.id === currentProfile.id && (
                                                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-zinc-800 mt-4 pt-4">
                                <Button
                                    onClick={handleLogout}
                                    variant="ghost"
                                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PIN Input Modal */}
            {selectedProfileId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 w-full max-w-md"
                    >
                        <h3 className="text-white text-xl font-semibold mb-4">
                            Enter PIN
                        </h3>
                        <p className="text-gray-400 mb-6">
                            This profile is protected. Please enter the 4-digit PIN to continue.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="pin" className="text-white">
                                    PIN
                                </Label>
                                <Input
                                    id="pin"
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="Enter 4-digit PIN"
                                    maxLength={4}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        setSelectedProfileId(null);
                                        setPin("");
                                    }}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        const profile = profiles.find(p => p.id === selectedProfileId);
                                        if (profile) {
                                            handleProfileSelect(profile);
                                        }
                                    }}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700"
                                    disabled={pin.length !== 4}
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
