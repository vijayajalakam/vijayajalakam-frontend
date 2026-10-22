import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Wallet } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import moment from "moment";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";

const ProfitLossReport = () => {
  const { user, currencySymbol, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {
      totalRevenue: 0,
      totalCommissionsPaid: 0,
      totalCommissionPending: 0,
      netProfit: 0,
    },
    payouts: [],
  });
  const [filters, setFilters] = useState({
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      const res = await api.get(`/invoices/profit-loss?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
        updatePagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch P&L data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, updatePagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    resetPagination();
  }, [filters, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(filters);
      params.append("page", 1);
      params.append("limit", 100000);
      const res = await api.get(`/invoices/profit-loss?${params.toString()}`);
      return res.data.success ? res.data.data.payouts : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    const {
      totalRevenue,
      totalCommissionsPaid,
      totalCommissionPending,
      netProfit,
    } = data.summary;
    return {
      total: totalRevenue,
      segments: [
        {
          label: "Net Profit",
          count: 1,
          value: netProfit,
          color: "#10b981",
          inProgressBar: true,
        },
        {
          label: "Commissions Paid",
          count: 1,
          value: totalCommissionsPaid,
          color: "#ef4444",
          inProgressBar: true,
        },
        {
          label: "Pending Commissions",
          count: 1,
          value: totalCommissionPending,
          color: "#f59e0b",
          inProgressBar: true,
        },
      ],
    };
  }, [data.summary]);

  const columns = [
    {
      header: "Staff Member",
      exportValue: (row) => row.staff?.name || "Unknown",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-100/50">
            {row.staff?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.staff?.name || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      header: "Payout Date",
      exportValue: (row) => moment(row.paidAt).format("DD MMM YYYY hh:mm A"),
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {moment(row.paidAt).format("DD MMM YYYY")}
          </span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest whitespace-nowrap">
            {moment(row.paidAt).format("hh:mm A")}
          </span>
        </div>
      ),
    },
    {
      header: "Amount Paid",
      exportValue: (row) => row.amount?.toLocaleString(),
      render: (row) => (
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
          {currencySymbol}
          {row.amount?.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Processed By",
      exportValue: (row) => row.paidBy?.name || user?.name || "Owner",
      render: (row) => (
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {row.paidBy?.name || user?.name || "Owner"}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Profit & Loss"
      subtitle="Summary of income and commission expenses"
    >
      <ReportSummaryCard
        title="Gross Revenue"
        totalValue={summaryData.total}
        totalCount={pagination.total}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
      />

      <CustomTable
        columns={columns}
        data={data.payouts}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={hasPermission('reports:accounts:profit_loss:export') ? handleExport : undefined}
        emptyMessage="No payout records found for the selected period."
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 border border-emerald-100 flex items-center justify-center">
              <Wallet size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.staff?.name}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {moment(row.paidAt).format("DD MMM")} •{" "}
              {row.paidBy?.name || user?.name || "Owner"}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {currencySymbol}
                {row.amount?.toLocaleString()}
              </div>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                Paid
              </span>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default ProfitLossReport;
