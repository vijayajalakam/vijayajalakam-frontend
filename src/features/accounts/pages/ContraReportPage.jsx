import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import { CreditCard, Store } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";
import AccountingFilterModal from "../../../components/shared/AccountingFilterModal";

const ContraReportPage = () => {
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
        `/account-transactions/contra-report?${params}`,
      );
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

      const res = await api.get(
        `/account-transactions/contra-report?${params}`,
      );
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    return {
      total: summary.totalAmount || 0,
      count: pagination.total,
      segments: [
        {
          id: "total",
          label: "Total Contra",
          value: summary.totalAmount || 0,
          color: "#3b82f6",
          inProgressBar: true,
        },
      ],
    };
  }, [summary, pagination.total]);

  const columns = [
    {
      header: "Document ID",
      exportValue: (r) => r.voucherNumber,
      render: (r) => (
        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
          {r.voucherNumber}
        </span>
      ),
    },
    {
      header: "Date",
      exportValue: (r) => new Date(r.date).toLocaleDateString(),
      render: (r) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {new Date(r.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Transfer To (To)",
      exportValue: (r) => r.debitAccount?.name || "—",
      render: (r) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {r.debitAccount?.name || "—"}
        </span>
      ),
    },
    {
      header: "Transfer From (From)",
      exportValue: (r) => r.creditAccount?.name || "—",
      render: (r) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {r.creditAccount?.name || "—"}
        </span>
      ),
    },
    {
      header: "Amount",
      exportValue: (r) => (r.amount || 0).toLocaleString(),
      render: (r) => (
        <span className="text-sm font-black text-blue-600 notranslate">
          {currencySymbol}
          {(r.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Narration",
      exportValue: (r) => r.narration || "—",
      render: (r) => (
        <span
          className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate block"
          title={r.narration}
        >
          {r.narration || "—"}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout title="Contra Report" subtitle="Monitor fund transfers between accounts">
      <div className="space-y-3 md:space-y-6">
        <ReportSummaryCard
          title="Contra Summary"
          totalValue={summaryData.total}
          totalCount={summaryData.count}
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
          emptyMessage="No contra data found."
          mobileMapper={{
            leading: () => (
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100">
                <CreditCard size={22} />
              </div>
            ),
            title: (row) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                {row.voucherNumber}
              </h4>
            ),
            subtitle: (row) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {row.debitAccount?.name} ← {row.creditAccount?.name} •{" "}
                {new Date(row.date).toLocaleDateString()}
              </p>
            ),
            trailing: (row) => (
              <div className="text-right">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  Amount
                </p>
                <p className="text-[13px] font-black text-blue-600 notranslate">
                  {currencySymbol}
                  {(row.amount || 0).toLocaleString()}
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

export default ContraReportPage;
