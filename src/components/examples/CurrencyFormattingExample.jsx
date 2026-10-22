import React from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { useAuth } from "../../features/auth/hooks/useAuth";


/**
 * Example component demonstrating currency formatting usage
 * This shows how to use the useCurrency hook across the application
 */
const CurrencyFormattingExample = () => {
  const { format, formatNumber, currencySymbol, decimalPrecision } = useCurrency();
  const { country } = useAuth();

  const exampleAmount = 1250.5;

  return (
    <div className="p-6 bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border">
      <h3 className="text-lg font-bold mb-4">Currency Formatting Examples</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-card rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">With Currency Symbol:</span>
          <span className="font-bold text-brand-primary dark:text-blue-400 notranslate">
            {format(exampleAmount)}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-card rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">Without Currency Symbol:</span>
          <span className="font-bold text-gray-700 dark:text-gray-300 notranslate">
            {formatNumber(exampleAmount)}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-card rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">Current Settings:</span>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Symbol: {currencySymbol} | Precision: {decimalPrecision} | Country: {country}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 rounded-lg">
          <h4 className="text-sm font-bold text-blue-900 mb-2">Usage in Components:</h4>
          <pre className="text-xs text-blue-800 overflow-x-auto">
{`import { useCurrency } from '../../hooks/useCurrency';

const MyComponent = () => {
  const { format, formatNumber } = useCurrency();
  
  return (
    <div>
      <span>{format(1250.50)}</span>
      <span>{formatNumber(1250.50)}</span>
    </div>
  );
};`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CurrencyFormattingExample;
