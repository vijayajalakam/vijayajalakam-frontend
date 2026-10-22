import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import { XCircle, Download } from "lucide-react";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import moment from "moment";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  getUnifiedInvoicePayableTotal,
  getUnifiedInvoiceRoundOff,
} from "../../../utils/unifiedInvoiceTotals";

const TrashInvoiceReport = () => {
  const { currencySymbol, hasPermission, enableRoundOff } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportSummary, setReportSummary] = useState(null);
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });

  const fetchCancelledInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/invoices/cancelled?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data || []);
        if (res.data.summary) setReportSummary(res.data.summary);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch cancelled invoices", err);
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
    fetchCancelledInvoices();
  }, [fetchCancelledInvoices]);

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

  const getPaymentMethodDisplay = (row) => {
    if (row.payments && row.payments.length > 0) {
      const methods = [...new Set(row.payments.map((p) => p.method))];
      return methods.join(" + ");
    }
    return row.paymentMethod || "N/A";
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/invoices/cancelled?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    const total = reportSummary?.total || 0;
    return {
      total,
      count: pagination.total,
      segments: [
        {
          label: "Cancelled",
          count: pagination.total,
          value: total,
          color: "#ef4444",
          textColor: "text-rose-600",
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
          <span className="font-mono text-xs text-gray-400 dark:text-gray-500 uppercase tracking-tight">
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
          <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 font-bold text-[10px] border border-rose-100/50">
            {row.customer?.name?.charAt(0).toUpperCase() || "W"}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.customer?.name || "LOCAL CUSTOMER"}
          </span>
        </div>
      ),
    },

    {
      header: "Method",
      exportValue: (row) => getPaymentMethodDisplay(row),
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-600">
          {getPaymentMethodDisplay(row)}
        </span>
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
      header: "Amount",
      exportValue: (row) =>
        `${currencySymbol}${formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-gray-900 dark:text-white notranslate line-through decoration-rose-400">
            {currencySymbol}
            {formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}
          </span>
        </div>
      ),
    },
    {
      header: "Cancelled At",
      exportValue: (row) =>
        row.cancelledAt
          ? moment(row.cancelledAt).format("DD MMM YYYY, h:mm A")
          : "N/A",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            {row.cancelledAt
              ? moment(row.cancelledAt).format("DD MMM YYYY")
              : "N/A"}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">
            {row.cancelledAt ? moment(row.cancelledAt).format("h:mm A") : ""}
          </span>
        </div>
      ),
    },
    {
      header: "Cancelled By",
      exportValue: (row) => row.cancelledBy?.name || "System",
      render: (row) => (
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
          {row.cancelledBy?.name || "System"}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end">
          {hasPermission('reports:sales:trash_invoices:download') && (
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

  return (
    <ReportLayout
      title="Trash Invoices"
      subtitle="View cancelled and voided invoices"
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <ReportSummaryCard
        title="Cancelled Invoices"
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
        onRefresh={fetchCancelledInvoices}
        isRefreshing={loading}
        onExport={hasPermission('reports:sales:trash_invoices:export') ? handleExport : undefined}
        emptyMessage="No cancelled invoices found."
        pagination={{
          ...pagination,
          onPageChange,
        }}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-400 border border-rose-100 flex items-center justify-center">
              <XCircle size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              #{row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.customer?.name || "LOCAL CUSTOMER"} •{" "}
              {row.cancelledAt
                ? moment(row.cancelledAt).format("DD MMM")
                : "N/A"}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-rose-600 dark:text-rose-400 line-through notranslate">
                {currencySymbol}
                {formatDisplayNumber(getUnifiedInvoicePayableTotal(row))}
              </div>
              <span className="text-[8px] text-rose-400 font-black uppercase tracking-wider">
                Cancelled
              </span>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default TrashInvoiceReport;
