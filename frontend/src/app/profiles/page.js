import { SparklesCore } from '@/components/ui/sparkles'
import React from 'react'

export default function Profiles() {
    return (
        <div className='relative h-screen flex flex-col items-center justify-center'>
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
            <div className="relative z-10">
                <h1 className="text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600  text-center font-sans font-bold">
                    Who&apos;s watching?
                </h1>
                <p className="text-neutral-500 my-2 text-lg text-center">
                    Select a profile to continue or create a new one
                </p>
            </div>
        </div>
    )
}
