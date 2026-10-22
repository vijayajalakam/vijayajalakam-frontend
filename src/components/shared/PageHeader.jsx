import React from "react";
import { Plus, RefreshCw, Search, ArrowLeft } from "lucide-react";

const PageHeader = ({
  title,
  subtitle,
  onAdd,
  onRefresh,
  loading,
  searchQuery,
  onSearchChange,
  searchPlaceholder,

  addButtonLabel = "Add New",
  children,
}) => {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-[1.5rem] py-3.5 px-4 md:py-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-4">
            {/* onBack button removed for report UI refinement */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                {title || "N/A"}
              </h2>
              {subtitle && (
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Mobile Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex md:hidden h-10 w-10 items-center justify-center bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:text-brand-accent rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          {onSearchChange && (
            <div className="relative group w-full md:w-64">
              <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:text-brand-accent transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder || "Search..."}
                className="block w-full h-10 ps-10 pe-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-medium text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:border-brand-accent focus:ring-brand-accent/20 transition-all duration-200"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {children}

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="hidden md:flex h-11 w-11 items-center justify-center bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:text-brand-accent hover:border-brand-accent/30 hover:bg-blue-50 dark:hover:bg-dark-border rounded-2xl transition-all duration-300 active:scale-95 disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            )}

            {onAdd && (
              <button
                onClick={onAdd}
                className="h-11 flex items-center gap-2 px-6 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-2xl transition-all duration-300 active:scale-95 shadow-none whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{addButtonLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
