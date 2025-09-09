'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Grid, List, getScrollbarSize } from 'react-window';
import { Tv, Film, MonitorSpeaker, Play } from 'lucide-react';

// Virtual Grid Component for handling large datasets
export default function VirtualContentGrid({ 
	channels = [], 
	viewMode = 'grid', 
	type = 'vod',
	searchQuery = '',
	selectedCategory = 'All',
	containerHeight = 600,
	containerWidth = '100%'
}) {
	const [imageErrors, setImageErrors] = useState(new Set());
	// Measure container width for react-window numeric width
	const hostRef = useRef(null);
	const [measuredWidth, setMeasuredWidth] = useState(0);
	useEffect(() => {
		if (!hostRef.current) return;
		const ro = new ResizeObserver((entries) => {
			const cr = entries[0]?.contentRect;
			if (cr?.width) setMeasuredWidth(Math.floor(cr.width));
		});
		ro.observe(hostRef.current);
		return () => ro.disconnect();
	}, []);

	// Handle image load errors
	const handleImageError = useCallback((streamId) => {
		setImageErrors(prev => new Set([...prev, streamId]));
	}, []);

	// Filter channels based on search and category
	const filteredChannels = useMemo(() => {
		let filtered = [...channels];

		// Apply search filter
		if (searchQuery?.trim()) {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter(channel => 
				channel.name?.toLowerCase().includes(query) ||
				channel.category_name?.toLowerCase().includes(query)
			);
		}

		// Apply category filter
		if (selectedCategory && selectedCategory !== 'All') {
			filtered = filtered.filter(channel => 
				channel.category_name === selectedCategory
			);
		}

		return filtered;
	}, [channels, searchQuery, selectedCategory]);

	// Grid/List configuration
	const config = useMemo(() => {
		if (viewMode === 'list') {
			return {
				isGrid: false,
				rowHeight: 80,
				itemsPerRow: 1
			};
		}

		// Grid mode - responsive columns
		const getColumnsForWidth = (width) => {
			if (width < 640) return 2;      // mobile: 2 columns
			if (width < 768) return 3;      // sm: 3 columns
			if (width < 1024) return 4;     // md: 4 columns
			if (width < 1280) return 5;     // lg: 5 columns
			return 6;                       // xl+: 6 columns
		};

		const containerWidthNum = typeof containerWidth === 'number' ? containerWidth : (measuredWidth || 1200);
		const columns = getColumnsForWidth(containerWidthNum);
		const itemWidth = Math.floor(containerWidthNum / columns) - 16;

		return {
			isGrid: true,
			columnCount: columns,
			columnWidth: itemWidth,
			rowHeight: itemWidth * 1.4 + 60, // Aspect ratio + text height
			itemsPerRow: columns
		};
	}, [viewMode, containerWidth, measuredWidth]);

	// Calculate total rows needed for grid mode
	const rowCount = config.isGrid 
		? Math.ceil((filteredChannels?.length || 0) / (config.itemsPerRow || 1))
		: (filteredChannels?.length || 0);

	// Show message if no content or if essential props are missing
	if (!filteredChannels || filteredChannels.length === 0 || !config) {
		return (
			<div className="h-full flex items-center justify-center p-6">
				<EmptyState 
					type={type}
					category={selectedCategory}
					searchQuery={searchQuery}
				/>
			</div>
		);
	}

	// Ensure all required props are valid numbers
	const safeContainerHeight = typeof containerHeight === 'number' && containerHeight > 0 ? containerHeight : 600;
	const safeColumnCount = typeof config.columnCount === 'number' && config.columnCount > 0 ? config.columnCount : 1;
	const safeColumnWidth = typeof config.columnWidth === 'number' && config.columnWidth > 0 ? config.columnWidth : 200;
	const safeRowHeight = typeof config.rowHeight === 'number' && config.rowHeight > 0 ? config.rowHeight : 200;
	const safeRowCount = typeof rowCount === 'number' && rowCount > 0 ? rowCount : 1;

	const widthReady = measuredWidth > 0 || (typeof containerWidth === 'number' && containerWidth > 0);
	const listWidth = typeof containerWidth === 'number' ? containerWidth : measuredWidth;

	return (
		<div ref={hostRef} className="h-full w-full">
			{widthReady ? (
				config.isGrid ? (
					<Grid
						cellComponent={GridCellComponent}
						cellProps={{
							channels: filteredChannels,
							type,
							imageErrors,
							handleImageError,
							itemsPerRow: config.itemsPerRow
						}}
						columnCount={safeColumnCount}
						columnWidth={safeColumnWidth}
						rowCount={safeRowCount}
						rowHeight={safeRowHeight}
						height={safeContainerHeight}
						width={listWidth}
					/>
				) : (
					<List
						rowComponent={ListRowComponent}
						rowProps={{
							channels: filteredChannels,
							type,
							imageErrors,
							handleImageError
						}}
						rowCount={filteredChannels.length}
						rowHeight={safeRowHeight}
						height={safeContainerHeight}
						width={listWidth}
					/>
				)
			) : (
				<div className="h-full w-full flex items-center justify-center">
					<div className="text-neutral-400">Measuring container...</div>
				</div>
			)}
		</div>
	);
}

// Row renderer for List
function ListRowComponent({ index, style, channels, type, imageErrors, handleImageError }) {
	const channel = channels[index];
	if (!channel) return <div style={style} />;
	const hasImageError = imageErrors.has(channel.stream_id || channel.id);
	return (
		<div style={style}>
			<ChannelListItem 
				channel={channel} 
				type={type}
				hasImageError={hasImageError}
				onImageError={() => handleImageError(channel.stream_id || channel.id)}
			/>
		</div>
	);
}

// Cell renderer for Grid
function GridCellComponent({ columnIndex, rowIndex, style, channels, itemsPerRow, type, imageErrors, handleImageError }) {
	const itemIndex = rowIndex * (itemsPerRow || 1) + columnIndex;
	const channel = channels[itemIndex];
	if (!channel) return <div style={style} />;
	const hasImageError = imageErrors.has(channel.stream_id || channel.id);
	return (
		<div style={style} className="p-2">
			<ChannelGridItem 
				channel={channel} 
				type={type}
				hasImageError={hasImageError}
				onImageError={() => handleImageError(channel.stream_id || channel.id)}
			/>
		</div>
	);
}

// Channel Grid Item Component
function ChannelGridItem({ channel, type, hasImageError, onImageError }) {
	return (
		<div className="bg-neutral-900 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-all cursor-pointer group overflow-hidden h-full">
			<div className="aspect-video bg-neutral-800 relative overflow-hidden">
				{channel.stream_icon && !hasImageError ? (
					<img
						src={channel.stream_icon}
						alt={channel.name}
						className="w-full h-full object-cover"
						onError={onImageError}
						loading="lazy"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						{type === 'live' && <Tv className="w-8 h-8 text-neutral-600" />}
						{type === 'vod' && <Film className="w-8 h-8 text-neutral-600" />}
						{type === 'series' && <MonitorSpeaker className="w-8 h-8 text-neutral-600" />}
					</div>
				)}
				
				<div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
					<Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
				</div>
			</div>
			
			<div className="p-3">
				<h3 className="font-medium text-white text-sm line-clamp-2 mb-1">
					{channel.name}
				</h3>
				{channel.category_name && (
					<p className="text-xs text-neutral-400 truncate">
						{channel.category_name}
					</p>
				)}
			</div>
		</div>
	);
}

// Channel List Item Component
function ChannelListItem({ channel, type, hasImageError, onImageError }) {
	return (
		<div className="flex items-center gap-4 p-3 bg-neutral-900 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-all cursor-pointer group mx-2 my-1">
			<div className="w-16 h-12 bg-neutral-800 rounded overflow-hidden flex-shrink-0">
				{channel.stream_icon && !hasImageError ? (
					<img
						src={channel.stream_icon}
						alt={channel.name}
						className="w-full h-full object-cover"
						onError={onImageError}
						loading="lazy"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						{type === 'live' && <Tv className="w-4 h-4 text-neutral-600" />}
						{type === 'vod' && <Film className="w-4 h-4 text-neutral-600" />}
						{type === 'series' && <MonitorSpeaker className="w-4 h-4 text-neutral-600" />}
					</div>
				)}
			</div>
			
			<div className="flex-1 min-w-0">
				<h3 className="font-medium text-white truncate">
					{channel.name}
				</h3>
				{channel.category_name && (
					<p className="text-sm text-neutral-400 truncate">
						{channel.category_name}
					</p>
				)}
			</div>
			
			<div className="flex-shrink-0">
				<Play className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
			</div>
		</div>
	);
}

// Empty State Component
function EmptyState({ type, category, searchQuery }) {
	return (
		<div className="text-center max-w-md">
			<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
				{type === 'live' && <Tv className="w-8 h-8 text-neutral-600" />}
				{type === 'vod' && <Film className="w-8 h-8 text-neutral-600" />}
				{type === 'series' && <MonitorSpeaker className="w-8 h-8 text-neutral-600" />}
			</div>
			
			<h3 className="text-lg font-semibold text-white mb-2">
				No {type} content found
			</h3>
			
			<p className="text-neutral-400 text-sm">
				{searchQuery ? (
					`No results for "${searchQuery}"`
				) : category !== 'All' ? (
					`No ${type} content in "${category}" category`
				) : (
					`No ${type} content available in this playlist`
				)}
			</p>
		</div>
	);
}
