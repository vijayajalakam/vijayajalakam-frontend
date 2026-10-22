import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import { Download } from "lucide-react";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import Snackbar from "../../../components/shared/Snackbar";
import TaxReportFilterModal from "../../../components/shared/TaxReportFilterModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  getUnifiedInvoicePayableTotal,
  getUnifiedInvoiceRoundOff,
} from "../../../utils/unifiedInvoiceTotals";

const SalesVatReport = () => {
  const { currencySymbol, hasPermission, enableRoundOff } = useAuth();
  const { formatDisplayNumber } = useCurrency();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

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
        // Filter for VAT taxes only
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
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      params.append("taxType", "VAT");

      if (filters.tax && filters.tax.length > 0) {
        const taxValues = filters.tax.map((t) => t.replace("%", ""));
        params.append("taxPercent", taxValues.join(","));
      }

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/invoices?${params.toString()}`);
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
    pagination.page,
    pagination.limit,
    searchTerm,
    updatePagination,
  ]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, filters, resetPagination]);

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showSnack("Failed to download invoice", "error");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (searchTerm) params.append("search", searchTerm);
      params.append("taxType", "VAT");

      if (filters.tax && filters.tax.length > 0) {
        const taxValues = filters.tax.map((t) => t.replace("%", ""));
        params.append("taxPercent", taxValues.join(","));
      }

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/invoices?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
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
          count: pagination.total,
          value: totalSelectedTax,
          color: "#f59e0b",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
        {
          id: "TaxableAmount",
          label: "Taxable Value",
          count: pagination.total,
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
      exportValue: (row) =>
        `#${row.invoiceNumber} (${new Date(row.createdAt).toLocaleDateString()})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-400 group-hover:text-brand-primary dark:text-blue-400 transition-colors uppercase tracking-tight">
            #{row.invoiceNumber}
          </span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      exportValue: (row) => row.customer?.name || "LOCAL CUSTOMER",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-100/50">
            {row.customer?.name?.charAt(0).toUpperCase() || "W"}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.customer?.name || "LOCAL CUSTOMER"}
          </span>
        </div>
      ),
    },
    {
      header: "Tax %",
      exportValue: (row) => {
        const percents = [...new Set((row.items || []).map((i) => i.taxPercent))].filter(
          (p) => p !== undefined && p !== null
        );
        return percents.length > 0 ? percents.join(", ") + "%" : "0%";
      },
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
      exportValue: (row) => row.amount - (row.taxAmount || 0),
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 notranslate">
            {currencySymbol}
            {((row.amount || 0) - (row.taxAmount || 0)).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      header: `VAT Amount`,
      exportValue: (row) => row.taxAmount || 0,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-amber-600 notranslate">
            {currencySymbol}
            {(row.taxAmount || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    ...(enableRoundOff
      ? [
          {
            header: "Round-off",
            exportValue: (row) => {
              const r = getUnifiedInvoiceRoundOff(row);
              return Math.abs(r) < 0.0001 ? "" : formatDisplayNumber(r);
            },
            render: (row) => {
              const r = getUnifiedInvoiceRoundOff(row);
              if (Math.abs(r) < 0.0001) {
                return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
              }
              return (
                <span className="text-sm font-bold text-slate-600 notranslate">
                  {r > 0 ? "+" : ""}
                  {currencySymbol}
                  {formatDisplayNumber(r)}
                </span>
              );
            },
          },
        ]
      : []),
    {
      header: "Total Amount",
      exportValue: (row) => formatDisplayNumber(getUnifiedInvoicePayableTotal(row)),
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
            {currencySymbol}
            {formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}
          </span>
        </div>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {hasPermission('reports:sales:sales_vat_report:download') && (
            <button
              onClick={() => handleDownload(row._id)}
              title="Download PDF"
              className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all active:scale-95"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const filterCount = useMemo(() => {
    return (filters.tax?.length || 0);
  }, [filters.tax]);

  return (
    <ReportLayout
      title={`VAT OUT Report`}
      subtitle={`Analyze sales filtered by VAT percentage`}
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <ReportSummaryCard
        title={`Sales VAT Analysis`}
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
        onExport={hasPermission('reports:sales:sales_vat_report:export') ? handleExport : undefined}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        onFilterClick={() => setIsFilterOpen(true)}
        filterCount={filterCount}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
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
              {row.customer?.name || "LOCAL CUSTOMER"} •{" "}
              {new Date(row.createdAt).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {currencySymbol}
                {formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}
              </div>
              <span className="text-[8px] font-bold uppercase text-amber-500">
                VAT {row.taxAmount?.toLocaleString()}
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

export default SalesVatReport;
