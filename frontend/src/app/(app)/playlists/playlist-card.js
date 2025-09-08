'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
    MoreVertical, 
    Edit, 
    Trash2, 
    Star,
    StarOff,
    RefreshCw,
    ExternalLink,
    Shield,
    ShieldOff,
    Clock,
    User,
    Link
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlaylistCard({ 
    playlist, 
    isDefault, 
    viewMode = 'grid',
    onEdit, 
    onDelete, 
    onSetDefault,
    isPending 
}) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Simulate refresh - in real app, this would call the Xtream API
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsRefreshing(false);
    };

    const handleDelete = () => {
        setShowDeleteDialog(false);
        onDelete();
    };

    // Format date
    const createdDate = new Date(playlist.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // List view
    if (viewMode === 'list') {
        return (
            <motion.div
                layout
                className="bg-neutral-900 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all"
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                            "w-2 h-12 rounded-full flex-shrink-0",
                            playlist.is_active ? "bg-green-500" : "bg-neutral-600"
                        )} />
                        
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white truncate">
                                    {playlist.name}
                                </h3>
                                {isDefault && (
                                    <Badge variant="secondary" className="bg-rose-600/20 text-rose-400 border-rose-600/50">
                                        <Star className="w-3 h-3 mr-1 fill-current" />
                                        Default
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-neutral-400">
                                <span className="flex items-center gap-1">
                                    <Link className="w-3 h-3" />
                                    {playlist.url}
                                </span>
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {playlist.username}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {createdDate}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleRefresh}
                            disabled={isRefreshing || isPending}
                            className="text-neutral-400 hover:text-white"
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        </Button>

                        {!isDefault && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onSetDefault}
                                disabled={isPending}
                                className="text-neutral-400 hover:text-white"
                            >
                                <StarOff className="w-4 h-4" />
                            </Button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-neutral-400 hover:text-white">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-neutral-950 border-white/10">
                                <DropdownMenuItem onClick={onEdit} className="text-white hover:bg-neutral-900">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem 
                                    onClick={() => setShowDeleteDialog(true)} 
                                    className="text-red-400 hover:bg-red-950/50 hover:text-red-300"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Compact view
    if (viewMode === 'compact') {
        return (
            <motion.div
                layout
                className="bg-neutral-900 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            playlist.is_active ? "bg-green-500/20" : "bg-neutral-800"
                        )}>
                            {playlist.is_active ? (
                                <Shield className="w-4 h-4 text-green-400" />
                            ) : (
                                <ShieldOff className="w-4 h-4 text-neutral-500" />
                            )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-white text-sm truncate">
                                {playlist.name}
                            </h3>
                            <p className="text-xs text-neutral-400 truncate">
                                {playlist.username}@{playlist.url}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {isDefault && (
                            <Star className="w-4 h-4 text-rose-400 fill-current" />
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="w-8 h-8 text-neutral-400 hover:text-white">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-neutral-950 border-white/10">
                                <DropdownMenuItem onClick={onEdit} className="text-white hover:bg-neutral-900">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                {!isDefault && (
                                    <DropdownMenuItem onClick={onSetDefault} className="text-white hover:bg-neutral-900">
                                        <Star className="w-4 h-4 mr-2" />
                                        Set as Default
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem 
                                    onClick={() => setShowDeleteDialog(true)} 
                                    className="text-red-400 hover:bg-red-950/50 hover:text-red-300"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Grid view (default)
    return (
        <>
            <motion.div
                layout
                whileHover={{ scale: 1.02 }}
                className="bg-neutral-900 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all group"
            >
                <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-white truncate">
                                {playlist.name}
                            </h3>
                            <p className="text-sm text-neutral-400 truncate">
                                {playlist.username}@{playlist.url}
                            </p>
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-white"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-neutral-950 border-white/10">
                                <DropdownMenuItem onClick={onEdit} className="text-white hover:bg-neutral-900">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Playlist
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleRefresh} className="text-white hover:bg-neutral-900">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh Data
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => window.open(playlist.url, '_blank')} 
                                    className="text-white hover:bg-neutral-900"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open URL
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem 
                                    onClick={() => setShowDeleteDialog(true)} 
                                    className="text-red-400 hover:bg-red-950/50 hover:text-red-300"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Playlist
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/10" />

                    {/* Status and Info */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Badge 
                                variant={playlist.is_active ? "default" : "secondary"}
                                className={cn(
                                    "text-xs",
                                    playlist.is_active 
                                        ? "bg-green-500/20 text-green-400 border-green-500/50" 
                                        : "bg-neutral-800 text-neutral-400 border-neutral-700"
                                )}
                            >
                                {playlist.is_active ? (
                                    <>
                                        <Shield className="w-3 h-3 mr-1" />
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <ShieldOff className="w-3 h-3 mr-1" />
                                        Inactive
                                    </>
                                )}
                            </Badge>
                            {isDefault && (
                                <Badge variant="secondary" className="bg-rose-600/20 text-rose-400 border-rose-600/50 text-xs">
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    Default
                                </Badge>
                            )}
                        </div>
                        
                        <span className="text-xs text-neutral-500">
                            Created {createdDate}
                        </span>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-3 bg-neutral-950 border-t border-white/10 flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing || isPending}
                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white border-white/10"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    
                    {!isDefault ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onSetDefault}
                            disabled={isPending}
                            className="flex-1 bg-rose-950/50 hover:bg-rose-900/50 text-rose-400 border-rose-600/20"
                        >
                            <Star className="w-4 h-4 mr-2" />
                            Set Default
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled
                            className="flex-1 bg-rose-600/20 text-rose-400 border-rose-600/50"
                        >
                            <Star className="w-4 h-4 mr-2 fill-current" />
                            Default Set
                        </Button>
                    )}
                </div>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-neutral-950 border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Playlist</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                            Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-neutral-900 text-white border-white/10 hover:bg-neutral-800">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 text-white hover:bg-red-500"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}