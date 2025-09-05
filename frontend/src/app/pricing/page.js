'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SparklesCore } from '@/components/ui/shadcn-io/sparkles';
import { CountingNumber } from '@/components/ui/shadcn-io/counting-number';

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const mockPlans = [
      {
        id: '1',
        name: 'Basic',
        price_monthly: 4.99,
        price_annual: 49.99,
        max_profiles: 3,
        max_playlists: 2,
        max_favorites: -1,
        cine_party: false,
        cine_party_voice_chat: false,
        sync_data_across_devices: true,
        record_live_tv: false,
        download_offline_viewing: false,
        parental_controls: true,
        multi_screen_viewing: 1,
        support_level: 'email',
        popular: false
      },
      {
        id: '2',
        name: 'Pro',
        price_monthly: 9.99,
        price_annual: 99.99,
        max_profiles: 6,
        max_playlists: 5,
        max_favorites: -1,
        cine_party: true,
        cine_party_voice_chat: false,
        sync_data_across_devices: true,
        record_live_tv: true,
        download_offline_viewing: true,
        parental_controls: true,
        multi_screen_viewing: 2,
        support_level: 'email_chat',
        popular: true
      },
      {
        id: '3',
        name: 'Ultimate',
        price_monthly: 14.99,
        price_annual: 149.99,
        max_profiles: -1,
        max_playlists: -1,
        max_favorites: -1,
        cine_party: true,
        cine_party_voice_chat: true,
        sync_data_across_devices: true,
        record_live_tv: true,
        download_offline_viewing: true,
        parental_controls: true,
        multi_screen_viewing: 5,
        support_level: 'priority_24_7',
        popular: false
      }
    ];

    // Simulate API call
    setTimeout(() => {
      setPlans(mockPlans);
      setLoading(false);
    }, 100);
  }, []);

  const AnimatedPrice = ({ plan, isYearly }) => {
    const currentPrice = isYearly ? plan.price_annual : plan.price_monthly;
    const originalPrice = isYearly ? plan.price_monthly * 12 : plan.price_monthly;
    const billingPeriod = isYearly ? 'year' : 'month';

    return (
      <div className="flex flex-col items-center">
        <div className="text-2xl font-bold text-white mb-1">
          $<CountingNumber 
            number={currentPrice} 
            decimalPlaces={2}
            transition={{ stiffness: 100, damping: 30 }}
            className="inline"
          />
        </div>
        {isYearly && (
          <div className="text-sm text-gray-400 line-through">
            ${originalPrice.toFixed(2)}/year
          </div>
        )}
        <div className="text-sm text-gray-300">
          /{billingPeriod}
        </div>
      </div>
    );
  };

  const getFeatureValue = (plan, featureKey) => {
    switch (featureKey) {
      case 'max_profiles':
        return plan.max_profiles === -1 ? 'Unlimited' : plan.max_profiles;
      case 'max_playlists':
        return plan.max_playlists === -1 ? 'Unlimited' : plan.max_playlists;
      case 'max_favorites':
        return plan.max_favorites === -1 ? 'Unlimited' : plan.max_favorites;
      case 'cine_party':
        return plan.cine_party ? 'Yes' : 'No';
      case 'cine_party_voice_chat':
        return plan.cine_party_voice_chat ? 'Yes' : 'No';
      case 'sync_data_across_devices':
        return plan.sync_data_across_devices ? 'Yes' : 'No';
      case 'record_live_tv':
        return plan.record_live_tv ? 'Yes' : 'No';
      case 'download_offline_viewing':
        return plan.download_offline_viewing ? 'Yes' : 'No';
      case 'parental_controls':
        return plan.parental_controls ? 'Yes' : 'No';
      case 'multi_screen_viewing':
        return plan.multi_screen_viewing;
      case 'support_level':
        switch (plan.support_level) {
          case 'email': return 'Email';
          case 'email_chat': return 'Email & Chat';
          case 'priority_24_7': return '24/7 Priority';
          default: return 'Email';
        }
      default:
        return 'No';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-auto relative">
      {/* Sparkles Background - Full Page Coverage from Top */}
      <div className="absolute inset-0 w-full h-full z-0">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.5}
          maxSize={2}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#e11d48"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header Section - Compact */}
        <div className="bg-black/80 backdrop-blur-sm text-white py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Choose Your Plan
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-4">
                Stream unlimited content with our flexible pricing plans.
                Start with a 3-day free trial and cancel anytime.
              </p>

              {/* Pricing Toggle */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className={cn("text-sm font-medium", !isYearly ? "text-white" : "text-gray-400")}>
                  Monthly
                </span>
                <button
                  onClick={() => setIsYearly(!isYearly)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-black",
                    isYearly ? "bg-rose-600" : "bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      isYearly ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span className={cn("text-sm font-medium", isYearly ? "text-white" : "text-gray-400")}>
                  Yearly
                </span>
                {isYearly && (
                  <Badge className="bg-green-600 text-white text-xs">
                    Save up to 17%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Table - Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="backdrop-blur-2xl rounded-2xl border border-white/20 overflow-hidden shadow-2xl shadow-rose-500/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="backdrop-blur-lg">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">

                    </th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          {plan.popular && (
                            <Badge className="bg-rose-600 text-white text-xs mb-2">
                              Most Popular
                            </Badge>
                          )}
                          <div className="text-lg font-bold text-white mb-3">
                            {plan.name}
                          </div>
                          <AnimatedPrice plan={plan} isYearly={isYearly} />
                          {isYearly && (
                            <div className="text-xs text-green-400 font-medium mt-2">
                              Save ${((plan.price_monthly * 12) - plan.price_annual).toFixed(2)} annually
                            </div>
                          )}
                          <Button
                            className={cn(
                              "w-full py-2 text-sm font-semibold rounded-lg transition-all duration-200 mt-4 mb-2",
                              plan.popular
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
                            )}
                          >
                            {plan.name === 'Basic' && 'Start Free Trial'}
                            {plan.name === 'Pro' && 'Get Pro Plan'}
                            {plan.name === 'Ultimate' && 'Go Ultimate'}
                          </Button>
                          <div className="text-xs text-gray-400">
                            3-day free trial • Cancel anytime
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {[
                    { name: 'Profiles', key: 'max_profiles' },
                    { name: 'Playlists', key: 'max_playlists' },
                    { name: 'Favorites', key: 'max_favorites' },
                    { name: 'Cine Party (Watch Together)', key: 'cine_party' },
                    { name: 'Voice Chat in Cine Party', key: 'cine_party_voice_chat' },
                    { name: 'Sync Across All Devices', key: 'sync_data_across_devices' },
                    { name: 'Record Live TV', key: 'record_live_tv' },
                    { name: 'Download for Offline Viewing', key: 'download_offline_viewing' },
                    { name: 'Parental Controls', key: 'parental_controls' },
                    { name: 'Simultaneous Screens', key: 'multi_screen_viewing' },
                    { name: 'Support Level', key: 'support_level' }
                  ].map((feature, index) => (
                    <tr key={index} className="hover:backdrop-blur-sm transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-white">
                        {feature.name}
                      </td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="px-6 py-3 text-center">
                          <span className={cn(
                            "text-sm font-medium",
                            getFeatureValue(plan, feature.key) === 'Yes' ||
                              getFeatureValue(plan, feature.key) === 'Unlimited' ||
                              (feature.key === 'multi_screen_viewing' && plan.multi_screen_viewing > 1) ||
                              (feature.key === 'support_level' && plan.support_level !== 'email')
                              ? "text-green-400"
                              : "text-gray-400"
                          )}>
                            {getFeatureValue(plan, feature.key)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}