import React, { useState, useEffect, useMemo } from "react";
import { useGetPurchaseReportQuery } from "../../../store/api/tenantEndpoints";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { FileText } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { exportToCSV } from "../../../utils/exportUtils";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";

const PurchaseReportPage = () => {
  const { currencySymbol, hasPermission, enableRoundOff } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState("");

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const reportQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", pagination.page);
    params.append("limit", pagination.limit);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (searchTerm) params.append("search", searchTerm);
    return params.toString();
  }, [
    pagination.page,
    pagination.limit,
    startDate,
    endDate,
    searchTerm,
  ]);

  const { data: reportRes, isLoading: loading, isFetching, refetch } =
    useGetPurchaseReportQuery(reportQueryString);

  const data = reportRes?.success ? reportRes.data || [] : [];
  const summary = reportRes?.success ? reportRes.summary || {} : {};

  useEffect(() => {
    if (reportRes?.success && reportRes.pagination) {
      updatePagination(reportRes.pagination);
    }
  }, [reportRes, updatePagination]);

  useEffect(() => {
    resetPagination();
  }, [startDate, endDate, searchTerm, resetPagination]);

  const handleExport = () => {
    const columns = [
      { header: "Invoice", key: "invoiceNumber" },
      { header: "Date", key: "date" },
      { header: "Supplier", key: "supplierName" },
      { header: "Total", key: "totalAmount" },
      ...(enableRoundOff ? [{ header: "Round-off", key: "roundOffAmount" }] : []),
      { header: "Paid", key: "paidAmount" },
      { header: "Status", key: "status" },
    ];
    const exportData = data.map((row) => ({
      ...row,
      supplierName: row.supplier?.name || "N/A",
      date: new Date(row.date).toLocaleDateString(),
      roundOffAmount:
        Math.abs(Number(row.roundOffAmount) || 0) < 0.0001
          ? ""
          : Number(row.roundOffAmount) || 0,
    }));
    exportToCSV(exportData, columns, "Purchase_Report.csv");
  };

  const summaryData = useMemo(() => {
    const totalAmount = summary.totalAmount || 0;
    const totalPaid = summary.totalPaid || 0;
    const totalDue = summary.totalDue || 0;

    return {
      total: totalAmount,
      count: pagination.total,
      segments: [
        {
          label: "Paid Amount",
          value: totalPaid,
          color: "#10b981",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
        {
          label: "Outstanding Amount",
          value: totalDue,
          color: "#ef4444",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
      ],
    };
  }, [summary, pagination.total]);

  const columns = [
    {
      header: "Invoice & Date",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-gray-900 dark:text-white tracking-wider">
            #{row.invoiceNumber}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
            {new Date(row.date).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: "Supplier",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 border border-blue-100/50">
            {row.supplier?.name?.charAt(0).toUpperCase() || "S"}
          </div>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {row.supplier?.name || "N/A"}
          </span>
        </div>
      ),
    },
    {
      header: "Payment Status",
      render: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                    ${
                      row.status === "paid"
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100"
                        : row.status === "partial"
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}
        >
          {row.status}
        </span>
      ),
    },
    ...(enableRoundOff
      ? [
          {
            header: "Round-off",
            render: (row) => {
              const r = Number(row.roundOffAmount) || 0;
              if (Math.abs(r) < 0.0001) {
                return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
              }
              return (
                <span className="text-sm font-bold text-slate-600 notranslate">
                  {r > 0 ? "+" : ""}
                  {currencySymbol}
                  {formatDisplayNumber(r)}
                </span>
              );
            },
          },
        ]
      : []),
    {
      header: "Amount Paid",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 notranslate">
            {currencySymbol}
            {formatDisplayNumber(row.paidAmount)}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Total: {currencySymbol}
            {formatDisplayNumber(row.totalAmount)}
          </span>
        </div>
      ),
    },
    {
      header: "Due",
      align: "right",
      render: (row) => (
        <span
          className={`text-sm font-black notranslate ${row.totalAmount - row.paidAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-400"}`}
        >
          {currencySymbol}
          {formatDisplayNumber(
            (Number(row.totalAmount) || 0) - (Number(row.paidAmount) || 0),
          )}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Purchase Report"
      subtitle="Overview of procurement and supplier payments"
    >
      <ReportSummaryCard
        title="Total Procurement"
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
        onExport={hasPermission('reports:stock:purchase_report:export') ? handleExport : undefined}
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
        emptyMessage="No purchase records found."
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100">
              <FileText size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.supplier?.name || "Supplier"} •{" "}
              {new Date(row.date).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {currencySymbol}
                {row.totalAmount.toLocaleString()}
              </div>
              <span
                className={`text-[8px] font-bold uppercase ${row.status === "paid" ? "text-emerald-500" : "text-rose-500"}`}
              >
                {row.status}
              </span>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default PurchaseReportPage;
