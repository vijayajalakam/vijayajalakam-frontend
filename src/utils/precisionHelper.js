/**
 * Precision and Round-off Helper (Frontend)
 * Handles decimal precision and round-off calculations based on salon settings
 */

/**
 * Format number with decimal precision
 * @param {number} value - The value to format
 * @param {number} precision - Decimal places (default: 2)
 * @returns {number} - Formatted number
 */
export const toFixedNumber = (value, precision = 2) => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

/**
 * Apply decimal precision to a value
 * @param {number} value - The value to format
 * @param {object} settings - Salon settings with decimalPrecision
 * @returns {number} - Value with applied precision
 */
export const applyPrecision = (value, settings) => {
  const precision = settings?.decimalPrecision ?? 2;
  return toFixedNumber(value, precision);
};

/**
 * Apply round-off to final amount if enabled
 * @param {number} amount - The amount to round
 * @param {object} settings - Salon settings with enableRoundOff, roundOffValue, roundOffBenefit
 * @returns {object} - { finalAmount, roundOffAmount }
 */
export const applyRoundOff = (amount, settings) => {
  if (!settings?.enableRoundOff) {
    return { finalAmount: amount, roundOffAmount: 0 };
  }

  const roundOffValue = parseFloat(settings?.roundOffValue) || 1;
  const roundOffBenefit = settings?.roundOffBenefit || "customer";

  let finalAmount = amount;
  const factor = amount / roundOffValue;
  
  if (roundOffBenefit === "seller") {
    // Seller benefits -> customer pays more -> round up
    finalAmount = Math.ceil(factor) * roundOffValue;
  } else {
    // Customer benefits -> customer pays less -> round down
    finalAmount = Math.floor(factor) * roundOffValue;
  }

  // Handle JS floating point precision issues
  finalAmount = Math.round(finalAmount * 100) / 100;
  
  const roundOffAmount = Math.round((finalAmount - amount) * 100) / 100;
  
  return { finalAmount, roundOffAmount };
};

/**
 * Round individual amount if round-off is enabled
 * Used for displaying individual item amounts in invoice
 * @param {number} amount - The amount to round
 * @param {object} settings - Salon settings
 * @returns {number} - Rounded amount
 */
export const roundAmount = (amount, settings) => {
  // Disabled as per user request to not round off amounts
  return applyPrecision(amount, settings);
};

/**
 * Calculate item amount with precision
 * @param {number} quantity - Item quantity
 * @param {number} price - Item price
 * @param {number} discount - Item discount
 * @param {object} settings - Salon settings
 * @returns {number} - Calculated amount
 */
export const calculateItemAmount = (quantity, price, discount = 0, settings) => {
  const amount = (quantity * price) - discount;
  return applyPrecision(amount, settings);
};

/**
 * Calculate tax amount with precision
 * @param {number} amount - Base amount
 * @param {number} taxPercent - Tax percentage
 * @param {object} settings - Salon settings
 * @returns {number} - Tax amount
 */
export const calculateTaxAmount = (amount, taxPercent, settings) => {
  const tax = (amount * taxPercent) / 100;
  return applyPrecision(tax, settings);
};

/**
 * Calculate cart/invoice totals with precision and round-off
 * @param {object} params - Calculation parameters
 * @param {array} params.items - Cart/Invoice items
 * @param {number} params.discount - Invoice level discount
 * @param {object} params.settings - Salon settings
 * @returns {object} - { subtotal, totalTax, totalItemDiscount, finalAmount, roundOffAmount }
 */
export const calculateCartTotals = ({ items, discount = 0, settings }) => {
  let subtotal = 0; // This will be the taxable amount (excluding tax)
  let totalTax = 0;
  let totalItemDiscount = 0;
  let hasInclusiveTax = false;

  items.forEach(item => {
    const itemAmount = item.price * item.qty;
    const itemDiscount = Number(item.discount) || 0;
    
    // For tax calculations, we need to handle both services and products
    const taxPct = item.itemType === "service" 
      ? (item.taxPercentage || item.taxPercent || 0) 
      : (item.taxPercent || item.taxPercentage || 0);

    const isInclusive = item.isTaxInclusive || false;

    if (isInclusive && taxPct > 0) {
      hasInclusiveTax = true;
      // Tax-inclusive: extract the base amount and tax separately
      const taxAmount = itemAmount - (itemAmount / (1 + (taxPct / 100)));
      const exTaxAmount = itemAmount - taxAmount;
      
      subtotal += exTaxAmount; // Base amount without tax
      totalTax += taxAmount; // Tax amount
      totalItemDiscount += itemDiscount;
    } else if (!isInclusive && taxPct > 0) {
      // Tax-exclusive: add tax to the amount
      subtotal += itemAmount; // Base amount
      const taxAmount = calculateTaxAmount(itemAmount - itemDiscount, taxPct, settings);
      totalTax += taxAmount; // Additional tax
      totalItemDiscount += itemDiscount;
    } else {
      // No tax
      subtotal += itemAmount;
      totalItemDiscount += itemDiscount;
    }
  });

  // Apply precision to totals
  subtotal = applyPrecision(subtotal, settings);
  totalTax = applyPrecision(totalTax, settings);
  totalItemDiscount = applyPrecision(totalItemDiscount, settings);
  
  const invoiceDiscount = Number(discount) || 0;
  const totalDiscount = applyPrecision(totalItemDiscount + invoiceDiscount, settings);

  // Calculate amount before round-off
  // Always add subtotal + tax - discounts for the final amount
  let amount = subtotal + totalTax - totalDiscount;
  amount = applyPrecision(amount, settings);

  // Apply round-off if enabled
  const { finalAmount, roundOffAmount } = applyRoundOff(amount, settings);

  return {
    subtotal,
    totalTax,
    totalItemDiscount,
    totalDiscount,
    amount,
    finalAmount,
    roundOffAmount,
    hasInclusiveTax
  };
};

/**
 * Format currency display value
 * @param {number} value - The value to format
 * @param {object} settings - Salon settings
 * @param {string} currencySymbol - Currency symbol
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, settings, currencySymbol = '') => {
  const precision = settings?.decimalPrecision ?? 2;
  const formatted = toFixedNumber(value, precision).toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
  return `${currencySymbol}${formatted}`;
};

/**
 * Format number for display with precision
 * @param {number} value - The value to format
 * @param {object} settings - Salon settings
 * @returns {string} - Formatted number string
 */
export const formatNumber = (value, settings) => {
  const precision = settings?.decimalPrecision ?? 2;
  return toFixedNumber(value, precision).toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
};
