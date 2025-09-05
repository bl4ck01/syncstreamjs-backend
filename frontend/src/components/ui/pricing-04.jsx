"use client";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";


export default function Pricing_04({ plans = [] }) {

    const [billPlan, setBillPlan] = useState("monthly");

    const handleSwitch = () => {
        setBillPlan((prev) => (prev === "monthly" ? "annually" : "monthly"));
    };

    return (
        <div
            className="relative flex flex-col items-center justify-center max-w-5xl py-20 mx-auto">
            <div className="flex flex-col items-center justify-center max-w-2xl mx-auto">

                <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-6">
                    Choose Your Plan
                </h2>
                <p
                    className="text-base md:text-lg text-center text-accent-foreground/80 mt-6">
                    Stream your favorite content with flexible plans designed for everyone.
                </p>
                </div>
                <div className="flex items-center justify-center space-x-4 mt-6">
                    <span className="text-base font-medium">Monthly</span>
                    <button
                        onClick={handleSwitch}
                        className="relative rounded-full focus:outline-none">
                        <div
                            className="w-12 h-6 transition rounded-full shadow-md outline-none bg-blue-500"></div>
                        <div
                            className={cn(
                                "absolute inline-flex items-center justify-center w-4 h-4 transition-all duration-500 ease-in-out top-1 left-1 rounded-full bg-white",
                                billPlan === "annually" ? "translate-x-6" : "translate-x-0"
                            )} />
                    </button>
                    <span className="text-base font-medium">Annually</span>
                </div>
            </div>
            <div
                className={cn(
                    "grid w-full pt-8 lg:pt-12 gap-4 lg:gap-6 max-w-6xl mx-auto",
                    plans.length === 3 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"
                )}>
                {plans.map((plan, idx) => (
                    <Plan key={plan.id} plan={plan} billPlan={billPlan} isPopular={plan.name === "Pro"} />
                ))}
            </div>
        </div>
    );
}

const Plan = ({
    plan,
    billPlan,
    isPopular = false
}) => {
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
        <div
            className={cn(
                "flex flex-col relative rounded-2xl lg:rounded-3xl transition-all bg-background/ items-start w-full border border-foreground/10 overflow-hidden",
                isPopular && "border-blue-500 scale-105 shadow-xl"
            )}>
            {isPopular && (
                <>
                    <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-sm py-1 text-center font-medium">
                        Most Popular
                    </div>
                    <div
                        className="absolute top-1/2 inset-x-0 mx-auto h-12 -rotate-45 w-full bg-blue-600 rounded-2xl lg:rounded-3xl blur-[8rem] -z-10"></div>
                </>
            )}
            <div
                className="p-4 md:p-8 flex rounded-t-2xl lg:rounded-t-3xl flex-col items-start w-full relative">
                <h2 className={cn(
                    "font-medium text-xl text-foreground",
                    isPopular ? "pt-8" : "pt-5"
                )}>
                    {plan.name}
                </h2>
                <h3 className="mt-3 text-2xl font-bold md:text-5xl">
                    <NumberFlow
                        value={billPlan === "monthly" ? parseFloat(plan.price_monthly) : parseFloat(plan.price_annual)}
                        suffix={billPlan === "monthly" ? "/mo" : "/yr"}
                        format={{
                            currency: "USD",
                            style: "currency",
                            currencySign: "standard",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                            currencyDisplay: "narrowSymbol"
                        }} />
                </h3>
                <p className="text-sm md:text-base text-muted-foreground mt-2">
                    {billPlan === "annually" && plan.price_annual && plan.price_monthly ? 
                        `Save $${(parseFloat(plan.price_monthly) * 12 - parseFloat(plan.price_annual)).toFixed(2)} per year` : 
                        "Perfect for getting started"
                    }
                </p>
            </div>
            <div className="flex flex-col items-start w-full px-4 py-2 md:px-8">
                <Button size="lg" className={cn(
                    "w-full",
                    isPopular && "bg-blue-500 hover:bg-blue-600"
                )}>
                    {plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : "Get Started"}
                </Button>
                <div className="h-8 overflow-hidden w-full mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={billPlan}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="text-sm text-center text-muted-foreground mt-3 mx-auto block">
                            {billPlan === "monthly" ? (
                                "Billed monthly"
                            ) : (
                                `Billed annually ($${plan.price_annual})`
                            )}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </div>
            <div className="flex flex-col items-start w-full p-5 mb-4 ml-1 gap-y-2">
                <span className="text-base text-left mb-2">
                    Includes:
                </span>
                {getFeatures().map((feature, index) => (
                    <div key={index} className="flex items-center justify-start gap-2">
                        <div className="flex items-center justify-center">
                            <CheckIcon className="size-5 text-green-500 flex-shrink-0" />
                        </div>
                        <span className="text-sm">{feature}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
