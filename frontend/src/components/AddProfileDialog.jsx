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
import { Plus } from 'lucide-react';
import { createProfile, getAvatarList } from '@/server/actions';
import { getPlaylists } from '@/server/actions';

export function AddProfileDialog({ onProfileCreated }) {
  const [open, setOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [pin, setPin] = useState('');
  const [isKidsProfile, setIsKidsProfile] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const [selectedDefaultPlaylistId, setSelectedDefaultPlaylistId] = useState('');

  useEffect(() => {
    const fetchDialogData = async () => {
      setLoadingAvatars(true);
      try {
        const result = await getAvatarList();
        if (result.success && result.data) {
          setAvatars(result.data);
          if (!selectedAvatar && result.data.length > 0) {
            setSelectedAvatar(result.data[0]);
          }
        }
        const playlistsResp = await getPlaylists();
        if (playlistsResp?.success) {
          const list = playlistsResp.data || [];
          setPlaylists(list);
          if (list.length === 1) {
            setSelectedDefaultPlaylistId(list[0].id);
          } else {
            setSelectedDefaultPlaylistId('');
          }
        }
      } catch (err) {
        console.error('Failed to load avatars:', err);
      } finally {
        setLoadingAvatars(false);
      }
    };

    if (open) {
      fetchDialogData();
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
        isKidsProfile,
        playlists.length > 1 ? (selectedDefaultPlaylistId || undefined) : (playlists.length === 1 ? playlists[0].id : undefined)
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
      setSelectedDefaultPlaylistId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          role="button"
          tabIndex={0}
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-md border border-gray-800 hover:border-2 hover:border-gray-400 transition-transform duration-300 hover:scale-105 relative overflow-hidden flex items-center justify-center"
        >
          <Plus className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-gray-400" />
        </motion.div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-neutral-950 text-neutral-200 border border-white/10">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-neutral-100">Create New Profile</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Add a new profile to your account.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {/* Avatar preview with edit icon opens separate picker */}
            <div className="grid gap-2">
              <Label className="text-neutral-300">Avatar</Label>
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-md border border-gray-800 hover:border-gray-600 transition-colors relative overflow-hidden cursor-pointer"
                style={{
                  backgroundImage: `url(${selectedAvatar || '/avatars/default-avatar.jpeg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
                onClick={() => setAvatarDialogOpen(true)}
              >
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-neutral-500">Click the avatar to choose a different image</p>
            </div>
            {/* Profile Name */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-neutral-300">Profile Name</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter profile name"
                required
                maxLength={100}
                className="text-lg bg-neutral-900 border-white/10 text-neutral-100 placeholder:text-neutral-500"
              />
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
                className="text-lg bg-neutral-900 border-white/10 text-neutral-100 placeholder:text-neutral-500"
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

            {/* Default Playlist selection - show only when more than one playlist exists */}
            {playlists.length > 1 && (
              <div className="grid gap-2">
                <Label htmlFor="default-playlist" className="text-neutral-300">Default Playlist</Label>
                <select
                  id="default-playlist"
                  value={selectedDefaultPlaylistId}
                  onChange={(e) => setSelectedDefaultPlaylistId(e.target.value)}
                  className="bg-neutral-900 border-white/10 text-neutral-100 p-2 rounded"
                >
                  <option value="">Select a default playlist</option>
                  {playlists.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-sm text-neutral-500">Choose which playlist will be the default for this profile</p>
              </div>
            )}

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
              className="text-neutral-500 border-neutral-600 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !profileName.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Avatar Picker Dialog */}
      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-neutral-950 text-neutral-200 border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl text-neutral-100">Choose Avatar</DialogTitle>
            <DialogDescription className="text-neutral-400">Select an image for your profile</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <AnimatePresence mode="wait">
              {loadingAvatars ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center py-8"
                >
                  <div className="text-neutral-400">Loading avatars...</div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3"
                >
                  {avatars.map((avatar, index) => (
                    <motion.button
                      key={avatar}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => {
                        setSelectedAvatar(avatar);
                        setAvatarDialogOpen(false);
                      }}
                      className={`relative group border ${selectedAvatar === avatar ? 'border-white' : 'border-white/10'} hover:border-white/40 transition-colors`}
                      style={{ width: '72px', height: '72px' }}
                    >
                      <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAvatarDialogOpen(false)}
              className="text-neutral-800 border-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
