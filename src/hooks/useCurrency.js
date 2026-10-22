import { useAuth } from "../features/auth/hooks/useAuth";
import { formatCurrency, formatAmount, parseCurrency, applyRoundOff } from "../utils/currencyUtils";

/**
 * Custom hook for currency formatting with regional settings
 * @returns {Object} Currency formatting utilities
 */
export const useCurrency = () => {
  const { 
    currencySymbol, 
    decimalPrecision,
    enableRoundOff,
    roundOffValue,
    roundOffBenefit
  } = useAuth();
  
  /**
   * Format amount with currency symbol
   * @param {number} amount - Amount to format
   * @param {boolean} showSymbol - Whether to show currency symbol (default: true)
   * @returns {string} Formatted currency string
   */
  const format = (amount, showSymbol = true) => {
    return formatCurrency(
      amount, 
      currencySymbol, 
      decimalPrecision, 
      showSymbol,
      enableRoundOff,
      roundOffValue,
      roundOffBenefit
    );
  };

  /**
   * Format amount without currency symbol
   * @param {number} amount - Amount to format
   * @returns {string} Formatted amount string
   */
  const formatNumber = (amount) => {
    return formatAmount(
      amount, 
      decimalPrecision,
      enableRoundOff,
      roundOffValue,
      roundOffBenefit
    );
  };

  /**
   * Format amount for display only (regional decimal places, no round-off transform).
   * Use for line items, reports, and tables so values match stored amounts.
   */
  const formatDisplayNumber = (amount) => {
    return formatAmount(amount, decimalPrecision, false, 1, "customer");
  };

  /**
   * Format with optional symbol; display-only (no round-off transform).
   */
  const formatDisplay = (amount, showSymbol = true) => {
    return formatCurrency(
      amount,
      currencySymbol,
      decimalPrecision,
      showSymbol,
      false,
      1,
      "customer",
    );
  };

  /**
   * Parse formatted currency string back to number
   * @param {string} formattedAmount - Formatted amount string
   * @returns {number} Parsed number
   */
  const parse = (formattedAmount) => {
    return parseCurrency(formattedAmount);
  };

  /**
   * Apply round-off to an amount
   * @param {number} amount - Amount to round
   * @returns {number} Rounded amount
   */
  const roundOff = (amount) => {
    return applyRoundOff(amount, enableRoundOff, roundOffValue, roundOffBenefit);
  };

  return {
    format,
    formatNumber,
    formatDisplay,
    formatDisplayNumber,
    parse,
    roundOff,
    currencySymbol,
    decimalPrecision,
    enableRoundOff,
    roundOffValue,
    roundOffBenefit,
  };
};
