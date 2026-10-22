import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Mail, Phone, Verified } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const CustomerReportPage = () => {
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
        const [activeTab, setActiveTab] = useState("all");
  const [reportSummary, setReportSummary] = useState(null);
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
                  if (searchTerm) params.append("search", searchTerm);
      // Backend handles pagination
      const res = await api.get(`/admin/customers?${params.toString()}`);
      if (res.data.success) {
        setCustomers(res.data.data);
        updatePagination(res.data.pagination);
        if (res.data.summary) setReportSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    updatePagination,
  ]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
                  if (searchTerm) params.append("search", searchTerm);
      const res = await api.get(`/admin/customers?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    const total = reportSummary?.total || pagination.total;
    const newToday = reportSummary?.newToday || 0;
    const existing = Math.max(0, total - newToday);

    return {
      total: total,
      segments: [
        {
          label: "Existing",
          count: existing,
          value: existing,
          color: "#3b82f6",
          inProgressBar: true,
        },
        {
          label: "New Today",
          count: newToday,
          value: newToday,
          color: "#10b981",
          inProgressBar: true,
        },
      ],
    };
  }, [reportSummary, pagination.total]);

  const columns = [
    {
      header: "Customer",
      exportValue: (c) => `${c.name || "Unknown"} (ID: ${c._id?.slice(-6)})`,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-100/50">
            {c.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {c.name || "Unknown"}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
              ID: {c._id?.slice(-6)}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Contact",
      exportValue: (c) =>
        `Email: ${c.email || "N/A"} | Phone: ${c.phone || "N/A"}`,
      render: (c) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
            <Mail size={12} className="text-gray-400 dark:text-gray-500" />
            <span>{c.email || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
            <Phone size={12} className="text-gray-400 dark:text-gray-500" />
            <span>{c.phone || "N/A"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Registration",
      exportValue: (c) =>
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A",
      render: (c) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A"}
          </span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
            Joined
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      exportValue: () => "Verified",
      render: () => (
        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-black uppercase tracking-wider">
          Verified
        </span>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Customer Report"
      subtitle="Analyze your growing client base"
    >
      <ReportSummaryCard
        title="Customers"
        totalValue={summaryData.total}
        totalCount={summaryData.total}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol=""
      />

      <CustomTable
        columns={columns}
        data={customers}
        loading={loading}
        onRefresh={fetchCustomers}
        isRefreshing={loading}
        onExport={hasPermission('reports:customer:customer_report:export') ? handleExport : undefined}
        emptyMessage="No customers found."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 border border-emerald-100 flex items-center justify-center font-bold text-lg">
              {row.name?.charAt(0).toUpperCase()}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">{row.name}</div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.phone || "No Phone"} • Verified
            </div>
          ),
          trailing: () => (
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Verified size={14} className="text-emerald-500" />
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default CustomerReportPage;
