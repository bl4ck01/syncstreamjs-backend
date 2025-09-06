'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Confetti } from '@/components/ui/confetti';
import { useRef, useCallback, useMemo } from 'react';
import { useEffect, useState } from 'react';
import { SparklesCore } from '@/components/ui/sparkles';

export default function PaymentSuccessPage() {
    const router = useRouter();
    const confettiRef = useRef(null);
    const [countdown, setCountdown] = useState(3);

    // Memoize the SparklesCore component to prevent re-renders
    const sparklesComponent = useMemo(() => (
        <SparklesCore
            id="tsparticlesfullpage"
            background="transparent"
            minSize={0.3}
            maxSize={1.8}
            particleDensity={120}
            className="w-full h-full"
            particleColor="#4ade80" // green-400 color
            speed={0.8}
        />
    ), []); // Empty dependency array - only create once

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Use setTimeout to defer the navigation outside of the state update
                    setTimeout(() => router.push('/'), 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="relative h-screen bg-black">
            <div className="absolute inset-0 w-full h-full">
                {sparklesComponent}
            </div>
            <Confetti
                ref={confettiRef}
                className="absolute left-0 top-0 z-0 size-full"
                onMouseEnter={() => {
                    confettiRef.current?.fire({});
                }}
            />

            <div className="relative z-10 h-full flex flex-col items-center py-12 px-4">
                {/* Success Header */}
                <div className="mt-48 mb-6 bg-green-400/20 rounded-full">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h1 className="text-2xl md:text-4xl font-bold text-green-400 mb-2">
                    Payment Successful!
                </h1>
                <p className="text-green-200">
                    Your subscription is now active
                </p>

                <div className="text-green-100 mt-10 text-center">
                    You will be redirected to the home page in <label className='inline-bold text-2xl text-white font-bold'>{countdown}</label> seconds.
                </div>
            </div>
        </div>
    );
}