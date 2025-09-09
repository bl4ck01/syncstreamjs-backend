'use client';

import { Loader2, Play, Tv, Film, MonitorSpeaker } from 'lucide-react';

export default function PlaylistLoading({ 
	message = "Loading playlist data...", 
	showAnalytics = false 
}) {
	return (
		<div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-neutral-950 text-white">
			{/* Main Loading Animation */}
			<div className="relative mb-8">
				<div className="absolute inset-0 rounded-full border-4 border-neutral-800 animate-pulse"></div>
				<div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-white" />
				</div>
			</div>

			{/* Loading Message */}
			<div className="text-center mb-8">
				<h3 className="text-lg font-semibold text-white mb-2">
					{message}
				</h3>
				<p className="text-sm text-neutral-400">
					This may take a few moments...
				</p>
			</div>

			{/* Analytics Preview (when enabled) */}
			{showAnalytics && (
				<div className="grid grid-cols-3 gap-4 w-full max-w-md">
					{[
						{ icon: Tv, label: "Live Channels", loading: true },
						{ icon: Film, label: "Movies", loading: true },
						{ icon: MonitorSpeaker, label: "Series", loading: true }
					].map((item, index) => (
						<div key={index} className="bg-neutral-900 rounded-lg p-4 text-center">
							<div className="flex justify-center mb-2">
								<item.icon className="w-6 h-6 text-neutral-500" />
							</div>
							<div className="space-y-2">
								<div className="h-6 bg-neutral-800 rounded animate-pulse"></div>
								<div className="text-xs text-neutral-500">{item.label}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// Skeleton component for playlist content
export function PlaylistSkeleton() {
	return (
		<div className="space-y-6 p-6">
			{/* Header Skeleton */}
			<div className="space-y-4">
				<div className="h-8 bg-neutral-800 rounded-md w-1/3 animate-pulse"></div>
				<div className="h-4 bg-neutral-800 rounded w-1/2 animate-pulse"></div>
			</div>

			{/* Analytics Grid Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="bg-neutral-900 rounded-lg p-4">
						<div className="space-y-3">
							<div className="h-8 bg-neutral-800 rounded animate-pulse"></div>
							<div className="h-4 bg-neutral-800 rounded w-2/3 animate-pulse"></div>
							<div className="h-3 bg-neutral-800 rounded w-1/2 animate-pulse"></div>
						</div>
					</div>
				))}
			</div>

			{/* Categories List Skeleton */}
			<div className="space-y-4">
				<div className="h-6 bg-neutral-800 rounded w-1/4 animate-pulse"></div>
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center space-x-3 p-3 bg-neutral-900 rounded-lg">
							<div className="w-12 h-12 bg-neutral-800 rounded animate-pulse"></div>
							<div className="flex-1 space-y-2">
								<div className="h-4 bg-neutral-800 rounded w-3/4 animate-pulse"></div>
								<div className="h-3 bg-neutral-800 rounded w-1/2 animate-pulse"></div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// Error state component
export function PlaylistError({ 
	message = "Failed to load playlist", 
	onRetry, 
	details 
}) {
	return (
		<div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-neutral-950 text-white p-6">
			<div className="text-center max-w-md">
				<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
					<Play className="w-8 h-8 text-red-500" />
				</div>

				<h3 className="text-lg font-semibold text-white mb-2">
					{message}
				</h3>

				{details && (
					<p className="text-sm text-neutral-400 mb-4">
						{details}
					</p>
				)}

				{onRetry && (
					<button
						onClick={onRetry}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
					>
						Try Again
					</button>
				)}
			</div>
		</div>
	);
}
