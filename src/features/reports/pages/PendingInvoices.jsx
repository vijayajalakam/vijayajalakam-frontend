import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CreditCard, FileText, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import InlineSearchSelect from "../../../components/shared/InlineSearchSelect";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  getUnifiedInvoicePayableTotal,
  getUnifiedInvoiceRoundOff,
} from "../../../utils/unifiedInvoiceTotals";

const PendingInvoices = () => {
  const { currencySymbol, hasPermission, enableRoundOff } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [reportSummary, setReportSummary] = useState(null);
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "CASH",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await api.get("/payment-methods");
      if (res.data.success) {
        setPaymentMethods(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch payment methods:", err);
    }
  }, []);

  const fetchPendingInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      params.append("isPendingOnly", "true");
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (searchTerm) params.append("search", searchTerm);

      if (activeTab === "partial") {
        params.append("paymentStatus", "Partial");
      }

      const res = await api.get(`/invoices?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data || []);
        if (res.data.summary) setReportSummary(res.data.summary);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch pending invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    activeTab,
    startDate,
    endDate,
    updatePagination,
  ]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  useEffect(() => {
    fetchPendingInvoices();
  }, [fetchPendingInvoices]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, activeTab, startDate, endDate, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      params.append("isPendingOnly", "true");
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (searchTerm) params.append("search", searchTerm);
      if (activeTab === "partial") {
        params.append("paymentStatus", "Partial");
      }

      const res = await api.get(`/invoices?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    const totalDue = reportSummary?.due || 0;
    const partialCount = reportSummary?.counts?.partial || 0;
    const pendingCount = reportSummary?.counts?.pending || 0;
    const totalCount = pagination.total;

    return {
      total: totalDue,
      count: totalCount,
      segments: [
        {
          label: "Partial",
          count: partialCount,
          value: partialCount,
          color: "#f59e0b",
          textColor: "text-amber-600",
        },
        {
          label: "Fully Pending",
          count: pendingCount,
          value: pendingCount,
          color: "#ef4444",
          textColor: "text-rose-600",
        },
      ],
    };
  }, [reportSummary, pagination.total]);

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: Number((invoice.dueAmount || 0).toFixed(2)),
      method: paymentMethods.length > 0 ? paymentMethods[0].name : "CASH",
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const payAmount = Number(paymentData.amount);
    if (!payAmount || payAmount <= 0 || payAmount > selectedInvoice.dueAmount) {
      showSnack(
        "Please enter a valid amount not exceeding the due amount.",
        "warning",
      );
      return;
    }

    try {
      setSavingPayment(true);
      const res = await api.put(`/invoices/${selectedInvoice._id}/pay`, {
        amount: payAmount,
        method: paymentData.method,
      });

      if (res.data.success) {
        setIsPaymentModalOpen(false);
        showSnack("Payment settled successfully!", "success");
        fetchPendingInvoices();
      }
    } catch (err) {
      console.error("Payment failed:", err);
      showSnack(
        err.response?.data?.message || "Payment capture failed",
        "error",
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const columns = [
    {
      header: "Invoice Reference",
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
      exportValue: (row) =>
        `${row.user?.name || "LOCAL CUSTOMER"} (${row.user?.phone || row.user?.email || "General Client"})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.user?.name || "LOCAL CUSTOMER"}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {row.user?.phone || row.user?.email || "General Client"}
          </span>
        </div>
      ),
    },

    {
      header: "Outstanding",
      exportValue: (row) =>
        `${formatDisplayNumber(row.dueAmount || 0)} (Total: ${formatDisplayNumber(getUnifiedInvoicePayableTotal(row))})`,
      render: (row) => {
        const fullTotal = getUnifiedInvoicePayableTotal(row);
        const ro = getUnifiedInvoiceRoundOff(row);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-black text-rose-600 dark:text-rose-400 notranslate">
              {currencySymbol}
              {formatDisplayNumber(row.dueAmount || 0)}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none">
              Total: {currencySymbol}
              {formatDisplayNumber(fullTotal)}
            </span>
            {enableRoundOff && Math.abs(ro) > 0.0001 && (
              <span className="text-[9px] text-slate-500 font-bold notranslate">
                Round-off: {ro > 0 ? "+" : ""}
                {currencySymbol}
                {formatDisplayNumber(ro)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Status",
      exportValue: (row) => row.paymentStatus || "Pending",
      render: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
          ${row.paymentStatus === "Partial" ? "bg-amber-50 text-amber-600" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"}`}
        >
          {row.paymentStatus || "Pending"}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        hasPermission("reports:sales:pending_invoices:settle") && (
          <button
            onClick={() => openPaymentModal(row)}
            className="px-4 py-2 bg-brand-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 shadow-sm"
          >
            Settle
          </button>
        )
      ),
    },
  ];

  return (
    <ReportLayout
      title="Pending Invoices"
      subtitle="Track and settle outstanding customer balances"
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <ReportSummaryCard
        title="Outstanding"
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
        onRefresh={fetchPendingInvoices}
        isRefreshing={loading}
        onExport={hasPermission('reports:sales:pending_invoices:export') ? handleExport : undefined}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        emptyMessage="No pending invoices found."
        tabs={[
          {
            id: "all",
            label: "All Pending",
            count:
              (reportSummary?.counts?.partial || 0) +
              (reportSummary?.counts?.pending || 0),
          },
          {
            id: "partial",
            label: "Partially Paid",
            count: reportSummary?.counts?.partial || 0,
          },
          {
            id: "pending",
            label: "Fully Pending",
            count: reportSummary?.counts?.pending || 0,
          },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-400 border border-red-100 flex items-center justify-center">
              <FileText size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.customer?.name || row.user?.name || "LOCAL CUSTOMER"} •{" "}
              {new Date(row.createdAt).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-rose-600 dark:text-rose-400 notranslate">
                {currencySymbol}
                {formatDisplayNumber(row.dueAmount || 0)}
              </div>
              <span className="text-[8px] text-rose-400 font-black uppercase tracking-wider">
                Due
              </span>
            </div>
          ),
        }}
      />

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-dark-border">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Settle Payment
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="px-6 py-6 space-y-5">
                <div className="p-4 bg-gray-50 dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                    <span>Reference</span>
                    <span>Customer</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white text-sm">
                    <span>#{selectedInvoice.invoiceNumber}</span>
                    <span>
                      {selectedInvoice.user?.name || "LOCAL CUSTOMER"}
                    </span>
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-dark-card my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase">
                      Amount Due
                    </span>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {currencySymbol}
                      {selectedInvoice.dueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                    Payment Method
                  </label>
                  <InlineSearchSelect
                    options={paymentMethods.map((pm) => ({
                      value: pm.name,
                      label: pm.name,
                    }))}
                    value={paymentData.method}
                    onChange={(val) =>
                      setPaymentData({ ...paymentData, method: val })
                    }
                    placeholder="Select method..."
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                    Amount to Pay
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-black text-lg">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          amount: e.target.value,
                        })
                      }
                      max={selectedInvoice.dueAmount}
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-xl font-black text-gray-900 dark:text-white outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-dark-card/50 border-t border-gray-100 dark:border-dark-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-4 text-sm font-black text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex-1 py-4 text-sm font-black text-white bg-brand-primary rounded-2xl hover:bg-brand-primary-dark disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={18} />{" "}
                  {savingPayment ? "Settling..." : "Settle Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ReportLayout>
  );
};

export default PendingInvoices;
