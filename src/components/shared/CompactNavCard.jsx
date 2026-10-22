import React from 'react';
import { motion } from 'framer-motion';

const CompactNavCard = ({ title, label, icon: Icon, color, onClick, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
            onClick={onClick}
            className="bg-white dark:bg-dark-surface rounded-[1.5rem] p-6 shadow-sm shadow-gray-200/50 hover:shadow-md hover:shadow-gray-200/60 transition-all cursor-pointer border-none group"
        >
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium text-sm block mb-1">
                        {label}
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">
                        {title}
                    </h3>
                </div>
                <div className={`p-4 rounded-2xl ${color || 'bg-brand-primary/10 text-brand-primary dark:text-blue-400'} transition-transform group-hover:scale-110`}>
                    <Icon size={28} strokeWidth={2} />
                </div>
            </div>
        </motion.div>
    );
};

export default CompactNavCard;
