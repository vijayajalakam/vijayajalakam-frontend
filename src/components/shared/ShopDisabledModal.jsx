import React from 'react';
import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ShopDisabledModal = ({ isOpen }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md p-8 shadow-2xl text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />

                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-red-500" />
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                        Account Access Restricted
                    </h2>

                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        This shop account has been temporarily disabled by the administrator.
                        Please contact support or the platform administrator to resolve this issue.
                    </p>

                    <div className="bg-gray-50 dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border mb-6">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            Status: <span className="text-red-600 font-bold">Disabled</span>
                        </div>
                    </div>

                    <button
                        disabled
                        className="w-full py-3 px-4 bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 rounded-xl font-bold cursor-not-allowed text-sm"
                    >
                        Access Denied
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ShopDisabledModal;
