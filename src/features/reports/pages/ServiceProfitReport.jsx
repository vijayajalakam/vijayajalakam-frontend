import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { usePagination } from "../../../hooks/usePagination";
import CustomDropdown from "../../../components/shared/CustomDropdown";

const ServiceProfitReport = () => {
  const { hasPermission } = useAuth();
  const { format, currencySymbol } = useCurrency();

  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({ startDate: today, endDate: today });

  useEffect(() => {
    api
      .get("/shops")
      .then((res) => {
        if (res.data?.success) setBranches(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (selectedBranch) params.append("branchId", selectedBranch);

      const res = await api.get(`/invoices/service-profit-report?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data || []);
        setSummary(res.data.summary || null);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Error fetching service profit report:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, searchTerm, selectedBranch, updatePagination]);

  useEffect(() => { resetPagination(); }, [searchTerm, filters, selectedBranch, resetPagination]);
  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (selectedBranch) params.append("branchId", selectedBranch);
      const res = await api.get(`/invoices/service-profit-report?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch {
      return [];
    }
  };

  const tableData = useMemo(() => {
    return data.map((row, index) => ({
      ...row,
      slNo: (pagination.page - 1) * pagination.limit + index + 1,
    }));
  }, [data, pagination.page, pagination.limit]);

  const summaryData = useMemo(() => {
    if (!summary) return { total: 0, count: 0, segments: [] };
    return {
      total: summary.totalNetProfit,
      count: summary.totalCount,
      segments: [
        {
          label: "Revenue",
          value: summary.totalRevenue,
          color: "#3b82f6",
          inProgressBar: true,
        },
        {
          label: "Material Cost",
          value: summary.totalCost,
          color: "#f97316",
          inProgressBar: true,
        },
        {
          label: "Commission",
          value: summary.totalCommission,
          color: "#8b5cf6",
          inProgressBar: true,
        },
        {
          label: "Net Profit",
          value: summary.totalNetProfit,
          color: "#10b981",
          inProgressBar: false,
        },
      ],
    };
  }, [summary]);

  const columns = [
    {
      header: "Sl No",
      render: (row) => (
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.slNo}</span>
      ),
    },
    {
      header: "Service",
      exportValue: (row) => `${row.serviceName}${row.variantName ? ` (${row.variantName})` : ""}`,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.serviceName}
          </span>
        </div>
      ),
    },
    {
      header: "Variant",
      exportValue: (row) => row.variantName || "—",
      render: (row) =>
        row.variantName ? (
          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 uppercase tracking-wider px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
            ✦ {row.variantName}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        ),
    },
    {
      header: "Count",
      exportValue: (row) => row.count,
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-dark-border">
          {row.count}×
        </span>
      ),
    },
    {
      header: "Revenue",
      exportValue: (row) => row.totalRevenue,
      render: (row) => (
        <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
          {format(row.totalRevenue, false)}
        </span>
      ),
    },
    {
      header: "Material Cost",
      exportValue: (row) => row.totalCost,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-orange-600 dark:text-orange-400 notranslate">
            {format(row.totalCost, false)}
          </span>
          {row.totalCost > 0 && (
            <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Inventory
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Commission",
      exportValue: (row) => row.totalCommission,
      render: (row) => (
        <span className="text-xs font-black text-purple-600 notranslate">
          {row.totalCommission > 0 ? format(row.totalCommission, false) : "—"}
        </span>
      ),
    },
    {
      header: "Discount",
      exportValue: (row) => row.totalDiscount,
      render: (row) => (
        <span className="text-xs font-bold text-rose-500 notranslate">
          {row.totalDiscount > 0 ? format(row.totalDiscount, false) : "—"}
        </span>
      ),
    },
    {
      header: "Net Profit",
      exportValue: (row) => row.netProfit,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span
            className={`text-sm font-black notranslate ${
              row.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
            }`}
          >
            {format(row.netProfit, false)}
          </span>
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded w-fit ${
              parseFloat(row.profitMargin) >= 50
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100"
                : parseFloat(row.profitMargin) >= 20
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : "bg-rose-50 text-rose-600 border border-rose-100"
            }`}
          >
            {row.profitMargin}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Service Profit Report"
      subtitle="Revenue, cost, and profit analysis per service"
    >
      <ReportSummaryCard
        title="Service Profit Overview"
        totalValue={summaryData.total}
        totalLabel="Total Net Profit"
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
        hideCountLabel={true}
      />

      {/* Branch filter moved into table toolbar via extraFilters */}

      <CustomTable
        rowKey={(row) => row.slNo}
        columns={columns}
        data={tableData}
        loading={loading}
        onRefresh={fetchReport}
        isRefreshing={loading}
        onExport={hasPermission("reports:sales:service_profit_report:export") ? handleExport : undefined}
        pagination={{ ...pagination, onPageChange }}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) =>
          setFilters((prev) => ({ ...prev, startDate: val }))
        }
        onEndDateChange={(val) =>
          setFilters((prev) => ({ ...prev, endDate: val }))
        }
        emptyMessage="No service data found for this period."
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {row.serviceName?.charAt(0)?.toUpperCase() || "S"}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.serviceName}
              {row.variantName && (
                <span className="text-[9px] ml-1 text-gray-400 dark:text-gray-500 font-bold uppercase">
                  ({row.variantName})
                </span>
              )}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.count}× sold • Cost: {format(row.totalCost, false)}
              {row.totalCommission > 0 && (
                <span className="text-purple-500">
                  {" "}• Comm: {format(row.totalCommission, false)}
                </span>
              )}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right flex flex-col items-end gap-1">
              <div
                className={`text-sm font-black notranslate ${
                  row.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                }`}
              >
                {format(row.netProfit, false)}
              </div>
              <span
                className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  parseFloat(row.profitMargin) >= 50
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                    : parseFloat(row.profitMargin) >= 20
                    ? "bg-amber-50 text-amber-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {row.profitMargin}%
              </span>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default ServiceProfitReport;
