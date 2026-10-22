import React, { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, Filter, RotateCcw, Check } from "lucide-react";

/**
 * TaxReportFilterModal - A simple modal to select a tax percentage.
 * The date filter is handled externally as per user requirement.
 */
const TaxReportFilterModal = ({
  isOpen,
  onClose,
  onApply,
  taxOptions = [],
  initialFilters = { tax: [] },
  taxLabel = "Tax",
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedTaxes, setSelectedTaxes] = useState(
    Array.isArray(initialFilters.tax) ? initialFilters.tax : [],
  );
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Synchronously reset state when modal opens to avoid cascading renders in useEffect
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setSelectedTaxes(
      Array.isArray(initialFilters.tax) ? initialFilters.tax : [],
    );
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const toggleTax = (taxId) => {
    setSelectedTaxes((prev) => {
      if (prev.includes(taxId)) {
        return prev.filter((id) => id !== taxId);
      } else {
        return [...prev, taxId];
      }
    });
  };

  const handleReset = () => {
    setSelectedTaxes([]);
  };

  const handleApply = () => {
    onApply(selectedTaxes);
    onClose();
  };

  const modalVariants = {
    hidden: isMobile
      ? { y: "100%", opacity: 1 }
      : { y: 20, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1 },
    exit: isMobile
      ? { y: "100%", opacity: 1 }
      : { y: 20, opacity: 0, scale: 0.95 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />

          <Motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-sm bg-white dark:bg-dark-surface overflow-hidden flex flex-col shadow-2xl border-t md:border border-gray-100 dark:border-dark-border
                          ${isMobile ? "rounded-t-[2rem] max-h-[60vh]" : "rounded-3xl"}`}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-50 dark:border-dark-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-brand-primary dark:text-blue-400" />
                <h4 className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                  Filter by {taxLabel} %
                </h4>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card rounded-lg transition-all active:scale-90"
              >
                <X size={20} className="text-gray-400 dark:text-gray-500" />
              </button>
            </div>

            {/* Options Area */}
            <div className="overflow-y-auto p-6 custom-scrollbar max-h-[300px]">
              <div className="grid grid-cols-1 gap-3">
                {taxOptions.map((opt) => {
                  const isSelected = selectedTaxes.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleTax(opt.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200
                                                ${
                                                  isSelected
                                                    ? "border-brand-primary bg-blue-50/30 text-brand-primary dark:text-blue-400 dark:bg-brand-primary/5"
                                                    : "border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card/30 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-dark-card"
                                                }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-tight">
                        {opt.label}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all
                                                  ${isSelected ? "border-brand-primary bg-brand-primary" : "border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card"}`}
                      >
                        {isSelected && (
                          <Check
                            size={12}
                            className="text-white"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-gray-50 dark:border-dark-border flex items-center gap-3 bg-white dark:bg-dark-surface shrink-0">
              <button
                onClick={handleReset}
                className="h-11 px-6 flex items-center gap-2 bg-gray-50 dark:bg-dark-card text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
              <button
                onClick={handleApply}
                className="flex-1 h-11 bg-brand-primary hover:bg-brand-secondary text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/10 active:scale-[0.98]"
              >
                Apply Filter
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TaxReportFilterModal;
