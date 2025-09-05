import { getPlans } from '@/server/actions';
import React from 'react'

export default async function Pricing() {
    const plans = await getPlans();
    return (
        <div className='flex flex-col gap-4 text-white'>
            {plans?.data?.map((plan) => (
                <div key={plan.id}>
                    <h1>{plan.name}</h1>
                    <p>{plan.price_monthly}</p>
                    <p>{JSON.stringify(plan.features, null, 2)}</p>
                </div>
            ))}
        </div>
    )
}
