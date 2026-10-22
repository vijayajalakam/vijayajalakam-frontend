import React from "react";
import { motion } from "framer-motion";

/**
 * Shimmer block component with animated gradient sweep
 */
const Shimmer = ({ className = "", style = {} }) => (
  <motion.div
    className={`relative overflow-hidden bg-gray-100 dark:bg-dark-card ${className}`}
    style={style}
    animate={{ opacity: [0.6, 1, 0.6] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
      animate={{ x: ["-150%", "150%"] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
    />
  </motion.div>
);

/**
 * Desktop skeleton matching the actual shop profile layout:
 * Navbar → Breadcrumb → Title + Rating → 3-image grid → Tabs → Services + Sidebar
 */
const DesktopSkeleton = () => (
  <div className="hidden md:block min-h-screen bg-white dark:bg-dark-surface">
    {/* Top Navbar */}
    <div className="border-b border-gray-100 dark:border-dark-border">
      <div className="flex items-center h-[64px] max-w-[1400px] mx-auto px-4">
        {/* Logo */}
        <Shimmer className="h-6 w-[90px] rounded-md" />
        {/* Search bar */}
        <div className="flex-1 flex justify-center">
          <Shimmer className="h-[44px] w-full max-w-[520px] rounded-full" />
        </div>
        {/* Profile icon */}
        <Shimmer className="w-10 h-10 rounded-full ml-10" />
      </div>
    </div>

    {/* Breadcrumb */}
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <div className="flex items-center gap-2">
        <Shimmer className="h-4 w-12 rounded-md" />
        <Shimmer className="h-4 w-3 rounded-md" />
        <Shimmer className="h-4 w-24 rounded-md" />
      </div>
    </div>

    {/* Shop Title + Rating */}
    <div className="max-w-[1400px] mx-auto px-4 pb-5">
      <Shimmer className="h-10 w-[280px] rounded-lg mb-4" />
      <div className="flex items-center gap-3">
        <Shimmer className="h-5 w-8 rounded-md" />
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => <Shimmer key={i} className="w-4 h-4 rounded-sm" />)}
        </div>
        <Shimmer className="h-5 w-10 rounded-md" />
        <Shimmer className="h-5 w-3 rounded-full" />
        <Shimmer className="h-5 w-[200px] rounded-md" />
        <Shimmer className="h-5 w-3 rounded-full" />
        <Shimmer className="h-5 w-[180px] rounded-md" />
        <Shimmer className="h-5 w-[90px] rounded-md" />
        <div className="flex items-center gap-2 ml-auto">
          <Shimmer className="w-9 h-9 rounded-full" />
          <Shimmer className="w-9 h-9 rounded-full" />
        </div>
      </div>
    </div>

    {/* Image Gallery Grid - 3 images */}
    <div className="max-w-[1400px] mx-auto px-4 mb-10">
      <div className="grid gap-3" style={{ height: '480px', gridTemplateColumns: '65% 35%', gridTemplateRows: '1fr 1fr' }}>
        <Shimmer className="rounded-xl" style={{ gridRow: '1 / 3' }} />
        <Shimmer className="rounded-xl" />
        <Shimmer className="rounded-xl" />
      </div>
    </div>

    {/* Sticky Tabs */}
    <div className="max-w-[1400px] mx-auto px-4 border-b border-gray-100 dark:border-dark-border mb-8">
      <div className="flex gap-8 py-4">
        <Shimmer className="h-5 w-16 rounded-md" />
        <Shimmer className="h-5 w-18 rounded-md" />
        <Shimmer className="h-5 w-16 rounded-md" />
        <Shimmer className="h-5 w-14 rounded-md" />
        <Shimmer className="h-5 w-14 rounded-md" />
      </div>
    </div>

    {/* Content: Services + Sidebar */}
    <div className="max-w-[1400px] mx-auto px-4">
      <div className="flex gap-8">
        {/* Left: Services */}
        <div className="flex-1">
          {/* Section Title */}
          <Shimmer className="h-8 w-[120px] rounded-lg mb-6" />

          {/* Category Pills */}
          <div className="flex gap-3 mb-8">
            <Shimmer className="h-9 w-[80px] rounded-full" />
            <Shimmer className="h-9 w-[160px] rounded-full" />
            <Shimmer className="h-9 w-[130px] rounded-full" />
            <Shimmer className="h-9 w-[90px] rounded-full" />
            <Shimmer className="h-9 w-[140px] rounded-full" />
          </div>

          {/* Service Items */}
          <div className="space-y-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between py-5 border-b border-gray-100 dark:border-dark-border">
                <div className="flex-1">
                  <Shimmer className="h-5 w-[180px] rounded-md mb-2" />
                  <Shimmer className="h-4 w-[80px] rounded-md mb-1.5" />
                  <Shimmer className="h-4 w-[100px] rounded-md" />
                </div>
                <Shimmer className="h-10 w-[72px] rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sidebar Card */}
        <div className="w-[320px] flex-shrink-0">
          <div className="sticky top-[80px] rounded-2xl border border-gray-200 dark:border-dark-border p-6">
            <Shimmer className="h-7 w-[140px] rounded-lg mb-3" />
            <div className="flex items-center gap-2 mb-5">
              <Shimmer className="h-5 w-8 rounded-md" />
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Shimmer key={i} className="w-4 h-4 rounded-sm" />)}
              </div>
              <Shimmer className="h-5 w-8 rounded-md" />
            </div>
            <Shimmer className="h-12 w-full rounded-xl mb-5" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Shimmer className="w-5 h-5 rounded-full" />
                <Shimmer className="h-4 w-[180px] rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Shimmer className="w-5 h-5 rounded-full" />
                <Shimmer className="h-4 w-[160px] rounded-md" />
              </div>
              <Shimmer className="h-4 w-[100px] rounded-md ml-8" />
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shimmer className="w-8 h-8 rounded-full" />
                  <div>
                    <Shimmer className="h-4 w-[80px] rounded-md mb-1" />
                    <Shimmer className="h-3 w-[140px] rounded-md" />
                  </div>
                </div>
                <Shimmer className="h-4 w-[50px] rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Mobile skeleton matching the mobile layout:
 * Hero image → Shop info card → Tabs → Category pills → Service list
 */
const MobileSkeleton = () => (
  <div className="md:hidden min-h-screen bg-[#f8f9fa] font-sans pb-32">
    {/* Hero Image Skeleton */}
    <div className="relative h-[320px] w-full overflow-hidden">
      <Shimmer className="w-full h-full" style={{ borderRadius: 0 }} />
      {/* Top action buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <Shimmer className="w-11 h-11 rounded-full" />
        <div className="flex items-center gap-2">
          <Shimmer className="w-11 h-11 rounded-full" />
          <Shimmer className="w-11 h-11 rounded-full" />
        </div>
      </div>
      {/* Image counter badge */}
      <div className="absolute bottom-10 right-4">
        <Shimmer className="w-12 h-6 rounded-full" />
      </div>
    </div>

    {/* Main Content Card */}
    <div className="-mt-6 relative z-20 bg-white dark:bg-dark-surface rounded-t-[24px] px-5 pt-6 pb-4 shadow-sm">
      <Shimmer className="h-7 w-3/5 rounded-lg mb-2" />
      <Shimmer className="h-4 w-2/5 rounded-md mb-3" />
      <div className="flex items-center gap-2 mb-3">
        <Shimmer className="w-4 h-4 rounded-full" />
        <Shimmer className="h-4 w-10 rounded-md" />
        <Shimmer className="h-4 w-8 rounded-md" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Shimmer className="w-4 h-4 rounded-full" />
        <Shimmer className="h-4 w-48 rounded-md" />
      </div>
      <Shimmer className="h-14 w-full rounded-xl" />
    </div>

    {/* Navigation Tabs */}
    <div className="px-5 py-4 flex gap-4 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
      <Shimmer className="h-5 w-16 rounded-full" />
      <Shimmer className="h-5 w-14 rounded-full" />
      <Shimmer className="h-5 w-20 rounded-full" />
      <Shimmer className="h-5 w-16 rounded-full" />
      <Shimmer className="h-5 w-14 rounded-full" />
    </div>

    {/* Services Section */}
    <div className="bg-white dark:bg-dark-surface px-5 py-6 mt-2">
      <Shimmer className="h-6 w-32 rounded-lg mb-5" />
      <div className="flex gap-2 mb-6 overflow-hidden">
        <Shimmer className="h-9 w-20 rounded-full flex-shrink-0" />
        <Shimmer className="h-9 w-24 rounded-full flex-shrink-0" />
        <Shimmer className="h-9 w-16 rounded-full flex-shrink-0" />
        <Shimmer className="h-9 w-28 rounded-full flex-shrink-0" />
        <Shimmer className="h-9 w-20 rounded-full flex-shrink-0" />
      </div>
      <div className="space-y-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 items-start">
            <Shimmer className="flex-shrink-0 rounded-xl" style={{ width: "64px", height: "64px" }} />
            <div className="flex-1 space-y-2 py-1">
              <Shimmer className="h-4 w-3/4 rounded-md" />
              <Shimmer className="h-3 w-1/2 rounded-md" />
              <div className="flex items-center gap-3 pt-1">
                <Shimmer className="h-4 w-16 rounded-md" />
                <Shimmer className="h-4 w-12 rounded-md" />
              </div>
            </div>
            <Shimmer className="flex-shrink-0 rounded-full" style={{ width: "36px", height: "36px" }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Full-screen skeleton for the Home / Shop Profile screen
 * Shows desktop or mobile skeleton based on screen size
 */
const HomeScreenSkeleton = () => {
  return (
    <>
      <DesktopSkeleton />
      <MobileSkeleton />
    </>
  );
};

export default HomeScreenSkeleton;
