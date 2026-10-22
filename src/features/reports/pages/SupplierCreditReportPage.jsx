import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";

const SupplierCreditReportPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState(null);
  const { pagination, onPageChange, setTotal, resetPagination } = usePagination({ initialLimit: 20 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers/credit-report");
      if (res.data.success) {
        const raw = res.data.data || [];
        setData(raw);
        const totalDue = raw.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0);
        const totalCredit = raw.filter((r) => r.balance < 0).reduce((s, r) => s + Math.abs(r.balance), 0);
        setSummary({
          total: raw.length,
          totalDue,
          totalCredit,
          dueCount: raw.filter((r) => r.balance > 0).length,
          creditCount: raw.filter((r) => r.balance < 0).length,
          settledCount: raw.filter((r) => r.balance === 0).length,
        });
      }
    } catch (err) {
      console.error("Failed to fetch supplier credit report:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (r) =>
        r.name?.toLowerCase().includes(lower) ||
        r.phone?.toLowerCase().includes(lower),
    );
  }, [data, searchTerm]);

  useEffect(() => {
    setTotal(filteredData.length);
  }, [filteredData.length, setTotal]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, resetPagination]);

  const paginatedData = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    return filteredData.slice(startIndex, startIndex + pagination.limit);
  }, [filteredData, pagination.page, pagination.limit]);

  const summaryData = useMemo(() => {
    if (!summary) return null;
    const maxBar = (summary.totalDue || 0) + (summary.totalCredit || 0);
    return {
      total: summary.totalDue,
      count: summary.total,
      maxBar: maxBar || 1,
      segments: [
        {
          label: "Due (Payable)",
          value: summary.totalDue,
          count: summary.dueCount,
          color: "#ef4444",
          inProgressBar: true,
        },
        {
          label: "Credit (Overpaid)",
          value: summary.totalCredit,
          count: summary.creditCount,
          color: "#10b981",
          inProgressBar: true,
        },
      ],
    };
  }, [summary]);

  const handleExport = async () => data;

  const columns = [
    {
      header: "Supplier",
      exportValue: (r) => `${r.name} | ${r.phone || "N/A"}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100/50">
            {r.name?.charAt(0).toUpperCase() || "S"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {r.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              {r.phone || "No Phone"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Purchases",
      exportValue: (r) => r.totalPurchases?.toLocaleString() || "0",
      render: (r) => (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 notranslate">
          {currencySymbol}{(r.totalPurchases || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Payments",
      exportValue: (r) => r.totalPayments?.toLocaleString() || "0",
      render: (r) => (
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 notranslate">
          {currencySymbol}{(r.totalPayments || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Returns",
      exportValue: (r) => r.totalReturns?.toLocaleString() || "0",
      render: (r) => (
        <span className="text-sm font-medium text-amber-600 notranslate">
          {currencySymbol}{(r.totalReturns || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Balance",
      align: "right",
      exportValue: (r) =>
        `${r.balance > 0 ? "Due" : r.balance < 0 ? "Credit" : "Settled"}: ${Math.abs(r.balance).toLocaleString()}`,
      render: (r) => (
        <div className="flex flex-col items-end">
          <span
            className={`text-sm font-black notranslate ${
              r.balance > 0
                ? "text-rose-600"
                : r.balance < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {r.balance < 0 ? "-" : ""}
            {currencySymbol}
            {Math.abs(r.balance).toLocaleString()}
          </span>
          <span
            className={`text-[9px] font-black uppercase tracking-wider ${
              r.balance > 0
                ? "text-rose-400"
                : r.balance < 0
                  ? "text-emerald-400"
                  : "text-gray-300"
            }`}
          >
            {r.balance > 0 ? "Due" : r.balance < 0 ? "Credit" : "Settled"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Supplier Credit Report"
      subtitle="Outstanding due and credit balances across all suppliers"
    >
      {summaryData && (
        <ReportSummaryCard
          title="Supplier Balance Summary"
          totalValue={summaryData.total}
          totalCount={summaryData.count}
          totalLabel="Total Due"
          countLabel="Suppliers"
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
          maxBarValue={summaryData.maxBar}
          hideCountLabel
        />
      )}

      <CustomTable
        columns={columns}
        data={paginatedData}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={
          hasPermission("reports:supplier:supplier_credit_report:export")
            ? handleExport
            : undefined
        }
        emptyMessage="No supplier balance data found."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        mobileMapper={{
          leading: (row) => (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold border ${
                row.balance > 0
                  ? "bg-rose-50 text-rose-400 border-rose-100"
                  : row.balance < 0
                    ? "bg-emerald-50 text-emerald-400 border-emerald-100"
                    : "bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 border-gray-100 dark:border-dark-border"
              }`}
            >
              {row.balance > 0 ? (
                <TrendingDown size={20} />
              ) : row.balance < 0 ? (
                <TrendingUp size={20} />
              ) : (
                <Minus size={20} />
              )}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.name}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.phone || "No Phone"} • Purchases:{" "}
              {currencySymbol}{(row.totalPurchases || 0).toLocaleString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div
                className={`text-sm font-black notranslate ${
                  row.balance > 0
                    ? "text-rose-600"
                    : row.balance < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {row.balance < 0 ? "-" : ""}
                {currencySymbol}
                {Math.abs(row.balance).toLocaleString()}
              </div>
              <span
                className={`text-[8px] font-black uppercase ${
                  row.balance > 0
                    ? "text-rose-400"
                    : row.balance < 0
                      ? "text-emerald-400"
                      : "text-gray-300"
                }`}
              >
                {row.balance > 0 ? "Due" : row.balance < 0 ? "Credit" : "Settled"}
              </span>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default SupplierCreditReportPage;
