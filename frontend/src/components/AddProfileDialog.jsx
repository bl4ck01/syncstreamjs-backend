'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from 'lucide-react';
import { createProfile, getAvatarList } from '@/server/actions';

export function AddProfileDialog({ onProfileCreated }) {
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [pin, setPin] = useState('');
  const [isKidsProfile, setIsKidsProfile] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingAvatars, setLoadingAvatars] = useState(true);

  useEffect(() => {
    const fetchAvatars = async () => {
      setLoadingAvatars(true);
      try {
        const result = await getAvatarList();
        if (result.success && result.data) {
          setAvatars(result.data);
          if (result.data.length > 0) {
            setSelectedAvatar(result.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load avatars:', err);
      } finally {
        setLoadingAvatars(false);
      }
    };
    
    if (open) {
      fetchAvatars();
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createProfile(
        profileName,
        selectedAvatar || null,
        pin || null,
        isKidsProfile
      );

      if (result.success) {
        setOpen(false);
        setProfileName('');
        setSelectedAvatar(avatars[0] || '');
        setPin('');
        setIsKidsProfile(false);
        if (onProfileCreated) {
          onProfileCreated();
        }
      } else {
        setError(result.message || 'Failed to create profile');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setProfileName('');
      setSelectedAvatar(avatars[0] || '');
      setPin('');
      setIsKidsProfile(false);
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Button 
            variant="outline" 
            size="lg" 
            className="h-auto p-8 flex flex-col items-center justify-center gap-4 border-2 border-dashed hover:border-solid transition-all"
          >
            <Plus className="h-12 w-12" />
            <span className="text-lg font-medium">Add Profile</span>
          </Button>
        </motion.div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Create New Profile</DialogTitle>
            <DialogDescription>
              Add a new profile to your account. Choose a name and avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {/* Profile Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Profile Name</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter profile name"
                required
                maxLength={100}
                className="text-lg"
              />
            </div>

            {/* Avatar Selection */}
            <div className="grid gap-2">
              <Label>Choose Avatar</Label>
              <AnimatePresence mode="wait">
                {loadingAvatars ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-center py-8"
                  >
                    <div className="text-muted-foreground">Loading avatars...</div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-4 sm:grid-cols-6 gap-4"
                  >
                    {avatars.map((avatar, index) => (
                      <motion.div
                        key={avatar}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedAvatar(avatar)}
                          className={`relative group transition-all ${
                            selectedAvatar === avatar ? 'ring-2 ring-primary ring-offset-2' : ''
                          }`}
                        >
                          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 transition-transform group-hover:scale-110">
                            <AvatarImage src={avatar} alt={`Avatar ${index + 1}`} />
                            <AvatarFallback>AV</AvatarFallback>
                          </Avatar>
                          {selectedAvatar === avatar && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                              <div className="bg-primary rounded-full p-1">
                                <svg
                                  className="w-4 h-4 text-primary-foreground"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </motion.div>
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Parental Control PIN */}
            <div className="grid gap-2">
              <Label htmlFor="pin">Parental Control PIN (Optional)</Label>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPin(value);
                }}
                placeholder="4-digit PIN"
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Set a 4-digit PIN to restrict access to this profile
              </p>
            </div>

            {/* Kids Profile Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="kids-profile"
                checked={isKidsProfile}
                onChange={(e) => setIsKidsProfile(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="kids-profile" className="cursor-pointer">
                This is a kids profile
              </Label>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive bg-destructive/10 p-3 rounded-md"
              >
                {error}
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !profileName.trim()}>
              {loading ? 'Creating...' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}