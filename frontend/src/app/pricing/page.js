import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Users, Star, Crown, Check, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Particles } from '@/components/ui/shadcn-io/particles';
import { getPlans } from '@/server/actions';

export default async function Pricing() {
	const plans = await getPlans();
	
	// Sort plans by price for better display
	const sortedPlans = plans?.data?.sort((a, b) => parseFloat(a.price_monthly) - parseFloat(b.price_monthly)) || [];
	
	// Get the top 4 plans for the pricing table
	const displayPlans = sortedPlans.slice(0, 4);
	
	// Map plan names to icons
	const getPlanIcon = (planName) => {
		const name = planName.toLowerCase();
		if (name.includes('free')) return Shield;
		if (name.includes('starter') || name.includes('basic')) return Users;
		if (name.includes('family') || name.includes('premium')) return Star;
		if (name.includes('business')) return Crown;
		return Zap;
	};
	
	// Map plan names to badges
	const getPlanBadge = (planName) => {
		const name = planName.toLowerCase();
		if (name.includes('free')) return 'Free Forever';
		if (name.includes('starter')) return 'Most Popular';
		if (name.includes('basic')) return 'Best Value';
		if (name.includes('family')) return 'For Families';
		if (name.includes('premium')) return 'Premium';
		if (name.includes('business')) return 'Enterprise';
		return 'Popular';
	};

	return (
		<div className="relative min-h-screen overflow-hidden bg-black">
			{/* Particles Background */}
			<Particles
				className="absolute inset-0"
				quantity={100}
				ease={80}
				color="#ef4444"
				size={0.4}
				particlesDensity={0.5}
			/>
			
			{/* Content */}
			<div className="relative z-10 px-4 py-20">
				{/* Header */}
				<div className="mx-auto max-w-4xl text-center mb-16">
					<h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
						Choose Your{' '}
						<span className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 bg-clip-text text-transparent">
							Perfect Plan
						</span>
					</h1>
					<p className="text-xl text-gray-300 max-w-2xl mx-auto">
						Unlock unlimited IPTV streaming with our flexible pricing plans. 
						Start free and upgrade anytime.
					</p>
				</div>

				{/* Pricing Cards */}
				<div className="mx-auto max-w-7xl">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
						{displayPlans.map((plan, index) => {
							const Icon = getPlanIcon(plan.name);
							const isPopular = index === 1; // Second plan is popular
							
							return (
								<PricingCard
									key={plan.id}
									plan={plan}
									icon={Icon}
									badge={getPlanBadge(plan.name)}
									isPopular={isPopular}
								/>
							);
						})}
					</div>
				</div>

				{/* Features Section */}
				<div className="mx-auto max-w-4xl mt-20">
					<h2 className="text-3xl font-bold text-white text-center mb-12">
						All plans include
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{ALL_FEATURES.map((feature, index) => (
							<div key={index} className="flex items-center space-x-3 text-gray-300">
								<Check className="h-5 w-5 text-rose-500 flex-shrink-0" />
								<span>{feature}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function PricingCard({ plan, icon: Icon, badge, isPopular }) {
	const features = getPlanFeatures(plan);
	
	return (
		<div className="relative group">
			{/* Animated Border */}
			<div className={cn(
				"absolute inset-0 rounded-2xl p-[2px]",
				isPopular 
					? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600" 
					: "bg-gradient-to-r from-gray-600 to-gray-700"
			)}>
				<div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-spin-slow" />
				<div className="absolute inset-[1px] rounded-2xl bg-black" />
			</div>
			
			{/* Card Content */}
			<Card className={cn(
				"relative bg-black/80 backdrop-blur-sm border-gray-800 h-full",
				isPopular && "border-rose-500/50"
			)}>
				<CardHeader className="text-center pb-4">
					{/* Badge */}
					{badge && (
						<Badge 
							variant={isPopular ? "default" : "secondary"}
							className={cn(
								"w-fit mx-auto mb-4",
								isPopular && "bg-rose-500 hover:bg-rose-600"
							)}
						>
							{badge}
						</Badge>
					)}
					
					{/* Icon */}
					<div className={cn(
						"w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
						isPopular 
							? "bg-gradient-to-r from-rose-500 to-pink-500" 
							: "bg-gray-800"
					)}>
						<Icon className={cn(
							"h-8 w-8",
							isPopular ? "text-white" : "text-gray-400"
						)} />
					</div>
					
					{/* Plan Name */}
					<CardTitle className="text-2xl font-bold text-white">
						{plan.name}
					</CardTitle>
					
					{/* Price */}
					<div className="mt-4">
						<span className="text-4xl font-bold text-white">
							${plan.price_monthly}
						</span>
						<span className="text-gray-400 ml-2">/month</span>
					</div>
					
					<CardDescription className="text-gray-400 mt-2">
						{plan.price_monthly === "0.00" ? "Perfect for getting started" : "Billed monthly"}
					</CardDescription>
				</CardHeader>
				
				<CardContent className="pt-0">
					{/* Features */}
					<ul className="space-y-3 mb-8">
						{features.map((feature, index) => (
							<li key={index} className="flex items-center space-x-3 text-gray-300">
								<Check className="h-4 w-4 text-rose-500 flex-shrink-0" />
								<span className="text-sm">{feature}</span>
							</li>
						))}
					</ul>
					
					{/* CTA Button */}
					<Button 
						className={cn(
							"w-full",
							isPopular 
								? "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white" 
								: "bg-gray-800 hover:bg-gray-700 text-white"
						)}
						size="lg"
					>
						{plan.price_monthly === "0.00" ? "Get Started Free" : "Choose Plan"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function getPlanFeatures(plan) {
	const features = [];
	
	// Basic features
	features.push(`${plan.max_profiles === -1 ? 'Unlimited' : plan.max_profiles} Profile${plan.max_profiles !== 1 ? 's' : ''}`);
	features.push(`${plan.max_playlists === -1 ? 'Unlimited' : plan.max_playlists} Playlist${plan.max_playlists !== 1 ? 's' : ''}`);
	features.push(`${plan.max_favorites === -1 ? 'Unlimited' : plan.max_favorites} Favorite${plan.max_favorites !== 1 ? 's' : ''}`);
	
	// Quality features
	if (plan.features?.hd) features.push('HD Quality Streaming');
	if (plan.features?.['4k']) features.push('4K Ultra HD Quality');
	
	// Ad features
	if (!plan.features?.ads) features.push('Ad-Free Experience');
	
	// Trial features
	if (plan.features?.trial) {
		features.push(`${plan.features.trial_days || 7}-Day Free Trial`);
	}
	
	// Support features
	if (plan.features?.priority_support) {
		features.push('Priority Support');
	}
	
	return features;
}

const ALL_FEATURES = [
	'Access to thousands of channels',
	'Multi-device streaming',
	'Offline downloads',
	'Parental controls',
	'Cloud DVR',
	'24/7 customer support',
	'Regular content updates',
	'Cross-platform compatibility',
	'High-quality streaming',
	'Multiple language support',
	'Custom playlists',
	'Favorites management'
];