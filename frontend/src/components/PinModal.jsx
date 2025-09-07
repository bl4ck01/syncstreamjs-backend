"use client";

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "motion/react";
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { z } from 'zod';
import { selectProfile } from '@/server/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Zod schema for PIN validation
const pinSchema = z.string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers');

export default function PinModal({ profile, onClose }) {
    const [pin, setPin] = useState(['', '', '', '']);
    const [activePinIndex, setActivePinIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const router = useRouter();

    const handlePinChange = (value, index) => {
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        if (value && index < 3) {
            setActivePinIndex(index + 1);
        } else if (value && index === 3) {
            setTimeout(() => {
                const pinString = newPin.join('');
                if (pinString.length === 4 && profile) {
                    handlePinSubmitWithPin(pinString);
                }
            }, 100);
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            setActivePinIndex(index - 1);
        }
    };

    const handlePinSubmitWithPin = async (pinString) => {
        // Validate PIN with Zod
        try {
            pinSchema.parse(pinString);
        } catch (error) {
            if (error instanceof z.ZodError && error.errors && error.errors.length > 0) {
                toast.error(error.errors[0].message);
                return;
            } else {
                toast.error('Invalid PIN format');
                return;
            }
        }

        if (pinString.length === 4 && profile) {
            setIsSubmitting(true);

            try {
                // Call the selectProfile function with the PIN
                const result = await selectProfile(profile.id, pinString);

                if (result.success) {
                    // Successfully selected profile
                    // toast.success('Profile selected successfully!');
                    onClose();
                    router.push('/');
                    // You might want to redirect or update the UI here
                } else {
                    // Handle error from backend
                    toast.error(result.message || 'Invalid PIN. Please try again.');
                }
            } catch (error) {
                console.error('Error selecting profile:', error);
                toast.error('An error occurred. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handlePinSubmit = async () => {
        const pinString = pin.join('');
        await handlePinSubmitWithPin(pinString);
    };

    const closePinModal = () => {
        onClose();
        setPin(['', '', '', '']);
        setActivePinIndex(0);
        setIsSubmitting(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            >
                {/* Close button */}
                <button
                    onClick={closePinModal}
                    className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Modal content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="text-center px-8"
                >
                    {/* Profile Avatar */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mb-8"
                    >
                        <div
                            className="w-36 h-36 mx-auto rounded overflow-hidden"
                            style={{
                                backgroundImage: `url(${profile.avatar_url || '/avatars/default-avatar.jpeg'})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat'
                            }}
                        />
                    </motion.div>

                    {/* Profile Lock message */}
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="text-white/70 text-sm mb-2"
                    >
                        Profile Lock is currently on.
                    </motion.p>

                    {/* Main message */}
                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="text-white text-2xl font-semibold mb-12"
                    >
                        Enter your PIN to access this profile.
                    </motion.h2>

                    {/* PIN Input */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="flex gap-4 justify-center mb-6"
                    >
                        {pin.map((digit, index) => (
                            <div key={index} className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="1"
                                    value={digit}
                                    disabled={isSubmitting}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        handlePinChange(value, index);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    ref={(input) => {
                                        if (input && index === activePinIndex && !isSubmitting) {
                                            input.focus();
                                        }
                                    }}
                                    className={cn(
                                        "w-12 h-12 text-center text-white text-xl font-semibold bg-transparent border border-white/30 rounded-md focus:border-white focus:outline-none transition-colors",
                                        isSubmitting && "opacity-50 cursor-not-allowed"
                                    )}
                                />
                                {index === activePinIndex && !isSubmitting && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 border-2 border-white rounded-md pointer-events-none"
                                    />
                                )}
                            </div>
                        ))}
                    </motion.div>

                    {/* Loading State */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center mt-3 mb-6"
                    >
                        {isSubmitting && (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                    </motion.div>

                    {/* Forgot PIN link */}
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                        className="mt-10 text-white hover:text-gray-300 transition-colors text-sm"
                    >
                        Forgot PIN?
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
