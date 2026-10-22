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
 * Full-screen skeleton for the Profile screen
 * Matches: Header with name + avatar → Wallet card → Menu items → Logout
 */
const ProfileScreenSkeleton = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface pb-24">
      <div className="px-3 pt-9 pb-6">
        {/* Header: Name + Avatar */}
        <div className="flex items-center justify-between mb-5 px-3">
          <div className="space-y-2">
            <Shimmer className="h-7 w-40 rounded-lg" />
            <Shimmer className="h-4 w-28 rounded-md" />
          </div>
          <Shimmer className="w-12 h-12 rounded-full flex-shrink-0" />
        </div>

        {/* Wallet Card */}
        <div className="rounded-[18px] overflow-hidden mb-5 mx-3">
          <Shimmer className="w-full" style={{ height: "130px" }} />
        </div>

        {/* Main Menu Items */}
        <div className="mx-3 rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden mb-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-[18px]"
              style={{ borderBottom: i < 4 ? "1px solid #f5f5f5" : "none" }}
            >
              <div className="flex items-center gap-4">
                <Shimmer className="w-[22px] h-[22px] rounded-md" />
                <Shimmer className="h-4 w-32 rounded-md" />
              </div>
              <Shimmer className="w-4 h-4 rounded-sm" />
            </div>
          ))}
        </div>

        {/* Secondary Menu (Support) */}
        <div className="mx-3 rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden mb-3.5">
          <div className="flex items-center justify-between px-4 py-[18px]">
            <div className="flex items-center gap-4">
              <Shimmer className="w-[22px] h-[22px] rounded-md" />
              <Shimmer className="h-4 w-20 rounded-md" />
            </div>
            <Shimmer className="w-4 h-4 rounded-sm" />
          </div>
        </div>

        {/* Logout */}
        <div className="mx-3 rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-[18px]">
            <div className="flex items-center gap-4">
              <Shimmer className="w-[22px] h-[22px] rounded-md" />
              <Shimmer className="h-4 w-16 rounded-md" />
            </div>
            <Shimmer className="w-4 h-4 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreenSkeleton;
