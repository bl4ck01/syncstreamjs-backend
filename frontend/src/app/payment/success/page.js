'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Confetti } from '@/components/ui/confetti';
import { useRef } from 'react';
import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
    const router = useRouter();
    const confettiRef = useRef(null);
    const [countdown, setCountdown] = useState(99);

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
        <div className="relative h-screen bg-rose-900 bg-[url('/noise-light.png')]">
            <Confetti
                ref={confettiRef}
                className="absolute left-0 top-0 z-0 size-full"
                onMouseEnter={() => {
                    confettiRef.current?.fire({});
                }}
            />

            <div className="relative z-10 h-full flex flex-col items-center py-12 px-4">
                {/* Success Header */}
                <div className="mt-48 mb-6 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl md:text-4xl font-bold text-green-400 mb-2">
                    Payment Successful!
                </h1>
                <p className="text-green-100">
                    Your subscription is now active
                </p>

                <div className="text-green-50 mt-8 text-center">
                    You will be redirected to the home page in <label className='inline-bold text-2xl text-white font-bold'>{countdown}</label> seconds.
                </div>
            </div>
        </div>
    );
}