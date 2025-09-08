"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/card';
import { Separator } from './ui/separator';

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
                        background: 'rgba(0,0,0,0.55)',
                        zIndex: 1000,
                        padding: 16,
                    }}
                >
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} style={{ width: '100%', maxWidth: 420 }}>
                        <Card>
                            <div style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                        style={{ width: 26, height: 26, borderRadius: 999, border: '3px solid #e5e7eb', borderTopColor: '#111827' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{title}</div>
                                        <div style={{ opacity: 0.7, fontSize: 13 }}>{subtitle}</div>
                                    </div>
                                </div>
                                <Separator style={{ margin: '14px 0' }} />
                                <div style={{ fontSize: 12, opacity: 0.8 }}>
                                    {tip || 'This may take a few seconds depending on your playlist size.'}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


