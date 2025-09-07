'use client';

import { SparklesCore } from '@/components/ui/sparkles'
import React from 'react'
import { motion } from 'framer-motion'

export default function Profiles() {
    const containerVariants = {
        hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: {
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                when: 'beforeChildren',
                staggerChildren: 0.08,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: 'spring', stiffness: 120, damping: 18 },
        },
    }

    return (
        <motion.div
            className='relative h-screen flex flex-col items-center justify-center'
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="absolute inset-0 w-full h-full">
                <SparklesCore
                    id="tsparticlesfullpage"
                    background="transparent"
                    minSize={0.3}
                    maxSize={1.5}
                    particleDensity={150}
                    className="w-full h-full"
                    particleColor="#e11d48" // rose-600 color
                    speed={0.8}
                />
            </div>
            <motion.div
                className="absolute inset-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
            >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
            </motion.div>
            <motion.div
                className="relative z-10"
                variants={itemVariants}
            >
                <h1 className="text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold">
                    Who&apos;s watching?
                </h1>
                <motion.p
                    className="text-neutral-500 my-2 text-lg text-center"
                    variants={itemVariants}
                >
                    Select a profile to continue or create a new one
                </motion.p>
            </motion.div>
        </motion.div>
    )
}
