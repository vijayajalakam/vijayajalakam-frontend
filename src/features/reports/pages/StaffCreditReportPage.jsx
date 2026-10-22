import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const StaffCreditReportPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState(null);
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      const res = await api.get(`/admin/staff/credit-report?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch staff credit report:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (r) =>
        r.name?.toLowerCase().includes(lower) ||
        r.phone?.toLowerCase().includes(lower) ||
        r.email?.toLowerCase().includes(lower),
    );
  }, [data, searchTerm]);

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
          label: "Overpaid (Credit)",
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
      header: "Staff",
      exportValue: (r) => `${r.name} | ${r.phone || "N/A"} | ${r.email || "N/A"}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs border border-purple-100/50">
            {r.name?.charAt(0).toUpperCase() || "S"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {r.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              {r.phone || r.email || "No Contact"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Earned",
      exportValue: (r) => r.totalEarned?.toLocaleString() || "0",
      render: (r) => (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 notranslate">
          {currencySymbol}{(r.totalEarned || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Settled",
      exportValue: (r) => r.totalSettled?.toLocaleString() || "0",
      render: (r) => (
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 notranslate">
          {currencySymbol}{(r.totalSettled || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Balance",
      align: "right",
      exportValue: (r) =>
        `${r.balance > 0 ? "Due" : r.balance < 0 ? "Overpaid" : "Settled"}: ${Math.abs(r.balance).toLocaleString()}`,
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
            {r.balance > 0 ? "Due" : r.balance < 0 ? "Overpaid" : "Settled"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Staff Credit Report"
      subtitle="Outstanding commission balances across all staff"
    >
      {summaryData && (
        <ReportSummaryCard
          title="Staff Balance Summary"
          totalValue={summaryData.total}
          totalCount={summaryData.count}
          totalLabel="Total Due"
          countLabel="Staff"
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
          maxBarValue={summaryData.maxBar}
          hideCountLabel
        />
      )}

      <CustomTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={
          hasPermission("reports:staff:staff_credit_report:export")
            ? handleExport
            : undefined
        }
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
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
              {row.phone || row.email || "No Contact"} • Earned:{" "}
              {currencySymbol}{(row.totalEarned || 0).toLocaleString()}
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
                {row.balance > 0 ? "Due" : row.balance < 0 ? "Overpaid" : "Settled"}
              </span>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default StaffCreditReportPage;
