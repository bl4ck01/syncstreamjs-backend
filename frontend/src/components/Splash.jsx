"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmeringText } from './ui/shimmering';

export default function Splash({ visible = false, title = 'Loading playlists', subtitle = 'Fetching data...', tip = null }) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#000',
                        zIndex: 1000,
                        padding: 16
                    }}
                >
                    <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} style={{ width: '100%', maxWidth: 680, textAlign: 'center', color: 'white' }}>
                        <div style={{ marginBottom: 10 }}>
                            <ShimmeringText text={title} duration={1} wave={true} color="#ffffff" shimmeringColor="#000" style={{ fontSize: 36 }} />
                        </div>
                        <div style={{ opacity: 0.9, fontSize: 14 }}>{subtitle}</div>
                        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>{tip || 'This may take a few seconds depending on your playlist size.'}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


