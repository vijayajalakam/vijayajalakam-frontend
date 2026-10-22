import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import { XCircle, Phone } from "lucide-react";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import moment from "moment";

const CancellationReport = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });

  const fetchCancelledBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("status", "cancelled");
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      // Add tab specific period filters if backend supports it or handle here
      // For now, let backend handle 'status=cancelled'
      // To filter by today/month on server, we should probably pass dates

      const res = await api.get(`/appointments?${params.toString()}`);
      if (res.data.success) {
        setBookings(res.data.data || []);
        updatePagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch cancelled bookings", err);
    } finally {
      setLoading(false);
    }
  }, [
    filters,
    pagination.page,
    pagination.limit,
    searchTerm,
    updatePagination,
  ]);

  useEffect(() => {
    fetchCancelledBookings();
  }, [fetchCancelledBookings]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    resetPagination();
  }, [searchTerm, filters, activeTab, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("status", "cancelled");
      params.append("page", 1);
      params.append("limit", 100000); // Fetch all data for export
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/appointments?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    const totalValue = bookings.reduce((sum, b) => {
      const val =
        b.services?.reduce((sSum, s) => {
          const price = s.price || s.pricing?.[0]?.price || 0;
          return sSum + Number(price);
        }, 0) || 0;
      return sum + val;
    }, 0);

    const todayCount = bookings.filter((b) =>
      moment(b.date).isSame(moment(), "day"),
    ).length;
    const earlierCount = bookings.length - todayCount;

    return {
      total: totalValue,
      count: pagination.total, // Use total from server
      segments: [
        {
          label: "Today",
          count: todayCount,
          value: todayCount,
          color: "#3b82f6",
          textColor: "text-blue-600",
        },
        {
          label: "History",
          count: earlierCount,
          value: earlierCount,
          color: "#10b981",
          textColor: "text-emerald-600",
        },
      ],
    };
  }, [bookings, pagination.total]);

  const columns = [
    {
      header: "Booking Info",
      exportValue: (row) =>
        `${moment(row.date).format("DD MMM YYYY")} (${row.slotTimes?.join(", ") || "N/A"})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {moment(row.date).format("DD MMM YYYY")}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap">
            {row.slotTimes?.join(", ") || "N/A"}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      exportValue: (row) =>
        `${row.user?.name || "Guest"} (${row.user?.phone || "N/A"})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {row.user?.name || "Guest"}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
            <Phone size={10} strokeWidth={3} /> {row.user?.phone || "N/A"}
          </span>
        </div>
      ),
    },
    {
      header: "Cancelled By",
      exportValue: (row) =>
        `${row.cancelledBy?.name || "Unknown"} (${row.updatedAt ? moment(row.updatedAt).format("h:mm A") : ""})`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400 leading-tight">
            {row.cancelledBy?.name || "Unknown"}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">
            {row.updatedAt ? moment(row.updatedAt).format("h:mm A") : ""}
          </span>
        </div>
      ),
    },
    {
      header: "Value",
      exportValue: (row) => {
        const total =
          row.services?.reduce(
            (sum, s) => sum + Number(s.price || s.pricing?.[0]?.price || 0),
            0,
          ) || 0;
        return `${currencySymbol}${total.toLocaleString()} (${row.services?.length || 0} Items)`;
      },
      render: (row) => {
        const total =
          row.services?.reduce((sum, s) => {
            const price = s.price || s.pricing?.[0]?.price || 0;
            return sum + Number(price);
          }, 0) || 0;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
              {currencySymbol}
              {total.toLocaleString()}
            </span>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter">
              {row.services?.length || 0} Items
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <ReportLayout
      title="Booking Cancellation Report"
      subtitle="Analyze booking drop-offs and patterns"
    >
      <ReportSummaryCard
        title="Cancelled Value"
        totalValue={summaryData.total}
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
      />

      <CustomTable
        columns={columns}
        data={bookings}
        loading={loading}
        onRefresh={fetchCancelledBookings}
        onExport={hasPermission('reports:sales:cancellation_report:export') ? handleExport : undefined}
        isRefreshing={loading}
        emptyMessage="No cancelled bookings matches your criteria."
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        tabs={[
          { id: "all", label: "All Cancelled", count: pagination.total },
          {
            id: "today",
            label: "Today",
            count: bookings.filter((b) =>
              moment(b.date).isSame(moment(), "day"),
            ).length,
          },
          {
            id: "month",
            label: "This Month",
            count: bookings.filter((b) =>
              moment(b.date).isSame(moment(), "month"),
            ).length,
          },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-400 border border-rose-100 flex items-center justify-center">
              <XCircle size={22} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.user?.name || "Guest"}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {moment(row.date).format("DD MMM")} •{" "}
              {row.cancelledBy?.name || "System"}
            </div>
          ),
          trailing: (row) => {
            const total =
              row.services?.reduce((sum, s) => {
                const price = s.price || s.pricing?.[0]?.price || 0;
                return sum + Number(price);
              }, 0) || 0;
            return (
              <div className="text-right">
                <div className="text-sm font-black text-rose-600 dark:text-rose-400 notranslate">
                  {currencySymbol}
                  {total.toLocaleString()}
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
                  Cancelled
                </span>
              </div>
            );
          },
        }}
      />
    </ReportLayout>
  );
};

export default CancellationReport;
