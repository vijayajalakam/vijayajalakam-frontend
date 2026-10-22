import React from 'react';
import { ChevronRight } from 'lucide-react';

const InfoRow = ({ title, subtitle, icon: Icon, onClick, color }) => {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors cursor-pointer border-b border-gray-100 dark:border-dark-border last:border-0 first:rounded-t-2xl last:rounded-b-2xl"
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${color || 'bg-brand-primary/10 text-brand-primary dark:text-blue-400'}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base">{title}</h3>
                    {subtitle && <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-0.5">{subtitle}</p>}
                </div>
            </div>

            <div className="text-gray-400 dark:text-gray-500">
                <ChevronRight size={18} />
            </div>
        </div>
    );
};

export default InfoRow;
