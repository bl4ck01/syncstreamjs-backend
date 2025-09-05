import React from 'react';
import Pricing_04 from '@/components/ui/pricing-04';
import { getPlans } from '@/server/actions';

export default async function PricingPage() {
  // Fetch plans from the backend
  const plansResponse = await getPlans();
  
  // Extract plans data or provide empty array as fallback
  const plans = plansResponse?.success && plansResponse?.data ? plansResponse.data : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4">
        <Pricing_04 plans={plans} />
      </div>
    </div>
  );
}