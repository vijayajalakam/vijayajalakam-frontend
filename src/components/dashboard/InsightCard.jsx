import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const InsightCard = ({ title, content, type = 'info' }) => {
  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <Info size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
        );
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border shadow-none">
      {renderIcon()}
      <div className="flex-1 min-w-0 mt-0.5">
        {title && <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{title}</h4>}
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">{content}</p>
      </div>
    </div>
  );
};

export default InsightCard;
