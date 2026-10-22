import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import { Landmark, Store } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";
import AccountingFilterModal from "../../../components/shared/AccountingFilterModal";

const ProfitLossPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    branches: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [shops, setShops] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 50 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.branches?.length > 0)
        params.append("branchId", filters.branches.join(","));

      const res = await api.get(`/account-transactions/profit-loss?${params}`);
      if (res.data.success) {
        setData(res.data.data);
        setSummary(res.data.summary || {});
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
    api.get("/shops").then((r) => {
      if (r.data.success) setShops(r.data.data);
    });
  }, []);

  useEffect(() => {
    resetPagination();
  }, [filters, searchTerm, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 100000,
      });
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.branches?.length > 0)
        params.append("branchId", filters.branches.join(","));

      const res = await api.get(`/account-transactions/profit-loss?${params}`);
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
          Revenue: "bg-emerald-50 text-emerald-600 border-emerald-100",
          "Cost of Sales": "bg-amber-50 text-amber-600 border-amber-100",
          Expense: "bg-rose-50 text-rose-600 border-rose-100",
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
      total: summary.netProfit || 0,
      count: pagination.total,
      segments: [
        {
          id: "revenue",
          label: "Revenue",
          count: summary.incomeCount || 0,
          value: summary.totalIncome || 0,
          color: "#10b981",
          inProgressBar: true,
        },
        {
          id: "cos",
          label: "Cost of Sales",
          count: summary.costOfSalesCount || 0,
          value: summary.totalCostOfSales || 0,
          color: "#f59e0b",
          inProgressBar: true,
        },
        {
          id: "expenses",
          label: "Expenses",
          count: summary.expensesCount || 0,
          value: summary.totalExpenses || 0,
          color: "#ef4444",
          inProgressBar: true,
        },
      ],
    };
  }, [summary, pagination.total]);

  return (
    <ReportLayout title="Profit & Loss" subtitle="Analyze your revenue, expenses, and net profit">
      <div className="space-y-3 md:space-y-6">
        <ReportSummaryCard
          title={`Net ${summary.netProfit >= 0 ? "Profit" : "Loss"}`}
          totalValue={Math.abs(summaryData.total)}
          totalCount={summaryData.count}
          totalLabel="Net amount"
          countLabel="Accounts"
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
        />

        {/* Profitability Bar */}
        {!loading && (
          <div
            className={`rounded-2xl border-2 px-6 py-4 flex items-center justify-between ${
              summary.grossProfit >= 0
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200"
                : "bg-rose-50 border-rose-200"
            }`}
          >
            <span className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-gray-100">
              Gross Profit Margin
            </span>
            <span
              className={`text-xl font-black notranslate ${
                summary.grossProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700"
              }`}
            >
              {currencySymbol}
              {Math.abs(summary.grossProfit || 0).toLocaleString()}
            </span>
          </div>
        )}

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
          onFilterClick={() => setIsFilterModalOpen(true)}
          filterCount={
            Object.entries(filters).filter(([k, v]) =>
              k !== "startDate" && k !== "endDate" && (Array.isArray(v) ? v.length > 0 : !!v),
            ).length
          }
          emptyMessage="No financial records for this period."
          mobileMapper={{
            leading: (row) => (
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-dark-border">
                <span className="text-[10px] font-black">
                  {row.code || "??"}
                </span>
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
      <AccountingFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        branches={shops}
        initialFilters={filters}
      />
    </ReportLayout>
  );
};

export default ProfitLossPage;
