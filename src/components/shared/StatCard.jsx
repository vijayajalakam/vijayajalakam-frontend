import React from "react";
import { motion as Motion } from "framer-motion";
import Skeleton from "./Skeleton";

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  delay = 0,
  loading = false,
}) => {
  if (loading) {
    return (
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-white dark:bg-dark-surface rounded-[1.5rem] py-3.5 px-5 h-full flex flex-col justify-center"
      >
        <div className="flex items-center gap-4">
          <Skeleton width="40px" height="40px" borderRadius="0.75rem" />
          <div className="space-y-2 flex-1">
            <Skeleton width="60%" height="10px" />
            <Skeleton width="80%" height="20px" />
          </div>
        </div>
      </Motion.div>
    );
  }

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="bg-white dark:bg-dark-surface rounded-[1.5rem] py-3.5 px-5 border border-gray-100 dark:border-dark-border shadow-none transition-all duration-200 h-full flex flex-col justify-center"
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-xl ${color || "bg-blue-50 dark:bg-blue-900/20 text-blue-600"} flex-shrink-0`}
        >
          {Icon && <Icon size={20} />}
        </div>
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block truncate">
            {label || "N/A"}
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none">
            {value ?? 0}
          </h3>
        </div>
      </div>
    </Motion.div>
  );
};

export default StatCard;
