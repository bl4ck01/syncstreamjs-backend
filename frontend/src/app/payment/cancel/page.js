'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, CreditCard, Mail, RefreshCw } from 'lucide-react';

export default function PaymentCancelPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');

    return (
        <div className="min-h-screen bg-black py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Cancel Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto mb-6 w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-orange-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Payment Cancelled
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Your payment was not completed
                    </p>
                </div>

                {/* Main Cancel Card */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Payment Status
                        </CardTitle>
                        <CardDescription>
                            No charges were made to your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
                            <p className="text-orange-200 text-sm">
                                Your payment was not completed and no charges were made. 
                                Your account remains unchanged.
                            </p>
                        </div>
                        
                        {sessionId && (
                            <div className="text-sm text-gray-400">
                                Session ID: <code className="bg-gray-800 px-2 py-1 rounded">{sessionId}</code>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Next Steps */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>What can you do?</CardTitle>
                        <CardDescription>
                            Here are some options to help you complete your subscription
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <RefreshCw className="w-3 h-3 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Try Again</p>
                                    <p className="text-gray-400 text-sm">
                                        You can restart the checkout process with a different payment method
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <CreditCard className="w-3 h-3 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Check Payment Method</p>
                                    <p className="text-gray-400 text-sm">
                                        Ensure your payment method is valid and has sufficient funds
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Mail className="w-3 h-3 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Contact Support</p>
                                    <p className="text-gray-400 text-sm">
                                        If you continue to have issues, our support team can help
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                        onClick={() => router.push('/pricing')}
                        className="flex-1"
                        size="lg"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    
                    <Button 
                        onClick={() => router.push('/')}
                        variant="outline"
                        className="flex-1"
                        size="lg"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>

                {/* Support Info */}
                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm">
                        Need help?{' '}
                        <a 
                            href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@syncstream.com'}`}
                            className="text-blue-400 hover:text-blue-300 underline"
                        >
                            Contact our support team
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
