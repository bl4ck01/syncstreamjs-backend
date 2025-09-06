"use client";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { 
    CheckIcon, 
    Users, 
    Tv, 
    Shield, 
    Download, 
    Headphones, 
    Smartphone, 
    PartyPopper,
    Zap,
    Star,
    Timer,
    Crown
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/server/actions";
import { useRouter } from "next/navigation";

// Map features to their icons
const featureIcons = {
    profiles: Users,
    cineParty: PartyPopper,
    recordLive: Tv,
    download: Download,
    parentalControls: Shield,
    syncDevices: Smartphone,
    support: Headphones,
    trial: Timer
};

export default function PricingEnhanced({ plans = [] }) {
    const [billPlan, setBillPlan] = useState("monthly");
    const router = useRouter();

    // Check if lifetime plan is available
    const hasLifetimePlan = plans.some(plan => plan.is_lifetime_available);

    return (
        <div className="relative flex flex-col items-center justify-center max-w-7xl py-12 px-4 mx-auto min-h-screen">
            <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-white"
                    >
                        Choose Your Plan
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-sm md:text-base text-center text-gray-400 mt-3"
                    >
                        Stream your favorite content with flexible plans designed for everyone.
                    </motion.p>
                </div>

                {/* Custom Animated Toggle */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-6 relative"
                >
                    <div className="flex items-center bg-zinc-900/50 backdrop-blur-sm rounded-full p-1 border border-zinc-800">
                        <button
                            onClick={() => setBillPlan("monthly")}
                            className={cn(
                                "relative z-10 px-5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2",
                                billPlan === "monthly" ? "text-white" : "text-gray-400 hover:text-gray-300"
                            )}
                        >
                            Monthly
                            {billPlan === "monthly" && (
                                <motion.div
                                    layoutId="toggle-indicator"
                                    className="absolute inset-0 bg-rose-600 rounded-full -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => setBillPlan("annually")}
                            className={cn(
                                "relative z-10 px-5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200",
                                billPlan === "annually" ? "text-white" : "text-gray-400 hover:text-gray-300"
                            )}
                        >
                            Annually
                            {billPlan === "annually" && (
                                <motion.div
                                    layoutId="toggle-indicator"
                                    className="absolute inset-0 bg-rose-600 rounded-full -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                        {hasLifetimePlan && (
                            <button
                                onClick={() => setBillPlan("lifetime")}
                                className={cn(
                                    "relative z-10 px-5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-1",
                                    billPlan === "lifetime" ? "text-white" : "text-gray-400 hover:text-gray-300"
                                )}
                            >
                                <Zap className="w-3 h-3" />
                                Lifetime
                                {billPlan === "lifetime" && (
                                    <motion.div
                                        layoutId="toggle-indicator"
                                        className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>

            <div className={cn(
                "grid w-full pt-8 gap-4 lg:gap-6 max-w-6xl mx-auto",
                plans.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
            )}>
                {plans.map((plan, idx) => (
                    <Plan key={plan.id} plan={plan} billPlan={billPlan} index={idx} router={router} />
                ))}
            </div>
        </div>
    );
}

const Plan = ({ plan, billPlan, index, router }) => {
    const [isLoading, setIsLoading] = useState(false);

    // Check if this plan has lifetime and we're showing lifetime
    const isLifetimePlan = plan.is_lifetime_available && billPlan === "lifetime";
    const isLifetimeEligible = plan.is_lifetime_available;

    // Calculate prices
    const monthlyPrice = Number(plan.price_monthly);
    const yearlyPrice = Number(plan.price_annual);
    const lifetimePrice = Number(plan.price_lifetime || 0);
    const yearlyMonthlyEquivalent = yearlyPrice / 12;

    // Current price logic
    let currentPrice;
    let priceLabel;
    let showStrikethrough = false;
    
    if (billPlan === "lifetime" && isLifetimeEligible) {
        currentPrice = lifetimePrice;
        priceLabel = "one-time";
        showStrikethrough = true; // Show monthly price as strikethrough
    } else if (billPlan === "annually") {
        currentPrice = yearlyMonthlyEquivalent;
        priceLabel = "/mo";
        showStrikethrough = yearlyMonthlyEquivalent < monthlyPrice;
    } else {
        currentPrice = monthlyPrice;
        priceLabel = "/mo";
    }

    // Transform features based on plan capabilities
    const getFeatures = () => {
        const features = [];

        // Profiles
        if (plan.max_profiles === 1) {
            features.push({ icon: featureIcons.profiles, text: "1 user profile" });
        } else {
            features.push({ icon: featureIcons.profiles, text: `Up to ${plan.max_profiles} user profiles` });
        }

        // Feature flags
        if (plan.cine_party) {
            features.push({ icon: featureIcons.cineParty, text: "Watch party feature" });
        }

        if (plan.record_live_tv) {
            features.push({ icon: featureIcons.recordLive, text: "Record live TV" });
        }

        if (plan.download_offline_viewing) {
            features.push({ icon: featureIcons.download, text: "Download for offline viewing" });
        }

        if (plan.parental_controls) {
            features.push({ icon: featureIcons.parentalControls, text: "Parental controls" });
        }

        if (plan.sync_data_across_devices) {
            features.push({ icon: featureIcons.syncDevices, text: "Sync across all devices" });
        }

        // Support level
        const supportLevels = {
            'email': 'Email support',
            'email_chat': 'Email & chat support',
            'priority_24_7': '24/7 priority support'
        };
        features.push({ icon: featureIcons.support, text: supportLevels[plan.support_level] || 'Email support' });

        // Trial days
        if (plan.trial_days > 0 && !isLifetimePlan) {
            features.push({ icon: featureIcons.trial, text: `${plan.trial_days}-day free trial` });
        }

        // Lifetime special feature
        if (isLifetimePlan) {
            features.push({ icon: Crown, text: "Lifetime access - Never pay again!" });
        }

        return features;
    };

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            const response = await createCheckoutSession(plan.id);
            if (response.success && response.data?.checkout_url) {
                window.location.href = response.data.checkout_url;
            } else {
                console.error('Failed to create checkout session:', response.message);
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            className="group h-full"
        >
            <div className={cn(
                "relative flex flex-col h-full rounded-2xl backdrop-blur-sm border overflow-hidden transition-all duration-300",
                isLifetimePlan 
                    ? "bg-gradient-to-br from-yellow-900/20 via-orange-900/20 to-red-900/20 border-yellow-500/50 hover:border-yellow-400 shadow-2xl" 
                    : "bg-zinc-900/30 border-zinc-800 hover:border-rose-500/50"
            )}>
                {/* Limited Time Badge for Lifetime Plan */}
                {isLifetimePlan && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20"
                    >
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1 shadow-lg">
                            <Timer className="w-3 h-3" />
                            LIMITED TIME OFFER
                        </div>
                    </motion.div>
                )}

                {/* Plan content */}
                <div className="relative p-6 text-center">
                    {/* Price */}
                    <div className="mb-1">
                        {showStrikethrough && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-2xl text-gray-500 line-through mb-2"
                            >
                                ${monthlyPrice.toFixed(2)}/mo
                            </motion.div>
                        )}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                                "text-6xl md:text-7xl font-bold flex items-baseline justify-center gap-2",
                                isLifetimePlan ? "text-yellow-400" : "text-white"
                            )}
                        >
                            <span className="text-4xl md:text-5xl">$</span>
                            <NumberFlow
                                value={currentPrice}
                                format={{
                                    style: "decimal",
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }}
                                transformTiming={{ duration: 800, easing: 'ease-out' }}
                                spinTiming={{ duration: 800, easing: 'ease-in-out' }}
                                opacityTiming={{ duration: 400, easing: 'ease-in' }}
                                respectMotionPreference={false}
                            />
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={billPlan}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-2xl md:text-3xl text-gray-400"
                                >
                                    {priceLabel === "one-time" ? "" : priceLabel}
                                </motion.span>
                            </AnimatePresence>
                        </motion.div>
                        {priceLabel === "one-time" && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-yellow-400 font-semibold mt-1"
                            >
                                One-time payment
                            </motion.p>
                        )}
                    </div>

                    <h3 className={cn(
                        "text-2xl font-semibold mb-2",
                        isLifetimePlan ? "text-yellow-400" : "text-white"
                    )}>
                        {plan.name}
                        {isLifetimePlan && (
                            <span className="ml-2 inline-flex">
                                <Star className="w-5 h-5 fill-yellow-400" />
                            </span>
                        )}
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">
                        {isLifetimePlan 
                            ? "Get lifetime access at an incredible price!" 
                            : (plan.name === 'Basic' ? 'Perfect for individual users' : 'Ideal for families')
                        }
                    </p>

                    {/* CTA Button */}
                    <Button
                        size="lg"
                        className={cn(
                            "w-full font-medium rounded-lg transition-all duration-200 text-lg py-6",
                            isLifetimePlan 
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black animate-pulse"
                                : "bg-rose-600 hover:bg-rose-700 text-white"
                        )}
                        onClick={handleSubscribe}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : (
                            isLifetimePlan 
                                ? "Get Lifetime Access Now!" 
                                : (plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : "Get Started")
                        )}
                    </Button>

                    <AnimatePresence mode="wait">
                        <motion.span
                            key={billPlan}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="text-sm text-center text-muted-foreground mt-3 mx-auto block"
                        >
                            {billPlan === "monthly" ? (
                                "Billed monthly"
                            ) : billPlan === "annually" ? (
                                `Billed $${yearlyPrice.toFixed(2)} annually`
                            ) : isLifetimePlan ? (
                                <span className="text-yellow-400 font-medium">Save ${(monthlyPrice * 12 - lifetimePrice).toFixed(2)} vs yearly!</span>
                            ) : (
                                "Select lifetime option above"
                            )}
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Features list */}
                <div className="px-6 pb-6 flex-grow">
                    <h4 className="text-base font-medium text-white mb-4">What's included:</h4>
                    <ul className="space-y-3">
                        {getFeatures().map((feature, idx) => {
                            const IconComponent = feature.icon;
                            return (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.4 + idx * 0.03 }}
                                    className="flex items-center gap-3"
                                >
                                    <IconComponent className={cn(
                                        "w-5 h-5 flex-shrink-0",
                                        isLifetimePlan && feature.icon === Crown 
                                            ? "text-yellow-400" 
                                            : "text-green-500"
                                    )} />
                                    <span className="text-sm text-gray-300">{feature.text}</span>
                                </motion.li>
                            );
                        })}
                    </ul>
                </div>

                {/* Lifetime plan special effects */}
                {isLifetimePlan && (
                    <>
                        {/* Animated border gradient */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 opacity-20 blur-xl animate-pulse" />
                        
                        {/* Corner sparkles */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute top-4 right-4"
                        >
                            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </motion.div>
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.5
                            }}
                            className="absolute bottom-4 left-4"
                        >
                            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </motion.div>
                    </>
                )}
            </div>
        </motion.div>
    );
};