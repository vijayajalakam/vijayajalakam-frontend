import React from 'react';
import { motion } from 'framer-motion';

const DashboardSection = ({ title, subtitle, icon: Icon, iconColor, children, delay = 0.2, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white dark:bg-dark-surface p-6 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-none flex flex-col ${className}`}
    >
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={`p-2 rounded-lg ${iconColor || 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
              <Icon size={20} />
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </motion.div>
  );
};

export default DashboardSection;
