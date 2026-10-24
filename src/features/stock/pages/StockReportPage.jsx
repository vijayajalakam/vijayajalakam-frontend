import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import { Package, Tag } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import { useGetSuppliersQuery } from "../../../store/api/tenantCrudEndpoints";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";

const StockReportPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [report, setReport] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  
  const { data: suppliers = [] } = useGetSuppliersQuery("");

  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  // Fetch branches for filter
  useEffect(() => {
    api
      .get("/shops")
      .then((res) => {
        if (res.data?.success) setBranches(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (searchTerm) params.append("search", searchTerm);
      if (selectedBranch) params.append("branchId", selectedBranch);
      if (selectedSupplier) params.append("supplierId", selectedSupplier);
      if (stockStatus) params.append("stockStatus", stockStatus);

      const res = await api.get(`/products/stock-report?${params}`);
      if (res.data.success) {
        setReport(res.data.data);
        setSummary(res.data.summary);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    startDate,
    endDate,
    selectedBranch,
    selectedSupplier,
    stockStatus,
    updatePagination,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, startDate, endDate, selectedBranch, selectedSupplier, stockStatus, resetPagination]);

  const summaryData = useMemo(() => {
    if (!summary) return null;
    return {
      total: summary.totalValue,
      count: summary.totalProducts,
      segments: [
        {
          label: "Total Unique Items",
          value: summary.totalProducts,
          color: "#94a3b8",
          inProgressBar: true,
        },
        {
          label: "Inventory Valuation",
          value: summary.totalValue,
          color: "#10b981",
          inProgressBar: true,
        },
      ],
    };
  }, [summary]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (searchTerm) params.append("search", searchTerm);
      if (selectedBranch) params.append("branchId", selectedBranch);
      if (selectedSupplier) params.append("supplierId", selectedSupplier);
      if (stockStatus) params.append("stockStatus", stockStatus);

      const res = await api.get(`/products/stock-report?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const columns = [
    {
      header: "Product",
      exportValue: (row) => row.name,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.name}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
            {row.sku || "NO-SKU"}
          </span>
        </div>
      ),
    },
    {
      header: "Type",
      exportValue: (row) => row.type || "Standard",
      render: (row) => {
        const isVariant = row.isVariant;
        const label = row.type || "Standard";
        return isVariant ? (
          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 uppercase tracking-wider px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
            ✦ {label}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-dark-border dark:text-gray-400 uppercase tracking-wider px-1.5 py-0.5 rounded border border-gray-200 dark:border-dark-border">
            {label}
          </span>
        );
      },
    },
    {
      header: "Category",
      exportValue: (row) => row.category,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Tag size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {row.category}
          </span>
        </div>
      ),
    },
    {
      header: "Pricing",
      exportValue: (row) =>
        `Sell: ${currencySymbol}${row.sellingPrice} / Cost: ${currencySymbol}${row.purchasePrice}`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white notranslate">
            {currencySymbol}
            {row.sellingPrice?.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium notranslate">
            Cost: {currencySymbol}
            {row.purchasePrice?.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      header: "Stock",
      exportValue: (row) => `${row.currentStock} ${row.unit}`,
      render: (row) => (
        <span
          className={`text-sm font-black ${
            row.currentStock <= 0
              ? "text-red-500"
              : row.currentStock <= 5
              ? "text-amber-500"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {row.currentStock} {row.unit}
        </span>
      ),
    },
    {
      header: "Total Value",
      align: "right",
      exportValue: (row) => row.stockValue,
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white notranslate">
          {currencySymbol}
          {row.stockValue?.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout title="Stock Report" subtitle="Monitor inventory levels and valuation">
      {summaryData && (
        <ReportSummaryCard
          title="Stock Summary"
          totalValue={summaryData.total}
          totalLabel="Inventory Value"
          totalCount={summaryData.count}
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
        />
      )}
      <CustomTable
        columns={columns}
        data={report}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={
          hasPermission("reports:stock:stock_report:export")
            ? handleExport
            : undefined
        }
        emptyMessage="No inventory records found."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        extraFilters={
          <>
            <div className="w-[calc(50%-4px)] sm:w-40 shrink-0">
              <CustomDropdown
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                options={[
                  { value: "", label: "All Stock Status" },
                  { value: "in_stock", label: "In Stock" },
                  { value: "out_of_stock", label: "Out of Stock" },
                  { value: "low_stock", label: "Low Stock" },
                ]}
                variant="compact"
                buttonClassName="h-9 text-[11px] font-bold border border-gray-100 dark:border-dark-border rounded-xl px-3 bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5 transition-all w-full flex items-center justify-between"
              />
            </div>
            <div className="w-[calc(50%-4px)] sm:w-48 shrink-0">
              <CustomDropdown
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                options={[
                  { value: "", label: "All Suppliers" },
                  ...suppliers.map((s) => ({
                    value: s._id,
                    label: s.name,
                  })),
                ]}
                variant="compact"
                buttonClassName="h-9 text-[11px] font-bold border border-gray-100 dark:border-dark-border rounded-xl px-3 bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5 transition-all w-full flex items-center justify-between"
              />
            </div>
            {branches.length > 0 && (
              <div className="flex-1 min-w-[120px] sm:w-48 shrink-0">
                <CustomDropdown
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  options={[
                    { value: "", label: "All Branches" },
                    ...branches.map((b) => ({
                      value: b._id,
                      label: `${b.name}${b.mapAddress || b.address ? ` - ${b.mapAddress || b.address}` : ""}`
                    }))
                  ]}
                  variant="compact"
                  buttonClassName="h-9 text-[11px] font-bold border border-gray-100 dark:border-dark-border rounded-xl px-3 bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5 transition-all w-full flex items-center justify-between"
                />
              </div>
            )}
          </>
        }
        pagination={{ ...pagination, onPageChange }}
        mobileMapper={{
          leading: (row) => (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border font-black ${
                row.isVariant
                  ? "bg-indigo-50 text-indigo-400 border-indigo-100"
                  : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 border-emerald-100"
              }`}
            >
              <Package size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.name}
              {row.isVariant && (
                <span className="text-[9px] ml-1 text-indigo-400 font-bold uppercase">
                  ({row.type})
                </span>
              )}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.category} • {row.sku || "NO SKU"} •{" "}
              <span
                className={
                  row.currentStock <= 0 ? "text-red-400" : "text-emerald-500"
                }
              >
                {row.currentStock} {row.unit}
              </span>
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white notranslate">
                {currencySymbol}
                {row.stockValue?.toLocaleString()}
              </div>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default StockReportPage;
