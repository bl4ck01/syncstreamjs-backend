'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlaylistStore } from '@/store/playlist';
import { List } from 'react-window';
import { Play, Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import PlaylistLoading, { PlaylistError } from './playlist-loading';

export default function CategoryHomeLayout() {
    const {
        loadDefaultPlaylist,
        getPlaylistData,
        getPlaylistCounts,
        getCategorizedStreams,
        globalLoading,
        error,
        clearError,
        isHydrated
    } = usePlaylistStore();

    const [currentPlaylist, setCurrentPlaylist] = useState(null);
    const [currentCounts, setCurrentCounts] = useState(null);
    const [noPlaylistMessage, setNoPlaylistMessage] = useState(null);
    const [hasTriedLoading, setHasTriedLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('live'); // 'live', 'movies', 'series'
    const [searchQuery, setSearchQuery] = useState('');

    // Debug component state
    console.log('[CategoryHomeLayout] Component render:', {
        isHydrated,
        globalLoading,
        hasCurrentPlaylist: !!currentPlaylist,
        hasNoPlaylistMessage: !!noPlaylistMessage,
        hasTriedLoading,
        activeTab
    });

    // Immediate check for cached data (fallback for faster loading)
    useEffect(() => {
        console.log('[CategoryHomeLayout] Component mounted, checking for immediate cached data...');

        // Small delay to ensure store is initialized
        const timer = setTimeout(() => {
            try {
                const state = usePlaylistStore.getState();
                console.log('[CategoryHomeLayout] Store state on mount:', {
                    isHydrated: state.isHydrated,
                    playlistCount: Object.keys(state.playlists || {}).length,
                    hasCurrentPlaylist: !!currentPlaylist,
                    hasTriedLoading
                });

                // If we have cached data and no current playlist, use it immediately
                if (!currentPlaylist && !hasTriedLoading && Object.keys(state.playlists || {}).length > 0) {
                    console.log('[CategoryHomeLayout] Found cached data on mount - using immediately');
                    const playlists = Object.values(state.playlists);
                    const validPlaylist = playlists.find(p => 
                        p.categorizedStreams?.live?.length || 
                        p.categorizedStreams?.vod?.length || 
                        p.categorizedStreams?.series?.length ||
                        p.streams?.live || 
                        p.streams?.vod || 
                        p.streams?.series
                    );

                    if (validPlaylist) {
                        console.log('[CategoryHomeLayout] Setting playlist from cached data on mount');
                        setCurrentPlaylist(validPlaylist);

                        // Find the correct playlist key for this playlist
                        const playlistKey = Object.keys(state.playlists).find(key =>
                            state.playlists[key] === validPlaylist
                        );
                        if (playlistKey) {
                            setCurrentCounts(getPlaylistCounts(playlistKey));
                        }

                        setHasTriedLoading(true);
                        console.log('[CategoryHomeLayout] Successfully set playlist from cached data on mount');
                    }
                }
            } catch (error) {
                console.error('[CategoryHomeLayout] Error in mount timer:', error);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    // Check for cached data immediately after hydration
    useEffect(() => {
        if (isHydrated && !currentPlaylist && !hasTriedLoading) {
            console.log('[CategoryHomeLayout] Checking for cached data after hydration...');
            setHasTriedLoading(true);

            // First, check if we have any cached playlists
            const state = usePlaylistStore.getState();
            const playlists = Object.values(state.playlists);
            const cachedPlaylist = playlists.find(p => 
                p.categorizedStreams?.live?.length || 
                p.categorizedStreams?.vod?.length || 
                p.categorizedStreams?.series?.length ||
                p.streams?.live || 
                p.streams?.vod || 
                p.streams?.series
            );

            if (cachedPlaylist) {
                console.log('[CategoryHomeLayout] Found cached playlist, using it immediately');
                setCurrentPlaylist(cachedPlaylist);

                // Find the correct playlist key for this playlist
                const playlistKey = Object.keys(state.playlists).find(key =>
                    state.playlists[key] === cachedPlaylist
                );
                if (playlistKey) {
                    setCurrentCounts(getPlaylistCounts(playlistKey));
                }

                return;
            }

            // If no cached data, try to load default playlist
            console.log('[CategoryHomeLayout] No cached data found, loading default playlist...');
            if (!globalLoading) {
                loadDefaultPlaylist().then(result => {
                    console.log('[CategoryHomeLayout] Load default playlist result:', result);
                    if (result.success) {
                        if (result.data && !result.noPlaylist) {
                            const state = usePlaylistStore.getState();
                            const playlists = Object.values(state.playlists);
                            const defaultPlaylist = playlists.find(p => 
                                p.categorizedStreams?.live?.length || 
                                p.categorizedStreams?.vod?.length || 
                                p.categorizedStreams?.series?.length ||
                                p.streams?.live || 
                                p.streams?.vod || 
                                p.streams?.series
                            );

                            if (defaultPlaylist) {
                                setCurrentPlaylist(defaultPlaylist);

                                // Find the correct playlist key for this playlist
                                const playlistKey = Object.keys(state.playlists).find(key =>
                                    state.playlists[key] === defaultPlaylist
                                );
                                if (playlistKey) {
                                    setCurrentCounts(getPlaylistCounts(playlistKey));
                                }
                            } else {
                                setNoPlaylistMessage('No valid playlist found');
                            }
                        } else if (result.noPlaylist) {
                            setNoPlaylistMessage(result.message || 'No playlist available');
                        } else {
                            setNoPlaylistMessage(result.message || 'No playlist available');
                        }
                    } else {
                        setNoPlaylistMessage(result.message || 'Failed to load playlist');
                    }
                }).catch(error => {
                    console.error('[CategoryHomeLayout] Error loading default playlist:', error);
                    setNoPlaylistMessage('Failed to load playlist');
                });
            }
        }
    }, [isHydrated, globalLoading, currentPlaylist, hasTriedLoading]);

    // Process data using pre-categorized streams for efficient display
    const categorizedData = useMemo(() => {
        if (!currentPlaylist) {
            console.log('[CategoryHomeLayout] No current playlist available');
            return [];
        }

        console.log('[CategoryHomeLayout] Processing playlist data:', {
            hasCategorizedStreams: !!currentPlaylist.categorizedStreams,
            hasOldStreams: !!currentPlaylist.streams,
            activeTab
        });

        // Find the playlist key in the store
        const state = usePlaylistStore.getState();
        const playlistKey = Object.keys(state.playlists).find(key =>
            state.playlists[key] === currentPlaylist
        );

        if (!playlistKey) {
            console.warn('[CategoryHomeLayout] Could not find playlist key in store');
            return [];
        }

        // Get pre-categorized streams using the new efficient method
        const categorizedStreams = getCategorizedStreams(playlistKey, activeTab);
        
        console.log('[CategoryHomeLayout] Got categorized streams:', {
            count: categorizedStreams.length,
            activeTab,
            playlistKey
        });

        // Apply search filter if needed
        if (!searchQuery) {
            // Map to the expected format for components
            const result = categorizedStreams.map(category => ({
                name: category.categoryName,
                items: category.streams,
                count: category.streamCount,
                categoryId: category.categoryId
            }));
            
            console.log('[CategoryHomeLayout] Final categorized data:', result.length, 'categories');
            return result;
        }

        // Filter streams based on search query
        const filteredCategories = categorizedStreams.map(category => {
            const filteredStreams = category.streams.filter(stream =>
                stream.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                stream.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                stream.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return {
                name: category.categoryName,
                items: filteredStreams,
                count: filteredStreams.length,
                categoryId: category.categoryId
            };
        }).filter(category => category.count > 0);

        console.log('[CategoryHomeLayout] Filtered categorized data:', filteredCategories.length, 'categories');
        return filteredCategories;
    }, [currentPlaylist, activeTab, searchQuery, getCategorizedStreams]);

    // Handle retry
    const handleRetry = () => {
        clearError();
        setCurrentPlaylist(null);
        setCurrentCounts(null);
        setNoPlaylistMessage(null);
        setHasTriedLoading(false);
    };

    // Render loading state
    if (!isHydrated || globalLoading) {
        console.log('[CategoryHomeLayout] Showing loading state:', { isHydrated, globalLoading });
        return <PlaylistLoading message="Loading your content..." showAnalytics={true} />;
    }

    // Render no playlist state
    if (noPlaylistMessage && !currentPlaylist) {
        return (
            <div className="h-full flex items-center justify-center bg-neutral-950 text-white p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-900/20 flex items-center justify-center">
                        <Tv className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        Default Playlist Issue
                    </h3>
                    <p className="text-neutral-400 text-sm mb-4">
                        {noPlaylistMessage}
                    </p>
                    <div className="space-y-2">
                        <button
                            onClick={() => window.location.href = '/playlists'}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Manage Playlists
                        </button>
                        <button
                            onClick={handleRetry}
                            className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render error state
    if (error && !currentPlaylist) {
        return (
            <PlaylistError
                message="Failed to load content"
                details={error}
                onRetry={handleRetry}
            />
        );
    }

    // If no current playlist but no error/loading, show loading
    if (!currentPlaylist) {
        return <PlaylistLoading message="Loading content..." showAnalytics={true} />;
    }

    return (
        <div className="h-full flex flex-col bg-black text-white">
            {/* Netflix-like Header */}
            <div className="flex-shrink-0 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
                {/* Top Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Home</h1>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-8">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search for characters, movies or series"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-neutral-900/50 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:border-red-500 focus:bg-neutral-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center px-4 sm:px-6 pb-4">
                    <TabButton
                        active={activeTab === 'live'}
                        onClick={() => setActiveTab('live')}
                        icon={Tv}
                        label="Live"
                        count={currentCounts?.totalLive}
                    />
                    <TabButton
                        active={activeTab === 'movies'}
                        onClick={() => setActiveTab('movies')}
                        icon={Film}
                        label="Movies"
                        count={currentCounts?.totalVod}
                    />
                    <TabButton
                        active={activeTab === 'series'}
                        onClick={() => setActiveTab('series')}
                        icon={MonitorSpeaker}
                        label="Series"
                        count={currentCounts?.totalSeries}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {categorizedData.length > 0 ? (
                    <VirtualCategoryList
                        categories={categorizedData}
                        activeTab={activeTab}
                        searchQuery={searchQuery}
                    />
                ) : (
                    <EmptyState activeTab={activeTab} searchQuery={searchQuery} />
                )}
            </div>
        </div>
    );
}

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label, count }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full mr-4 transition-all duration-200 ${active
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 hover:text-white'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="font-medium">{label}</span>
            {count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-red-700' : 'bg-neutral-700'
                    }`}>
                    {count.toLocaleString()}
                </span>
            )}
        </button>
    );
}

// Virtual Category List Component with dynamic heights
function VirtualCategoryList({ categories, activeTab }) {
    const [containerHeight, setContainerHeight] = useState(0);
    const containerRef = useRef(null);

    // Measure container height
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            const cr = entries[0]?.contentRect;
            if (cr?.height) setContainerHeight(cr.height);
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // Calculate item sizes based on category content
    const getItemSize = useCallback((index) => {
        const category = categories[index];
        if (!category) return 350;

        // Each category row: header (50px) + content (280px) + padding (20px)
        return 350;
    }, [categories]);

    return (
        <div ref={containerRef} className="h-full w-full">
            {containerHeight > 0 && (
                <List
                    height={containerHeight}
                    rowCount={categories.length}
                    rowHeight={getItemSize}
                    rowComponent={CategoryRow}
                    rowProps={{ categories, activeTab }}
                />
            )}
        </div>
    );
}

// Category Row Component for virtual scrolling
function CategoryRow({ index, style, categories, activeTab }) {
	const category = categories[index];

	return (
		<div style={style} className="px-4 sm:px-6 py-4">
			<CategoryRowContent category={category} activeTab={activeTab} />
		</div>
	);
}

// Category Row Content Component with horizontal virtual scrolling
function CategoryRowContent({ category, activeTab }) {
    const listRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const measureRef = useRef(null);

    // Responsive item widths: base: 160px (w-40), sm: 176px (w-44), lg: 192px (w-48), xl: 208px (w-52)
    const itemWidth = 176; // Average responsive width + gap
    const itemHeight = 260; // Approximate height for content cards

    // Measure container width for react-window
    useEffect(() => {
        if (!measureRef.current) return;
        const ro = new ResizeObserver((entries) => {
            const cr = entries[0]?.contentRect;
            if (cr?.width) {
                // Account for padding and subtract scroll button widths
                setContainerWidth(Math.max(200, cr.width - 80));
            }
        });
        ro.observe(measureRef.current);
        return () => ro.disconnect();
    }, []);

    const scrollLeft = () => {
        if (listRef.current) {
            // For horizontal scrolling, we need to scroll by a certain amount
            const currentScroll = listRef.current.scrollLeft || 0;
            listRef.current.scrollTo(Math.max(0, currentScroll - itemWidth * 2));
        }
    };

    const scrollRight = () => {
        if (listRef.current) {
            // For horizontal scrolling, we need to scroll by a certain amount
            const currentScroll = listRef.current.scrollLeft || 0;
            listRef.current.scrollTo(currentScroll + itemWidth * 2);
        }
    };

    return (
        <div ref={measureRef} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">{category.name}</h2>
                <span className="text-sm text-neutral-400">
                    ({category.items.length} items)
                </span>
            </div>

            {/* Horizontal Virtual Scrollable Content */}
            {containerWidth > 0 && category.items.length > 0 && (
                <List
                    ref={listRef}
                    direction="horizontal"
                    height={itemHeight}
                    width={containerWidth}
                    rowCount={category.items.length}
                    rowHeight={itemWidth}
                    rowComponent={HorizontalContentItem}
                    rowProps={{ items: category.items, type: activeTab }}
                    className="scrollbar-hide"
                />
            )}
        </div>
    );
}

// Horizontal Content Item Component for virtual list
function HorizontalContentItem({ index, style, items, type }) {
    const item = items[index];

    return (
        <div style={style} className="pr-4">
            <ContentCard item={item} type={type} />
        </div>
    );
}

// Content Card Component
function ContentCard({ item, type }) {
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
        setImageError(true);
    }, []);

	return (
		<div className="flex-shrink-0 w-48 bg-black rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-10">
			<div className="aspect-video bg-neutral-800 relative overflow-hidden rounded-lg">
				{item.stream_icon && !imageError ? (
					<img
						src={item.stream_icon}
						alt={item.name}
						className="w-full h-full object-cover"
						onError={handleImageError}
						loading="lazy"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-neutral-800">
						{type === 'live' && <Tv className="w-8 h-8 text-neutral-600" />}
						{type === 'movies' && <Film className="w-8 h-8 text-neutral-600" />}
						{type === 'series' && <MonitorSpeaker className="w-8 h-8 text-neutral-600" />}
					</div>
				)}
				
				<div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center">
					<Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100" />
				</div>
			</div>
			
			<div className="p-3">
				<h4 className="font-medium text-white text-sm line-clamp-2 mb-1">
					{item.name}
				</h4>
			</div>
		</div>
	);
}

// Empty State Component
function EmptyState({ activeTab, searchQuery }) {
	const getIcon = () => {
		switch (activeTab) {
			case 'live': return <Tv className="w-16 h-16 text-neutral-600" />;
			case 'movies': return <Film className="w-16 h-16 text-neutral-600" />;
			case 'series': return <MonitorSpeaker className="w-16 h-16 text-neutral-600" />;
			default: return <Tv className="w-16 h-16 text-neutral-600" />;
		}
	};

	const getTitle = () => {
		if (searchQuery) {
			return `No results for "${searchQuery}"`;
		}
		switch (activeTab) {
			case 'live': return 'No Live Channels';
			case 'movies': return 'No Movies Available';
			case 'series': return 'No Series Available';
			default: return 'No Content Available';
		}
	};

	const getDescription = () => {
		if (searchQuery) {
			return 'Try adjusting your search terms or browse different categories.';
		}
		return 'This playlist doesn\'t contain any content in this category yet.';
	};

	return (
		<div className="h-full flex items-center justify-center">
			<div className="text-center max-w-md">
				<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-900/50 flex items-center justify-center">
					{getIcon()}
				</div>
				<h3 className="text-xl font-semibold text-white mb-3">
					{getTitle()}
				</h3>
				<p className="text-neutral-400 text-sm">
					{getDescription()}
				</p>
			</div>
		</div>
	);
}
