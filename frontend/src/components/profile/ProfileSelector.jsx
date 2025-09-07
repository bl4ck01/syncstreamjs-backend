"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfiles, selectProfile, createProfile } from "@/server/actions";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, User, Shield, Lock } from "lucide-react";

export default function ProfileSelector() {
    const { selectProfile: setCurrentProfile } = useProfile();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfileId, setSelectedProfileId] = useState(null);
    const [pin, setPin] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        name: "",
        avatarUrl: "",
        parentalPin: "",
        isKidsProfile: false
    });
    const [creating, setCreating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const response = await getProfiles();
            if (response.success) {
                setProfiles(response.data || []);
            } else {
                toast.error(response.message || "Failed to load profiles");
            }
        } catch (error) {
            toast.error("Failed to load profiles");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSelect = async (profileId, requiresPin = false) => {
        if (requiresPin && !pin) {
            toast.error("Please enter the PIN for this profile");
            return;
        }

        try {
            const response = await selectProfile(profileId, pin || null);
            if (response.success) {
                // Set the profile in context (which will store it in localStorage)
                setCurrentProfile(response.profileData);
                toast.success("Profile selected successfully");
                router.push("/");
            } else {
                toast.error(response.message || "Failed to select profile");
                if (response.message === "Invalid PIN") {
                    setPin("");
                }
            }
        } catch (error) {
            toast.error("Failed to select profile");
        }
    };

    const handleCreateProfile = async (e) => {
        e.preventDefault();
        if (!createFormData.name.trim()) {
            toast.error("Please enter a profile name");
            return;
        }

        setCreating(true);
        try {
            const response = await createProfile(
                createFormData.name,
                createFormData.avatarUrl || null,
                createFormData.parentalPin || null,
                createFormData.isKidsProfile
            );

            if (response.success) {
                toast.success("Profile created successfully");
                setShowCreateForm(false);
                setCreateFormData({
                    name: "",
                    avatarUrl: "",
                    parentalPin: "",
                    isKidsProfile: false
                });
                await loadProfiles();
            } else {
                toast.error(response.message || "Failed to create profile");
            }
        } catch (error) {
            toast.error("Failed to create profile");
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">Loading profiles...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Who's watching?
                    </h1>
                    <p className="text-gray-400">
                        Select a profile to continue or create a new one
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Existing Profiles */}
                    <AnimatePresence>
                        {profiles.map((profile, index) => (
                            <motion.div
                                key={profile.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="group"
                            >
                                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-300 cursor-pointer overflow-hidden">
                                    <div
                                        className="p-6 text-center"
                                        onClick={() => {
                                            setSelectedProfileId(profile.id);
                                            if (profile.parental_pin) {
                                                // Show PIN input for profiles with parental controls
                                                setPin("");
                                            } else {
                                                handleProfileSelect(profile.id);
                                            }
                                        }}
                                    >
                                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
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
                                        
                                        <h3 className="text-white font-semibold text-lg mb-2">
                                            {profile.name}
                                        </h3>
                                        
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                                            {profile.is_kids_profile && (
                                                <span className="flex items-center gap-1">
                                                    <Shield className="w-4 h-4" />
                                                    Kids
                                                </span>
                                            )}
                                            {profile.parental_pin && (
                                                <span className="flex items-center gap-1">
                                                    <Lock className="w-4 h-4" />
                                                    Protected
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Create New Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: profiles.length * 0.1 }}
                        className="group"
                    >
                        <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-300 cursor-pointer overflow-hidden">
                            <div
                                className="p-6 text-center h-full flex flex-col items-center justify-center min-h-[200px]"
                                onClick={() => setShowCreateForm(true)}
                            >
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <h3 className="text-white font-semibold text-lg">
                                    Add Profile
                                </h3>
                                <p className="text-gray-400 text-sm mt-2">
                                    Create a new profile
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* PIN Input Modal */}
                {selectedProfileId && profiles.find(p => p.id === selectedProfileId)?.parental_pin && (
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
                                        onClick={() => handleProfileSelect(selectedProfileId, true)}
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

                {/* Create Profile Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 w-full max-w-md max-h-[90vh] overflow-y-auto"
                        >
                            <h3 className="text-white text-xl font-semibold mb-4">
                                Create New Profile
                            </h3>
                            <form onSubmit={handleCreateProfile} className="space-y-4">
                                <div>
                                    <Label htmlFor="name" className="text-white">
                                        Profile Name *
                                    </Label>
                                    <Input
                                        id="name"
                                        value={createFormData.name}
                                        onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Enter profile name"
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="avatarUrl" className="text-white">
                                        Avatar URL (optional)
                                    </Label>
                                    <Input
                                        id="avatarUrl"
                                        value={createFormData.avatarUrl}
                                        onChange={(e) => setCreateFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                                        placeholder="https://example.com/avatar.jpg"
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="parentalPin" className="text-white">
                                        Parental PIN (optional)
                                    </Label>
                                    <Input
                                        id="parentalPin"
                                        type="password"
                                        value={createFormData.parentalPin}
                                        onChange={(e) => setCreateFormData(prev => ({ ...prev, parentalPin: e.target.value }))}
                                        placeholder="4-digit PIN"
                                        maxLength={4}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                    />
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isKidsProfile"
                                        checked={createFormData.isKidsProfile}
                                        onChange={(e) => setCreateFormData(prev => ({ ...prev, isKidsProfile: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <Label htmlFor="isKidsProfile" className="text-white">
                                        Kids Profile
                                    </Label>
                                </div>
                                
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-rose-600 hover:bg-rose-700"
                                        disabled={creating}
                                    >
                                        {creating ? "Creating..." : "Create Profile"}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
