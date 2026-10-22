import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const StatsCard = ({ title, value, change, icon: Icon, trend, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-surface rounded-[1.5rem] py-3 px-4 md:px-6 transition-all duration-200 min-w-fit lg:min-w-0"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title || "N/A"}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? 0}</h3>
            {change && (
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}
              >
                {trend === "up" ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowDownRight size={14} />
                )}
                {change}
              </div>
            )}
          </div>
        </div>
        <div
          className={`p-3 rounded-xl ${color.bg} ${color.text} transition-transform duration-300`}
        >
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
