import React from 'react';
import Pricing_04 from '@/components/ui/pricing-04';
import { getPlans } from '@/server/actions';
import { SparklesCore } from '@/components/ui/sparkles';

export default async function PricingPage() {
  // Fetch plans from the backend
  const plansResponse = await getPlans();
  
  // Extract plans data or provide empty array as fallback
  const plans = plansResponse?.success && plansResponse?.data ? plansResponse.data : [];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Sparkles background effect */}
      <div className="absolute inset-0 w-full h-full">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.3}
          maxSize={1.8}
          particleDensity={120}
          className="w-full h-full"
          particleColor="#e11d48" // rose-600 color
          speed={0.8}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <Pricing_04 plans={plans} />
      </div>
    </div>
  );
}