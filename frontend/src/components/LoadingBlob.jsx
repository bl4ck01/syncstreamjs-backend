'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingBlob({ message = "Loading your playlists" }) {

    return (
        <AnimatePresence mode="wait">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center"
            >
                <motion.div 
                    className="text-center space-y-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    {/* Loading Text */}
                    <motion.div
                        className='text-4xl sm:text-5xl md:text-6xl font-semibold text-white mb-10'
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        {message}
                    </motion.div>

                    {/* Progress indicator */}
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '100%', opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="w-64 sm:w-72 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden"
                    >
                        <motion.div
                            className="h-full bg-gradient-to-r from-white/20 to-white rounded-full"
                            animate={{
                                x: ['-100%', '100%'],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.6
                            }}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
