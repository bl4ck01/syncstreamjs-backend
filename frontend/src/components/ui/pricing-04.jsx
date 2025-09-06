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
        <div className="relative flex flex-col items-center justify-center max-w-7xl py-12 px-4 mx-auto min-h-screen">
            <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white"
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
                                    className="absolute inset-0 bg-blue-600 rounded-full -z-10"
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
                                    className="absolute inset-0 bg-blue-600 rounded-full -z-10"
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
            className="group h-full"
        >
            <div className="relative flex flex-col h-full rounded-2xl bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 overflow-hidden transition-all duration-300 hover:border-blue-500/50">
                {/* Plan content */}
                <div className="relative p-6 text-center">
                    {/* Price */}
                    <div className="mb-1">
                        <motion.div
                            key={billPlan}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-4xl font-bold text-white flex items-baseline justify-center gap-1"
                        >
                            <NumberFlow
                                value={billPlan === "monthly" ? parseFloat(plan.price_monthly) : parseFloat(plan.price_annual)}
                                format={{
                                    style: "decimal",
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }}
                            />
                            <span className="text-2xl">$</span>
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={billPlan}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-lg text-gray-400"
                                >
                                    /{billPlan === "monthly" ? "mo" : "mo"}
                                </motion.span>
                            </AnimatePresence>
                        </motion.div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-4">Perfect for getting started</p>
                    
                    {/* CTA Button */}
                    <Button 
                        size="default" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                    >
                        {plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : "Get Started"}
                    </Button>
                    
                    <p className="text-xs text-gray-500 mt-2">
                        {billPlan === "monthly" ? "Billed monthly" : `Billed annually`}
                    </p>
                </div>
                
                {/* Features list */}
                <div className="px-6 pb-6 flex-grow">
                    <h4 className="text-sm text-white mb-3">Includes:</h4>
                    <ul className="space-y-2">
                        {getFeatures().map((feature, index) => (
                            <motion.li
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.4 + index * 0.03 }}
                                className="flex items-center gap-2"
                            >
                                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="text-xs text-gray-300">{feature}</span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    );
};