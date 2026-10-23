import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Mail, Phone, Download } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const StaffReportPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
        const [activeTab, setActiveTab] = useState("all");
  const [reportSummary, setReportSummary] = useState(null);
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
                  if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(`/admin/staff?${params.toString()}`);
      if (res.data.success) {
        setStaff(res.data.data);
        updatePagination(res.data.pagination);
        if (res.data.summary) setReportSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
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
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
                  if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(`/admin/staff?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    const total =
      pagination.total ||
      reportSummary?.active + reportSummary?.inactive ||
      staff.length;
    const totalEarnings = reportSummary?.totalEarnings || 0;
    const totalPaid = reportSummary?.totalPaid || 0;
    const totalPending = reportSummary?.totalPending || 0;

    return {
      total: total,
      segments: [
        {
          label: "Total Earned",
          value: totalEarnings,
          color: "#8b5cf6",
          inProgressBar: true,
        },
        {
          label: "Total Paid",
          value: totalPaid,
          color: "#10b981",
          inProgressBar: true,
        },
        {
          label: "Pending",
          value: totalPending,
          color: "#f59e0b",
          inProgressBar: true,
        },
      ],
    };
  }, [reportSummary, pagination.total, staff.length]);

  const columns = [
    {
      header: "Staff Member",
      exportValue: (s) => `${s.name} (${s.role || "Staff"})`,
      render: (s) => (
        <div className="flex items-center gap-3">
          {s.photo?.url ? (
            <img
              src={s.photo.url}
              alt={s.name}
              className="w-9 h-9 rounded-xl object-cover border border-blue-100/50 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100/50 flex-shrink-0">
              {s.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {s.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
              {s.role || "Staff"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Contact",
      exportValue: (s) =>
        `Email: ${s.email || "N/A"} | Phone: ${s.phone || "N/A"}`,
      render: (s) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
            <Mail size={12} className="text-gray-400 dark:text-gray-500" />
            <span>{s.email || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
            <Phone size={12} className="text-gray-400 dark:text-gray-500" />
            <span>{s.phone || "N/A"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Joined",
      exportValue: (s) =>
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "N/A",
      render: (s) => (
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
    {
      header: "Status",
      exportValue: (s) => (s.status !== "inactive" ? "Active" : "Inactive"),
      render: (s) => {
        const isActive = s.status !== "inactive";
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              isActive
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      header: "Action",
      align: "right",
      render: () => (
        <div className="flex justify-end">
          {hasPermission('reports:staff:staff_report:download') && (
            <button className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all active:scale-95 group">
              <Download size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Staff Report"
      subtitle="View and manage staff"
    >
      <ReportSummaryCard
        title="Staff Summary"
        totalValue={
          summaryData.segments.find((s) => s.label === "Pending")?.value || 0
        }
        totalCount={summaryData.total}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
        totalLabel="Total Pending"
        countLabel="Staff Members"
      />

      <CustomTable
        columns={columns}
        data={staff}
        loading={loading}
        onRefresh={fetchStaff}
        onExport={hasPermission('reports:staff:staff_report:export') ? handleExport : undefined}
        isRefreshing={loading}
        emptyMessage="No staff members found."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-50 dark:bg-blue-900/20 text-blue-400 border border-blue-100 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {row.photo?.url ? (
                <img
                  src={row.photo.url}
                  alt={row.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                row.name?.charAt(0).toUpperCase()
              )}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.name}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.role || "Staff"} •{" "}
              {row.status !== "inactive" ? "Active" : "Inactive"}
            </div>
          ),
          trailing: (row) => (
            <div
              className={`w-2 h-2 rounded-full ${row.status !== "inactive" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"}`}
            />
          ),
        }}
      />
    </ReportLayout>
  );
};

export default StaffReportPage;
