import React from "react";
import { motion } from "framer-motion";

const Skeleton = ({
  className = "",
  width,
  height,
  borderRadius = "0.5rem",
}) => {
  return (
    <motion.div
      className={`bg-gray-200 dark:bg-dark-card overflow-hidden relative ${className}`}
      style={{ width, height, borderRadius }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent"
        animate={{
          x: ["-150%", "150%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};

export const StatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-dark-surface rounded-[1.5rem] py-3.5 px-5 border border-gray-100 dark:border-dark-border h-full flex flex-col justify-center shadow-none"
        >
          <div className="flex items-center gap-4">
            <Skeleton width="40px" height="40px" borderRadius="0.75rem" />
            <div className="space-y-2 flex-1">
              <Skeleton width="60%" height="10px" />
              <Skeleton width="80%" height="20px" />
            </div>
          </div>
        </div>
      ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="w-full bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
    <div className="bg-gray-50/50 dark:bg-dark-card/50 px-6 py-4 border-b border-gray-100 dark:border-dark-border flex gap-4">
      {Array(cols)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} width="15%" height="16px" />
        ))}
    </div>
    <div className="divide-y divide-gray-100 dark:divide-dark-border px-6">
      {Array(rows)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="py-4 flex gap-4 items-center">
            {Array(cols)
              .fill(0)
              .map((_, j) => (
                <Skeleton key={j} width="15%" height="14px" />
              ))}
          </div>
        ))}
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-white dark:bg-dark-surface p-6 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-dark-border w-full h-[400px] flex flex-col">
    <div className="flex justify-between mb-8">
      <div>
        <Skeleton width="150px" height="20px" className="mb-2" />
        <Skeleton width="100px" height="12px" />
      </div>
      <Skeleton width="40px" height="40px" borderRadius="0.75rem" />
    </div>
    <div className="flex-1 flex items-end gap-4 px-4 overflow-hidden">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton
          key={i}
          width="100%"
          height={`${[40, 70, 45, 80, 55, 90, 35, 65][i - 1]}%`}
          borderRadius="0.5rem 0.5rem 0 0"
        />
      ))}
    </div>
  </div>
);

export const TimelineSkeleton = ({ items = 3 }) => (
  <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-gray-100 dark:bg-dark-card pl-2">
    {Array(items)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="relative pl-8">
          <div className="absolute left-[13px] top-6 w-3.5 h-3.5 rounded-full border-[3px] border-white z-10 bg-gray-200 dark:bg-dark-border" />
          <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton
                width="3.5rem"
                height="3rem"
                borderRadius="0.75rem"
                className="flex-shrink-0"
              />
              <div className="space-y-2 flex-1">
                <Skeleton width="60%" height="16px" />
                <Skeleton width="40%" height="12px" />
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <Skeleton width="32px" height="32px" borderRadius="0.5rem" />
              <Skeleton width="32px" height="32px" borderRadius="0.5rem" />
            </div>
          </div>
        </div>
      ))}
  </div>
);

export const ManagerCardSkeleton = ({ count = 8 }) => (
  <div className="flex flex-wrap gap-6">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-dark-surface px-4 py-3 rounded-xl flex items-center gap-3 border border-transparent dark:border-dark-border min-w-[140px] w-auto h-[50px]"
        >
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton width="80px" height="14px" />
            <Skeleton width="40px" height="10px" />
          </div>
        </div>
      ))}
  </div>
);

export const ShopSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-dark-surface rounded-[1.2rem] border border-gray-100 dark:border-dark-border overflow-hidden flex flex-col h-[400px]"
        >
          <Skeleton width="100%" height="192px" borderRadius="0" />
          <div className="p-5 flex-1 flex flex-col gap-4">
            <div>
              <Skeleton width="60%" height="20px" className="mb-2" />
              <Skeleton width="40%" height="12px" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton width="100%" height="50px" borderRadius="0.75rem" />
                <Skeleton width="100%" height="50px" borderRadius="0.75rem" />
              </div>
              <Skeleton width="100%" height="100px" borderRadius="0.8rem" />
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-dark-border flex gap-2">
              <Skeleton width="100%" height="40px" borderRadius="0.75rem" />
            </div>
          </div>
        </div>
      ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-dark-surface rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 shadow-none">
      <div className="flex items-center justify-between gap-3 mb-6 border-b border-gray-100 dark:border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <Skeleton width="36px" height="36px" borderRadius="0.5rem" />
          <Skeleton width="180px" height="24px" />
        </div>
        <Skeleton width="120px" height="36px" borderRadius="0.75rem" />
      </div>
      <div className="col-span-full mb-4 flex flex-col items-center">
        <Skeleton
          width="128px"
          height="128px"
          borderRadius="9999px"
          className="mb-4"
        />
        <Skeleton width="80px" height="14px" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} width="100%" height="56px" borderRadius="1rem" />
          ))}
      </div>
    </div>
  </div>
);

export const PrinterSkeleton = () => (
  <div className="flex flex-col xl:flex-row gap-8 min-h-screen pb-20">
    <div className="flex-1 space-y-6">
      <div className="bg-white dark:bg-dark-surface rounded-[2rem] border border-gray-100 dark:border-dark-border p-8">
        <div className="flex justify-between mb-10">
          <div className="space-y-2">
            <Skeleton width="200px" height="28px" />
            <Skeleton width="300px" height="16px" />
          </div>
          <div className="flex gap-3">
            <Skeleton width="80px" height="40px" borderRadius="0.75rem" />
            <Skeleton width="80px" height="40px" borderRadius="0.75rem" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-10 pb-8 border-b border-gray-100 dark:border-dark-border">
          <div className="md:col-span-6">
            <Skeleton width="100%" height="45px" borderRadius="0.75rem" />
          </div>
          <div className="md:col-span-3">
            <Skeleton width="100%" height="45px" borderRadius="0.75rem" />
          </div>
          <div className="md:col-span-3">
            <Skeleton width="100%" height="45px" borderRadius="0.75rem" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton width="120px" height="16px" className="mb-4" />
                {Array(5)
                  .fill(0)
                  .map((_, j) => (
                    <Skeleton
                      key={j}
                      width="100%"
                      height="50px"
                      borderRadius="1.5rem"
                    />
                  ))}
              </div>
            ))}
        </div>
      </div>
    </div>
    <div className="xl:w-[380px] space-y-6">
      <Skeleton width="100%" height="600px" borderRadius="1.5rem" />
    </div>
  </div>
);

export const CalendarSkeleton = ({ columns = 4 }) => (
  <div className="w-full flex overflow-hidden border border-gray-100 dark:border-dark-border rounded-2xl bg-white dark:bg-dark-surface h-[500px]">
    {/* Time Column */}
    <div className="w-[80px] border-r border-gray-100 dark:border-dark-border flex flex-col bg-gray-50 dark:bg-dark-card shrink-0 hidden md:flex">
      <div className="h-14 border-b border-gray-100 dark:border-dark-border" />
      {Array(6).fill(0).map((_, i) => (
        <div key={`time-${i}`} className="h-[90px] p-2 flex justify-center items-start border-b border-gray-100 dark:border-dark-border">
          <Skeleton width="40px" height="12px" />
        </div>
      ))}
    </div>
    {/* Staff Columns */}
    <div className="flex-1 flex overflow-hidden">
      {Array(columns).fill(0).map((_, i) => (
        <div key={`col-${i}`} className="flex-1 min-w-[130px] border-r border-gray-100 dark:border-dark-border flex flex-col">
          <div className="h-14 border-b border-gray-100 dark:border-dark-border flex items-center justify-center gap-2 bg-gray-50 dark:bg-dark-card p-2">
            <Skeleton width="24px" height="24px" borderRadius="50%" />
            <Skeleton width="60px" height="14px" />
          </div>
          <div className="flex-1 flex flex-col p-2 gap-2">
            {i % 2 === 0 ? (
              <>
                <div className="h-8" />
                <Skeleton width="100%" height="80px" borderRadius="12px" />
                <div className="h-12" />
                <Skeleton width="100%" height="60px" borderRadius="12px" />
              </>
            ) : (
              <>
                <Skeleton width="100%" height="60px" borderRadius="12px" />
                <div className="h-24" />
                <Skeleton width="100%" height="100px" borderRadius="12px" />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const StaffSkeleton = ({ count = 6 }) => (
  <div className="w-full bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
    <div className="bg-gray-50 dark:bg-dark-card/50 px-6 py-4 flex gap-4">
      <Skeleton width="60px" height="16px" />
      <Skeleton width="200px" height="16px" />
      <Skeleton width="150px" height="16px" />
      <Skeleton width="150px" height="16px" />
      <Skeleton width="120px" height="16px" />
    </div>
    <div className="divide-y divide-gray-100 px-6">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="py-4 flex gap-4 items-center">
            <Skeleton
              width="48px"
              height="48px"
              borderRadius="3rem"
              className="shrink-0"
            />
            <div className="flex-1 space-y-2 max-w-[200px]">
              <Skeleton width="80%" height="16px" />
              <Skeleton width="50%" height="10px" />
            </div>
            <div className="flex-1 space-y-2 max-w-[150px]">
              <Skeleton width="90%" height="14px" />
              <Skeleton width="70%" height="14px" />
            </div>
            <div className="flex-1 flex gap-2 max-w-[150px]">
              <Skeleton width="50px" height="20px" borderRadius="1rem" />
              <Skeleton width="50px" height="20px" borderRadius="1rem" />
            </div>
            <div className="flex-1 max-w-[120px]">
              <Skeleton width="80px" height="24px" />
            </div>
            <div className="flex gap-2 ml-auto">
              <Skeleton width="36px" height="36px" borderRadius="0.5rem" />
              <Skeleton width="36px" height="36px" borderRadius="0.5rem" />
            </div>
          </div>
        ))}
    </div>
  </div>
);

export const ServicesSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-dark-surface rounded-[1.5rem] border border-gray-100 dark:border-dark-border overflow-hidden flex flex-col h-full"
        >
          <Skeleton width="100%" height="128px" borderRadius="0" />
          <div className="p-3 flex-1 flex flex-col gap-2">
            <Skeleton width="80%" height="14px" />
            {/* Tax Badge placeholder */}
            <Skeleton width="40px" height="12px" borderRadius="4px" />
            <div className="mt-auto flex justify-between items-center">
              <Skeleton width="50px" height="12px" />
              <div className="flex flex-col items-end gap-1">
                <Skeleton width="40px" height="16px" />
              </div>
            </div>
          </div>
        </div>
      ))}
  </div>
);

export const RegionalSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-white dark:bg-dark-surface rounded-[2rem] p-8 border border-gray-100 dark:border-dark-border space-y-8 shadow-none">
      <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
        <Skeleton width="36px" height="36px" borderRadius="0.75rem" />
        <Skeleton width="150px" height="24px" />
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton width="100px" height="12px" />
            <Skeleton width="100%" height="45px" borderRadius="0.75rem" />
          </div>
        ))}
      </div>
    </div>
    <div className="bg-gray-50 dark:bg-dark-card/50 rounded-[2rem] p-8 border border-gray-100 dark:border-dark-border flex flex-col items-center justify-center text-center space-y-6 shadow-none">
      <Skeleton
        width="80px"
        height="80px"
        borderRadius="1.5rem"
        className="mb-2"
      />
      <Skeleton width="200px" height="24px" />
      <div className="space-y-4 w-full max-w-[250px]">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-dark-border last:border-0"
          >
            <Skeleton width="80px" height="16px" />
            <Skeleton width="100px" height="20px" />
          </div>
        ))}
      </div>
      <Skeleton width="250px" height="12px" className="mt-4" />
      <Skeleton width="200px" height="12px" />
    </div>
  </div>
);

export const ThemeSkeleton = () => (
  <div className="space-y-8">
    {/* Primary Color Section */}
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="100px" height="16px" />
        <Skeleton width="80px" height="12px" />
      </div>

      {/* Color Swatches Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Preset Color Circles */}
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton
            key={i}
            width="40px"
            height="40px"
            borderRadius="50%"
          />
        ))}
        
        {/* Custom Color Picker Button */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-200 via-yellow-200 to-blue-200 animate-pulse p-0.5">
          <div className="w-full h-full rounded-full bg-white dark:bg-dark-card flex items-center justify-center">
            <Skeleton width="12px" height="12px" />
          </div>
        </div>
      </div>
    </section>

    {/* Display Mode Section */}
    <section className="space-y-4">
      <Skeleton width="100px" height="16px" />
      
      <div className="flex flex-wrap gap-4">
        {/* Light Mode Card */}
        <div className="w-64 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-1.5">
          <div className="rounded-xl overflow-hidden">
            {/* Mock Browser Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-auto w-16 h-2 rounded-full bg-gray-100 dark:bg-gray-700" />
            </div>
            
            {/* Mock Content Area */}
            <div className="bg-gray-50 dark:bg-gray-950 px-4 py-5 flex gap-3">
              <div className="w-12 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    width="100%"
                    height="8px"
                    className={i === 2 ? "bg-blue-300 dark:bg-blue-500" : ""}
                  />
                ))}
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton width="100%" height="32px" borderRadius="0.5rem" />
                <div className="flex gap-2">
                  <Skeleton width="100%" height="24px" borderRadius="0.5rem" />
                  <Skeleton width="100%" height="24px" borderRadius="0.5rem" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Card Footer */}
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-2.5">
              <Skeleton width="36px" height="36px" borderRadius="0.75rem" />
              <div className="space-y-1">
                <Skeleton width="80px" height="16px" />
                <Skeleton width="60px" height="12px" />
              </div>
            </div>
            <Skeleton width="24px" height="24px" borderRadius="50%" />
          </div>
        </div>

        {/* Dark Mode Card */}
        <div className="w-64 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-1.5">
          <div className="rounded-xl overflow-hidden">
            {/* Mock Browser Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-auto w-16 h-2 rounded-full bg-gray-700" />
            </div>
            
            {/* Mock Content Area */}
            <div className="bg-gray-950 px-4 py-5 flex gap-3">
              <div className="w-12 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    width="100%"
                    height="8px"
                    className={i === 2 ? "bg-blue-500/40" : "bg-gray-700"}
                  />
                ))}
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton width="100%" height="32px" borderRadius="0.5rem" className="bg-gray-800" />
                <div className="flex gap-2">
                  <Skeleton width="100%" height="24px" borderRadius="0.5rem" className="bg-gray-800" />
                  <Skeleton width="100%" height="24px" borderRadius="0.5rem" className="bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Card Footer */}
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-2.5">
              <Skeleton width="36px" height="36px" borderRadius="0.75rem" className="bg-gray-700" />
              <div className="space-y-1">
                <Skeleton width="80px" height="16px" className="bg-gray-600" />
                <Skeleton width="60px" height="12px" className="bg-gray-700" />
              </div>
            </div>
            <Skeleton width="24px" height="24px" borderRadius="50%" className="bg-gray-600" />
          </div>
        </div>
      </div>
    </section>
  </div>
);

export const InvoiceListSkeleton = ({ count = 8 }) => (
  <div className="flex flex-col bg-white dark:bg-dark-surface border-y border-gray-100 dark:border-dark-border mb-4">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className="flex flex-row h-24 border-b last:border-b-0 border-gray-100 dark:border-white/5 bg-white dark:bg-dark-surface p-0"
        >
          <div className="w-24 h-24 shrink-0 p-3">
            <Skeleton width="100%" height="100%" borderRadius="12px" />
          </div>
          <div className="flex-1 flex flex-row items-center justify-between gap-4 py-3 pr-4">
            <div className="flex-1">
              <Skeleton width="60%" height="18px" />
              <Skeleton width="40px" height="14px" className="mt-2" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end gap-1">
                <Skeleton width="80px" height="20px" />
              </div>
            </div>
          </div>
        </div>
      ))}
  </div>
);

export const CardSkeleton = ServicesSkeleton;

export const SettingsPageSkeleton = () => (
  <div className="max-w-4xl space-y-6">
    <div className="flex gap-2 pb-2 overflow-x-auto">
      <Skeleton width="120px" height="40px" borderRadius="9999px" />
      <Skeleton width="100px" height="40px" borderRadius="9999px" />
      <Skeleton width="110px" height="40px" borderRadius="9999px" />
    </div>
    <div className="bg-white dark:bg-dark-card rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 shadow-none space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-dark-border pb-4">
        <Skeleton width="36px" height="36px" borderRadius="0.5rem" />
        <div className="space-y-2">
          <Skeleton width="150px" height="20px" />
          <Skeleton width="250px" height="12px" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton width="100%" height="80px" borderRadius="1rem" />
        <Skeleton width="100%" height="80px" borderRadius="1rem" />
        <Skeleton width="100%" height="80px" borderRadius="1rem" />
        <Skeleton width="100%" height="80px" borderRadius="1rem" />
      </div>
    </div>
  </div>
);

export default Skeleton;
