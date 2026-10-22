import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const HomeBanner = ({ banners }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    // Auto-slide logic
    useEffect(() => {
        if (!banners || banners.length <= 1) return;

        const timer = setInterval(() => {
            setDirection(1);
            setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
        }, 6000); // Slightly longer for a peaceful feel

        return () => clearInterval(timer);
    }, [banners]);

    // Safeguard
    if (!banners || !Array.isArray(banners) || banners.length === 0) {
        return null;
    }

    const goToSlide = (index) => {
        if (index === currentIndex) return;
        setDirection(index > currentIndex ? 1 : -1);
        setCurrentIndex(index);
    };

    const banner = banners[currentIndex];
    if (!banner) return null;

    const slideVariants = {
        enter: () => ({
            opacity: 0,
            scale: 1.05
        }),
        center: {
            zIndex: 1,
            opacity: 1,
            scale: 1,
            transition: {
                opacity: { duration: 0.8, ease: "easeInOut" },
                scale: { duration: 1.2, ease: "easeOut" }
            }
        },
        exit: () => ({
            zIndex: 0,
            opacity: 0,
            transition: {
                opacity: { duration: 0.8, ease: "easeInOut" }
            }
        })
    };

    return (
        <div className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 mb-8">
            {/* Ultra-Clean, Shadow-less Banner Container */}
            <div className="relative h-[220px] sm:h-[260px] lg:h-[300px] w-full rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="absolute inset-0 w-full h-full"
                    >
                        {/* Background Layer with Soft Fade */}
                        <div className="absolute inset-0 z-0">
                            {banner.image?.url && (
                                <img 
                                    src={banner.image.url} 
                                    alt={banner.title || 'Banner'} 
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </div>

                        {/* Content Layer - Centered & Elegant */}
                        <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="max-w-2xl space-y-4">
                                <motion.h1 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.8 }}
                                    className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight"
                                >
                                    {banner.title}
                                </motion.h1>

                                {banner.subtitle && (
                                    <motion.p 
                                        className="text-[10px] sm:text-xs text-white/80 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-3 sm:mt-4 max-w-lg mx-auto px-4"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.2 }}
                                    >
                                        {banner.subtitle}
                                    </motion.p>
                                )}

                                {banner.buttonName && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.6, duration: 0.8 }}
                                        className="pt-2 flex justify-center"
                                    >
                                        <a 
                                            href={banner.buttonUrl || '#'}
                                            className="group relative px-8 sm:px-10 py-3 rounded-full overflow-hidden transition-all duration-500"
                                            style={{ backgroundColor: banner.buttonColor || '#3b82f6' }}
                                        >
                                            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                                {banner.buttonName}
                                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                            </div>
                                            <div className="absolute inset-0 bg-white dark:bg-dark-surface/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        </a>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Minimalist Dotted Navigation - Integrated Inside Bottom */}
                {banners.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
                        {banners.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => goToSlide(idx)}
                                className="group py-2"
                            >
                                <div className={`h-[2px] transition-all duration-700 ${
                                    currentIndex === idx 
                                    ? 'w-8 bg-white dark:bg-dark-surface' 
                                    : 'w-4 bg-white dark:bg-dark-surface/30 hover:bg-white dark:bg-dark-surface/50'
                                }`} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeBanner;
