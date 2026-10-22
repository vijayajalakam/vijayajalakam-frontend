import React from "react";
import { motion } from "framer-motion";

/**
 * Shimmer block component with animated gradient sweep
 */
const Shimmer = ({ className = "", style = {} }) => (
  <motion.div
    className={`relative overflow-hidden bg-gray-200 dark:bg-dark-border/70 ${className}`}
    style={style}
    animate={{ opacity: [0.5, 0.8, 0.5] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      animate={{ x: ["-150%", "150%"] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
    />
  </motion.div>
);

/**
 * Full-screen skeleton for the Search / Explore screen
 * Matches: Search bar → Map area → Bottom sheet with venue cards
 */
const SearchScreenSkeleton = () => {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-dark-surface">
      {/* Search Header */}
      <div className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 z-20">
        <div className="bg-white dark:bg-dark-surface rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-dark-border/80 px-4 py-3 flex items-center gap-3">
          <Shimmer className="w-6 h-6 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Shimmer className="h-4 w-48 rounded-md" />
            <Shimmer className="h-3 w-28 rounded-md" />
          </div>
          <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
        </div>
      </div>

      {/* Map Area Skeleton */}
      <div className="flex-1 relative">
        <Shimmer className="w-full h-full" style={{ borderRadius: 0 }} />
        {/* Fake map markers */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Simulated map grid lines */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/4 left-0 right-0 h-px bg-gray-400" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-400" />
              <div className="absolute top-3/4 left-0 right-0 h-px bg-gray-400" />
              <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-400" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400" />
              <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-400" />
            </div>
            {/* Marker placeholders */}
            <Shimmer
              className="absolute rounded-full"
              style={{ width: "14px", height: "14px", top: "35%", left: "45%" }}
            />
            <Shimmer
              className="absolute rounded-full"
              style={{ width: "40px", height: "24px", top: "50%", left: "55%", borderRadius: "20px" }}
            />
            <Shimmer
              className="absolute rounded-full"
              style={{ width: "40px", height: "24px", top: "30%", left: "65%", borderRadius: "20px" }}
            />
            <Shimmer
              className="absolute rounded-full"
              style={{ width: "14px", height: "14px", top: "60%", left: "35%" }}
            />
          </div>
        </div>
        {/* Recenter button */}
        <div className="absolute z-10 right-4 bottom-[440px]">
          <Shimmer className="w-12 h-12 rounded-full" />
        </div>
      </div>

      {/* Bottom Sheet */}
      <div
        className="absolute left-0 right-0 bg-white dark:bg-dark-surface rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.1)] z-20 flex flex-col overflow-hidden"
        style={{ bottom: "56px", height: "420px" }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-9 h-[5px] bg-gray-300 rounded-full" />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-hidden shrink-0">
          <Shimmer className="h-8 w-12 rounded-full flex-shrink-0" />
          <Shimmer className="h-8 w-16 rounded-full flex-shrink-0" />
          <Shimmer className="h-8 w-20 rounded-full flex-shrink-0" />
          <Shimmer className="h-8 w-14 rounded-full flex-shrink-0" />
          <Shimmer className="h-8 w-18 rounded-full flex-shrink-0" />
        </div>

        {/* Venue Count */}
        <div className="px-4 pb-2 shrink-0 flex justify-center">
          <Shimmer className="h-4 w-28 rounded-md" />
        </div>

        {/* Shop Cards */}
        <div className="flex-1 overflow-hidden px-4 pb-6 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              {/* Shop Image */}
              <Shimmer
                className="w-full rounded-2xl mb-3"
                style={{ aspectRatio: "16/9" }}
              />
              {/* Shop Info */}
              <div className="flex justify-between items-start mb-1.5">
                <Shimmer className="h-5 w-2/3 rounded-md" />
                <div className="flex items-center gap-1">
                  <Shimmer className="w-4 h-4 rounded-full" />
                  <Shimmer className="h-4 w-8 rounded-md" />
                </div>
              </div>
              <Shimmer className="h-3 w-1/2 rounded-md mb-1" />
              <Shimmer className="h-3 w-2/3 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="h-14 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border flex items-center justify-around px-4 shrink-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Shimmer className="w-6 h-6 rounded-md" />
            <Shimmer className="w-10 h-2.5 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchScreenSkeleton;
