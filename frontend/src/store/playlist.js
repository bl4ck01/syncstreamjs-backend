"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import { fetchPlaylistData } from '@/lib/proxy';

// Efficient playlist store - uses proxy JSON structure directly
export const usePlaylistStore = create(
	persist(
		(set, get) => ({
			// Simple, efficient state structure
			playlists: {}, // Record<playlistId, ProxyData> - stores the full proxy response
			defaultPlaylistId: null,
			isHydrated: false,
			loadingStates: {}, // Record<playlistId, 'loading' | 'success' | 'error'>
			error: null,
			globalLoading: false,
			failedPlaylistIds: new Set(), // Track failed playlist IDs to avoid repeated requests

			// Efficient selectors that use proxy data directly
			hasPlaylistData: (playlistId) => {
				const playlist = get().playlists[playlistId];
				// Support both old and new structure for backward compatibility
				return !!(
					playlist?.categorizedStreams?.live?.length || 
					playlist?.categorizedStreams?.vod?.length || 
					playlist?.categorizedStreams?.series?.length ||
					playlist?.streams?.live || 
					playlist?.streams?.vod || 
					playlist?.streams?.series
				);
			},

			getPlaylistData: (playlistId) => {
				return get().playlists[playlistId] || null;
			},

			// Get categorized streams ready for display (no processing needed!)
			getCategorizedStreams: (playlistId, type = 'live') => {
				const playlist = get().playlists[playlistId];
				if (!playlist) {
					console.log('[Store] getCategorizedStreams: No playlist found for', playlistId);
					return [];
				}

				console.log('[Store] getCategorizedStreams:', {
					playlistId,
					type,
					hasCategorizedStreams: !!playlist.categorizedStreams,
					hasOldStreams: !!playlist.streams
				});

				// Use new categorized structure if available
				if (playlist.categorizedStreams) {
					let result;
					switch (type) {
						case 'live':
							result = playlist.categorizedStreams.live || [];
							break;
						case 'movies':
						case 'vod':
							result = playlist.categorizedStreams.vod || [];
							break;
						case 'series':
							result = playlist.categorizedStreams.series || [];
							break;
						default:
							result = [];
					}
					
					console.log('[Store] getCategorizedStreams: Found categorized data, returning', result.length, 'categories for', type);
					return result;
				}

				// Fallback to old structure (group streams manually for backward compatibility)
				if (playlist.streams && playlist.categories) {
					console.log('[Store] getCategorizedStreams: Using fallback grouping for old structure');
					const streams = playlist.streams[type === 'movies' ? 'vod' : type] || [];
					const categories = playlist.categories[type === 'movies' ? 'vod' : type] || [];
					
					console.log('[Store] getCategorizedStreams: Fallback data:', {
						streamsCount: streams.length,
						categoriesCount: categories.length,
						type
					});
					
					// Group streams by category manually
					const categoryMap = {};
					categories.forEach(cat => {
						categoryMap[cat.category_id] = {
							categoryId: cat.category_id,
							categoryName: cat.category_name,
							streams: [],
							streamCount: 0
						};
					});

					// Add uncategorized group
					categoryMap['uncategorized'] = {
						categoryId: 'uncategorized',
						categoryName: 'Uncategorized',
						streams: [],
						streamCount: 0
					};

					// Group streams
					streams.forEach(stream => {
						const categoryId = stream.category_id || 'uncategorized';
						if (categoryMap[categoryId]) {
							categoryMap[categoryId].streams.push(stream);
							categoryMap[categoryId].streamCount++;
						} else {
							categoryMap['uncategorized'].streams.push(stream);
							categoryMap['uncategorized'].streamCount++;
						}
					});

					// Return only categories that have streams
					const result = Object.values(categoryMap).filter(cat => cat.streamCount > 0);
					console.log('[Store] getCategorizedStreams: Fallback result:', result.length, 'categories');
					return result;
				}

				console.log('[Store] getCategorizedStreams: No data available, returning empty array');
				return [];
			},

			// Get counts directly from proxy statistics (optimized!)
			getPlaylistCounts: (playlistId) => {
				const playlist = get().playlists[playlistId];
				if (!playlist) return null;

				// Use pre-calculated statistics from proxy if available, fallback to counting
				const stats = playlist.statistics;
				if (stats) {
					return {
						totalLive: stats.totalLive || 0,
						totalVod: stats.totalVod || 0,
						totalSeries: stats.totalSeries || 0,
						totalChannels: stats.totalItems || 0,
						liveCategories: playlist.categories?.live || [],
						vodCategories: playlist.categories?.vod || [],
						seriesCategories: playlist.categories?.series || [],
						lastUpdated: playlist.fetchedAt || Date.now()
					};
				}

				// Fallback to manual counting (for backward compatibility)
				if (!playlist.streams) return null;

				return {
					totalLive: playlist.streams.live?.length || 0,
					totalVod: playlist.streams.vod?.length || 0,
					totalSeries: playlist.streams.series?.length || 0,
					totalChannels: (playlist.streams.live?.length || 0) +
						(playlist.streams.vod?.length || 0) +
						(playlist.streams.series?.length || 0),
					liveCategories: playlist.categories?.live || [],
					vodCategories: playlist.categories?.vod || [],
					seriesCategories: playlist.categories?.series || [],
					lastUpdated: playlist.fetchedAt || Date.now()
				};
			},

			isPlaylistLoading: (playlistId) => {
				return get().loadingStates[playlistId] === 'loading';
			},

			// Get total counts across all playlists (optimized with statistics)
			getAllPlaylistsCounts: () => {
				const playlists = get().playlists;
				let totalLive = 0, totalVod = 0, totalSeries = 0;
				const allLiveCategories = new Set();
				const allVodCategories = new Set();
				const allSeriesCategories = new Set();

				Object.values(playlists).forEach(playlist => {
					// Use statistics if available, fallback to counting
					if (playlist.statistics) {
						totalLive += playlist.statistics.totalLive || 0;
						totalVod += playlist.statistics.totalVod || 0;
						totalSeries += playlist.statistics.totalSeries || 0;
					} else if (playlist.streams) {
						// Fallback to manual counting
						totalLive += playlist.streams.live?.length || 0;
						totalVod += playlist.streams.vod?.length || 0;
						totalSeries += playlist.streams.series?.length || 0;
					}

					// Aggregate categories
					playlist.categories?.live?.forEach(cat => allLiveCategories.add(cat.category_name));
					playlist.categories?.vod?.forEach(cat => allVodCategories.add(cat.category_name));
					playlist.categories?.series?.forEach(cat => allSeriesCategories.add(cat.category_name));
				});

				return {
					totalLive,
					totalVod,
					totalSeries,
					totalChannels: totalLive + totalVod + totalSeries,
					playlistCount: Object.keys(playlists).length,
					allCategories: {
						live: Array.from(allLiveCategories),
						vod: Array.from(allVodCategories),
						series: Array.from(allSeriesCategories)
					}
				};
			},

			// Efficient search using categorized streams
			searchChannels: (query, playlistId = null, type = null) => {
				if (!query || query.trim().length < 2) return [];

				const searchTerm = query.toLowerCase().trim();
				const results = [];
				const playlists = get().playlists;

				const playlistsToSearch = playlistId ?
					{ [playlistId]: playlists[playlistId] } :
					playlists;

				Object.entries(playlistsToSearch).forEach(([id, playlist]) => {
					let streamsToSearch = [];

					// Use categorized streams if available
					if (playlist?.categorizedStreams) {
						const { live = [], vod = [], series = [] } = playlist.categorizedStreams;
						
						if (type) {
							const categoryType = type === 'movies' ? 'vod' : type;
							const categories = categoryType === 'live' ? live : categoryType === 'vod' ? vod : series;
							categories.forEach(category => {
								streamsToSearch.push(...category.streams);
							});
						} else {
							// Search all types
							[...live, ...vod, ...series].forEach(category => {
								streamsToSearch.push(...category.streams);
							});
						}
					} 
					// Fallback to old structure
					else if (playlist?.streams) {
						const { live = [], vod = [], series = [] } = playlist.streams;
						streamsToSearch = type ?
							(type === 'live' ? live : type === 'vod' || type === 'movies' ? vod : series) :
							[...live, ...vod, ...series];
					}

					streamsToSearch.forEach(item => {
						if (item.name?.toLowerCase().includes(searchTerm) ||
							item.categoryName?.toLowerCase().includes(searchTerm) ||
							item.category_name?.toLowerCase().includes(searchTerm)) {
							results.push({
								...item,
								playlistId: id,
								playlistName: playlist.userInfo?.username || 'Unknown'
							});
						}
					});
				});

				return results.slice(0, 100);
			},

			// Actions - Simple and efficient 
			loadPlaylistData: async (playlistConfig) => {
				const { baseUrl, username, password, name } = playlistConfig;

				if (!baseUrl || !username || !password) {
					const error = 'Missing required playlist configuration';
					set({ error });
					return { success: false, message: error };
				}

				const playlistId = `${baseUrl}|${username}`;

				// Set loading state
				set(state => ({
					...state,
					loadingStates: { ...state.loadingStates, [playlistId]: 'loading' },
					error: null
				}));

				try {
					console.log(`[Playlist Store] Loading: ${name || playlistId}`);

					// Fetch data from proxy (already normalized)
					const proxyData = await fetchPlaylistData({ baseUrl, username, password });

					if (!proxyData) {
						throw new Error('No data received from proxy');
					}

					// Store the complete proxy response directly - no processing needed!
					set(state => ({
						...state,
						playlists: {
							...state.playlists,
							[playlistId]: {
								...proxyData,
								// Add our metadata
								_meta: {
									name: name || '',
									baseUrl,
									username,
									password, // TODO: Encrypt
									loadedAt: Date.now()
								}
							}
						},
						loadingStates: { ...state.loadingStates, [playlistId]: 'success' }
					}));

					// Use statistics from proxy if available, fallback to counting
					const counts = proxyData.statistics ? {
						totalLive: proxyData.statistics.totalLive || 0,
						totalVod: proxyData.statistics.totalVod || 0,
						totalSeries: proxyData.statistics.totalSeries || 0,
						totalItems: proxyData.statistics.totalItems || 0
					} : {
						totalLive: proxyData.streams?.live?.length || 0,
						totalVod: proxyData.streams?.vod?.length || 0,
						totalSeries: proxyData.streams?.series?.length || 0,
						totalItems: (proxyData.streams?.live?.length || 0) + (proxyData.streams?.vod?.length || 0) + (proxyData.streams?.series?.length || 0)
					};

					console.log(`[Playlist Store] Success: Live: ${counts.totalLive}, VOD: ${counts.totalVod}, Series: ${counts.totalSeries}, Total: ${counts.totalItems}`);

					return { success: true, data: proxyData, counts };
				} catch (error) {
					console.error('[Playlist Store] Error:', error);

					set(state => ({
						...state,
						loadingStates: { ...state.loadingStates, [playlistId]: 'error' },
						error: error.message || 'Failed to load playlist'
					}));

					return {
						success: false,
						message: error.message || 'Failed to load playlist',
						error
					};
				}
			},

			loadDefaultPlaylist: async () => {
				set({ globalLoading: true, error: null });

				try {
					// Get current profile's default playlist
					const { getCurrentProfileWithPlaylist } = await import('@/server/playlist-actions');
					const profileResult = await getCurrentProfileWithPlaylist();

					if (!profileResult.success || !profileResult.data) {
						throw new Error('Unable to load current profile');
					}

					const profile = profileResult.data;
					const defaultPlaylistId = profile.default_playlist_id;

					set(state => ({ ...state, defaultPlaylistId }));

					if (!defaultPlaylistId) {
						set({ globalLoading: false });
						return { success: true, message: 'No default playlist set' };
					}

				// Check if this playlist ID has already failed
				if (get().failedPlaylistIds.has(defaultPlaylistId)) {
					console.log('[Playlist Store] Skipping known failed playlist:', defaultPlaylistId);
					set({ globalLoading: false });
					return { 
						success: true, 
						message: 'Default playlist is not accessible. Please select a playlist manually.',
						noPlaylist: true
					};
				}

				// Get playlist details
				console.log('[Playlist Store] Fetching playlist details for ID:', defaultPlaylistId);
				const { getPlaylistAction } = await import('@/server/playlist-actions');
				const playlistResult = await getPlaylistAction(defaultPlaylistId);
				
				console.log('[Playlist Store] Playlist fetch result:', playlistResult);

				if (!playlistResult.success || !playlistResult.data) {
					console.warn('[Playlist Store] Default playlist not accessible:', {
						playlistId: defaultPlaylistId,
						success: playlistResult.success,
						message: playlistResult.message,
						data: playlistResult.data
					});
					
					// Add to failed playlist IDs and clear invalid default playlist ID
					set(state => {
						const newFailedIds = new Set(state.failedPlaylistIds);
						newFailedIds.add(defaultPlaylistId);
						return { 
							...state,
							globalLoading: false,
							failedPlaylistIds: newFailedIds,
							defaultPlaylistId: null // Clear invalid default playlist ID
						};
					});
					
					// Provide a more specific error message
					const errorMessage = playlistResult.message === 'Playlist not found' 
						? `Default playlist (${defaultPlaylistId}) was not found. It may have been deleted.`
						: `Default playlist is not accessible: ${playlistResult.message || 'Unknown error'}`;
					
					// If playlist was not found, clear it from the profile on the server too
					if (playlistResult.message === 'Playlist not found') {
						try {
							const { setDefaultPlaylistAction } = await import('@/server/playlist-actions');
							await setDefaultPlaylistAction(null); // Clear the invalid default playlist
							console.log('[Playlist Store] Cleared invalid default playlist from profile');
						} catch (clearError) {
							console.warn('[Playlist Store] Failed to clear invalid default playlist:', clearError);
						}
					}
					
					return { 
						success: true, 
						message: errorMessage,
						noPlaylist: true,
						playlistId: defaultPlaylistId
					};
				}

					const playlist = playlistResult.data;
					const playlistStoreId = `${playlist.url}|${playlist.username}`;

					// Check if already cached
					const existingPlaylist = get().playlists[playlistStoreId];

					if (existingPlaylist?.categorizedStreams || existingPlaylist?.streams) {
						console.log('[BROWSER STORAGE DEBUG] 🎯 Found cached playlist data in browser storage!');
						// Calculate counts from the available structure
						let liveCounts = 0, vodCounts = 0, seriesCounts = 0;
						if (existingPlaylist.categorizedStreams) {
							liveCounts = existingPlaylist.categorizedStreams.live?.reduce((sum, cat) => sum + cat.streamCount, 0) || 0;
							vodCounts = existingPlaylist.categorizedStreams.vod?.reduce((sum, cat) => sum + cat.streamCount, 0) || 0;
							seriesCounts = existingPlaylist.categorizedStreams.series?.reduce((sum, cat) => sum + cat.streamCount, 0) || 0;
						} else if (existingPlaylist.streams) {
							liveCounts = existingPlaylist.streams.live?.length || 0;
							vodCounts = existingPlaylist.streams.vod?.length || 0;
							seriesCounts = existingPlaylist.streams.series?.length || 0;
						}

						console.log('[BROWSER STORAGE DEBUG] 📊 Cached playlist details:', {
							playlistId: playlistStoreId,
							name: existingPlaylist._meta?.name || 'Unknown',
							liveCounts,
							vodCounts,
							seriesCounts,
							totalChannels: liveCounts + vodCounts + seriesCounts,
							loadedAt: existingPlaylist._meta?.loadedAt ? new Date(existingPlaylist._meta.loadedAt).toLocaleString() : 'Unknown',
							hasCategorizedStreams: !!(existingPlaylist.categorizedStreams),
							hasOldStreams: !!(existingPlaylist.streams),
							hasCategories: !!(existingPlaylist.categories)
						});
						console.log('[BROWSER STORAGE DEBUG] ✅ Using cached data from browser storage - no network request needed');
						set({ globalLoading: false });
						return {
							success: true,
							data: existingPlaylist,
							cached: true
						};
					}

					// Load fresh data
					console.log('[Playlist Store] Loading fresh data');
					const result = await get().loadPlaylistData({
						baseUrl: playlist.url,
						username: playlist.username,
						password: playlist.password,
						name: playlist.name
					});

					set({ globalLoading: false });
					return result;

				} catch (error) {
					console.error('[Playlist Store] Error loading default:', error);
					set({
						globalLoading: false,
						error: error.message || 'Failed to load default playlist'
					});

					return {
						success: false,
						message: error.message || 'Failed to load default playlist'
					};
				}
			},

			refreshPlaylistData: async (playlistId) => {
				const playlist = get().playlists[playlistId];
				if (!playlist?._meta) {
					return { success: false, message: 'Playlist not found' };
				}

				console.log(`[Playlist Store] Refreshing: ${playlist._meta.name}`);
				return get().loadPlaylistData(playlist._meta);
			},

			removePlaylist: (playlistId) => {
				console.log(`[Playlist Store] Removing: ${playlistId}`);

				set(state => {
					const { [playlistId]: removed, ...remainingPlaylists } = state.playlists;
					const { [playlistId]: removedLoading, ...remainingLoading } = state.loadingStates;

					return {
						...state,
						playlists: remainingPlaylists,
						loadingStates: remainingLoading,
						defaultPlaylistId: state.defaultPlaylistId === playlistId ? null : state.defaultPlaylistId
					};
				});
			},

			setDefaultPlaylist: (playlistId) => {
				set(state => ({ ...state, defaultPlaylistId: playlistId }));
			},

			cleanupOrphanedPlaylists: (validServerPlaylists) => {
				const validIds = new Set(
					validServerPlaylists.map(p => `${p.url}|${p.username}`)
				);

				const state = get();
				const currentIds = Object.keys(state.playlists);
				let removed = 0;

				const newPlaylists = { ...state.playlists };
				const newLoading = { ...state.loadingStates };

				currentIds.forEach(id => {
					if (!validIds.has(id)) {
						delete newPlaylists[id];
						delete newLoading[id];
						removed++;
					}
				});

				if (removed > 0) {
					console.log(`[Playlist Store] Cleaned up ${removed} orphaned playlists`);
					set(state => ({
						...state,
						playlists: newPlaylists,
						loadingStates: newLoading
					}));
				}

				return Object.keys(newPlaylists).length;
			},

			// Clear all data
			clearAll: () => {
				console.log('[Playlist Store] Clearing all data');
				set(state => ({
					...state,
					playlists: {},
					loadingStates: {},
					defaultPlaylistId: null,
					error: null,
					globalLoading: false,
					failedPlaylistIds: new Set()
				}));
			},

			clearError: () => set(state => ({ ...state, error: null })),

			// Clear failed playlist cache (useful for retry scenarios)
			clearFailedPlaylistCache: () => {
				set(state => ({ ...state, failedPlaylistIds: new Set() }));
			},

			clearLoadingState: (playlistId) => {
				set(state => {
					const { [playlistId]: removed, ...remainingLoading } = state.loadingStates;
					return { ...state, loadingStates: remainingLoading };
				});
			}
		}),
		{
			name: 'playlist-store-v5', // Updated for categorized streams
			storage: createJSONStorage(() => localforage),
			// Only persist essential data - let proxy JSON structure handle the rest
			partialize: (state) => ({
				playlists: state.playlists, // Store complete proxy data directly
				defaultPlaylistId: state.defaultPlaylistId
				// Do NOT persist failedPlaylistIds - let each session start fresh
			}),
			// Simple rehydration
			onRehydrateStorage: () => (state, error) => {
				if (error) {
					console.error('[BROWSER STORAGE DEBUG] ❌ Error during rehydration:', error);
					return;
				}
				
				if (state) {
					console.log('[BROWSER STORAGE DEBUG] 🔄 Starting rehydration from browser storage');
					console.log('[BROWSER STORAGE DEBUG] 📦 Raw state from storage:', state);
					
					// Ensure playlists is an object
					if (!state.playlists || typeof state.playlists !== 'object') {
						console.warn('[BROWSER STORAGE DEBUG] ⚠️ Invalid playlists data, resetting');
						state.playlists = {};
					} else {
						console.log('[BROWSER STORAGE DEBUG] ✅ Valid playlists object found in storage');
						console.log('[BROWSER STORAGE DEBUG] 📋 Playlist IDs from storage:', Object.keys(state.playlists));
						
						// Log details about each stored playlist
						Object.entries(state.playlists).forEach(([id, playlist]) => {
							// Calculate counts from available structure
							let liveCounts = 0, vodCounts = 0, seriesCounts = 0;
							if (playlist?.categorizedStreams) {
								liveCounts = playlist.categorizedStreams.live?.reduce((sum, cat) => sum + cat.streamCount, 0) || 0;
								vodCounts = playlist.categorizedStreams.vod?.reduce((sum, cat) => sum + cat.streamCount, 0) || 0;
								seriesCounts = playlist.categorizedStreams.series?.reduce((sum, cat) => sum + cat.streamCount, 0) || 0;
							} else if (playlist?.streams) {
								liveCounts = playlist.streams.live?.length || 0;
								vodCounts = playlist.streams.vod?.length || 0;
								seriesCounts = playlist.streams.series?.length || 0;
							}

							console.log(`[BROWSER STORAGE DEBUG] 📺 Playlist "${id}":`, {
								hasCategorizedStreams: !!(playlist?.categorizedStreams),
								hasOldStreams: !!(playlist?.streams),
								liveCounts,
								vodCounts,
								seriesCounts,
								hasMetadata: !!(playlist?._meta),
								playlistName: playlist?._meta?.name || 'Unknown',
								loadedAt: playlist?._meta?.loadedAt ? new Date(playlist._meta.loadedAt).toLocaleString() : 'Unknown'
							});
						});
					}

					console.log(`[BROWSER STORAGE DEBUG] 🎯 Successfully rehydrated ${Object.keys(state.playlists).length} playlists from browser storage`);
					console.log('[BROWSER STORAGE DEBUG] 🏁 Default playlist ID from storage:', state.defaultPlaylistId);
					
					// Set hydrated flag and reset runtime state - do this after logging
					state.isHydrated = true;
					state.loadingStates = {};
					state.error = null;
					state.globalLoading = false;
					state.failedPlaylistIds = new Set(); // Reset failed IDs on each session
					
					console.log('[BROWSER STORAGE DEBUG] 🔥 Setting isHydrated to true in store');
					
					// Add a timestamp to force component re-renders
					state._hydrationTimestamp = Date.now();
					console.log('[BROWSER STORAGE DEBUG] 🚀 Added hydration timestamp to force re-renders');
				} else {
					console.log('[BROWSER STORAGE DEBUG] ❌ No state found in browser storage - starting fresh');
				}
			}
		}
	)
);

export default usePlaylistStore;