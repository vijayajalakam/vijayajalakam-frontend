import React from 'react';
import { User, Trophy } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

const PerformanceList = ({ items = [], type = 'staff' }) => {
  const { currencySymbol } = useAuth();

  if (!items || items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic opacity-40 py-8">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border shadow-none hover:bg-gray-100/70 dark:hover:bg-dark-card/60 transition-all duration-200 group">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0
              ${index === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                index === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              }
            `}>
              {index < 3 ? <Trophy size={18} /> : `#${index + 1}`}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
            {type === 'customer' && (
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate">
                {item.phone || item.email || 'No contact info'}
              </p>
            )}
          </div>
          
          <div className="text-right shrink-0">
            {type === 'staff' ? (
              <div className="flex flex-col items-end">
                <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                  {item.count || 0} <span className="text-[10px] font-medium text-gray-500">jobs</span>
                </p>
                {item.invoiceCount !== undefined && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                    {item.invoiceCount || 0} <span className="text-[10px] font-medium text-gray-500">inv.</span>
                    {item.invoiceRevenue > 0 && (
                      <span className="notranslate text-emerald-500/80 dark:text-emerald-400/80 ml-1">
                        ({currencySymbol}{(item.invoiceRevenue || 0).toLocaleString()})
                      </span>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate leading-tight">
                  {currencySymbol}{item.totalSpent?.toLocaleString() || 0}
                </p>
                {item.loyaltyPoints > 0 && (
                  <p className="text-[11px] font-bold text-amber-500 mt-0.5 leading-tight flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {parseFloat(Number(item.loyaltyPoints).toFixed(2))} pts
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PerformanceList;
