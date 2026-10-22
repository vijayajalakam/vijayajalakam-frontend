import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import TaxReportFilterModal from "../../../components/shared/TaxReportFilterModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { exportToCSV } from "../../../utils/exportUtils";
import { usePagination } from "../../../hooks/usePagination";

const PurchaseTaxReport = () => {
  const { currencySymbol, country, hasPermission } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    tax: [],
    startDate: today,
    endDate: today,
  });

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const taxLabel = useMemo(() => {
    const c = (country || "").toLowerCase();
    if (c === "india") return "GST";
    if (["uae", "uk", "united kingdom", "bahrain", "oman"].includes(c))
      return "VAT";
    if (["usa", "united states"].includes(c)) return "Sales Tax";
    return "Tax";
  }, [country]);

  const fetchTaxes = useCallback(async () => {
    try {
      const res = await api.get("/taxes");
      if (res.data.success) {
        setTaxes(
          res.data.data.filter(
            (t) => t.isActive && t.name.toUpperCase().includes(taxLabel.toUpperCase()),
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [taxLabel]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const taxFilterOptions = useMemo(() => {
    const dbTaxes = taxes.map((t) => ({
      id: `${t.percentage}%`,
      label: `${t.percentage}% ${taxLabel}`,
      value: t.percentage.toString(),
    }));

    const options = [];
    if (!dbTaxes.some((t) => t.value === "0")) {
      options.push({ id: "0%", label: `0% ${taxLabel}`, value: "0" });
    }
    return [...options, ...dbTaxes];
  }, [taxes, taxLabel]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      params.append("taxType", taxLabel);

      if (filters.tax && filters.tax.length > 0) {
        const taxValues = filters.tax.map((t) => t.replace("%", ""));
        params.append("taxPercent", taxValues.join(","));
      }

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/purchases/invoices?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data || []);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    filters,
    searchTerm,
    pagination.page,
    pagination.limit,
    updatePagination,
    taxLabel,
  ]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, filters, resetPagination]);

  const processedInvoices = useMemo(() => {
    return invoices.map((inv) => {
      let matchingItems = inv.items || [];
      const activeTaxValues = filters.tax || [];

      matchingItems = matchingItems.filter(
        (item) =>
          item.taxPercent === 0 ||
          taxes.some((t) => t.percentage === item.taxPercent),
      );

      if (activeTaxValues && activeTaxValues.length > 0) {
        const targetPercents = activeTaxValues.map(Number);
        matchingItems = matchingItems.filter(
          (item) => targetPercents.includes(item.taxPercent),
        );
      }

      const taxableAmount = matchingItems.reduce((acc, item) => {
        const itemTax = item.taxAmount || 0;
        const itemAmount = item.amount || 0;
        return acc + (itemAmount - itemTax);
      }, 0);

      const taxAmount = matchingItems.reduce(
        (acc, item) => acc + (item.taxAmount || 0),
        0,
      );
      const totalAmount = matchingItems.reduce(
        (acc, item) => acc + (item.amount || 0),
        0,
      );

      return {
        ...inv,
        taxableAmount,
        combinedTaxAmount: taxAmount,
        combinedTotalAmount: totalAmount,
      };
    });
  }, [invoices, filters.tax, taxes]);

  const handleExport = () => {
    const columns = [
      { header: "Invoice #", key: "invoiceNumber" },
      { header: "Date", key: "date" },
      { header: "Supplier", key: "supplierName" },
      { header: "Tax %", key: "taxPercent" },
      { header: "Taxable Value", key: "taxableValue" },
      { header: `${taxLabel} Amount`, key: "taxValue" },
      { header: "Total Amount", key: "totalValue" },
    ];
    const exportData = processedInvoices.map((inv) => ({
      ...inv,
      supplierName: inv.supplier?.name || "Unknown",
      date: new Date(inv.date).toLocaleDateString(),
      taxPercent: [...new Set((inv.items || []).map((i) => i.taxPercent))]
        .filter((p) => p !== undefined && p !== null)
        .join(", ") + "%",
      taxableValue: inv.taxableAmount,
      taxValue: inv.combinedTaxAmount,
      totalValue: inv.combinedTotalAmount,
    }));
    exportToCSV(exportData, columns, `Purchase_${taxLabel.replace(/\s+/g, "_")}_Report.csv`);
  };

  const summaryData = useMemo(() => {
    const totalSelectedTotal = processedInvoices.reduce(
      (acc, cur) => acc + (cur.combinedTotalAmount || 0),
      0,
    );
    const totalSelectedTax = processedInvoices.reduce(
      (acc, cur) => acc + (cur.combinedTaxAmount || 0),
      0,
    );
    const totalSelectedTaxable = processedInvoices.reduce(
      (acc, cur) => acc + (cur.taxableAmount || 0),
      0,
    );

    return {
      total: totalSelectedTotal,
      count: pagination.total,
      segments: [
        {
          id: "TaxAmount",
          label: `${taxLabel} Amount`,
          value: totalSelectedTax,
          color: "#f59e0b",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
        {
          id: "TaxableAmount",
          label: "Taxable Value",
          value: totalSelectedTaxable,
          color: "#10b981",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
      ],
    };
  }, [processedInvoices, pagination.total, taxLabel]);

  const columns = [
    {
      header: "Invoice",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-400 group-hover:text-brand-primary dark:text-blue-400 transition-colors uppercase tracking-tight">
            #{row.invoiceNumber}
          </span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
            {new Date(row.date).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: "Supplier",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-100/50">
            {row.supplier?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.supplier?.name || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      header: "Tax %",
      render: (row) => {
        const percents = [...new Set((row.items || []).map((i) => i.taxPercent))].filter(
          (p) => p !== undefined && p !== null
        );
        return (
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-card px-2 py-1 rounded-full">
            {percents.length > 0 ? percents.join(", ") : "0"}%
          </span>
        );
      },
    },
    {
      header: "Taxable Value",
      render: (row) => (
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 notranslate">
          {currencySymbol}
          {row.taxableAmount?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      header: `${taxLabel} Amount`,
      render: (row) => (
        <span className="text-sm font-bold text-amber-600 notranslate">
          {currencySymbol}
          {row.combinedTaxAmount?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      header: "Total Amount",
      render: (row) => (
        <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
          {currencySymbol}
          {row.combinedTotalAmount?.toLocaleString() || 0}
        </span>
      ),
    },
  ];

  const filterCount = useMemo(() => {
    return (filters.tax?.length || 0);
  }, [filters.tax]);

  return (
    <ReportLayout
      title={`Purchase ${taxLabel} Report`}
      subtitle={`Analyze purchases filtered by ${taxLabel} percentage`}
    >
      <ReportSummaryCard
        title={`Purchase ${taxLabel} Analysis`}
        totalValue={summaryData.total}
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
      />

      <CustomTable
        columns={columns}
        data={processedInvoices}
        loading={loading}
        onExport={hasPermission('reports:purchases:purchase_tax:export') ? handleExport : undefined}
        onFilterClick={() => setIsFilterOpen(true)}
        filterCount={filterCount}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100 font-bold">
              {row.invoiceNumber?.slice(-2) || "IN"}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.supplier?.name || "Unknown"} •{" "}
              {new Date(row.date).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {currencySymbol}
                {row.combinedTotalAmount?.toLocaleString()}
              </div>
              <span className="text-[8px] font-bold uppercase text-amber-500">
                {taxLabel} {row.combinedTaxAmount?.toLocaleString()}
              </span>
            </div>
          ),
        }}
      />
      <TaxReportFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(tax) => setFilters((prev) => ({ ...prev, tax }))}
        taxOptions={taxFilterOptions}
        taxLabel={taxLabel}
        initialFilters={filters}
      />
    </ReportLayout>
  );
};

export default PurchaseTaxReport;
