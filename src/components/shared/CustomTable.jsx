import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Calendar,
  PackageOpen,
  FileText,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Skeleton, { TableSkeleton } from "./Skeleton";
import DateRangePicker from "./DateRangePicker";
import toast from "react-hot-toast";
import * as exportUtils from "../../utils/exportUtils";
import { useAuth } from "../../features/auth/hooks/useAuth";
import api from "../../api/axiosInstance";

/**
 * Reusable Premium Table Component
 * Standardizes headers, row styles, animations, and loading/empty states.
 * Automatically switches to Expansion Tiles on mobile.
 */
const CustomTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found.",
  rowKey = (row) => row._id || row.id || row.slNo || row.invoiceNo || JSON.stringify(row),
  onRowClick = null,
  className = "",
  // mobileMapper allows custom mapping of row data to the expansion tile header
  mobileMapper = null,
  // New features for redesign
  tabs = [], // [{ id: 'all', label: 'All', count: 19 }]
  activeTab = "",
  onTabChange = null,
  searchQuery = "",
  onSearchChange = null,
  title,
  subtitle,
  searchPlaceholder = "Search...",
  headerActions = null, // React node for Add button etc
  extraFilters = null, // React node for branch filters etc
  pagination = null, // { page: 1, totalPages: 10, total: 100, onPageChange: (p) => {} }
  onExport = null,
  onFilterClick = null,
  filterCount = 0,
  // Date Range Props
  startDate = "",
  endDate = "",
  onStartDateChange = null,
  onEndDateChange = null,
  showSelection = false,
  selectedIds = [],
  onSelectionChange = null,
  bulkActions = null, // React node for bulk action buttons
  expandable = false, // Desktop-only explicit expansion support
  expandedContent = null, // (row) => <JSX> function to render inner content
  flushExpandedContent = false, // If true, removes padding and shadow from expanded area
  mobileGroupWithNext = null, // (currentRow, nextRow) => boolean to group rows on mobile
  renderRowHeader = null, // (currentRow, prevRow) => <JSX> function to group rows with a header
}) => {

  const [viewMode, setViewMode] = React.useState(
    window.innerWidth < 768 ? "mobile" : "desktop",
  );
  const [expandedId, setExpandedId] = React.useState(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportingFormat, setExportingFormat] = React.useState(null);
  const { salonConfig } = useAuth();

  const handleDirectExport = async (formatId) => {
    if (isExporting) return;
    
    const isPDF = formatId === "pdf";
    const isWhatsApp = formatId === "whatsapp";
    const loadingToast = (isPDF && !isWhatsApp) ? null : toast.loading(isWhatsApp ? "Sending to WhatsApp..." : `Generating ${formatId.toUpperCase()}...`);
    try {
      setIsExporting(true);
      if (!isPDF) {
        setExportingFormat(formatId);
      }
      
      let exportData = [];
      let summaryDataOverride = null;
      if (onExport) {
        const result = await onExport();
        if (result && !Array.isArray(result) && result.data) {
          exportData = result.data;
          summaryDataOverride = result.summaryDataOverride;
        } else {
          exportData = result;
        }
      } else {
        exportData = data;
      }
      
      if (!exportData || exportData.length === 0) {
        if (loadingToast) toast.dismiss(loadingToast);
        toast.error("No data available to export");
        return;
      }
      
      let derivedTitle = title;
      if (!derivedTitle) {
        const metaEl = document.getElementById('report-title-meta');
        if (metaEl && metaEl.dataset.title) {
          derivedTitle = metaEl.dataset.title;
        } else {
          const h1 = document.querySelector('h1');
          if (h1 && h1.innerText) derivedTitle = h1.innerText;
        }
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = derivedTitle || "Report";
      const fullFilename = `${filename.replace(/\s+/g, "_")}_${timestamp}`;
      
      // Small delay for user experience feedback
      await new Promise((r) => setTimeout(r, 600));
      
      if (isPDF || isWhatsApp) {
        if (isWhatsApp) {
          const base64Data = await exportUtils.exportToPDF(
            exportData,
            columns,
            `${fullFilename}.pdf`,
            { title: derivedTitle, subtitle, startDate, endDate, shopDetails: salonConfig, summaryDataOverride, returnBase64: true }
          );
          
          const res = await api.post("/whatsapp/send-report", {
            title: derivedTitle || "Report",
            pdfBase64: base64Data
          });
          
          if (!res.data || !res.data.success) {
             throw new Error(res.data?.message || "Failed to send report to WhatsApp");
          }
          
          toast.success("Report sent to owner's WhatsApp successfully!");
        } else {
          await exportUtils.exportToPDF(
            exportData,
            columns,
            `${fullFilename}.pdf`,
            { title: derivedTitle, subtitle, startDate, endDate, shopDetails: salonConfig, summaryDataOverride }
          );
        }
      } else {
        exportUtils.exportToExcel(
          exportData,
          columns,
          `${fullFilename}.xlsx`
        );
      }
      
      if (loadingToast) toast.dismiss(loadingToast);
      if (!isPDF && !isWhatsApp) {
        toast.success(`${formatId.toUpperCase()} downloaded successfully!`);
      }
    } catch (error) {
      console.error("Export error:", error);
      if (loadingToast) toast.dismiss(loadingToast);
      if (isWhatsApp) {
        toast.error(error.response?.data?.message || error.message || "Failed to send to WhatsApp");
      } else if (!isPDF) {
        toast.error(`Failed to generate ${formatId.toUpperCase()}`);
      }
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  React.useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "mobile" : "desktop");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, onPageChange } = pagination;

    // Enhanced pagination logic to show more buttons
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    const finalPages = pages.filter((v, i, a) => a.indexOf(v) === i);

    return (
      <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
        <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          PAGE {page} OF {totalPages}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="h-8 px-3 flex items-center gap-1 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border disabled:opacity-50 transition-all font-black"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1 mx-2">
            {finalPages.map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-2 text-gray-400 dark:text-gray-500 text-xs font-black"
                >
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  onClick={() => onPageChange(p)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-black transition-all ${
                    page === p
                      ? "bg-brand-primary text-white shadow-md"
                      : "bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border shadow-none"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="h-8 px-3 flex items-center gap-1 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border disabled:opacity-50 transition-all font-black"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderMobileTile = (row, prevRow, keyPrefix, idx, isLast = false) => {
    const isExpanded = expandedId === rowKey(row);

    // Default mapping if mapper is not provided
    const mainColumn =
      columns.find((c) => c.key === "name" || c.key === "title") ||
      columns.find((c) => c.key) ||
      columns[0];
    const secondColumn =
      columns.find((c) => c !== mainColumn && c.key) || columns[1];
    const moneyColumn =
      columns.find(
        (c) =>
          c.header?.toLowerCase().includes("price") ||
          c.header?.toLowerCase().includes("balance") ||
          c.header?.toLowerCase().includes("amount") ||
          c.header?.toLowerCase().includes("total"),
      ) || columns[2];

    const leading = mobileMapper?.leading ? (
      mobileMapper.leading(row, idx)
    ) : (
      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card flex items-center justify-center text-gray-300 font-bold text-lg border border-gray-100 dark:border-dark-border overflow-hidden">
        {mainColumn?.render ? (
          <div className="scale-75 origin-center">{mainColumn.render(row)}</div>
        ) : (
          String(row[mainColumn?.key] || mainColumn?.header || "?")
            .charAt(0)
            .toUpperCase()
        )}
      </div>
    );

    const title = mobileMapper?.title ? (
      mobileMapper.title(row, idx)
    ) : (
      <div className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
        {mainColumn?.render
          ? mainColumn.render(row)
          : row[mainColumn?.key] || mainColumn?.header || "No Title"}
      </div>
    );

    const subtitle = mobileMapper?.subtitle ? (
      mobileMapper.subtitle(row, idx)
    ) : (
      <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
        {secondColumn?.render
          ? secondColumn.render(row)
          : row[secondColumn?.key] || secondColumn?.header || "Details"}
      </div>
    );

    const trailing = mobileMapper?.trailing ? (
      mobileMapper.trailing(row, idx)
    ) : (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[13px] font-black text-gray-900 dark:text-white leading-none">
            {moneyColumn?.render
              ? moneyColumn.render(row)
              : row[moneyColumn?.key] || ""}
          </div>
        </div>
      </div>
    );

    const headerGroup = renderRowHeader ? renderRowHeader(row, prevRow) : null;

    return (
      <React.Fragment key={`${keyPrefix}-${rowKey(row)}`}>
        {headerGroup && (
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-dark-card/50 border-b border-gray-100 dark:border-dark-border font-bold text-gray-700 dark:text-gray-300">
            {headerGroup}
          </div>
        )}
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className={`bg-white dark:bg-dark-surface transition-all duration-300 ${!isLast ? "border-b border-gray-200 dark:border-dark-border" : ""} ${isExpanded ? "bg-gray-50/50 dark:bg-dark-bg/50" : ""} ${selectedIds.includes(rowKey(row)) ? "bg-brand-primary/5" : ""}`}
        >
          <div className="flex items-center">
            {showSelection && (
              <div
                className="pl-4 py-3.5 pr-0 self-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(rowKey(row))}
                  onChange={() => {
                    const id = rowKey(row);
                    if (selectedIds.includes(id)) {
                      onSelectionChange(
                        selectedIds.filter((item) => item !== id),
                      );
                    } else {
                      onSelectionChange([...selectedIds, id]);
                    }
                  }}
                  className="w-4 h-4 rounded-md border-gray-300 dark:border-dark-border text-brand-primary dark:text-blue-400 focus:ring-brand-primary cursor-pointer transition-all"
                />
              </div>
            )}
            <div
              onClick={() => setExpandedId(isExpanded ? null : rowKey(row))}
              className="p-3.5 flex-1 flex items-center gap-4 cursor-pointer active:bg-gray-50 dark:bg-dark-card transition-colors"
            >
              <div className="flex-shrink-0">{leading}</div>
              <div className="flex-1 min-w-0">
                {title}
                {subtitle}
              </div>
              <div className="flex items-center gap-3">
                {trailing}
                <Motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-gray-300"
                >
                  <ChevronDown size={18} />
                </Motion.div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-gray-50/50 dark:bg-dark-bg/50"
              >
                <div className="px-4 py-4 border-t border-gray-100/50 dark:border-dark-border space-y-4">
                  {mobileMapper?.expandedContent ? (
                    // Fully custom expanded content from mobileMapper
                    <div>{mobileMapper.expandedContent(row, idx)}</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {columns
                        .filter((col) => {
                          const h = col.header?.toLowerCase() || "";
                          return (
                            h !== "photo" &&
                            h !== "profile" &&
                            h !== "image" &&
                            h !== "actions" &&
                            h !== "action"
                          );
                        })
                        .map((col, i) => {
                          return (
                            <div
                              key={i}
                              className="flex items-start justify-between gap-4"
                            >
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">
                                {col.header}
                              </span>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-right">
                                {col.render ? col.render(row) : row[col.key] || "—"}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  {(mobileMapper?.actions || columns.find(c => c.header?.toLowerCase() === "action" || c.header?.toLowerCase() === "actions")?.render) && (
                    <div className="pt-2 border-t border-gray-100 dark:border-dark-border/50">
                      {mobileMapper?.actions 
                        ? mobileMapper.actions(row, idx) 
                        : columns.find(c => c.header?.toLowerCase() === "action" || c.header?.toLowerCase() === "actions").render(row)}
                    </div>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.div>
      </React.Fragment>
    );
  };

  const renderHeaderActions = () => {
    if (
      tabs.length === 0 &&
      !onSearchChange &&
      !onExport &&
      !headerActions &&
      !extraFilters &&
      !title
    )
      return null;

    return (
      <>
        <div className="md:border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface md:rounded-none rounded-[1.5rem]">
          {/* Tabs Row */}
          {tabs.length > 0 && (
            <div className="px-6 pt-4 flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-gray-50 dark:border-dark-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange && onTabChange(tab.id)}
                  className={`pb-3 text-xs font-black uppercase tracking-widest relative transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-brand-primary"
                      : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {tab.label} {tab.count !== undefined && `(${tab.count})`}
                  {activeTab === tab.id && (
                    <Motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full transition-all duration-300"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Controls Row */}
          <div className="px-4 pt-4 pb-3 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Side: Title & Subtitle */}
            {(title || subtitle) && (
              <div className="flex flex-col gap-0.5 border-r border-gray-100 dark:border-dark-border pr-5 hidden md:flex min-w-[140px]">
                {title && (
                  <h2 className="text-[15px] font-black text-gray-900 dark:text-white leading-tight tracking-tight uppercase">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Mobile: all filters, search and actions in one horizontal row */}
            <div className="flex md:hidden items-center gap-2 w-full flex-wrap pb-1">
              {onSearchChange && (
                <div className="relative group w-full shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder || "Search..."}
                    className="w-full h-10 pl-10 pr-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-[11px] font-bold text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-none"
                  />
                </div>
              )}
              {extraFilters && (
                <div className="contents">
                  {extraFilters}
                </div>
              )}
              {(onStartDateChange || onEndDateChange) && (
                <div className="flex-1 min-w-[130px] shrink-0">
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={onStartDateChange}
                    onEndDateChange={onEndDateChange}
                  />
                </div>
              )}
              {onFilterClick && (
                <button
                  onClick={onFilterClick}
                  className="h-10 w-10 flex items-center justify-center bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-500 dark:text-gray-400 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 shrink-0 relative"
                >
                  <Filter className="w-4 h-4 text-brand-primary dark:text-blue-400" />
                  {filterCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-brand-primary text-white text-[8px] font-black">
                      {filterCount}
                    </span>
                  )}
                </button>
              )}
              {onExport && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                    disabled={isExporting}
                    className="h-10 w-10 flex items-center justify-center bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 shrink-0 disabled:opacity-75"
                  >
                    {isExporting ? (
                      <Loader2 size={15} className="animate-spin text-brand-primary dark:text-blue-400" />
                    ) : (
                      <Download size={15} className="text-brand-primary dark:text-blue-400" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isExportDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsExportDropdownOpen(false)} 
                        />
                        <Motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border p-1.5 shadow-xl z-50 flex flex-col gap-1"
                        >
                          <button
                            onClick={() => {
                              setIsExportDropdownOpen(false);
                              handleDirectExport("pdf");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                          >
                            <FileText size={16} className="text-rose-600" />
                            <span>PDF Document</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsExportDropdownOpen(false);
                              handleDirectExport("excel");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet size={16} className="text-emerald-600" />
                            <span>Excel Sheet</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsExportDropdownOpen(false);
                              handleDirectExport("whatsapp");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                          >
                            <MessageCircle size={16} className="text-green-500" />
                            <span>Send to WhatsApp</span>
                          </button>
                        </Motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {headerActions && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {headerActions}
                </div>
              )}
            </div>{/* end mobile flex-col */}

            {/* Desktop layout */}
            <div className="hidden md:flex flex-1 md:flex-row md:items-center gap-2">
              {/* Search Section */}
              {onSearchChange && (
                <div className="relative group w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder || "Search..."}
                    className="w-full h-9 pl-10 pr-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-[11px] font-bold text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-none"
                  />
                </div>
              )}

              {/* Spacer to push other filters to right */}
              <div className="flex-1" />

              {/* Extra Filters */}
              {extraFilters && (
                <div className="flex items-center gap-2">{extraFilters}</div>
              )}

              {/* Date, Filter, Export */}
              <div className="flex items-center gap-2 flex-wrap">
                {(onStartDateChange || onEndDateChange) && (
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={onStartDateChange}
                    onEndDateChange={onEndDateChange}
                  />
                )}

                {onFilterClick && (
                  <button
                    onClick={onFilterClick}
                    className="h-9 px-3.5 flex items-center gap-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-border hover:border-brand-primary/20 active:scale-95 text-[10px] uppercase tracking-wider shrink-0 shadow-none relative group"
                  >
                    <Filter
                      className="w-3 h-3 text-brand-primary dark:text-blue-400"
                    />
                    <span>Filters</span>
                    {filterCount > 0 && (
                      <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-brand-primary text-white text-[8px] font-black">
                        {filterCount}
                      </span>
                    )}
                  </button>
                )}

                {onExport && (
                  <div className="relative">
                    <button
                      onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                      disabled={isExporting}
                      className="h-9 px-4 flex items-center gap-2 bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border hover:border-brand-primary/20 active:scale-95 text-[10px] uppercase tracking-[0.15em] shrink-0 shadow-none disabled:opacity-75"
                      title="Export Report"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-brand-primary dark:text-blue-400" />
                          <span>Generating {exportingFormat?.toUpperCase()}...</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} className="text-brand-primary dark:text-blue-400" />
                          <span>Export</span>
                        </>
                      )}
                    </button>
                    <AnimatePresence>
                      {isExportDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsExportDropdownOpen(false)} 
                          />
                          <Motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border p-1.5 shadow-xl z-50 flex flex-col gap-1"
                          >
                            <button
                              onClick={() => {
                                setIsExportDropdownOpen(false);
                                handleDirectExport("pdf");
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                            >
                              <FileText size={16} className="text-rose-600" />
                              <span>PDF Document</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsExportDropdownOpen(false);
                                handleDirectExport("excel");
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                            >
                              <FileSpreadsheet size={16} className="text-emerald-600" />
                              <span>Excel Sheet</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsExportDropdownOpen(false);
                                handleDirectExport("whatsapp");
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                            >
                              <MessageCircle size={16} className="text-green-500" />
                              <span>Send to WhatsApp</span>
                            </button>
                          </Motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Header Actions (desktop only) */}
            {headerActions && (
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2.5">{headerActions}</div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className={
        viewMode === "mobile"
          ? `flex flex-col gap-3 pb-24 ${className}`
          : `bg-white dark:bg-dark-surface rounded-[1.5rem] border border-gray-100 dark:border-dark-border overflow-hidden ${className}`
      }
    >
      {renderHeaderActions()}

      {viewMode === "mobile" ? (
        <>
          {showSelection && !loading && data.length > 0 && (
            <div className="p-3.5 flex items-center justify-between bg-white dark:bg-dark-surface rounded-[1.5rem]">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange(data.map((r) => rowKey(r)));
                    } else {
                      onSelectionChange([]);
                    }
                  }}
                  className="w-4 h-4 rounded-md border-gray-300 dark:border-dark-border text-brand-primary dark:text-blue-400 focus:ring-brand-primary cursor-pointer transition-all focus:ring-offset-0"
                />
                <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                  Select All ({data.length})
                </span>
              </div>
              {selectedIds.length > 0 && (
                <span className="text-[10px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest">
                  {selectedIds.length} Selected
                </span>
              )}
            </div>
          )}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-surface p-4 rounded-[1.5rem] border border-gray-100 dark:border-dark-border flex gap-4 items-center"
                >
                  <Skeleton width="48px" height="48px" borderRadius="0.75rem" />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="60%" height="14px" />
                    <Skeleton width="40%" height="10px" />
                  </div>
                  <Skeleton width="60px" height="16px" />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-dark-surface rounded-[2rem] border border-dashed border-gray-100 dark:border-dark-border animate-in fade-in zoom-in duration-500">
              <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-dark-card flex items-center justify-center mb-4 border border-gray-100 dark:border-dark-border">
                <PackageOpen size={24} className="text-gray-300" />
              </div>
              <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-1">
                Nothing here yet
              </h3>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center max-w-[200px] leading-tight opacity-70">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(() => {
                let currentGroup = [];
                const groups = [];
                for (let i = 0; i < data.length; i++) {
                  currentGroup.push(data[i]);
                  const shouldGroup = mobileGroupWithNext 
                    ? mobileGroupWithNext(data[i], data[i+1]) 
                    : false;
                  
                  if (i === data.length - 1 || !shouldGroup) {
                    groups.push(currentGroup);
                    currentGroup = [];
                  }
                }
                return groups.map((group, gIdx) => (
                  <div key={gIdx} className="flex flex-col bg-white dark:bg-dark-surface rounded-[1.5rem] border border-gray-100 dark:border-dark-border overflow-hidden shadow-sm">
                    {group.map((row, idx) => {
                       const prevRow = idx > 0 ? group[idx - 1] : (gIdx > 0 ? groups[gIdx - 1][groups[gIdx - 1].length - 1] : null);
                       return renderMobileTile(row, prevRow, gIdx, idx, idx === group.length - 1);
                    })}
                  </div>
                ));
              })()}
            </div>
          )}
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start bg-white dark:bg-dark-surface border-separate border-spacing-0">
            <thead className="bg-gray-50/30 dark:bg-dark-card/50 border-b border-gray-100 dark:border-dark-border">
              <tr>
                {expandable && (
                  <th className="w-12 px-2 py-4 border-b border-gray-100 dark:border-dark-border"></th>
                )}
                {showSelection && (
                  <th className="pl-6 py-4 w-10 border-b border-gray-100 dark:border-dark-border">
                    <input
                      type="checkbox"
                      checked={
                        data.length > 0 && selectedIds.length === data.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectionChange(data.map((r) => rowKey(r)));
                        } else {
                          onSelectionChange([]);
                        }
                      }}
                      className="w-4 h-4 rounded-md border-gray-300 dark:border-dark-border text-brand-primary dark:text-blue-400 focus:ring-brand-primary cursor-pointer transition-all focus:ring-offset-0"
                    />
                  </th>
                )}
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={`px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-dark-border ${col.align === "right" ? "text-end" : "text-start"} ${col.width || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80">
              {loading ? (
                <>
                  {Array(pagination?.limit || 10).fill(0).map((_, i) => (
                    <tr key={`skel-row-${i}`} className="border-b border-gray-50 dark:border-dark-border last:border-0">
                      {expandable && <td className="w-12 px-2 py-4"></td>}
                      {showSelection && (
                        <td className="pl-6 py-4 w-10">
                          <Skeleton width="16px" height="16px" borderRadius="0.25rem" />
                        </td>
                      )}
                      {columns.map((col, j) => (
                        <td key={`skel-col-${j}`} className="px-6 py-4">
                          <div className={`flex ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                            <Skeleton width={col.width ? "100%" : (j === 0 ? "40%" : "70%")} height="14px" borderRadius="0.25rem" />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (showSelection ? 1 : 0) + (expandable ? 1 : 0)}
                    className="px-6 py-20 text-center"
                  >
                    <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                      <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-dark-card flex items-center justify-center mb-5 border border-gray-100 dark:border-dark-border shadow-sm">
                        <PackageOpen size={28} className="text-gray-300" />
                      </div>
                      <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.25em] mb-2">
                        No Records Found
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] max-w-[300px] leading-relaxed opacity-60">
                        {emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {data.map((row, idx) => {
                    const isExpanded = expandable && expandedId === rowKey(row);
                    const colSpanCount = columns.length + (showSelection ? 1 : 0) + (expandable ? 1 : 0);
                    const prevRow = idx > 0 ? data[idx - 1] : null;
                    const headerGroup = renderRowHeader ? renderRowHeader(row, prevRow) : null;
                    return (
                      <React.Fragment key={rowKey(row)}>
                        {headerGroup && (
                          <tr>
                            <td colSpan={colSpanCount} className="px-6 py-3 bg-gray-50/50 dark:bg-dark-card/50 border-b border-gray-100 dark:border-dark-border">
                              {headerGroup}
                            </td>
                          </tr>
                        )}
                        <Motion.tr
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ delay: idx * 0.01, duration: 0.2 }}
                          onClick={() => {
                            if (expandable && !onRowClick) {
                                setExpandedId(isExpanded ? null : rowKey(row));
                            } else if (onRowClick) {
                                onRowClick(row);
                            }
                          }}
                          className={`hover:bg-gray-50 dark:bg-dark-card/50 dark:hover:bg-dark-card/50 transition-colors group ${onRowClick || expandable ? "cursor-pointer" : ""} ${selectedIds.includes(rowKey(row)) || isExpanded ? "bg-brand-primary/[0.03]" : ""}`}
                        >
                          {expandable && (
                            <td className="w-12 pl-4 py-4 border-b border-gray-50/50 dark:border-dark-border/50 text-center align-middle">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId(isExpanded ? null : rowKey(row));
                                }}
                                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center transition-all ${isExpanded ? "bg-brand-primary text-white shadow-md shadow-brand-primary/30" : "bg-gray-100 dark:bg-dark-border text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-border hover:text-gray-900 dark:text-white"}`}
                              >
                                <Motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                  <ChevronDown size={14} strokeWidth={3} />
                                </Motion.div>
                              </button>
                            </td>
                          )}
                          {showSelection && (
                            <td className="pl-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50 last:border-b-0">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(rowKey(row))}
                                onChange={() => {
                                  const id = rowKey(row);
                                  if (selectedIds.includes(id)) {
                                    onSelectionChange(selectedIds.filter((item) => item !== id));
                                  } else {
                                    onSelectionChange([...selectedIds, id]);
                                  }
                                }}
                                className="w-4 h-4 rounded-md border-gray-300 dark:border-dark-border text-brand-primary dark:text-blue-400 focus:ring-brand-primary cursor-pointer transition-all focus:ring-offset-0"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          )}
                          {columns.map((col, i) => (
                            <td
                              key={i}
                              className={`px-6 py-4 border-b border-gray-50/50 dark:border-dark-border/50 last:border-b-0 ${col.align === "right" ? "text-end" : "text-start"} ${col.width || ""}`}
                            >
                              {col.render ? (
                                col.render(row)
                              ) : (
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {row[col.key] || "—"}
                                </span>
                              )}
                            </td>
                          ))}
                        </Motion.tr>
                        <AnimatePresence>
                            {isExpanded && expandedContent && (
                              <tr className="bg-gray-50/30 dark:bg-dark-border/10">
                                <td colSpan={colSpanCount} className="p-0 border-b border-gray-100/80 dark:border-dark-border">
                                  <Motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className={`overflow-hidden ${flushExpandedContent ? "" : "ring-1 ring-inset ring-gray-100/50 shadow-inner"}`}
                                  >
                                    <div className={flushExpandedContent ? "" : "p-6 md:p-8"}>
                                      {expandedContent(row)}
                                    </div>
                                  </Motion.div>
                                </td>
                              </tr>
                            )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      )}

      {renderPagination()}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && bulkActions && (
          <Motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-auto"
          >
            <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 md:px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-between md:justify-start gap-3 md:gap-6 border border-white/10 dark:border-gray-200">
              <div className="flex items-center gap-2 md:gap-3 pr-3 md:pr-6 border-r border-white/10 dark:border-gray-100 shrink-0">
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-brand-primary flex items-center justify-center text-[9px] md:text-[11px] font-black text-white">
                  {selectedIds.length}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hidden xs:inline">
                  Selected
                </span>
              </div>
              <div className="flex items-center gap-2 md:gap-4 overflow-x-auto scrollbar-hide py-0.5">
                {bulkActions}
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomTable;
