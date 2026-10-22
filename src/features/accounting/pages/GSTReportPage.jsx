import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import { Landmark, Store } from "lucide-react";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { exportToCSV } from "../../../utils/exportUtils";
import moment from "moment";
import { usePagination } from "../../../hooks/usePagination";
import AccountingFilterModal from "../../../components/shared/AccountingFilterModal";

const GSTReportPage = () => {
  const { currencySymbol, country } = useAuth();
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

  // Determine tax label based on country
  const taxLabel = useMemo(() => {
    const c = (country || "").toLowerCase();
    if (c === "india") return "GST";
    if (["uae", "uk", "united kingdom", "bahrain", "oman"].includes(c))
      return "VAT";
    if (["usa", "united states"].includes(c)) return "Sales Tax";
    return "Tax";
  }, [country]);

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

      const res = await api.get(`/account-transactions/gst-report?${params}`);
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

      const res = await api.get(`/account-transactions/gst-report?${params}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const columns = [
    {
      header: "Type",
      exportValue: (r) => r.type,
      render: (row) => {
        const colors =
          row.type === "Sales"
            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
            : "bg-amber-50 text-amber-600 border-amber-100";
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors}`}
          >
            {row.type}
          </span>
        );
      },
    },
    {
      header: "Reference",
      exportValue: (r) => r.ref,
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">{row.ref}</span>
      ),
    },
    {
      header: "Date",
      exportValue: (r) => moment(r.date).format("DD MMM YYYY"),
      render: (row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {moment(row.date).format("DD MMM YYYY")}
        </span>
      ),
    },
    {
      header: "Subtotal",
      exportValue: (r) => (r.subtotal || 0).toLocaleString(),
      render: (row) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 notranslate">
          {currencySymbol}
          {(row.subtotal || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: `${taxLabel} Amount`,
      exportValue: (r) => (r.taxAmount || 0).toLocaleString(),
      render: (row) => (
        <span
          className={`text-sm font-bold notranslate ${row.taxType === "Output" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}
        >
          {currencySymbol}
          {(row.taxAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: `${taxLabel} Type`,
      exportValue: (r) => `${r.taxType} ${taxLabel}`,
      render: (row) => {
        const colors =
          row.taxType === "Output" ? "text-emerald-600" : "text-rose-600";
        return (
          <span
            className={`text-xs font-bold uppercase tracking-wider ${colors}`}
          >
            {row.taxType} {taxLabel}
          </span>
        );
      },
    },
  ];

  const summaryData = useMemo(() => {
    if (!summary || Object.keys(summary).length === 0) return null;
    return {
      payable: summary.netTaxPayable || 0,
      totalCount: pagination.total,
      segments: [
        {
          id: "output",
          label: `Output ${taxLabel} (Collected)`,
          value: summary.totalTaxCollected || 0,
          color: "#10b981",
          inProgressBar: true,
        },
        {
          id: "input",
          label: `Input ${taxLabel} (Paid)`,
          value: summary.totalTaxPaid || 0,
          color: "#ef4444",
          inProgressBar: true,
        },
      ],
    };
  }, [summary, taxLabel, pagination.total]);

  return (
    <>
      <div className="space-y-3 md:space-y-6">
        {summaryData && (
          <ReportSummaryCard
            title={`Net ${taxLabel} Payable`}
            totalValue={Math.abs(summaryData.payable)}
            totalCount={summaryData.totalCount}
            totalLabel={`Net ${taxLabel.toLowerCase()}`}
            countLabel="Entries"
            segments={summaryData.segments}
            loading={loading}
            currencySymbol={currencySymbol}
          />
        )}

        {/* Net Tax Summary Bar */}
        {!loading && summaryData && (
          <div
            className={`rounded-2xl border-2 px-6 py-4 flex items-center justify-between ${
              summaryData.payable >= 0
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200"
            }`}
          >
            <span className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-gray-100">
              {summaryData.payable >= 0
                ? `${taxLabel} Payable to Government`
                : `${taxLabel} Credit (Refundable)`}
            </span>
            <span
              className={`text-xl font-black notranslate ${
                summaryData.payable >= 0 ? "text-amber-700" : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {currencySymbol}
              {Math.abs(summaryData.payable).toLocaleString()}
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
          emptyMessage={`No ${taxLabel.toLowerCase()} records for this period.`}
          mobileMapper={{
            leading: (row) => (
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  row.type === "Sales"
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100"
                    : "bg-amber-50 border-amber-100"
                }`}
              >
                <span
                  className={`text-[9px] font-black uppercase ${
                    row.type === "Sales" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                  }`}
                >
                  {row.type === "Sales" ? "OUT" : "IN"}
                </span>
              </div>
            ),
            title: (row) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                {row.ref}
              </h4>
            ),
            subtitle: (row) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {row.type} · {moment(row.date).format("DD MMM")}
              </p>
            ),
            trailing: (row) => (
              <div className="text-right">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  {row.taxType} {taxLabel}
                </p>
                <p
                  className={`text-[13px] font-black notranslate ${
                    row.taxType === "Output"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600"
                  }`}
                >
                  {currencySymbol}
                  {(row.taxAmount || 0).toLocaleString()}
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
    </>
  );
};

export default GSTReportPage;
