'use client';

import { useState, useTransition, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertCircle,
    Loader2,
    Globe,
    User,
    Key,
    Tag,
    Shield,
    Info,
    CheckCircle2,
    Copy,
    Eye,
    EyeOff
} from 'lucide-react';
import { createPlaylistAction, updatePlaylistAction } from '@/server/playlist-actions';
import { toast } from 'sonner';

// Validation schema
const playlistSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name must be less than 100 characters')
        .trim(),
    url: z.string()
        .url('Must be a valid URL')
        .refine(url => {
            try {
                const u = new URL(url);
                return u.protocol === 'http:' || u.protocol === 'https:';
            } catch {
                return false;
            }
        }, 'URL must start with http:// or https://'),
    username: z.string()
        .min(1, 'Username is required')
        .max(50, 'Username must be less than 50 characters')
        .trim(),
    password: z.string()
        .min(1, 'Password is required')
        .max(100, 'Password must be less than 100 characters'),
    is_active: z.boolean().default(true)
});

export default function PlaylistDialog({ 
    open, 
    onOpenChange, 
    playlist = null,
    onSuccess 
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const isEditing = !!playlist;

    // Form setup
    const form = useForm({
        resolver: zodResolver(playlistSchema),
        defaultValues: {
            name: '',
            url: '',
            username: '',
            password: '',
            is_active: true
        }
    });

    // Reset form when dialog opens/closes or playlist changes
    useEffect(() => {
        if (open) {
            if (playlist) {
                form.reset({
                    name: playlist.name || '',
                    url: playlist.url || '',
                    username: playlist.username || '',
                    password: playlist.password || '',
                    is_active: playlist.is_active ?? true
                });
            } else {
                form.reset({
                    name: '',
                    url: '',
                    username: '',
                    password: '',
                    is_active: true
                });
            }
            setError('');
            setShowPassword(false);
        }
    }, [open, playlist, form]);

    // Handle form submission
    const onSubmit = (data) => {
        setError('');
        
        startTransition(async () => {
            try {
                const result = isEditing 
                    ? await updatePlaylistAction(playlist.id, data)
                    : await createPlaylistAction(data);

                if (result.success) {
                    toast.success(isEditing ? 'Playlist updated' : 'Playlist created');
                    onSuccess(result.data);
                    onOpenChange(false);
                } else {
                    setError(result.message || 'Something went wrong');
                }
            } catch (err) {
                setError('An unexpected error occurred');
                console.error(err);
            }
        });
    };

    // Copy to clipboard helper
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-neutral-950 text-white border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {isEditing ? 'Edit Playlist' : 'Add New Playlist'}
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        {isEditing 
                            ? 'Update your IPTV playlist configuration'
                            : 'Enter your IPTV provider credentials to add a new playlist'
                        }
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2 bg-neutral-900">
                        <TabsTrigger value="details">Playlist Details</TabsTrigger>
                        <TabsTrigger value="help">Help & Info</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {/* Error Alert */}
                                {error && (
                                    <Alert variant="destructive" className="bg-red-950/50 border-red-900">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Name Field */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-neutral-400" />
                                                Playlist Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    {...field} 
                                                    placeholder="e.g., My IPTV Provider"
                                                    className="bg-neutral-900 border-white/10 text-white placeholder:text-neutral-500"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-neutral-500">
                                                A friendly name to identify this playlist
                                            </FormDescription>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                {/* URL Field */}
                                <FormField
                                    control={form.control}
                                    name="url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-neutral-400" />
                                                Server URL
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        {...field} 
                                                        placeholder="http://server.example.com:8080/"
                                                        className="bg-neutral-900 border-white/10 text-white placeholder:text-neutral-500 pr-10"
                                                    />
                                                    {field.value && (
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="absolute right-1 top-1 h-8 w-8 text-neutral-400 hover:text-white"
                                                            onClick={() => copyToClipboard(field.value)}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormDescription className="text-neutral-500">
                                                Your IPTV provider&apos;s server URL
                                            </FormDescription>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                {/* Username Field */}
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-neutral-400" />
                                                Username
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    {...field} 
                                                    placeholder="your-username"
                                                    className="bg-neutral-900 border-white/10 text-white placeholder:text-neutral-500"
                                                    autoComplete="username"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                {/* Password Field */}
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Key className="w-4 h-4 text-neutral-400" />
                                                Password
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        {...field} 
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="your-password"
                                                        className="bg-neutral-900 border-white/10 text-white placeholder:text-neutral-500 pr-10"
                                                        autoComplete="current-password"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="absolute right-1 top-1 h-8 w-8 text-neutral-400 hover:text-white"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                {/* Active Status (only for editing) */}
                                {isEditing && (
                                    <FormField
                                        control={form.control}
                                        name="is_active"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border border-white/10 p-4 bg-neutral-900/50">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="flex items-center gap-2">
                                                        <Shield className="w-4 h-4 text-neutral-400" />
                                                        Active Status
                                                    </FormLabel>
                                                    <FormDescription className="text-neutral-500">
                                                        Enable or disable this playlist
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => onOpenChange(false)}
                                        disabled={isPending}
                                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white border-white/10"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isPending}
                                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                {isEditing ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                {isEditing ? 'Update Playlist' : 'Create Playlist'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="help" className="mt-4 space-y-4">
                        <Alert className="bg-blue-950/50 border-blue-900">
                            <Info className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-200">
                                <strong>What is an IPTV Playlist?</strong><br />
                                An IPTV playlist contains live TV channels, movies (VOD), and series that you can stream.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-neutral-300">Common IPTV Providers</h4>
                            <div className="space-y-2">
                                <Badge variant="secondary" className="bg-neutral-900 text-neutral-300 border-neutral-700">
                                    Xtream Codes API
                                </Badge>
                                <Badge variant="secondary" className="bg-neutral-900 text-neutral-300 border-neutral-700">
                                    M3U Playlist URL
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-neutral-300">Typical Server URL Format</h4>
                            <code className="block p-3 bg-neutral-900 rounded-md text-xs text-neutral-400 font-mono">
                                http://server.example.com:8080/<br />
                                http://192.168.1.100:25461/<br />
                                https://iptv.provider.com/
                            </code>
                        </div>

                        <Alert className="bg-yellow-950/50 border-yellow-900">
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                            <AlertDescription className="text-yellow-200">
                                <strong>Security Note:</strong> Your credentials are stored securely and only used to fetch content from your IPTV provider.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}