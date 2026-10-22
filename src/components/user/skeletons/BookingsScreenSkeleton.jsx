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
 * Full-screen skeleton for the Bookings / Activity screen
 * Matches: Header with title → Upcoming section with image cards → Past section with list items
 */
const BookingsScreenSkeleton = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface pb-24">
      {/* Sticky App Bar */}
      <div className="sticky top-0 z-20 bg-white dark:bg-dark-surface">
        <div className="flex items-center justify-between px-4 h-[56px]">
          <Shimmer className="h-5 w-16 rounded-md" style={{ opacity: 0 }} />
          <Shimmer className="w-9 h-9 rounded-full" style={{ opacity: 0 }} />
        </div>
      </div>

      {/* Header */}
      <div className="pt-2 px-5 pb-5 flex items-center justify-between">
        <Shimmer className="h-8 w-28 rounded-lg" />
        <Shimmer className="w-[42px] h-[42px] rounded-full" />
      </div>

      <div className="px-5 space-y-8">
        {/* Upcoming Section */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <Shimmer className="h-5 w-24 rounded-md" />
            <Shimmer className="w-[22px] h-[22px] rounded-full" />
          </div>

          {/* Upcoming Booking Cards */}
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid #f5f5f5" }}
              >
                {/* Image */}
                <Shimmer className="w-full" style={{ height: "160px" }} />

                {/* Details */}
                <div className="p-4 bg-white dark:bg-dark-surface">
                  {/* Date & Time */}
                  <Shimmer className="h-4 w-48 rounded-md mb-2" />
                  {/* Duration, price, service */}
                  <Shimmer className="h-3.5 w-64 rounded-md mb-1.5" />
                  {/* Address */}
                  <Shimmer className="h-3 w-44 rounded-md mb-4" />

                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <Shimmer className="h-9 w-32 rounded-full" />
                    <Shimmer className="w-[38px] h-[38px] rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past Section */}
        <section>
          <Shimmer className="h-5 w-12 rounded-md mb-4" />

          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                {/* Thumbnail */}
                <Shimmer
                  className="flex-shrink-0 rounded-xl"
                  style={{ width: "56px", height: "56px" }}
                />
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Shimmer className="h-4 w-36 rounded-md" />
                  <Shimmer className="h-3 w-44 rounded-md" />
                  <Shimmer className="h-3 w-28 rounded-md" />
                </div>
                {/* Rebook button */}
                <Shimmer className="h-8 w-20 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BookingsScreenSkeleton;
