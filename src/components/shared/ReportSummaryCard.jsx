import React from "react";
import { motion } from "framer-motion";
import Skeleton from "./Skeleton";
import { useCurrency } from "../../hooks/useCurrency";

/**
 * ReportSummaryCard component matching the professional redesign.
 * Shows a summary header with a segmented progress bar and detailed legend.
 */
const ReportSummaryCard = ({
  title,
  totalValue,
  totalCount,
  segments = [],
  loading = false,
  currencySymbol: propCurrencySymbol,
  onSegmentClick,
  activeSegment,
  totalLabel = "Total invoice value",
  countLabel = "Invoices",
  maxBarValue,
  estimatedTotalValue,
  hideCountLabel = false,
  hideTotalValue = false,
  showDrCr = false,
  isCurrency = true, // Added isCurrency prop
}) => {
  const { currencySymbol: contextCurrencySymbol, decimalPrecision } = useCurrency();
  const currencySymbol = propCurrencySymbol || contextCurrencySymbol;
  
  // Use 0 decimal precision if it's not a currency
  const actualPrecision = isCurrency ? decimalPrecision : 0;
  
  const barDenominator = Math.abs(maxBarValue || totalValue || 1);
  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-[1.5rem] p-5">
        <div className="flex justify-between items-start mb-5">
          <div className="space-y-2">
            <Skeleton width="120px" height="24px" />
            <Skeleton width="200px" height="14px" />
          </div>
          <Skeleton width="150px" height="14px" />
        </div>
        <Skeleton
          width="100%"
          height="12px"
          borderRadius="999px"
          className="mb-5"
        />
        <div className="flex flex-wrap gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton width="12px" height="12px" borderRadius="50%" />
              <Skeleton width="100px" height="14px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-[1.5rem] p-5">
      {/* Header Info */}
      <h2 className="text-[20px] font-bold text-gray-700 dark:text-white leading-none mb-5">
        {title === "Invoice Payment Wise Summary" ||
        title === "Payment Wise Summary" ||
        title === "Revenue Analysis"
          ? "Invoices"
          : title}
      </h2>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-1.5">
          {!hideTotalValue && (
            <>
              <span className="text-[14px] font-normal text-gray-400 dark:text-gray-500">
                {totalLabel}:
              </span>
              <span className={`text-[14px] font-bold notranslate ml-1 ${showDrCr && totalValue !== 0 ? (totalValue > 0 ? "text-emerald-600" : "text-rose-600") : "text-gray-700 dark:text-gray-200"}`}>
                {showDrCr && totalValue !== 0 && (
                  <span className="mr-1 text-[12px] opacity-70">
                    {totalValue > 0 ? "Dr" : "Cr"}
                  </span>
                )}
                {isCurrency && currencySymbol}
                {Math.abs(totalValue || 0).toLocaleString(undefined, {
                  minimumFractionDigits: actualPrecision,
                  maximumFractionDigits: actualPrecision,
                })}
              </span>
            </>
          )}
          <span
            className={`text-[14px] font-normal text-gray-400 dark:text-gray-500 ${!hideTotalValue ? "ml-1.5" : ""}`}
          >
            {totalCount}{" "}
            {totalCount === 1 ? countLabel.replace(/s$/, "") : countLabel}
          </span>
        </div>
        {estimatedTotalValue !== undefined && (
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-normal text-gray-400 dark:text-gray-500">
                Estimated {totalLabel}:
              </span>
              <span className={`text-[14px] font-bold notranslate ml-1 ${showDrCr && estimatedTotalValue !== 0 ? (estimatedTotalValue > 0 ? "text-emerald-600" : "text-rose-600") : "text-gray-700 dark:text-gray-200"}`}>
                {showDrCr && estimatedTotalValue !== 0 && (
                  <span className="mr-1 text-[12px] opacity-70">
                    {estimatedTotalValue > 0 ? "Dr" : "Cr"}
                  </span>
                )}
                {isCurrency && currencySymbol}
                {Math.abs(estimatedTotalValue || 0).toLocaleString(undefined, {
                  minimumFractionDigits: actualPrecision,
                  maximumFractionDigits: actualPrecision,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex items-center w-full gap-1 mb-4 h-2.5">
        {segments
          .filter((s) => s.inProgressBar !== false)
          .map((segment, idx) => (
            <motion.div
              key={idx}
              initial={{ width: 0 }}
              animate={{
                width: `${(Math.abs(segment.value) / barDenominator) * 100}%`,
              }}
              transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
              style={{ backgroundColor: segment.color }}
              className="h-full rounded-full opacity-90"
            />
          ))}
      </div>

      {/* Legend / Breakdown */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {segments.map((segment, idx) => {
          const isActive =
            activeSegment === segment.id || activeSegment === segment.label;
          const isFaded = activeSegment && !isActive;

          return (
            <div
              key={idx}
              onClick={() =>
                onSegmentClick && onSegmentClick(segment.id || segment.label)
              }
              className={`flex items-center gap-2 group transition-all duration-200 ${
                onSegmentClick
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              } ${isFaded ? "opacity-30" : "opacity-100"}`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 opacity-90"
                style={{ backgroundColor: segment.color }}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {segment.label === "Due/Unpaid" ? "Due" : segment.label}
                </span>
                {segment.count > 0 && (
                  <span className="text-[14px] font-normal text-gray-400 dark:text-gray-500">
                    {segment.count}
                    {!hideCountLabel && (
                      <>
                        {" "}
                        {segment.count === 1
                          ? countLabel.replace(/s$/, "")
                          : countLabel}
                      </>
                    )}
                  </span>
                )}
                <span className={`text-[14px] font-bold notranslate ml-0.5 ${showDrCr && (segment.value !== 0 || segment.forceDrCr) ? (segment.forceDrCr === "Dr" || (!segment.forceDrCr && segment.value > 0) ? "text-emerald-600" : "text-rose-600") : "text-gray-700 dark:text-gray-200"}`}>
                  {showDrCr && (segment.value !== 0 || segment.forceDrCr) && (
                    <span className="mr-1 text-[11px] opacity-60">
                      {segment.forceDrCr || (segment.value > 0 ? "Dr" : "Cr")}
                    </span>
                  )}
                  {(!segment.hideCurrency && isCurrency) && currencySymbol}
                  {Math.abs(segment.value || 0).toLocaleString(undefined, {
                    minimumFractionDigits: segment.hideCurrency ? 0 : actualPrecision,
                    maximumFractionDigits: segment.hideCurrency ? 2 : actualPrecision,
                  })}
                  {segment.suffix && <span className="ml-1 text-[12px] opacity-80 normal-case">{segment.suffix}</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportSummaryCard;
