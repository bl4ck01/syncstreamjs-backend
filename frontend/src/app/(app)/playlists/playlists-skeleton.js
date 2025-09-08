export default function PlaylistsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Search and Filters Bar Skeleton */}
            <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 h-10 bg-neutral-800/50 rounded-md animate-pulse" />
                    <div className="flex gap-2">
                        <div className="w-32 h-10 bg-neutral-800/50 rounded-md animate-pulse" />
                        <div className="w-32 h-10 bg-neutral-800/50 rounded-md animate-pulse" />
                        <div className="w-32 h-10 bg-neutral-800/50 rounded-md animate-pulse" />
                        <div className="w-32 h-10 bg-neutral-800/50 rounded-md animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Stats Bar Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                        <div className="h-8 w-16 bg-neutral-800/50 rounded mb-2 animate-pulse" />
                        <div className="h-4 w-24 bg-neutral-800/50 rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Playlists Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-neutral-900 border border-white/10 rounded-lg overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 w-3/4 bg-neutral-800 rounded animate-pulse" />
                                    <div className="h-4 w-full bg-neutral-800 rounded animate-pulse" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 bg-neutral-800 rounded animate-pulse" />
                                    <div className="w-8 h-8 bg-neutral-800 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex justify-between items-center">
                                <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
                                <div className="h-6 w-16 bg-neutral-800 rounded-full animate-pulse" />
                            </div>
                        </div>
                        <div className="p-3 bg-neutral-950 border-t border-white/10">
                            <div className="h-10 bg-neutral-800 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}