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
 * Full-screen skeleton for the Booking Details screen
 * Matches: Hero image with shop name → Confirmed badge → Date/time → Quick actions → Overview with services
 */
const BookingDetailsScreenSkeleton = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface pb-20">
      {/* Hero Image Skeleton */}
      <div className="relative h-[280px] w-full overflow-hidden">
        <Shimmer className="w-full h-full" style={{ borderRadius: 0 }} />

        {/* Close button */}
        <div className="absolute top-4 right-4">
          <Shimmer className="w-[38px] h-[38px] rounded-full" />
        </div>

        {/* Shop name on image */}
        <div className="absolute bottom-5 left-5 right-5">
          <Shimmer className="h-7 w-40 rounded-lg mb-2" />
          <Shimmer className="h-3.5 w-56 rounded-md" />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-8">
        {/* Confirmed pill */}
        <Shimmer className="h-7 w-28 rounded-full mb-4" />

        {/* Date & Time */}
        <Shimmer className="h-7 w-64 rounded-lg mb-2" />
        {/* Duration */}
        <Shimmer className="h-4 w-32 rounded-md mb-6" />

        {/* Quick Actions */}
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{ border: "1.5px solid #f0f0f0" }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-4"
              style={{ borderBottom: i < 4 ? "1px solid #f5f5f5" : "none" }}
            >
              <div className="flex items-center gap-3">
                <Shimmer className="w-10 h-10 rounded-full" />
                <Shimmer className="h-4 w-32 rounded-md" />
              </div>
              <Shimmer className="w-3 h-5 rounded-sm" />
            </div>
          ))}
        </div>

        {/* Overview Title */}
        <Shimmer className="h-6 w-24 rounded-lg mb-3" />

        {/* Services List */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ border: "1.5px solid #f0f0f0" }}
        >
          {/* Service items */}
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start justify-between py-2.5">
              <div className="flex-1 min-w-0 pr-3 space-y-1.5">
                <Shimmer className="h-4 w-36 rounded-md" />
                <Shimmer className="h-3 w-16 rounded-md" />
              </div>
              <Shimmer className="h-4 w-14 rounded-md flex-shrink-0" />
            </div>
          ))}

          {/* Totals */}
          <div className="border-t border-gray-100 dark:border-dark-border mt-3 pt-3 space-y-2.5">
            <div className="flex justify-between">
              <Shimmer className="h-3.5 w-16 rounded-md" />
              <Shimmer className="h-3.5 w-14 rounded-md" />
            </div>
            <div className="flex justify-between pt-1">
              <Shimmer className="h-4 w-12 rounded-md" />
              <Shimmer className="h-4 w-16 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsScreenSkeleton;
