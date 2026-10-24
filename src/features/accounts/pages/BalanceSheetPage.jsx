import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import { Landmark } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";

const BalanceSheetPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: new Date().toLocaleDateString("en-CA"),
  });
  const [searchTerm, setSearchTerm] = useState("");

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 50 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });
      if (filters.endDate) params.append("asOfDate", filters.endDate);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(
        `/account-transactions/balance-sheet?${params}`,
      );
      if (res.data.success) {
        setData(res.data.data);
        setTotals(res.data.totals || {});
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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    resetPagination();
  }, [filters, searchTerm, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 100000,
      });
      if (filters.endDate) params.append("asOfDate", filters.endDate);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(
        `/account-transactions/balance-sheet?${params}`,
      );
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const columns = [
    {
      header: "Code",
      exportValue: (r) => r.code,
      render: (r) => (
        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 font-bold">
          {r.code}
        </span>
      ),
    },
    {
      header: "Account Name",
      exportValue: (r) => r.name,
      render: (r) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{r.name}</span>
      ),
    },
    {
      header: "Section",
      exportValue: (r) => r.section,
      render: (r) => {
        const colors = {
          Asset: "bg-blue-50 text-blue-600 border-blue-100",
          Liability: "bg-rose-50 text-rose-600 border-rose-100",
          Equity: "bg-purple-50 text-purple-600 border-purple-100",
        };
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[r.section] || "bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-100 dark:border-dark-border"}`}
          >
            {r.section}
          </span>
        );
      },
    },
    {
      header: "Amount",
      align: "right",
      exportValue: (r) => Math.abs(r.amount || 0).toLocaleString(),
      render: (r) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white notranslate">
          {currencySymbol}
          {Math.abs(r.amount || 0).toLocaleString()}
        </span>
      ),
    },
  ];

  const summaryData = useMemo(() => {
    return {
      total: totals.totalAssets || 0,
      count: pagination.total,
      segments: [
        {
          id: "assets",
          label: "Assets",
          value: totals.totalAssets || 0,
          color: "#3b82f6",
          inProgressBar: true,
        },
        {
          id: "liabilities",
          label: "Liabilities",
          value: totals.totalLiabilities || 0,
          color: "#ef4444",
          inProgressBar: true,
        },
        {
          id: "equity",
          label: "Equity",
          value: totals.totalEquity || 0,
          color: "#a855f7",
          inProgressBar: true,
        },
      ],
    };
  }, [totals, pagination.total]);

  return (
    <ReportLayout title="Balance Sheet" subtitle="View your company's assets, liabilities, and equity">
      <div className="space-y-3 md:space-y-6">
        <ReportSummaryCard
          title="Financial Position"
          totalValue={summaryData.total}
          totalCount={summaryData.count}
          totalLabel="Total assets"
          countLabel="Accounts"
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
        />

        <CustomTable
          columns={columns}
          data={data}
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
          pagination={{ ...pagination, onPageChange }}
          emptyMessage="No financial data available."
          mobileMapper={{
            leading: (row) => (
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-dark-border">
                <span className="text-[10px] font-black">{row.code}</span>
              </div>
            ),
            title: (row) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                {row.name}
              </h4>
            ),
            subtitle: (row) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {row.section}
              </p>
            ),
            trailing: (row) => (
              <div className="text-right">
                <p className="text-[13px] font-black notranslate text-gray-900 dark:text-white">
                  {currencySymbol}
                  {Math.abs(row.amount || 0).toLocaleString()}
                </p>
              </div>
            ),
          }}
        />
      </div>
    </ReportLayout>
  );
};

export default BalanceSheetPage;
