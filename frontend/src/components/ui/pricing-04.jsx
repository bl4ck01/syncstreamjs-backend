"use client";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Pricing_04({ plans = [] }) {
    const [billPlan, setBillPlan] = useState("monthly");

    return (
        <div className="relative flex flex-col items-center justify-center max-w-6xl py-20 mx-auto">
            <div className="flex flex-col items-center justify-center max-w-2xl mx-auto">
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
                        className="text-base md:text-lg text-center text-gray-400 mt-6"
                    >
                        Stream your favorite content with flexible plans designed for everyone.
                    </motion.p>
                </div>
                
                {/* Custom Animated Toggle */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-8 relative"
                >
                    <div className="flex items-center bg-zinc-900/50 backdrop-blur-sm rounded-full p-1 border border-zinc-800">
                        <motion.div
                            className="absolute h-[calc(100%-8px)] bg-gradient-to-r from-rose-600 to-rose-500 rounded-full"
                            initial={false}
                            animate={{
                                x: billPlan === "monthly" ? 0 : "100%",
                                width: billPlan === "monthly" ? "50%" : "50%"
                            }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                        <button
                            onClick={() => setBillPlan("monthly")}
                            className={cn(
                                "relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200",
                                billPlan === "monthly" ? "text-white" : "text-gray-400 hover:text-gray-300"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillPlan("annually")}
                            className={cn(
                                "relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200",
                                billPlan === "annually" ? "text-white" : "text-gray-400 hover:text-gray-300"
                            )}
                        >
                            Yearly
                            <span className="ml-1 text-xs text-rose-400">Save 20%</span>
                        </button>
                    </div>
                </motion.div>
            </div>
            
            <div className="grid w-full grid-cols-1 lg:grid-cols-2 pt-12 gap-6 lg:gap-8 max-w-5xl mx-auto">
                {plans.map((plan, idx) => (
                    <Plan key={plan.id} plan={plan} billPlan={billPlan} index={idx} />
                ))}
            </div>
        </div>
    );
}

const Plan = ({ plan, billPlan, index }) => {
    // Transform features based on plan capabilities
    const getFeatures = () => {
        const features = [];
        
        // Profiles
        if (plan.max_profiles === -1) {
            features.push("Unlimited profiles");
        } else {
            features.push(`Up to ${plan.max_profiles} profiles`);
        }
        
        // Playlists
        if (plan.max_playlists === -1) {
            features.push("Unlimited playlists");
        } else {
            features.push(`Up to ${plan.max_playlists} playlists`);
        }
        
        // Favorites
        if (plan.max_favorites === -1) {
            features.push("Unlimited favorites");
        } else if (plan.max_favorites > 0) {
            features.push(`Up to ${plan.max_favorites} favorites`);
        }
        
        // Multi-screen viewing
        features.push(`${plan.multi_screen_viewing} simultaneous ${plan.multi_screen_viewing === 1 ? 'screen' : 'screens'}`);
        
        // Feature flags
        if (plan.cine_party) {
            features.push(plan.cine_party_voice_chat ? "CineParty with voice chat" : "CineParty (watch together)");
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
            features.push("Sync across devices");
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="group"
        >
            <div className="relative flex flex-col h-full rounded-3xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 overflow-hidden transition-all duration-300 hover:border-rose-500/50">
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Plan header */}
                <div className="relative p-8 pb-6">
                    <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                    
                    {/* Price with animation */}
                    <div className="flex items-baseline gap-1">
                        <motion.div
                            key={billPlan}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-5xl font-bold text-white"
                        >
                            <NumberFlow
                                value={billPlan === "monthly" ? parseFloat(plan.price_monthly) : parseFloat(plan.price_annual)}
                                format={{
                                    currency: "USD",
                                    style: "currency",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                    currencyDisplay: "narrowSymbol"
                                }}
                            />
                        </motion.div>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={billPlan}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="text-gray-400 text-lg"
                            >
                                /{billPlan === "monthly" ? "month" : "year"}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                    
                    {/* Savings badge for annual */}
                    <AnimatePresence>
                        {billPlan === "annually" && plan.price_annual && plan.price_monthly && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3"
                            >
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    Save ${(parseFloat(plan.price_monthly) * 12 - parseFloat(plan.price_annual)).toFixed(0)} per year
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* CTA Button */}
                <div className="px-8 pb-8">
                    <Button 
                        size="lg" 
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-rose-600/25"
                    >
                        {plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : "Get Started"}
                    </Button>
                </div>
                
                {/* Features list */}
                <div className="relative px-8 pb-8 pt-0 flex-grow">
                    <div className="border-t border-zinc-800 pt-8">
                        <h4 className="text-sm font-medium text-gray-400 mb-4">Everything included</h4>
                        <ul className="space-y-3">
                            {getFeatures().map((feature, index) => (
                                <motion.li
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center mt-0.5">
                                        <CheckIcon className="w-3 h-3 text-rose-500" />
                                    </div>
                                    <span className="text-sm text-gray-300">{feature}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};