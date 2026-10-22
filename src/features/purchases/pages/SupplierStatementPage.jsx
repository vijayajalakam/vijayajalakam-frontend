import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  User,
  Calendar,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
} from "lucide-react";
import { exportToCSV } from "../../../utils/exportUtils";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import InlineSearchSelect from "../../../components/shared/InlineSearchSelect";
import Snackbar from "../../../components/shared/Snackbar";

const SupplierStatementPage = () => {
  const { hasPermission } = useAuth();
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const location = useLocation();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(location.state?.supplierId || "");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayStr = today.toLocaleDateString("en-CA");
  const firstDayStr = firstDayOfMonth.toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeOpening, setIncludeOpening] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);

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
        const [suppRes, pmRes] = await Promise.all([
          api.get("/suppliers"),
          api.get("/payment-methods"),
        ]);
        if (suppRes.data.success) setSuppliers(suppRes.data.data || []);
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
    if (!selectedSupplier) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await api.get(
        `/suppliers/${selectedSupplier}/statement?${params}`,
      );
      if (res.data.success) {
        setTransactions(res.data.data || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier, startDate, endDate]);

  useEffect(() => {
    if (selectedSupplier) fetchStatement();
  }, [fetchStatement, selectedSupplier]);

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

  const handleAction = async (type) => {
    if (!actionAmount || isNaN(actionAmount) || Number(actionAmount) <= 0)
      return showSnack("Enter valid amount", "warning");
    const endpoint = type === "receipt" ? "process-receipt" : "process-payment";
    try {
      setActionLoading(true);
      await api.post(`/suppliers/${selectedSupplier}/${endpoint}`, {
        amount: Number(actionAmount),
        paymentMethod: actionMethod,
        date: actionDate,
        notes: actionNotes,
      });
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

  const selectedSupplierName =
    suppliers.find((s) => s._id === selectedSupplier)?.name || "";

  const handleExport = () => {
    const columns = [
      { header: "Date", key: "date" },
      { header: "Type", key: "type" },
      { header: "Ref #", key: "ref" },
      { header: "Debit", key: "debit" },
      { header: "Credit", key: "credit" },
      { header: "Balance", key: "balance" },
    ];
    const exportData = transactions.map((t) => ({
      ...t,
      date: new Date(t.date).toLocaleDateString(),
    }));
    exportToCSV(
      exportData,
      columns,
      `Supplier_Statement_${selectedSupplierName}.csv`,
    );
  };

  const summaryData = useMemo(() => {
    if (!summary) return null;
    
    const maxBar = Math.abs(summary.openingBalance || 0) + 
                   Math.abs(summary.totalDebit || 0) + 
                   Math.abs(summary.totalCredit || 0);
    
    return {
      total: summary.closingBalance || 0,
      estimatedClosingBalance: summary.supplierBalance || 0,
      count: summary.count || transactions.length,
      maxBar: maxBar || 1,
      segments: [
        {
          label: "Opening Balance",
          value: Math.abs(summary.openingBalance || 0),
          color: "#94a3b8",
          inProgressBar: true,
        },
        {
          label: "Total Debit",
          value: Math.abs(summary.totalDebit || 0),
          color: "#f43f5e",
          inProgressBar: true,
          forceDrCr: "Dr",
        },
        {
          label: "Total Credit",
          value: Math.abs(summary.totalCredit || 0),
          color: "#10b981",
          inProgressBar: true,
          forceDrCr: "Cr",
        },
        {
          label: "Closing Balance",
          value: Math.abs(summary.closingBalance || 0),
          color: (summary.closingBalance || 0) < 0 ? "#10b981" : (summary.closingBalance || 0) > 0 ? "#f43f5e" : "#94a3b8",
          inProgressBar: false,
        },
      ],
    };
  }, [summary, transactions]);

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
      header: "Type",
      render: (r) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            r.type?.toLowerCase().includes("purchase") && !r.type?.toLowerCase().includes("return") || r.type?.toLowerCase().includes("receipt")
              ? "bg-rose-50 text-rose-600 border border-rose-100/50"
              : r.type?.toLowerCase().includes("return") || r.type?.toLowerCase().includes("payment")
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                : "bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-dark-border/50"
          }`}
        >
          {r.type}
        </span>
      ),
    },
    {
      header: "Ref",
      render: (row) => (
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">
          {row.description}
        </span>
      ),
    },
    {
      header: "Debit",
      render: (r) => (
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 notranslate">
          {r.debit
            ? `${currencySymbol}${formatDisplayNumber(r.debit)}`
            : "—"}
        </span>
      ),
    },
    {
      header: "Credit",
      render: (r) => (
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 notranslate">
          {r.credit
            ? `${currencySymbol}${formatDisplayNumber(r.credit)}`
            : "—"}
        </span>
      ),
    },
    {
      header: "Balance",
      align: "right",
      render: (r) => {
        const val = r.balance != null ? Number(r.balance) : 0;
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
      title="Supplier Statement"
      subtitle="Detailed transaction history per supplier"
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <div className="space-y-3 md:space-y-6">
        {summaryData && (
          <ReportSummaryCard
            title={
              summary.supplierName || selectedSupplierName || "Supplier Ledger"
            }
            totalValue={summaryData.total}
            totalCount={summaryData.count}
            segments={summaryData.segments}
            loading={loading}
            currencySymbol={currencySymbol}
            showDrCr={true}
            totalLabel="Closing Balance"
            countLabel="Transactions"
            estimatedTotalValue={summaryData.estimatedClosingBalance}
            maxBarValue={summaryData.maxBar}
          />
        )}

        <CustomTable
          columns={columns}
          data={filteredData}
          loading={loading}
          onRefresh={fetchStatement}
          isRefreshing={loading}
          onExport={hasPermission('reports:supplier:supplier_statement:export') ? handleExport : undefined}
          searchQuery={searchTerm}
          onSearchChange={selectedSupplier ? setSearchTerm : null}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          emptyMessage={
            selectedSupplier
              ? "No transactions found for this supplier."
              : "Please select a supplier to view statement."
          }
          extraFilters={
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border w-full md:min-w-[180px] md:w-auto">
              <User size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <InlineSearchSelect
                options={suppliers.map((s) => ({
                  value: s._id,
                  label: s.name,
                }))}
                value={selectedSupplier}
                onChange={setSelectedSupplier}
                placeholder="Select Supplier"
                className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-transparent border-none py-0 focus:ring-0"
                allowClear
              />
            </div>
          }
          headerActions={
            summary && (
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
                {hasPermission('reports:supplier:supplier_statement:settle') && (
                  <>
                    <button
                      onClick={() => {
                        setActionAmount("");
                        setActionNotes("");
                        setIsPaymentModalOpen(true);
                      }}
                      className="h-9 w-9 md:w-auto md:px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpCircle size={14} />
                      <span className="hidden md:inline text-[10px] uppercase tracking-widest">Payment</span>
                    </button>
                    <button
                      onClick={() => {
                        setActionAmount("");
                        setActionNotes("");
                        setIsReceiptModalOpen(true);
                      }}
                      className="h-9 w-9 md:w-auto md:px-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowDownCircle size={14} />
                      <span className="hidden md:inline text-[10px] uppercase tracking-widest">Receipt</span>
                    </button>
                  </>
                )}
              </div>
            )
          }
          mobileMapper={{
            leading: (row) => (
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border ${
                  row.type === "Purchase"
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-400 border-blue-100"
                    : row.type === "Return"
                      ? "bg-orange-50 text-orange-400 border-orange-100"
                      : "bg-green-50 text-green-400 border-green-100"
                }`}
              >
                <span className="text-[10px] uppercase">
                  {row.type.charAt(0)}
                </span>
              </div>
            ),
            title: (row) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                {row.ref}
              </h4>
            ),
            subtitle: (row) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {row.type} • {new Date(row.date).toLocaleDateString()}
              </p>
            ),
            trailing: (row) => (
              <div className="text-right">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  Balance
                </p>
                <p
                  className={`text-[13px] font-black notranslate ${row.balance > 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {currencySymbol}
                  {Math.abs(row.balance || 0).toLocaleString()}
                </p>
              </div>
            ),
          }}
        />
      </div>

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
                  ? "Process Supplier Receipt"
                  : "Process Supplier Payment"}
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
                  Current Statement Balance
                </span>
                <div
                  className={`text-xl font-black notranslate ${summary?.closingBalance > 0 ? "text-rose-600" : summary?.closingBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}
                >
                  {currencySymbol}
                  {Math.abs(summary?.closingBalance || 0).toLocaleString()}
                  <span className="text-[10px] font-bold uppercase tracking-wider ml-2 opacity-60">
                    {summary?.closingBalance > 0
                      ? "(Due)"
                      : summary?.closingBalance < 0
                        ? "(Advance/Credit)"
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
                  <InlineSearchSelect
                    options={paymentMethods.map((pm) => ({
                      value: pm.name,
                      label: pm.name,
                    }))}
                    value={actionMethod}
                    onChange={setActionMethod}
                    placeholder="Select method..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-brand-primary"
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
                  ${isReceiptModalOpen ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
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

export default SupplierStatementPage;
