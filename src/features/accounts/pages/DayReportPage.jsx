import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { exportToCSV } from "../../../utils/exportUtils";
import {
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Receipt,
  Calendar,
  Layers,
  Search,
} from "lucide-react";

const DayReportPage = () => {
  const { hasPermission } = useAuth();
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    startDate: new Date().toLocaleDateString("en-CA"),
    endDate: new Date().toLocaleDateString("en-CA"),
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      const res = await api.get(`/account-transactions/day-report?${params}`);
      if (res.data.success) {
        setData(res.data.data);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (item) =>
        item.voucherNumber?.toLowerCase().includes(lower) ||
        item.narration?.toLowerCase().includes(lower) ||
        item.type?.toLowerCase().includes(lower),
    );
  }, [data, searchTerm]);

  const handleExport = async () => {
    return filteredData;
  };

  const summaryData = useMemo(() => {
    if (!summary) return null;
    return {
      total: summary.totalReceipt - summary.totalPayment,
      segments: [
        {
          label: "Receipts",
          count: 1,
          value: summary.totalReceipt || 0,
          color: "#10b981",
          inProgressBar: true,
        },
        {
          label: "Payments",
          count: 1,
          value: summary.totalPayment || 0,
          color: "#ef4444",
          inProgressBar: true,
        },
        {
          label: "Contra",
          count: 1,
          value: summary.totalContra || 0,
          color: "#3b82f6",
          inProgressBar: true,
        },
        {
          label: "Journal",
          count: 1,
          value: summary.totalJournal || 0,
          color: "#f59e0b",
          inProgressBar: true,
        },
      ],
    };
  }, [summary]);

  const columns = [
    {
      header: "Voucher",
      exportValue: (r) => `${r.voucherNumber} (${r.type})`,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {r.voucherNumber}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
            {r.type}
          </span>
        </div>
      ),
    },
    {
      header: "Ledger Postings",
      exportValue: (r) => (r.entries || []).map(e => `${e.account?.name}: ${e.debit > 0 ? "DR "+e.debit : "CR "+e.credit}`).join(" | "),
      render: (r) => (
        <div className="flex flex-col gap-1 py-1">
          {r.entries?.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 group/entry pr-4"
            >
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                {e.account?.name}
              </span>
              <span
                className={`text-[11px] font-black notranslate ${e.debit > 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}
              >
                {e.debit > 0
                  ? `DR ${currencySymbol}${e.debit}`
                  : `CR ${currencySymbol}${e.credit}`}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: "Narration",
      exportValue: (r) => r.narration || "—",
      render: (r) => (
        <span
          className="text-xs font-medium text-gray-400 dark:text-gray-500 max-w-[200px] truncate block"
          title={r.narration}
        >
          {r.narration || "—"}
        </span>
      ),
    },
    {
      header: "Total Amount",
      align: "right",
      exportValue: (r) => formatDisplayNumber(r.totalAmount),
      render: (r) => (
        <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
          {currencySymbol}
          {formatDisplayNumber(r.totalAmount)}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout title="Day Report" subtitle="Review daily financial transactions and ledger postings">
      {summaryData && (
        <ReportSummaryCard
          title="Net Daily Cashflow"
          totalValue={summaryData.total}
          totalCount={summary.transactionCount}
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
          isCurrency={true}
        />
      )}

      <CustomTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={handleExport}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        emptyMessage={`No transactions recorded for the selected period.`}
        mobileMapper={{
          leading: (row) => (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border
                ${
                  row.type === "receipt"
                    ? "bg-emerald-50 text-emerald-400 border-emerald-100"
                    : row.type === "payment"
                      ? "bg-rose-50 text-rose-400 border-rose-100"
                      : "bg-blue-50 dark:bg-blue-900/20 text-blue-400 border-blue-100"
                }`}
            >
              {row.type === "receipt" ? (
                <ArrowDownCircle size={22} />
              ) : row.type === "payment" ? (
                <ArrowUpCircle size={22} />
              ) : (
                <Layers size={22} />
              )}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.voucherNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.type} • {row.narration || "No Narration"}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {currencySymbol}
                {formatDisplayNumber(row.totalAmount)}
              </div>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                Total
              </span>
            </div>
          ),
          actions: (row) => (
            <div className="p-4 bg-gray-50 dark:bg-dark-card/50 rounded-2xl space-y-2 border border-gray-100 dark:border-dark-border">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                Double Entry Postings
              </p>
              {row.entries?.map((e, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-xs font-bold"
                >
                  <span className="text-gray-600 dark:text-gray-400">{e.account?.name}</span>
                  <span
                    className={`font-mono ${e.debit > 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}
                  >
                    {e.debit > 0
                      ? `DR ${currencySymbol}${e.debit}`
                      : `CR ${currencySymbol}${e.credit}`}
                  </span>
                </div>
              ))}
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default DayReportPage;
