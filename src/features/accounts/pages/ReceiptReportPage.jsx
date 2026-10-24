import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import { ArrowDownCircle } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";

const ReceiptReportPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });
  const [searchTerm, setSearchTerm] = useState("");

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

      const res = await api.get(
        `/account-transactions/receipt-report?${params}`,
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

      const res = await api.get(
        `/account-transactions/receipt-report?${params}`,
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
          label: "Total Receipts",
          value: summary.totalAmount || 0,
          color: "#10b981",
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
      header: "Debit A/C",
      exportValue: (r) => r.debitAccount?.name || "—",
      render: (r) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {r.debitAccount?.name || "—"}
        </span>
      ),
    },
    {
      header: "Credit A/C",
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
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
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
    <ReportLayout title="Receipt Report" subtitle="Monitor incoming receipts and vouchers">
      {summaryData && (
        <ReportSummaryCard
          title="Receipts Summary"
          totalValue={summaryData.total}
          totalCount={summaryData.count}
          segments={summaryData.segments}
          loading={loading}
          currencySymbol={currencySymbol}
        />
      )}

      <CustomTable
        columns={columns}
        data={data}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={handleExport}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 border border-emerald-100 flex items-center justify-center font-bold">
              <ArrowDownCircle size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.voucherNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.creditAccount?.name} • {new Date(row.date).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {currencySymbol}
                {row.amount?.toLocaleString()}
              </div>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default ReceiptReportPage;
