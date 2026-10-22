import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import TaxReportFilterModal from "../../../components/shared/TaxReportFilterModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { exportToCSV } from "../../../utils/exportUtils";
import { usePagination } from "../../../hooks/usePagination";

const PurchaseVatReport = () => {
  const { currencySymbol, hasPermission } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    tax: [],
    startDate: today,
    endDate: today,
  });

  const fetchTaxes = useCallback(async () => {
    try {
      const res = await api.get("/taxes");
      if (res.data.success) {
        setTaxes(
          res.data.data.filter(
            (t) => t.isActive && t.name.toUpperCase().includes("VAT"),
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const taxFilterOptions = useMemo(() => {
    const dbTaxes = taxes.map((t) => ({
      id: `${t.percentage}%`,
      label: `${t.percentage}% VAT`,
      value: t.percentage.toString(),
    }));

    const options = [];
    if (!dbTaxes.some((t) => t.value === "0")) {
      options.push({ id: "0%", label: "0% VAT", value: "0" });
    }
    return [...options, ...dbTaxes];
  }, [taxes]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });
      if (searchTerm) params.append("search", searchTerm);
      params.append("taxType", "VAT");

      if (filters.tax && filters.tax.length > 0) {
        const taxValues = filters.tax.map((t) => t.replace("%", ""));
        params.append("taxPercent", taxValues.join(","));
      }

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/purchases/invoices?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data || []);
        if (res.data.summary) setReportSummary(res.data.summary);
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
  ]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    resetPagination();
  }, [filters, searchTerm, resetPagination]);

  const handleExport = () => {
    const columns = [
      { header: "Invoice #", key: "invoiceNumber" },
      { header: "Date", key: "date" },
      { header: "Supplier", key: "supplierName" },
      { header: "Tax %", key: "taxPercent" },
      { header: "Taxable Value", key: "taxableValue" },
      { header: `VAT Amount`, key: "taxValue" },
      { header: "Total Amount", key: "totalValue" },
    ];
    const exportData = invoices.map((inv) => ({
      ...inv,
      supplierName: inv.supplier?.name || "Unknown",
      date: new Date(inv.date).toLocaleDateString(),
      taxPercent: [...new Set((inv.items || []).map((i) => i.taxPercent))]
        .filter((p) => p !== undefined && p !== null)
        .join(", ") + "%",
      taxableValue: (inv.totalAmount || 0) - (inv.taxAmount || 0),
      taxValue: inv.taxAmount || 0,
      totalValue: inv.totalAmount || 0,
    }));
    exportToCSV(exportData, columns, `Purchase_VAT_IN_Report.csv`);
  };

  const summaryData = useMemo(() => {
    const totalSelectedTotal = reportSummary?.total || 0;
    const totalSelectedTax = reportSummary?.tax || 0;
    const totalSelectedTaxable = reportSummary?.taxable || 0;

    return {
      total: totalSelectedTotal,
      count: pagination.total,
      segments: [
        {
          id: "TaxAmount",
          label: `VAT Amount`,
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
  }, [reportSummary, pagination.total]);

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
          {((row.totalAmount || 0) - (row.taxAmount || 0)).toLocaleString()}
        </span>
      ),
    },
    {
      header: `VAT Amount`,
      render: (row) => (
        <span className="text-sm font-bold text-amber-600 notranslate">
          {currencySymbol}
          {(row.taxAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Total Amount",
      render: (row) => (
        <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
          {currencySymbol}
          {(row.totalAmount || 0).toLocaleString()}
        </span>
      ),
    },
  ];

  const filterCount = useMemo(() => {
    return (filters.tax?.length || 0);
  }, [filters.tax]);

  return (
    <ReportLayout
      title={`VAT IN Report`}
      subtitle={`Analyze purchases filtered by VAT percentage`}
    >
      <ReportSummaryCard
        title={`Purchase VAT Analysis`}
        totalValue={summaryData.total}
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
      />

      <CustomTable
        columns={columns}
        data={invoices}
        loading={loading}
        onRefresh={fetchInvoices}
        isRefreshing={loading}
        onExport={hasPermission('reports:purchases:purchase_vat:export') ? handleExport : undefined}
        onFilterClick={() => setIsFilterOpen(true)}
        filterCount={filterCount}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        pagination={{ ...pagination, onPageChange }}
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100 font-bold">
              {row.invoiceNumber?.slice(-3) || "IN"}
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
                {(row.totalAmount || 0).toLocaleString()}
              </div>
              <span className="text-[8px] font-bold uppercase text-amber-500">
                VAT {(row.taxAmount || 0).toLocaleString()}
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
        taxLabel="VAT"
        initialFilters={filters}
      />
    </ReportLayout>
  );
};

export default PurchaseVatReport;
