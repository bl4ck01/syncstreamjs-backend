"use client";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/server/actions";
import { useRouter } from "next/navigation";

export default function Pricing_04({ plans = [] }) {
    const [billPlan, setBillPlan] = useState("monthly");
    const router = useRouter();

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

    // Calculate prices
    const monthlyPrice = Number(plan.price_monthly);
    const yearlyPrice = Number(plan.price_annual);
    const yearlyMonthlyEquivalent = yearlyPrice / 12;

    const currentPrice = billPlan === "monthly" ? monthlyPrice : yearlyMonthlyEquivalent;
    const showStrikethrough = billPlan === "annually" && yearlyMonthlyEquivalent < monthlyPrice;

    // Transform features based on plan capabilities
    const getFeatures = () => {
        const features = [];

        // Profiles
        if (plan.max_profiles === 1) {
            features.push("1 user profile");
        } else {
            features.push(`Up to ${plan.max_profiles} user profiles`);
        }

        // Feature flags
        if (plan.cine_party) {
            features.push(plan.cine_party_voice_chat ? "Watch party with voice chat" : "Watch party feature");
        }

        if (plan.record_live_tv) {
            features.push("Record live TV");
        }

        if (plan.download_offline_viewing) {
            features.push("Download for offline viewing");
        }

        if (plan.parental_controls) {
            features.push("Parental controls");
        }

        if (plan.sync_data_across_devices) {
            features.push("Sync across all devices");
        }

        // Support level
        const supportLevels = {
            'email': 'Email support',
            'email_chat': 'Email & chat support',
            'priority_24_7': '24/7 priority support'
        };
        features.push(supportLevels[plan.support_level] || 'Email support');

        // Trial days
        if (plan.trial_days > 0) {
            features.push(`${plan.trial_days}-day free trial`);
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
                // Handle error - could show toast notification here
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
            <div className="relative flex flex-col h-full rounded-2xl bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 overflow-hidden transition-all duration-300 hover:border-rose-500/50">
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
                            className="text-6xl md:text-7xl font-bold text-white flex items-baseline justify-center gap-2"
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
                                    /mo
                                </motion.span>
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-400 mb-6">{plan.name === 'Basic' ? 'Perfect for individual users' : 'Ideal for families'}</p>

                    {/* CTA Button */}
                    <Button
                        size="lg"
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-all duration-200 text-lg py-6"
                        onClick={handleSubscribe}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : (plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : "Get Started")}
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
                            ) : (
                                `Billed $${yearlyPrice.toFixed(2)} annually`
                            )}
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Features list */}
                <div className="px-6 pb-6 flex-grow">
                    <h4 className="text-base font-medium text-white mb-4">What's included:</h4>
                    <ul className="space-y-3">
                        {getFeatures().map((feature, index) => (
                            <motion.li
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.4 + index * 0.03 }}
                                className="flex items-center gap-3"
                            >
                                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                                <span className="text-sm text-gray-300">{feature}</span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    );
};