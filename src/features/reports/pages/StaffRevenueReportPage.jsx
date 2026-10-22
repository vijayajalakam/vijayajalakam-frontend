import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Users } from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const StaffRevenueReportPage = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      // Branch filter is handled by ReportLayout automatically adding to filters
      if (filters.branchId) params.append("branchId", filters.branchId);

      const res = await api.get(`/invoices/staff-revenue-report?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch staff revenue report:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.branchId) params.append("branchId", filters.branchId);

      const res = await api.get(`/invoices/staff-revenue-report?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    let totalSalesAmount = 0;
    let totalCommission = 0;
    data.forEach((item) => {
      totalSalesAmount += item.totalSalesAmount || 0;
      totalCommission += item.totalCommission || 0;
    });
    return {
      total: totalSalesAmount,
      count: data.length,
      segments: [
        {
          label: "Total Revenue",
          value: totalSalesAmount,
          color: "#8b5cf6",
          inProgressBar: true,
        },
        {
          label: "Total Commission",
          value: totalCommission,
          color: "#10b981",
          inProgressBar: true,
        },
      ],
    };
  }, [data]);

  const columns = [
    {
      header: "Staff Member",
      exportValue: (row) => row.staffName || "Unknown",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.staffPhoto?.url ? (
            <img
              src={row.staffPhoto.url}
              alt={row.staffName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {(row.staffName?.charAt(0) || "U").toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {row.staffName || "Unknown"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Bookings Count",
      exportValue: (row) => row.bookingsCount?.toString() || "0",
      render: (row) => (
        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
          {row.bookingsCount || 0}
        </span>
      ),
    },
    {
      header: "Total Sales Count",
      exportValue: (row) => row.totalSalesCount?.toString() || "0",
      render: (row) => (
        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
          {row.totalSalesCount || 0}
        </span>
      ),
    },
    {
      header: "Total Revenue",
      exportValue: (row) => row.totalSalesAmount?.toString() || "0",
      render: (row) => (
        <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
          {currencySymbol}{(row.totalSalesAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Total Commission",
      exportValue: (row) => row.totalCommission?.toString() || "0",
      render: (row) => (
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
          {currencySymbol}{(row.totalCommission || 0).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Staff Revenue Report"
      description="View revenue and commission metrics by staff member."
      icon={Users}
      filters={filters}
      onFilterChange={setFilters}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      showBranchFilter={true}
    >
      <div className="space-y-6">
        <ReportSummaryCard
          title="Revenue Overview"
          icon={Users}
          totalValue={summaryData.total}
          totalLabel="Total Revenue"
          segments={summaryData.segments}
          countLabel="Staff Members"
          totalCount={summaryData.count}
          currencySymbol={currencySymbol}
        />

        <CustomTable
          columns={columns}
          data={data}
          loading={loading}
          enableExport={hasPermission("reports:sales:staff_revenue_report", "export")}
          exportFilename={`staff-revenue-report-${filters.startDate}`}
          onExportDataFetch={handleExport}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
          onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
          mobileMapper={{
            leading: (row) => (
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                {row.staffPhoto?.url ? (
                  <img src={row.staffPhoto.url} className="w-full h-full object-cover" alt={row.staffName} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-sm">
                    {(row.staffName?.charAt(0) || "U").toUpperCase()}
                  </div>
                )}
              </div>
            ),
            title: (row) => (
              <div className="font-bold text-gray-900 dark:text-white text-sm">
                {row.staffName || "Unknown"}
              </div>
            ),
            subtitle: (row) => (
              <div className="text-xs text-gray-500 font-medium mt-0.5">
                {row.bookingsCount || 0} Bookings &bull; {row.totalSalesCount || 0} Sales
              </div>
            ),
            trailing: (row) => (
              <div className="text-right flex flex-col items-end">
                <div className="text-sm font-black text-gray-900 dark:text-white notranslate">
                  {currencySymbol}{(row.totalSalesAmount || 0).toLocaleString()}
                </div>
                <div className="text-[10px] font-bold text-emerald-500 mt-0.5 notranslate">
                  +{currencySymbol}{(row.totalCommission || 0).toLocaleString()}
                </div>
              </div>
            )
          }}
        />
      </div>
    </ReportLayout>
  );
};

export default StaffRevenueReportPage;
