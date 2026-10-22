import React from "react";
import { motion } from "framer-motion";

const SettingsSection = ({ title, icon: Icon, subtitle, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-dark-card rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 mb-6 shadow-none"
  >
    <div className="flex items-center justify-between gap-3 mb-6 border-b border-gray-100 dark:border-dark-border pb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{subtitle}</p>}
        </div>
      </div>
    </div>
    {/* If children is a grid, it should be defined inside the children itself. But to match ConfigurationSettings, let's keep it flexible or use the same grid. */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </motion.div>
);

export default SettingsSection;
