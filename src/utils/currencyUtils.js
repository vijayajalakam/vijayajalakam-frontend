/**
 * Apply round-off logic to an amount
 * @param {number} amount - The amount to round
 * @param {boolean} enableRoundOff - Whether round-off is enabled
 * @param {number} roundOffValue - The round-off value (1, 5, 10, etc.)
 * @param {string} roundOffBenefit - Who benefits: "customer" or "seller"
 * @returns {number} Rounded amount
 */
export const applyRoundOff = (
  amount,
  enableRoundOff = false,
  roundOffValue = 1,
  roundOffBenefit = "customer"
) => {
  if (!enableRoundOff) {
    return parseFloat(amount) || 0;
  }

  const rValue = parseFloat(roundOffValue) || 1;
  let finalAmount = parseFloat(amount) || 0;
  const factor = finalAmount / rValue;
  
  if (roundOffBenefit === "seller") {
    finalAmount = Math.ceil(factor) * rValue;
  } else {
    finalAmount = Math.floor(factor) * rValue;
  }

  return Math.round(finalAmount * 100) / 100;
};

/**
 * Format amount with currency symbol and decimal precision
 * @param {number} amount - The amount to format
 * @param {string} currencySymbol - Currency symbol (e.g., '₹', '$', 'AED')
 * @param {number} decimalPrecision - Number of decimal places (0-4)
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @param {boolean} enableRoundOff - Whether round-off is enabled
 * @param {number} roundOffValue - The round-off value
 * @param {string} roundOffBenefit - Who benefits from round-off
 * @returns {string} Formatted amount string
 */
export const formatCurrency = (
  amount,
  currencySymbol = "",
  decimalPrecision = 2,
  showSymbol = true,
  enableRoundOff = false,
  roundOffValue = 1,
  roundOffBenefit = "customer"
) => {
  let numAmount = parseFloat(amount) || 0;
  
  // Apply round-off if enabled
  if (enableRoundOff) {
    numAmount = applyRoundOff(numAmount, enableRoundOff, roundOffValue, roundOffBenefit);
  }
  
  const formatted = numAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimalPrecision,
    maximumFractionDigits: decimalPrecision,
  });

  return showSymbol ? `${currencySymbol}${formatted}` : formatted;
};

/**
 * Format amount without currency symbol
 * @param {number} amount - The amount to format
 * @param {number} decimalPrecision - Number of decimal places (0-4)
 * @param {boolean} enableRoundOff - Whether round-off is enabled
 * @param {number} roundOffValue - The round-off value
 * @param {string} roundOffBenefit - Who benefits from round-off
 * @returns {string} Formatted amount string
 */
export const formatAmount = (
  amount,
  decimalPrecision = 2,
  enableRoundOff = false,
  roundOffValue = 1,
  roundOffBenefit = "customer"
) => {
  let numAmount = parseFloat(amount) || 0;
  
  // Apply round-off if enabled
  if (enableRoundOff) {
    numAmount = applyRoundOff(numAmount, enableRoundOff, roundOffValue, roundOffBenefit);
  }
  
  return numAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimalPrecision,
    maximumFractionDigits: decimalPrecision,
  });
};

/**
 * Parse formatted currency string back to number
 * @param {string} formattedAmount - Formatted amount string
 * @returns {number} Parsed number
 */
export const parseCurrency = (formattedAmount) => {
  if (typeof formattedAmount === "number") return formattedAmount;
  const cleaned = String(formattedAmount).replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
};
