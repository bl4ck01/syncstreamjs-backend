'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Shield, ShieldOff, Star, Edit, Calendar, Radio, Film, Tv, Trash2, RefreshCw } from 'lucide-react';
// Removed dropdown menu imports since we're using direct buttons now
import { cn } from '@/lib/utils';
import './PlaylistMagicBento.css';

const DEFAULT_PARTICLE_COUNT = 8;
const DEFAULT_GLOW_COLOR = '132, 0, 255'; // purple

const createParticleElement = (x, y, color = DEFAULT_GLOW_COLOR) => {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.cssText = `
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(${color}, 0.8);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
    return el;
};

const PlaylistCard = ({
    card,
    onEdit,
    onDelete,
    onSetDefault,
    onAddPlaylist,
    onRefresh,
    isPending,
    className = '',
    particleCount = DEFAULT_PARTICLE_COUNT,
    glowColor = DEFAULT_GLOW_COLOR,
    enableBorderGlow = true,
    enableStars = true,
    enableTilt = true,
    enableMagnetism = true,
    clickEffect = true,
}) => {
    const cardRef = useRef(null);
    const particlesRef = useRef([]);
    const timeoutsRef = useRef([]);
    const isHoveredRef = useRef(false);
    const memoizedParticles = useRef([]);
    const particlesInitialized = useRef(false);

    const initializeParticles = useCallback(() => {
        if (particlesInitialized.current || !cardRef.current) return;

        const { width, height } = cardRef.current.getBoundingClientRect();
        memoizedParticles.current = Array.from({ length: particleCount }, () =>
            createParticleElement(Math.random() * width, Math.random() * height, glowColor));
        particlesInitialized.current = true;
    }, [particleCount, glowColor]);

    const clearAllParticles = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        particlesRef.current.forEach(particle => {
            gsap.to(particle, {
                scale: 0,
                opacity: 0,
                duration: 0.3,
                ease: 'back.in(1.7)',
                onComplete: () => {
                    particle.parentNode?.removeChild(particle);
                }
            });
        });
        particlesRef.current = [];
    }, []);

    const animateParticles = useCallback(() => {
        if (!cardRef.current || !isHoveredRef.current) return;

        if (!particlesInitialized.current) {
            initializeParticles();
        }

        memoizedParticles.current.forEach((particle, index) => {
            const timeoutId = setTimeout(() => {
                if (!isHoveredRef.current || !cardRef.current) return;

                const clone = particle.cloneNode(true);
                cardRef.current.appendChild(clone);
                particlesRef.current.push(clone);

                gsap.fromTo(
                    clone,
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
                );

                gsap.to(clone, {
                    x: (Math.random() - 0.5) * 80,
                    y: (Math.random() - 0.5) * 80,
                    rotation: Math.random() * 360,
                    duration: 2 + Math.random() * 2,
                    ease: 'none',
                    repeat: -1,
                    yoyo: true
                });

                gsap.to(clone, {
                    opacity: 0.3,
                    duration: 1.5,
                    ease: 'power2.inOut',
                    repeat: -1,
                    yoyo: true
                });
            }, index * 100);

            timeoutsRef.current.push(timeoutId);
        });
    }, [initializeParticles]);

    useEffect(() => {
        if (!cardRef.current) return;

        const element = cardRef.current;

        const handleMouseEnter = () => {
            isHoveredRef.current = true;
            animateParticles();

            gsap.to(element, {
                rotateX: 2,
                rotateY: 2,
                duration: 0.3,
                ease: 'power2.out',
                transformPerspective: 1000
            });
        };

        const handleMouseLeave = () => {
            isHoveredRef.current = false;
            clearAllParticles();

            gsap.to(element, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        };

        const handleMouseMove = e => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;

            gsap.to(element, {
                rotateX,
                rotateY,
                duration: 0.1,
                ease: 'power2.out',
                transformPerspective: 1000
            });
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
        element.addEventListener('mousemove', handleMouseMove);

        return () => {
            isHoveredRef.current = false;
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            element.removeEventListener('mousemove', handleMouseMove);
            clearAllParticles();
        };
    }, [animateParticles, clearAllParticles]);

    const handleCardClick = (e) => {
        e.stopPropagation();
        if (card.type === 'add') {
            onAddPlaylist();
            return;
        }
        // Handle playlist selection or other actions
    };

    // Removed handleMenuClick since we're using direct buttons now

    if (card.type === 'add') {
        return (
            <div
                ref={cardRef}
                className={cn(
                    "playlist-card add-playlist-card",
                    enableBorderGlow && "playlist-card--border-glow",
                    className
                )}
                onClick={handleCardClick}
                style={{ '--glow-color': glowColor }}
            >
                <div className="add-playlist-card__icon">
                    <Plus className="w-6 h-6" />
                </div>
                <div className="add-playlist-card__title">{card.title}</div>
                <div className="add-playlist-card__description">{card.description}</div>
            </div>
        );
    }

    return (
        <div
            ref={cardRef}
            className={cn(
                "playlist-card",
                enableBorderGlow && "playlist-card--border-glow",
                {
                    'playlist-card--default': card.isDefault,
                    'playlist-card--inactive': !card.isActive
                },
                className
            )}
            onClick={handleCardClick}
            style={{ '--glow-color': glowColor }}
        >
            {/* Top Header with Set Default and Edit buttons */}
            <div className="flex justify-between items-start mb-4">
                {/* Set as Default Button (Top Left) - Text only with hover color change */}
                {!card.isDefault && (
                    <div
                        className="flex items-center text-sm text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onSetDefault(card.id); }}
                    >
                        <Star className="w-4 h-4 mr-1" />
                        Set Default
                    </div>
                )}

                {/* Edit, Refresh and Delete Buttons (Top Right) - Icons only with hover color change */}
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                    >
                        <Edit className="w-5 h-5" />
                    </div>
                    {onRefresh && (
                        <div
                            className="flex items-center text-neutral-400 hover:text-blue-400 transition-all duration-200 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); onRefresh(card); }}
                        >
                            <RefreshCw className="w-5 h-5" />
                        </div>
                    )}
                    <div
                        className="flex items-center text-neutral-400 hover:text-red-400 transition-all duration-200 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                    >
                        <Trash2 className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Playlist Name - Bigger */}
                <h2 className="text-xl font-semibold mb-4">{card.title}</h2>

                {/* Expiration Info - Reorganized */}
                <div className="flex items-center gap-2 mb-4 p-3 bg-neutral-900/50 rounded-lg">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <div className="flex-1">
                        <div className="text-xs text-neutral-500">{card.expirationDate}</div>
                        <div className="text-sm font-medium text-orange-400">
                            {card.daysRemaining > 0 ? `${card.daysRemaining} days left` : 'Expired'}
                        </div>
                    </div>
                </div>

                {/* Content Stats - Live, VOD, Series */}
                <div className="flex items-center gap-2 mb-4">
                    {/* Live Channels */}
                    <div className="flex-1 flex items-center justify-center gap-1 bg-rose-200/10 rounded p-2">
                        <Radio className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-light text-rose-400">
                            {card.streamsData?.live?.length || 0}
                        </span>
                    </div>

                    {/* VOD */}
                    <div className="flex-1 flex items-center justify-center gap-1 bg-rose-200/10 rounded p-2">
                        <Film className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-medium text-rose-400">
                            {card.streamsData?.vod?.length || 0}
                        </span>
                    </div>

                    {/* Series */}
                    <div className="flex-1 flex items-center justify-center gap-1 bg-rose-200/10 rounded p-2">
                        <Tv className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-medium text-rose-400">
                            {card.streamsData?.series?.length || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Active Status - Small in Bottom Left */}
            <div className="absolute bottom-4 left-4">
                <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                    {
                        'bg-green-500/20 text-green-400': card.isActive,
                        'bg-red-500/20 text-red-400': !card.isActive
                    }
                )}>
                    {card.isActive ? (
                        <>
                            <Shield className="w-2 h-2" />
                            Active
                        </>
                    ) : (
                        <>
                            <ShieldOff className="w-2 h-2" />
                            Inactive
                        </>
                    )}
                </div>
            </div>

            {/* Default Badge - Top Right Corner */}
            {card.isDefault && (
                <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
                        <Star className="w-2 h-2 fill-current" />
                        Default
                    </div>
                </div>
            )}
        </div>
    );
};

const GlobalSpotlight = ({
    gridRef,
    disableAnimations = false,
    enabled = true,
    spotlightRadius = 300,
    glowColor = DEFAULT_GLOW_COLOR
}) => {
    const spotlightRef = useRef(null);
    const isInsideSection = useRef(false);

    useEffect(() => {
        if (disableAnimations || !gridRef?.current || !enabled) return;

        const spotlight = document.createElement('div');
        spotlight.className = 'global-spotlight';
        spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
        document.body.appendChild(spotlight);
        spotlightRef.current = spotlight;

        const handleMouseMove = e => {
            if (!spotlightRef.current || !gridRef.current) return;

            const section = gridRef.current.closest('.playlist-bento-section');
            const rect = section?.getBoundingClientRect();
            const mouseInside =
                rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

            isInsideSection.current = mouseInside || false;
            const cards = gridRef.current.querySelectorAll('.playlist-card');

            if (!mouseInside) {
                gsap.to(spotlightRef.current, {
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
                cards.forEach(card => {
                    card.style.setProperty('--glow-intensity', '0');
                });
                return;
            }

            const proximity = spotlightRadius * 0.5;
            const fadeDistance = spotlightRadius * 0.75;
            let minDistance = Infinity;

            cards.forEach(card => {
                const cardElement = card;
                const cardRect = cardElement.getBoundingClientRect();
                const centerX = cardRect.left + cardRect.width / 2;
                const centerY = cardRect.top + cardRect.height / 2;
                const distance =
                    Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
                const effectiveDistance = Math.max(0, distance);

                minDistance = Math.min(minDistance, effectiveDistance);

                let glowIntensity = 0;
                if (effectiveDistance <= proximity) {
                    glowIntensity = 1;
                } else if (effectiveDistance <= fadeDistance) {
                    glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
                }

                const relativeX = ((e.clientX - cardRect.left) / cardRect.width) * 100;
                const relativeY = ((e.clientY - cardRect.top) / cardRect.height) * 100;

                cardElement.style.setProperty('--glow-x', `${relativeX}%`);
                cardElement.style.setProperty('--glow-y', `${relativeY}%`);
                cardElement.style.setProperty('--glow-intensity', glowIntensity.toString());
                cardElement.style.setProperty('--glow-radius', `${spotlightRadius}px`);
            });

            gsap.to(spotlightRef.current, {
                left: e.clientX,
                top: e.clientY,
                duration: 0.1,
                ease: 'power2.out'
            });

            const targetOpacity =
                minDistance <= proximity
                    ? 0.8
                    : minDistance <= fadeDistance
                        ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
                        : 0;

            gsap.to(spotlightRef.current, {
                opacity: targetOpacity,
                duration: targetOpacity > 0 ? 0.2 : 0.5,
                ease: 'power2.out'
            });
        };

        const handleMouseLeave = () => {
            isInsideSection.current = false;
            gridRef.current?.querySelectorAll('.playlist-card').forEach(card => {
                card.style.setProperty('--glow-intensity', '0');
            });
            if (spotlightRef.current) {
                gsap.to(spotlightRef.current, {
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
        };
    }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

    return null;
};

const PlaylistMagicBento = ({
    cards,
    onEdit,
    onDelete,
    onSetDefault,
    onAddPlaylist,
    onRefresh,
    isPending,
    glowColor = DEFAULT_GLOW_COLOR,
    particleCount = DEFAULT_PARTICLE_COUNT,
    enableSpotlight = true,
    enableBorderGlow = true,
    enableStars = true,
    enableTilt = true,
    enableMagnetism = true,
    clickEffect = true,
    spotlightRadius = 300
}) => {
    const gridRef = useRef(null);

    return (
        <>
            <style>
                {`
          .playlist-bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: 200px;
            --glow-color: ${glowColor};
            --border-color: #392e4e;
            --background-dark: #060010;
            --white: hsl(0, 0%, 100%);
            --purple-primary: rgba(132, 0, 255, 1);
            --purple-glow: rgba(132, 0, 255, 0.2);
            --purple-border: rgba(132, 0, 255, 0.8);
          }
          
          .playlist-card--border-glow::after {
            content: '';
            position: absolute;
            inset: 0;
            padding: 6px;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.8)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 30%,
                transparent 60%);
            border-radius: inherit;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: subtract;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 1;
          }
          
          .playlist-card--border-glow:hover::after {
            opacity: 1;
          }
          
          .playlist-card--border-glow:hover {
            box-shadow: 0 4px 20px rgba(46, 24, 78, 0.4), 0 0 30px rgba(${glowColor}, 0.2);
          }
        `}
            </style>

            {enableSpotlight && (
                <GlobalSpotlight
                    gridRef={gridRef}
                    disableAnimations={false}
                    enabled={enableSpotlight}
                    spotlightRadius={spotlightRadius}
                    glowColor={glowColor}
                />
            )}
            <div className="playlist-bento-section">
                <div className="playlist-card-grid" ref={gridRef}>
                    <AnimatePresence mode="popLayout">
                        {cards.map((card, index) => (
                            <motion.div
                                key={card.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.8,
                                    y: -20,
                                    transition: { duration: 0.3 }
                                }}
                                transition={{ duration: 0.5, delay: 0.25 + index * 0.09 }}
                                whileHover={{
                                    scale: 1.02,
                                    transition: { duration: 0.2 }
                                }}
                            >
                                <PlaylistCard
                                    card={card}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onSetDefault={onSetDefault}
                                    onAddPlaylist={onAddPlaylist}
                                    onRefresh={onRefresh}
                                    isPending={isPending}
                                    particleCount={particleCount}
                                    glowColor={glowColor}
                                    enableBorderGlow={enableBorderGlow}
                                    enableStars={enableStars}
                                    enableTilt={enableTilt}
                                    enableMagnetism={enableMagnetism}
                                    clickEffect={clickEffect}
                                    className="group"
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};

export default PlaylistMagicBento;
