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
    Crown,
    Sparkles
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
    trial: Timer,
    lifetime: Crown
};

export default function PricingLifetime({ plans = [] }) {
    const [billPlan, setBillPlan] = useState("monthly");
    const router = useRouter();

    // Separate lifetime plans from regular plans
    const regularPlans = plans.filter(plan => !plan.is_lifetime);
    const lifetimePlans = plans.filter(plan => plan.is_lifetime);

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

                {/* Custom Animated Toggle for regular plans only */}
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
                    </div>
                </motion.div>
            </div>

            {/* Limited Time Badge if lifetime plans exist */}
            {lifetimePlans.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-8 mb-4 text-center"
                >
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-full px-4 py-2">
                        <Timer className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-semibold text-sm">LIMITED TIME OFFER AVAILABLE</span>
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                    </div>
                </motion.div>
            )}

            <div className={cn(
                "grid w-full pt-8 gap-4 lg:gap-6 max-w-6xl mx-auto",
                plans.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
                {/* Show regular plans first */}
                {regularPlans.map((plan, idx) => (
                    <Plan key={plan.id} plan={plan} billPlan={billPlan} index={idx} router={router} isLifetime={false} />
                ))}
                
                {/* Show lifetime plans after regular plans */}
                {lifetimePlans.map((plan, idx) => (
                    <Plan key={plan.id} plan={plan} billPlan={billPlan} index={regularPlans.length + idx} router={router} isLifetime={true} />
                ))}
            </div>
        </div>
    );
}

const Plan = ({ plan, billPlan, index, router, isLifetime }) => {
    const [isLoading, setIsLoading] = useState(false);

    // Calculate prices
    const monthlyPrice = Number(plan.price_monthly || 0);
    const yearlyPrice = Number(plan.price_annual || 0);
    const lifetimePrice = Number(plan.price_lifetime || 0);
    const yearlyMonthlyEquivalent = yearlyPrice / 12;

    // Current price logic
    let currentPrice;
    let priceLabel;
    let billingText;
    
    if (isLifetime) {
        currentPrice = lifetimePrice;
        priceLabel = "";
        billingText = "One-time payment - Never pay again!";
    } else if (billPlan === "annually") {
        currentPrice = yearlyMonthlyEquivalent;
        priceLabel = "/mo";
        billingText = `Billed $${yearlyPrice.toFixed(2)} annually`;
    } else {
        currentPrice = monthlyPrice;
        priceLabel = "/mo";
        billingText = "Billed monthly";
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
        if (plan.trial_days > 0 && !isLifetime) {
            features.push({ icon: featureIcons.trial, text: `${plan.trial_days}-day free trial` });
        }

        // Lifetime special feature
        if (isLifetime) {
            features.push({ icon: featureIcons.lifetime, text: "Lifetime access - Never pay again!" });
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

    // Calculate savings for lifetime plan
    const lifetimeSavings = isLifetime ? (monthlyPrice * 12 - lifetimePrice).toFixed(2) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            className="group h-full"
        >
            <div className={cn(
                "relative flex flex-col h-full rounded-2xl backdrop-blur-sm border overflow-hidden transition-all duration-300",
                isLifetime 
                    ? "bg-gradient-to-br from-yellow-900/20 via-orange-900/20 to-red-900/20 border-yellow-500/50 hover:border-yellow-400 shadow-2xl scale-105" 
                    : "bg-zinc-900/30 border-zinc-800 hover:border-rose-500/50"
            )}>
                {/* Limited Time Badge for Lifetime Plan */}
                {isLifetime && (
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

                {/* Most Popular Badge for Lifetime Plan */}
                {isLifetime && (
                    <div className="absolute top-4 right-4 z-10">
                        <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-white" />
                            BEST VALUE
                        </div>
                    </div>
                )}

                {/* Plan content */}
                <div className="relative p-6 text-center">
                    {/* Price */}
                    <div className="mb-1">
                        {isLifetime && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xl text-gray-400 mb-2"
                            >
                                <span className="text-gray-500 line-through">${(monthlyPrice * 12).toFixed(2)}/year</span>
                                <span className="text-yellow-400 font-bold ml-2">Save ${lifetimeSavings}!</span>
                            </motion.div>
                        )}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                                "text-6xl md:text-7xl font-bold flex items-baseline justify-center gap-2",
                                isLifetime ? "text-yellow-400" : "text-white"
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
                            {priceLabel && (
                                <span className="text-2xl md:text-3xl text-gray-400">
                                    {priceLabel}
                                </span>
                            )}
                        </motion.div>
                    </div>

                    <h3 className={cn(
                        "text-2xl font-semibold mb-2",
                        isLifetime ? "text-yellow-400" : "text-white"
                    )}>
                        {plan.name}
                        {isLifetime && (
                            <span className="ml-2 inline-flex">
                                <Crown className="w-6 h-6 fill-yellow-400" />
                            </span>
                        )}
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">
                        {isLifetime 
                            ? "Get lifetime access to all premium features!" 
                            : (plan.name === 'Basic' ? 'Perfect for individual users' : 'Ideal for families')
                        }
                    </p>

                    {/* CTA Button */}
                    <Button
                        size="lg"
                        className={cn(
                            "w-full font-medium rounded-lg transition-all duration-200 text-lg py-6",
                            isLifetime 
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black animate-pulse"
                                : "bg-rose-600 hover:bg-rose-700 text-white"
                        )}
                        onClick={handleSubscribe}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : (
                            isLifetime 
                                ? "Get Lifetime Access Now!" 
                                : (plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : "Get Started")
                        )}
                    </Button>

                    <p className="text-sm text-center text-muted-foreground mt-3">
                        {billingText}
                    </p>
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
                                        isLifetime && feature.icon === Crown 
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
                {isLifetime && (
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
                            className="absolute top-4 left-4"
                        >
                            <Sparkles className="w-6 h-6 text-yellow-400" />
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
                            className="absolute bottom-4 right-4"
                        >
                            <Sparkles className="w-6 h-6 text-yellow-400" />
                        </motion.div>
                    </>
                )}
            </div>
        </motion.div>
    );
};