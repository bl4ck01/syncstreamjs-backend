'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePlaylistStore } from '@/store/playlist';

export default function PlaylistAnalytics({ playlistId }) {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState([]);
	const [loading, setLoading] = useState(false);

	const { getPlaylistCounts, searchChannels } = usePlaylistStore();

	// Get counts from store
	const counts = useMemo(() => {
		if (!playlistId) return null;
		return getPlaylistCounts(playlistId);
	}, [playlistId, getPlaylistCounts]);

	// Handle search
	const handleSearch = async (e) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;

		setLoading(true);
		try {
			const results = searchChannels(searchQuery, playlistId);
			setSearchResults(results);
		} catch (error) {
			console.error('Search failed:', error);
			setSearchResults([]);
		} finally {
			setLoading(false);
		}
	};

	if (!counts) {
		return (
			<div className="p-4 bg-neutral-900 rounded-lg">
				<p className="text-neutral-400">Loading analytics...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Analytics Overview */}
			<div className="bg-neutral-900 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-white mb-4">Playlist Analytics</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="bg-neutral-800 rounded-lg p-4">
						<div className="text-2xl font-bold text-white">
							{counts.totalLive.toLocaleString()}
						</div>
						<div className="text-sm text-neutral-400">
							Live Channels
						</div>
						<div className="text-xs text-neutral-500 mt-1">
							{counts.liveCategories?.length || 0} categories
						</div>
					</div>
					
					<div className="bg-neutral-800 rounded-lg p-4">
						<div className="text-2xl font-bold text-white">
							{counts.totalVod.toLocaleString()}
						</div>
						<div className="text-sm text-neutral-400">
							Movies (VOD)
						</div>
						<div className="text-xs text-neutral-500 mt-1">
							{counts.vodCategories?.length || 0} categories
						</div>
					</div>
					
					<div className="bg-neutral-800 rounded-lg p-4">
						<div className="text-2xl font-bold text-white">
							{counts.totalSeries.toLocaleString()}
						</div>
						<div className="text-sm text-neutral-400">
							TV Series
						</div>
						<div className="text-xs text-neutral-500 mt-1">
							{counts.seriesCategories?.length || 0} categories
						</div>
					</div>
				</div>
				
				{counts.lastUpdated && (
					<div className="mt-4 text-xs text-neutral-500">
						Last updated: {new Date(counts.lastUpdated).toLocaleString()}
					</div>
				)}
			</div>

			{/* Search Interface */}
			<div className="bg-neutral-900 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-white mb-4">Search Channels</h3>
				
				<form onSubmit={handleSearch} className="flex gap-2 mb-4">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search channels..."
						className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder:text-neutral-400"
					/>
					<button
						type="submit"
						disabled={loading}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded transition-colors"
					>
						{loading ? 'Searching...' : 'Search'}
					</button>
				</form>

				{/* Search Results */}
				{searchResults.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-sm font-medium text-white">
							Found {searchResults.length} channels
						</h4>
						<div className="max-h-60 overflow-y-auto space-y-1">
							{searchResults.map((channel, index) => (
								<div
									key={`${channel.stream_id || channel.id}-${index}`}
									className="flex items-center gap-3 p-2 bg-neutral-800 rounded text-sm"
								>
									{channel.stream_icon && (
										<img
											src={channel.stream_icon}
											alt=""
											className="w-8 h-8 rounded object-cover"
											onError={(e) => e.target.style.display = 'none'}
										/>
									)}
									<div className="flex-1">
										<div className="text-white font-medium">{channel.name}</div>
										<div className="text-neutral-400 text-xs">
											{channel.playlistName && `${channel.playlistName} • `}
											Category: {channel.category_name || 'None'}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
