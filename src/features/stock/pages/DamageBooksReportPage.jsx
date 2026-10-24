import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import { AlertTriangle, Package } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";

const DamageBooksReportPage = () => {
  const { currencySymbol } = useAuth();
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState("");

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(`/damages/report?${params}`);
      if (res.data.success) {
        setData(res.data.data);
        setSummary(res.data.summary);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    startDate,
    endDate,
    searchTerm,
    updatePagination,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    resetPagination();
  }, [startDate, endDate, searchTerm, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(`/damages/report?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    if (!summary) return null;
    return {
      total: summary.totalValue,
      count: summary.totalEntries,
      segments: [
        {
          label: "Total Inventory Loss",
          value: summary.totalValue,
          color: "#ef4444",
          inProgressBar: true,
        },
        {
          label: "Log Entries",
          value: summary.totalEntries,
          color: "#94a3b8",
          inProgressBar: true,
        },
      ],
    };
  }, [summary]);

  const columns = [
    {
      header: "Entry Details",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {new Date(row.date).toLocaleDateString()}
          </span>
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
            {row.entryNumber}
          </span>
        </div>
      ),
    },
    {
      header: "Product",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-card flex items-center justify-center border border-gray-100 dark:border-dark-border/50">
            <Package size={14} className="text-gray-400 dark:text-gray-500" />
          </div>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {row.product?.name || row.productName || "N/A"}
          </span>
        </div>
      ),
    },
    {
      header: "Quantity",
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {row.quantity} {row.product?.unit}
        </span>
      ),
    },
    {
      header: "Value Loss",
      render: (row) => (
        <span className="text-sm font-black text-rose-600 dark:text-rose-400 notranslate">
          {currencySymbol}
          {(row.lossAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Reason",
      align: "right",
      render: (row) => (
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">
          {row.reason || "Damage / Expired"}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout title="Damage Books Report" subtitle="Monitor book losses and damage logs">
      {summaryData && (
        <ReportSummaryCard
          title="Loss Summary"
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
        onExport={handleExport}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        emptyMessage="No damage records found for the selected period."
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-400 border border-rose-100">
              <AlertTriangle size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.product?.name || row.productName}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.reason || "Damage"} •{" "}
              {new Date(row.date).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                {currencySymbol}
                {(row.lossAmount || 0).toLocaleString()}
              </div>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                Loss Value
              </span>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export { DamageBooksReportPage as DamageReportPage };
export default DamageBooksReportPage;
