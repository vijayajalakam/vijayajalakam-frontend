import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import { Landmark, Store } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";
import AccountingFilterModal from "../../../components/shared/AccountingFilterModal";

const TrialBalancePage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toLocaleDateString("en-CA"),
    endDate: new Date().toLocaleDateString("en-CA"),
    branches: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [shops, setShops] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

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

      const res = await api.get(
        `/account-transactions/trial-balance?${params}`,
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

      const res = await api.get(
        `/account-transactions/trial-balance?${params}`,
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
        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
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
      header: "Type",
      exportValue: (r) => r.type,
      render: (r) => (
        <span className="text-sm text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
          {r.type}
        </span>
      ),
    },
    {
      header: "Debit",
      exportValue: (r) => r.debit ? formatDisplayNumber(r.debit) : "—",
      render: (r) => (
        <span className="text-sm font-black text-rose-600 dark:text-rose-400 notranslate">
          {r.debit ? `${currencySymbol}${formatDisplayNumber(r.debit)}` : "—"}
        </span>
      ),
    },
    {
      header: "Credit",
      exportValue: (r) => r.credit ? formatDisplayNumber(r.credit) : "—",
      render: (r) => (
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
          {r.credit ? `${currencySymbol}${formatDisplayNumber(r.credit)}` : "—"}
        </span>
      ),
    },
  ];

  const summaryData = useMemo(() => {
    return {
      total: totals.totalDebit || 0,
      count: pagination.total,
      segments: [
        {
          id: "debit",
          label: "Total Debit",
          value: totals.totalDebit || 0,
          color: "#ef4444",
          inProgressBar: true,
        },
        {
          id: "credit",
          label: "Total Credit",
          value: totals.totalCredit || 0,
          color: "#10b981",
          inProgressBar: true,
        },
      ],
    };
  }, [totals, pagination.total]);

  return (
    <ReportLayout title="Trial Balance" subtitle="Verify account balances and ledger totals">
      <div className="space-y-3 md:space-y-6">
        <ReportSummaryCard
          title="Ledger Balance"
          totalValue={summaryData.total}
          totalCount={summaryData.count}
          totalLabel="Total debit"
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
          onFilterClick={() => setIsFilterModalOpen(true)}
          filterCount={
            Object.entries(filters).filter(([k, v]) =>
              k !== "startDate" && k !== "endDate" && (Array.isArray(v) ? v.length > 0 : !!v),
            ).length
          }
          emptyMessage="No account data available."
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
                {row.type}
              </p>
            ),
            trailing: (row) => (
              <div className="text-right">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  {row.debit > 0
                    ? "Debit"
                    : row.credit > 0
                      ? "Credit"
                      : "Balance"}
                </p>
                <p
                  className={`text-[13px] font-black notranslate ${row.debit > 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {currencySymbol}
                  {formatDisplayNumber(row.debit || row.credit || 0)}
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

export default TrialBalancePage;
