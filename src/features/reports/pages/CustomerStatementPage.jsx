import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  X,
  User,
  Calendar,
} from "lucide-react";
import InlineSearchSelect from "../../../components/shared/InlineSearchSelect";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import { usePagination } from "../../../hooks/usePagination";

const CustomerStatementPage = () => {
  const { hasPermission } = useAuth();
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(location.state?.customerId || "");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeOpening, setIncludeOpening] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  // Modal states
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [actionAmount, setActionAmount] = useState("");
  const [actionMethod, setActionMethod] = useState("");
  const [actionDate, setActionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, pmRes] = await Promise.all([
          api.get("/admin/customers?reconcile=false"),
          api.get("/payment-methods"),
        ]);
        if (custRes.data.success) setCustomers(custRes.data.data || []);
        if (pmRes.data.success) {
          const methods = pmRes.data.data.filter((m) => m.name !== "WALLET");
          setPaymentMethods(methods);
          if (methods.length > 0) setActionMethod(methods[0].name);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const fetchStatement = useCallback(async () => {
    if (!selectedCustomer) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await api.get(
        `/sales/customer-statement/${selectedCustomer}?${params}`,
      );
      if (res.data.success) {
        setTransactions(res.data.data || []);
        setSummary(res.data.summary || null);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedCustomer,
    startDate,
    endDate,
    pagination.page,
    pagination.limit,
    updatePagination,
  ]);

  useEffect(() => {
    if (selectedCustomer) fetchStatement();
  }, [fetchStatement, selectedCustomer]);

  useEffect(() => {
    resetPagination();
  }, [selectedCustomer, startDate, endDate, resetPagination]);

  const processedTransactions = useMemo(() => {
    let currentBalance = includeOpening && summary && typeof summary.openingBalance === "number" ? summary.openingBalance : 0;
    return transactions.map(t => {
      currentBalance = currentBalance + (t.debit || 0) - (t.credit || 0);
      return { ...t, balance: currentBalance };
    });
  }, [transactions, includeOpening, summary]);

  const filteredData = useMemo(() => {
    let baseData = processedTransactions;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      baseData = processedTransactions.filter(
        (t) =>
          t.voucherNumber?.toLowerCase().includes(lower) ||
          t.ref?.toLowerCase().includes(lower) ||
          t.narration?.toLowerCase().includes(lower) ||
          t.type?.toLowerCase().includes(lower),
      );
    }
    
    if (includeOpening && summary && typeof summary.openingBalance === "number") {
      const openingRow = {
        _id: 'opening-balance',
        date: startDate || new Date(0).toISOString(),
        ref: 'OPENING',
        type: 'Opening Balance',
        debit: summary.openingBalance > 0 ? summary.openingBalance : 0,
        credit: summary.openingBalance < 0 ? Math.abs(summary.openingBalance) : 0,
        balance: summary.openingBalance
      };
      return [openingRow, ...baseData];
    }
    return baseData;
  }, [processedTransactions, searchTerm, includeOpening, summary, startDate]);

  const handleExport = async () => {
    if (!selectedCustomer) return [];
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await api.get(
        `/sales/customer-statement/${selectedCustomer}?${params.toString()}`,
      );
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    if (!summary) return null;
    const { closingBalance, totalDebit, totalCredit, count, openingBalance } =
      summary;

    const isDue = closingBalance < 0;
    const isWallet = closingBalance > 0;
    
    const maxBar = Math.abs(openingBalance || 0) + 
                   Math.abs(totalDebit || 0) + 
                   Math.abs(totalCredit || 0);

    return {
      total: closingBalance,
      label: "Balance",
      count: count || transactions.length,
      maxBar: maxBar || 1,
      segments: [
        {
          label: "Opening Balance",
          value: Math.abs(openingBalance || 0),
          color: "#94a3b8",
          inProgressBar: true,
        },
        {
          label: "Total Debit",
          value: Math.abs(totalDebit || 0),
          color: "#ef4444",
          inProgressBar: true,
          forceDrCr: "Dr",
        },
        {
          label: "Total Credit",
          value: Math.abs(totalCredit || 0),
          color: "#10b981",
          inProgressBar: true,
          forceDrCr: "Cr",
        },
        {
          label: "Closing Balance",
          value: Math.abs(closingBalance || 0),
          color: isDue ? "#ef4444" : isWallet ? "#10b981" : "#94a3b8",
          inProgressBar: false,
        },
      ],
    };
  }, [summary, transactions.length]);

  const handleAction = async (type) => {
    if (!actionAmount || isNaN(actionAmount) || Number(actionAmount) <= 0)
      return showSnack("Enter valid amount", "warning");
    const endpoint = type === "receipt" ? "process-receipt" : "process-payment";
    try {
      setActionLoading(true);
      await api.post(
        `/sales/customer-statement/${selectedCustomer}/${endpoint}`,
        {
          amount: Number(actionAmount),
          paymentMethod: actionMethod,
          date: actionDate,
          notes: actionNotes,
        },
      );
      showSnack(
        `${type === "receipt" ? "Receipt Processed" : "Payment Processed"} Successfully!`,
        "success",
      );
      setIsReceiptModalOpen(false);
      setIsPaymentModalOpen(false);
      setActionAmount("");
      setActionNotes("");
      fetchStatement();
    } catch (err) {
      showSnack(err.response?.data?.message || "Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: "Date",
      exportValue: (row) => new Date(row.date).toLocaleDateString(),
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {new Date(row.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Transaction ID",
      exportValue: (row) => row.ref,
      render: (row) => (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
          {row.ref}
        </span>
      ),
    },
    {
      header: "TYPE",
      exportValue: (row) => {
        if (row.type === "Invoice" || row.type === "Service" || row.type === "Product Sale") return "Invoice";
        if (row.type === "Bill" || row.type === "BILL") return "Bill";
        if (row.type === "Receipt") return "Receipt";
        if (row.type === "Payment") return "Payment";
        return row.type || "Bill";
      },
      render: (row) => {
        const isInvoice = row.type === "Invoice" || row.type === "Service" || row.type === "Product Sale";
        const isBill = row.type === "Bill" || row.type === "BILL";
        const isReceipt = row.type === "Receipt";
        const isPayment = row.type === "Payment";
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
            ${isInvoice ? "bg-purple-50 text-purple-600"
              : isBill ? "bg-emerald-50 text-emerald-600 dark:text-emerald-400"
              : isReceipt ? "bg-teal-50 text-teal-600"
              : isPayment ? "bg-rose-50 text-rose-600"
              : "bg-blue-50 dark:bg-blue-900/20 text-blue-600"}`}
          >
            {isInvoice ? "Invoice" : isBill ? "Bill" : isReceipt ? "Receipt" : isPayment ? "Payment" : (row.type || "Bill")}
          </span>
        );
      },
    },
    {
      header: "Debit",
      align: "right",
      exportValue: (row) => (row.debit ? formatDisplayNumber(row.debit) : "—"),
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white notranslate">
          {row.debit > 0 ? `${currencySymbol}${formatDisplayNumber(row.debit)}` : "—"}
        </span>
      ),
    },
    {
      header: "Credit",
      align: "right",
      exportValue: (row) => (row.credit ? formatDisplayNumber(row.credit) : "—"),
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white notranslate">
          {row.credit > 0 ? `${currencySymbol}${formatDisplayNumber(row.credit)}` : "—"}
        </span>
      ),
    },
    {
      header: "Balance",
      align: "right",
      exportValue: (row) => {
        const val = row.balance || 0;
        return `${val >= 0 ? "Dr" : "Cr"} ${formatDisplayNumber(Math.abs(val))}`;
      },
      render: (row) => {
        const val = row.balance || 0;
        return (
          <span className={`text-sm font-black notranslate ${val < 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}>
            <span className="mr-1 text-[10px] opacity-70">
              {val >= 0 ? "Dr" : "Cr"}
            </span>
            {currencySymbol}
            {formatDisplayNumber(Math.abs(val))}
          </span>
        );
      },
    },
  ];

  return (
    <ReportLayout
      title="Customer Statement"
      subtitle="Full financial history of selected customer"
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      {summaryData && (
        <ReportSummaryCard
          title={summary.customerName || "Customer Statement"}
          totalValue={summaryData.total}
          totalCount={summaryData.count}
          totalLabel={summaryData.label}
          countLabel="Transactions"
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
          showDrCr={true}
          maxBarValue={summaryData.maxBar}
        />
      )}

      <CustomTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onRefresh={fetchStatement}
        isRefreshing={loading}
        onExport={hasPermission('reports:customer:customer_statement:export') ? handleExport : undefined}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        mobileGroupWithNext={(row, nextRow) => {
          if (!nextRow) return false;
          // Group Invoice with the following Bill
          const currentType = row.type?.toUpperCase();
          const nextType = nextRow.type?.toUpperCase();
          return currentType === "INVOICE" && nextType === "BILL";
        }}
        searchQuery={searchTerm}
        onSearchChange={selectedCustomer ? setSearchTerm : null}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        emptyMessage={
          selectedCustomer
            ? "No transaction history found."
            : "Select a customer to view data."
        }
        extraFilters={
          <div className="flex items-center gap-2 bg-white dark:bg-dark-surface px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm w-full md:min-w-[180px] md:w-auto">
            <User size={14} className="text-brand-primary dark:text-blue-400 flex-shrink-0" />
            <InlineSearchSelect
              options={customers.map((c) => ({ value: c._id, label: c.name }))}
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              placeholder="Search customers..."
              className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-transparent border-none py-0"
              allowClear
            />
          </div>
        }
        headerActions={
          summary && summary.customerName !== "LOCAL CUSTOMER" && (
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 mr-2 cursor-pointer uppercase tracking-wide">
                <input
                  type="checkbox"
                  checked={includeOpening}
                  onChange={(e) => setIncludeOpening(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary dark:bg-dark-surface cursor-pointer w-3.5 h-3.5"
                />
                Include Opening
              </label>
              {hasPermission('reports:customer:customer_statement:settle') && (
                <>
                  <button
                    onClick={() => {
                      setActionAmount("");
                      setActionNotes("");
                      setIsReceiptModalOpen(true);
                    }}
                    className="h-9 w-9 md:w-auto md:px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowDownCircle size={14} />
                    <span className="hidden md:inline text-[10px] uppercase tracking-widest">Receipt</span>
                  </button>
                  <button
                    onClick={() => {
                      setActionAmount("");
                      setActionNotes("");
                      setIsPaymentModalOpen(true);
                    }}
                    className="h-9 w-9 md:w-auto md:px-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowUpCircle size={14} />
                    <span className="hidden md:inline text-[10px] uppercase tracking-widest">Payment</span>
                  </button>
                </>
              )}
            </div>
          )
        }
        mobileMapper={{
          leading: (row) => (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border
                    ${row.debit > 0 ? "bg-rose-50 text-rose-400 border-rose-100" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 border-emerald-100"}`}
            >
              {row.type === "Receipt" ? (
                <ArrowUpCircle size={22} />
              ) : (
                <Receipt size={22} />
              )}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.ref}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.type === "Bill" || row.type === "BILL" ? "Bill"
                : row.type === "Receipt" ? "Receipt"
                : row.type === "Payment" ? "Payment"
                : row.type === "Invoice" ? "Invoice"
                : row.type || "Bill"} • {new Date(row.date).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => {
            const val = row.balance || 0;
            return (
              <div className="text-right flex flex-col items-end gap-0.5">
                {row.debit > 0 && (
                  <div className="text-sm font-black text-gray-900 dark:text-white notranslate">
                    <span className="text-[9px] text-rose-500 font-bold mr-1 tracking-wider uppercase">Dr</span>
                    {currencySymbol}{formatDisplayNumber(row.debit)}
                  </div>
                )}
                {row.credit > 0 && (
                  <div className="text-sm font-black text-gray-900 dark:text-white notranslate">
                    <span className="text-[9px] text-emerald-500 font-bold mr-1 tracking-wider uppercase">Cr</span>
                    {currencySymbol}{formatDisplayNumber(row.credit)}
                  </div>
                )}
                {(!row.debit && !row.credit) && (
                  <div className="text-sm font-black text-gray-400 dark:text-gray-600">
                    -
                  </div>
                )}
                <div className={`text-[10px] font-black uppercase tracking-wider ${val < 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                  Bal: {val >= 0 ? "Dr" : "Cr"} {currencySymbol}{formatDisplayNumber(Math.abs(val))}
                </div>
              </div>
            );
          },
        }}
      />

      {/* Unified Modals */}
      {(isReceiptModalOpen || isPaymentModalOpen) && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsReceiptModalOpen(false);
            setIsPaymentModalOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-dark-border">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {isReceiptModalOpen
                  ? "Process Customer Receipt"
                  : "Process Customer Payment"}
              </h3>
              <button
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setIsPaymentModalOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border/50">
                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest block mb-1">
                  Current Master Balance
                </span>
                <div
                  className={`text-xl font-black notranslate ${summary?.closingBalance < 0 ? "text-rose-600" : summary?.closingBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}
                >
                  {currencySymbol}
                  {formatDisplayNumber(Math.abs(summary?.closingBalance || 0))}
                  <span className="text-[10px] font-bold uppercase tracking-wider ml-2 opacity-60">
                    {summary?.closingBalance < 0
                      ? "(Due)"
                      : summary?.closingBalance > 0
                        ? "(Credit/Wallet)"
                        : "(Settled)"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-black text-lg">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-6 py-3.5 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-lg font-black text-gray-900 dark:text-white outline-none focus:border-brand-primary transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar
                      size={14}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    />
                    <input
                      type="date"
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-brand-primary appearance-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                    Payment Method
                  </label>
                  <CustomDropdown
                    value={actionMethod}
                    onChange={(e) => setActionMethod(e.target.value)}
                    options={paymentMethods.map((pm) => ({
                      value: pm.name,
                      label: pm.name
                    }))}
                    placeholder="Select method..."
                    variant="compact"
                    buttonClassName="w-full px-4 py-3 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-brand-primary flex items-center justify-between"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Optional reference..."
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-brand-primary transition-all"
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-dark-card/5 border-t border-gray-100 dark:border-dark-border flex gap-3">
              <button
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setIsPaymentModalOpen(false);
                }}
                className="flex-1 py-4 text-sm font-black text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(isReceiptModalOpen ? "receipt" : "payment")
                }
                disabled={actionLoading}
                className={`flex-1 py-4 text-sm font-black text-white rounded-2xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 
                  ${isReceiptModalOpen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-primary hover:bg-brand-primary-dark"}`}
              >
                {actionLoading ? (
                  "Processing..."
                ) : (
                  <>
                    {isReceiptModalOpen ? (
                      <ArrowDownCircle size={18} />
                    ) : (
                      <ArrowUpCircle size={18} />
                    )}
                    {isReceiptModalOpen ? "Post Receipt" : "Post Payment"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ReportLayout>
  );
};

export default CustomerStatementPage;
