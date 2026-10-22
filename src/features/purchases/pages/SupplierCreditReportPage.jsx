import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import ReportLayout from "../../../components/shared/ReportLayout";
import CustomTable from "../../../components/shared/CustomTable";
import { Users, TrendingUp } from "lucide-react";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const SupplierCreditReportPage = () => {
  const { currencySymbol } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/suppliers/credit-report");
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summaryData = useMemo(() => {
    const totalBalance = data.reduce((s, d) => s + d.balance, 0);
    const totalPurchases = data.reduce((s, d) => s + d.totalPurchases, 0);

    return {
      total: totalBalance,
      count: data.length,
      segments: [
        {
          label: "Credit Balance",
          value: totalBalance,
          count: data.filter((d) => d.balance > 0).length,
          color: "#ef4444",
          inProgressBar: true,
        },
        {
          label: "Total Purchases",
          value: totalPurchases,
          count: data.length,
          color: "#10b981",
          inProgressBar: false,
        },
      ],
    };
  }, [data]);

  const columns = [
    {
      header: "Supplier",
      render: (r) => (
        <div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">{r.name}</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
            {r.phone || "No Phone"}
          </div>
        </div>
      ),
    },
    {
      header: "Purchases",
      render: (r) => (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 notranslate">
          {currencySymbol}
          {r.totalPurchases?.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Payments",
      render: (r) => (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 notranslate">
          {currencySymbol}
          {r.totalPayments?.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Returns",
      render: (r) => (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 notranslate">
          {currencySymbol}
          {r.totalReturns?.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Balance",
      align: "right",
      render: (r) => (
        <span
          className={`text-sm font-black notranslate ${r.balance > 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {currencySymbol}
          {r.balance?.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Supplier Credit Report"
      subtitle="Outstanding balances with suppliers"
      showBackButton={false}
    >
      <div className="space-y-3 md:space-y-6">
        <ReportSummaryCard
          title="Credit Summary"
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
          onRefresh={fetchData}
          isRefreshing={loading}
          emptyMessage="No credit data found."
          mobileMapper={{
            leading: () => (
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100">
                <Users size={22} />
              </div>
            ),
            title: (row) => (
              <div className="font-bold text-gray-900 dark:text-white text-sm">{row.name}</div>
            ),
            subtitle: (row) => (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                Purchases: {currencySymbol}
                {row.totalPurchases?.toLocaleString()}
              </div>
            ),
            trailing: (row) => (
              <div className="text-right">
                <div
                  className={`text-sm font-black ${row.balance > 0 ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {currencySymbol}
                  {row.balance?.toLocaleString()}
                </div>
                <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                  Balance
                </span>
              </div>
            ),
          }}
        />
      </div>
    </ReportLayout>
  );
};

export default SupplierCreditReportPage;
