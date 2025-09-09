'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePlaylistStore } from '@/store/playlist';
import PlaylistLoading, { PlaylistError, PlaylistSkeleton } from './playlist-loading';
import VirtualContentGrid from './virtual-content-grid';
import {
	Play,
	Tv,
	Film,
	MonitorSpeaker,
	Search,
	Filter,
	Grid,
	List,
	Star,
	Clock,
	Users
} from 'lucide-react';

export default function PlaylistViewer() {
	const {
		loadDefaultPlaylist,
		getPlaylistData,
		getPlaylistCounts,
		searchChannels,
		globalLoading,
		error,
		clearError,
		defaultPlaylistId,
		isHydrated,
		_hydrationTimestamp
	} = usePlaylistStore();

	const [selectedCategory, setSelectedCategory] = useState('All');
	const [selectedType, setSelectedType] = useState('live'); // live, vod, series
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState('grid'); // grid, list
	const [currentPlaylist, setCurrentPlaylist] = useState(null);
	const [currentCounts, setCurrentCounts] = useState(null);
	const [noPlaylistMessage, setNoPlaylistMessage] = useState(null);
	const [hasTriedLoading, setHasTriedLoading] = useState(false);

	// Check for cached data immediately on mount (regardless of hydration status)
	useEffect(() => {
		console.log('[BROWSER STORAGE DEBUG] 🔍 Component mounted - checking for immediate cached data');

		// Small delay to ensure store is initialized
		const timer = setTimeout(() => {
			try {
				const state = usePlaylistStore.getState();
				if (!state) {
					console.log('[BROWSER STORAGE DEBUG] ⚠️ Store state is undefined on mount');
					return;
				}

				console.log('[BROWSER STORAGE DEBUG] 📊 Store state on mount:', {
					isHydrated: state.isHydrated,
					playlistCount: Object.keys(state.playlists || {}).length,
					hasCurrentPlaylist: !!currentPlaylist,
					hasTriedLoading
				});

				// If we have cached data and no current playlist, use it immediately
				if (!currentPlaylist && !hasTriedLoading && Object.keys(state.playlists || {}).length > 0) {
					console.log('[BROWSER STORAGE DEBUG] 🚀 Found cached data on mount - using immediately');
					const playlists = Object.values(state.playlists);
					const validPlaylist = playlists.find(p => p.streams);

					if (validPlaylist) {
						console.log('[BROWSER STORAGE DEBUG] 🎯 Setting playlist from cached data on mount');
						setCurrentPlaylist(validPlaylist);
						setCurrentCounts(getPlaylistCounts(Object.keys(state.playlists)[0]));
						setHasTriedLoading(true);
						console.log('[BROWSER STORAGE DEBUG] ✅ Successfully set playlist from cached data on mount');
					}
				}
			} catch (error) {
				console.error('[BROWSER STORAGE DEBUG] ❌ Error in mount timer:', error);
			}
		}, 100); // Small delay to ensure store initialization

		// Fallback check with longer delay
		const fallbackTimer = setTimeout(() => {
			try {
				if (!currentPlaylist && !hasTriedLoading) {
					console.log('[BROWSER STORAGE DEBUG] 🔄 Fallback check - looking for cached data again');
					const state = usePlaylistStore.getState();

					if (!state) {
						console.log('[BROWSER STORAGE DEBUG] ⚠️ Store state is undefined in fallback');
						return;
					}

					if (Object.keys(state.playlists || {}).length > 0) {
						console.log('[BROWSER STORAGE DEBUG] 🎯 Fallback: Found cached data, setting playlist');
						const playlists = Object.values(state.playlists);
						const validPlaylist = playlists.find(p => p.streams);

						if (validPlaylist) {
							setCurrentPlaylist(validPlaylist);
							setCurrentCounts(getPlaylistCounts(Object.keys(state.playlists)[0]));
							setHasTriedLoading(true);
							console.log('[BROWSER STORAGE DEBUG] ✅ Fallback: Successfully set playlist');
						}
					}
				}
			} catch (error) {
				console.error('[BROWSER STORAGE DEBUG] ❌ Error in fallback timer:', error);
			}
		}, 500); // Longer delay as fallback

		return () => {
			clearTimeout(timer);
			clearTimeout(fallbackTimer);
		};
	}, []);

	// Debug store hydration
	useEffect(() => {
		console.log('[BROWSER STORAGE DEBUG] 💧 Store hydration status changed:', {
			isHydrated,
			hydrationTimestamp: _hydrationTimestamp,
			timestamp: new Date().toLocaleTimeString()
		});

		if (isHydrated) {
			console.log('[BROWSER STORAGE DEBUG] ✅ Store has been hydrated from browser storage!');

			// Log current store state after hydration
			const state = usePlaylistStore.getState();
			console.log('[BROWSER STORAGE DEBUG] 📊 Store state after hydration:', {
				playlistCount: Object.keys(state.playlists).length,
				defaultPlaylistId: state.defaultPlaylistId,
				playlistIds: Object.keys(state.playlists),
				globalLoading: state.globalLoading,
				error: state.error
			});

			// Check if we can immediately use cached data
			if (!currentPlaylist && Object.keys(state.playlists).length > 0) {
				console.log('[BROWSER STORAGE DEBUG] 🚀 Found cached playlists immediately after hydration - trying to use them');
				const playlists = Object.values(state.playlists);
				const validPlaylist = playlists.find(p => p.streams);

				if (validPlaylist) {
					console.log('[BROWSER STORAGE DEBUG] 🎯 Using cached playlist immediately after hydration');
					console.log('[BROWSER STORAGE DEBUG] 📋 Immediate playlist details:', {
						hasStreams: !!(validPlaylist.streams),
						liveCounts: validPlaylist.streams?.live?.length || 0,
						vodCounts: validPlaylist.streams?.vod?.length || 0,
						seriesCounts: validPlaylist.streams?.series?.length || 0,
						name: validPlaylist._meta?.name || 'Unknown'
					});
					setCurrentPlaylist(validPlaylist);
					setCurrentCounts(getPlaylistCounts(Object.keys(state.playlists)[0]));
					setHasTriedLoading(true); // Prevent the other useEffect from running
					console.log('[BROWSER STORAGE DEBUG] ✅ Successfully set playlist immediately from cached data');
				}
			}
		}
	}, [isHydrated, _hydrationTimestamp]);

	// Load default playlist on component mount (run only once)
	useEffect(() => {
		console.log('[BROWSER STORAGE DEBUG] 🔍 Playlist Viewer useEffect triggered - Checking conditions:', {
			isHydrated,
			globalLoading,
			hasCurrentPlaylist: !!currentPlaylist,
			hasTriedLoading,
			shouldProceed: isHydrated && !globalLoading && !currentPlaylist && !hasTriedLoading
		});

		if (isHydrated && !globalLoading && !currentPlaylist && !hasTriedLoading) {
			console.log('[BROWSER STORAGE DEBUG] 🚀 All conditions met - Starting to load default playlist...');
			console.log('[Playlist Viewer] Starting to load default playlist...');
			setHasTriedLoading(true);

			loadDefaultPlaylist().then(result => {
				console.log('[BROWSER STORAGE DEBUG] 📥 Playlist Viewer received load result:', result);
				if (result.success) {
					if (result.data && !result.noPlaylist) {
						// Find the playlist directly from the simplified structure
						const state = usePlaylistStore.getState();
						const playlists = Object.values(state.playlists);
						const defaultPlaylist = playlists.find(p => p.streams);

						if (defaultPlaylist) {
							console.log('[BROWSER STORAGE DEBUG] 🎪 Setting current playlist in Playlist Viewer from browser storage data');
							console.log('[BROWSER STORAGE DEBUG] 📋 Playlist data being set:', {
								hasStreams: !!(defaultPlaylist.streams),
								liveCounts: defaultPlaylist.streams?.live?.length || 0,
								vodCounts: defaultPlaylist.streams?.vod?.length || 0,
								seriesCounts: defaultPlaylist.streams?.series?.length || 0,
								name: defaultPlaylist._meta?.name || 'Unknown',
								wasCached: result.cached,
								source: result.cached ? 'Browser Storage Cache' : 'Fresh Network Request'
							});
							setCurrentPlaylist(defaultPlaylist);
							setCurrentCounts(getPlaylistCounts(Object.keys(state.playlists)[0])); // Get first playlist ID
							console.log('[BROWSER STORAGE DEBUG] ✅ Playlist Viewer successfully loaded data from browser storage');
						} else {
							console.log('[BROWSER STORAGE DEBUG] ⚠️ No valid playlist found in state playlists');
						}
					} else if (result.noPlaylist) {
						// Check if we have any cached playlists as fallback
						const state = usePlaylistStore.getState();
						const playlists = Object.values(state.playlists);
						const cachedPlaylist = playlists.find(p => p.streams);

						if (cachedPlaylist) {
							console.log('[BROWSER STORAGE DEBUG] 🔄 Default playlist not found, using cached playlist as fallback');
							console.log('[BROWSER STORAGE DEBUG] 📋 Fallback playlist details:', {
								hasStreams: !!(cachedPlaylist.streams),
								liveCounts: cachedPlaylist.streams?.live?.length || 0,
								vodCounts: cachedPlaylist.streams?.vod?.length || 0,
								seriesCounts: cachedPlaylist.streams?.series?.length || 0,
								name: cachedPlaylist._meta?.name || 'Unknown'
							});
							setCurrentPlaylist(cachedPlaylist);
							setCurrentCounts(getPlaylistCounts(Object.keys(state.playlists)[0])); // Get first playlist ID
							console.log('[BROWSER STORAGE DEBUG] ✅ Successfully using cached playlist as fallback');
						} else {
							// No default playlist available - show message
							console.log('[BROWSER STORAGE DEBUG] ❌ No default playlist available and no cached fallback:', result.message);
							setNoPlaylistMessage(result.message || 'No playlist available');
						}
					} else {
						// No default playlist available - show message
						console.log('[BROWSER STORAGE DEBUG] ❌ No default playlist available:', result.message);
						setNoPlaylistMessage(result.message || 'No playlist available');
					}
				} else {
					// Handle error case
					console.error('[BROWSER STORAGE DEBUG] ❌ Failed to load default playlist:', result.message);
					setNoPlaylistMessage(result.message || 'Failed to load playlist');
				}
			}).catch(error => {
				console.error('[BROWSER STORAGE DEBUG] ❌ Error loading default playlist:', error);
				setNoPlaylistMessage('Failed to load playlist');
			});
		}
	}, [isHydrated, globalLoading, currentPlaylist, hasTriedLoading]); // Removed functions from deps

	// Memoized data processing
	const processedData = useMemo(() => {
		if (!currentPlaylist?.streams) {
			console.log('[BROWSER STORAGE DEBUG] ⚠️ No streams in current playlist - returning empty data');
			return {
				categories: [],
				filteredChannels: [],
				totalCount: 0
			};
		}

		console.log('[BROWSER STORAGE DEBUG] 🎬 Processing playlist data from browser storage:', {
			playlistName: currentPlaylist._meta?.name || 'Unknown',
			selectedType,
			selectedCategory,
			hasSearchQuery: !!searchQuery.trim(),
			rawStreamCounts: {
				live: currentPlaylist.streams?.live?.length || 0,
				vod: currentPlaylist.streams?.vod?.length || 0,
				series: currentPlaylist.streams?.series?.length || 0
			}
		});

		const { live = [], vod = [], series = [] } = currentPlaylist.streams;

		// Get categories directly from proxy data
		const allCategories = ['All'];
		if (currentPlaylist.categories) {
			if (selectedType === 'live' && currentPlaylist.categories.live) {
				allCategories.push(...currentPlaylist.categories.live.map(cat => cat.category_name));
			} else if (selectedType === 'vod' && currentPlaylist.categories.vod) {
				allCategories.push(...currentPlaylist.categories.vod.map(cat => cat.category_name));
			} else if (selectedType === 'series' && currentPlaylist.categories.series) {
				allCategories.push(...currentPlaylist.categories.series.map(cat => cat.category_name));
			}
		}

		const categories = allCategories;

		// Get current streams for filtering
		const currentStreams = selectedType === 'live' ? live :
			selectedType === 'vod' ? vod : series;

		// Filter channels based on selected category and search
		let filteredChannels = currentStreams;

		if (selectedCategory !== 'All') {
			filteredChannels = filteredChannels.filter(item =>
				item.category_name === selectedCategory
			);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredChannels = filteredChannels.filter(item =>
				item.name?.toLowerCase().includes(query) ||
				item.category_name?.toLowerCase().includes(query)
			);
		}

		const result = {
			categories,
			filteredChannels,
			totalCount: filteredChannels.length
		};

		console.log('[BROWSER STORAGE DEBUG] ✅ Processed data from browser storage:', {
			categoriesCount: result.categories.length,
			filteredChannelsCount: result.filteredChannels.length,
			totalCount: result.totalCount,
			firstFewChannels: result.filteredChannels.slice(0, 3).map(ch => ch.name)
		});

		return result;
	}, [currentPlaylist, currentCounts, selectedType, selectedCategory, searchQuery]);

	// Handle retry
	const handleRetry = () => {
		console.log('[Playlist Viewer] Retrying...');
		clearError();
		setCurrentPlaylist(null);
		setCurrentCounts(null);
		setNoPlaylistMessage(null);
		setHasTriedLoading(false); // Reset the loading flag so useEffect can run again
	};

	// Render loading state
	if (!isHydrated || globalLoading) {
		return <PlaylistLoading message="Loading your default playlist..." showAnalytics={true} />;
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
				message="Failed to load playlist"
				details={error}
				onRetry={handleRetry}
			/>
		);
	}

	// If no current playlist but no error/loading, show loading
	if (!currentPlaylist) {
		return <PlaylistLoading message="Loading playlist..." showAnalytics={true} />;
	}

	// Render main interface
	return (
		<div className="h-full flex flex-col bg-neutral-950 text-white">
			{/* Header with Analytics */}
			<div className="flex-shrink-0 p-6 border-b border-neutral-800">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-bold text-white">
							{currentPlaylist._meta?.name || 'Default Playlist'}
						</h1>
						<p className="text-neutral-400 text-sm">
							Your default playlist • Last updated {
								new Date(currentPlaylist.fetchedAt || currentPlaylist._meta?.loadedAt || Date.now()).toLocaleDateString()
							}
						</p>
					</div>
				</div>

				{/* Analytics Cards */}
				{currentCounts && (
					<div className="grid grid-cols-3 gap-4 mb-6">
						<AnalyticsCard
							icon={Tv}
							label="Live Channels"
							count={currentCounts.totalLive}
							active={selectedType === 'live'}
							onClick={() => {
								setSelectedType('live');
								setSelectedCategory('All');
							}}
						/>
						<AnalyticsCard
							icon={Film}
							label="Movies"
							count={currentCounts.totalVod}
							active={selectedType === 'vod'}
							onClick={() => {
								setSelectedType('vod');
								setSelectedCategory('All');
							}}
						/>
						<AnalyticsCard
							icon={MonitorSpeaker}
							label="Series"
							count={currentCounts.totalSeries}
							active={selectedType === 'series'}
							onClick={() => {
								setSelectedType('series');
								setSelectedCategory('All');
							}}
						/>
					</div>
				)}

				{/* Search and Filters */}
				<div className="flex items-center gap-4 mb-4">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
						<input
							type="text"
							placeholder={`Search ${selectedType} content...`}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500"
						/>
					</div>

					<select
						value={selectedCategory}
						onChange={(e) => setSelectedCategory(e.target.value)}
						className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
					>
						{processedData.categories.map(category => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>

					<div className="flex items-center gap-2">
						<button
							onClick={() => setViewMode('grid')}
							className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
									? 'bg-blue-600 text-white'
									: 'bg-neutral-800 text-neutral-400 hover:text-white'
								}`}
						>
							<Grid className="w-4 h-4" />
						</button>
						<button
							onClick={() => setViewMode('list')}
							className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
									? 'bg-blue-600 text-white'
									: 'bg-neutral-800 text-neutral-400 hover:text-white'
								}`}
						>
							<List className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Results Info */}
				<div className="text-sm text-neutral-400">
					Showing {processedData.totalCount.toLocaleString()} {selectedType}
					{selectedCategory !== 'All' && ` in "${selectedCategory}"`}
					{searchQuery && ` matching "${searchQuery}"`}
				</div>
			</div>

			{/* Content Area */}
			<div className="flex-1 overflow-hidden">
				<VirtualContentGrid
					channels={processedData.filteredChannels}
					viewMode={viewMode}
					type={selectedType}
					searchQuery={searchQuery}
					selectedCategory={selectedCategory}
					containerHeight={600}
				/>
			</div>
		</div>
	);
}

// Analytics Card Component
function AnalyticsCard({ icon: Icon, label, count, active, onClick }) {
	return (
		<button
			onClick={onClick}
			className={`p-4 rounded-lg border transition-all ${active
					? 'bg-blue-600/20 border-blue-500 text-blue-400'
					: 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-white'
				}`}
		>
			<div className="flex items-center gap-3">
				<Icon className="w-6 h-6" />
				<div className="text-left">
					<div className={`text-2xl font-bold ${active ? 'text-white' : 'text-white'}`}>
						{count.toLocaleString()}
					</div>
					<div className="text-sm">{label}</div>
				</div>
			</div>
		</button>
	);
}

// Note: ContentGrid, ChannelGridItem, ChannelListItem, and EmptyState components
// have been moved to VirtualContentGrid component for better performance with large datasets
