import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { exportToCSV } from "../../../utils/exportUtils";
import { usePagination } from "../../../hooks/usePagination";

const PurchaseReturnReportPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
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

      const res = await api.get(`/purchases/returns/report?${params}`);
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

  const handleExport = () => {
    const columns = [
      { header: "Return #", key: "returnNumber" },
      { header: "Date", key: "date" },
      { header: "Supplier", key: "supplierName" },
      { header: "Items", key: "itemsCount" },
      { header: "Amount", key: "totalAmount" },
      { header: "Reason", key: "reason" },
    ];
    const exportData = data.map((r) => ({
      ...r,
      date: new Date(r.date).toLocaleDateString(),
      supplierName: r.supplier?.name || "N/A",
      itemsCount: r.items?.length || 0,
    }));
    exportToCSV(exportData, columns, "Purchase_Return_Report.csv");
  };

  const columns = [
    {
      header: "Return #",
      render: (r) => (
        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white tracking-wider">
          #{r.returnNumber}
        </span>
      ),
    },
    {
      header: "Date",
      render: (r) => (
        <span className="text-sm">{new Date(r.date).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Supplier",
      render: (r) => (
        <span className="text-sm font-medium">{r.supplier?.name || "N/A"}</span>
      ),
    },
    {
      header: "Items",
      render: (r) => <span className="text-sm">{r.items?.length || 0}</span>,
    },
    {
      header: "Amount",
      render: (r) => (
        <span className="text-sm font-bold notranslate text-gray-900 dark:text-white">
          {currencySymbol}
          {r.totalAmount?.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Reason",
      render: (r) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 italic">{r.reason || "—"}</span>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Purchase Return Report"
      subtitle="Summary of returned items and related refunds"
    >
      <ReportSummaryCard
        title="Return Valuation"
        totalValue={summary.totalAmount || 0}
        totalCount={pagination.total}
        segments={[
          {
            label: "Total Returns",
            value: summary.totalAmount || 0,
            color: "#f97316",
            inProgressBar: true,
          },
        ]}
        loading={loading}
        currencySymbol={currencySymbol}
      />
      <CustomTable
        columns={columns}
        data={data}
        loading={loading}
        onRefresh={fetchData}
        isRefreshing={loading}
        onExport={hasPermission('reports:stock:purchase_return_report:export') ? handleExport : undefined}
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
        emptyMessage="No return data found."
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-400 border border-orange-100">
              <span className="text-[10px] uppercase font-bold">R</span>
            </div>
          ),
          title: (row) => (
            <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
              #{row.returnNumber}
            </h4>
          ),
          subtitle: (row) => (
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {row.supplier?.name || "Local Return"} •{" "}
              {new Date(row.date).toLocaleDateString()}
            </p>
          ),
          trailing: (row) => (
            <div className="text-right">
              <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                Amount
              </p>
              <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate">
                {currencySymbol}
                {row.totalAmount.toLocaleString()}
              </p>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default PurchaseReturnReportPage;
