import React, { useState, useMemo } from "react";
import { Mail, Phone } from "lucide-react";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { useGetRegularCustomerReportQuery } from "../../../store/api/tenantEndpoints";

const RegularCustomerReportPage = () => {
  const { hasPermission } = useAuth();
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const { data: apiBody, isLoading: loading, isFetching, refetch } =
    useGetRegularCustomerReportQuery({ startDate, endDate });

  const data = apiBody?.success ? apiBody.data || [] : [];
  const summary = apiBody?.success ? apiBody.summary : null;

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (r) =>
        r.name?.toLowerCase().includes(lower) ||
        r.phone?.toLowerCase().includes(lower) ||
        r.email?.toLowerCase().includes(lower),
    );
  }, [data, searchTerm]);

  const columns = [
    {
      header: "Customer",
      exportValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100/50">
            {r.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{r.name}</span>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              <Phone size={9} />
              <span>{r.phone || "N/A"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Email",
      exportValue: (r) => r.email || "N/A",
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <Mail size={12} className="text-gray-400 dark:text-gray-500" />
          <span>{r.email || "N/A"}</span>
        </div>
      ),
    },
    {
      header: "No. of Visits",
      exportValue: (r) => r.salesCount,
      render: (r) => (
        <span className="text-sm font-black text-blue-600">{r.salesCount}</span>
      ),
    },
    {
      header: "Total Sales Amount",
      exportValue: (r) => formatDisplayNumber(r.totalAmount),
      render: (r) => (
        <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 text-xs font-bold">
          {currencySymbol}
          {formatDisplayNumber(r.totalAmount)}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Regular Buyer Report"
      subtitle="Buyers ranked by highest number of visits/purchases"
    >
      <ReportSummaryCard
        title="Regular Buyers"
        totalValue={summary?.totalVisits || 0}
        totalCount={summary?.total || 0}
        segments={[
          {
            label: "Total Buyers",
            count: summary?.total || 0,
            value: summary?.total || 0,
            color: "#3b82f6",
            inProgressBar: true,
          },
        ]}
        loading={loading}
        currencySymbol=""
      />

      <CustomTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onRefresh={refetch}
        isRefreshing={isFetching}
        onExport={
          hasPermission("reports:customer:regular_customer_report:export")
            ? () => Promise.resolve(filteredData)
            : undefined
        }
        emptyMessage="No buyer sales data found."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 border border-blue-100 flex items-center justify-center font-bold text-lg">
              {row.name?.charAt(0).toUpperCase()}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">{row.name}</div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.phone || "No Phone"} • {row.salesCount} visits
            </div>
          ),
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-blue-600">{row.salesCount} visits</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500">
                {currencySymbol}
                {formatDisplayNumber(row.totalAmount)}
              </div>
            </div>
          ),
        }}
      />
    </ReportLayout>
  );
};

export default RegularCustomerReportPage;
