import React, { useState, useEffect } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import {
  ArrowRightLeft,
  ArrowRight,
  Store,
} from "lucide-react";
import InlineSearchSelect from "../../../components/shared/InlineSearchSelect";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";

const StockTransferReportPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date().toLocaleDateString("en-CA"),
    endDate: new Date().toLocaleDateString("en-CA"),
    fromBranchId: "",
    toBranchId: "",
  });

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      if (filters.fromBranchId)
        queryParams.append("fromBranchId", filters.fromBranchId);
      if (filters.toBranchId)
        queryParams.append("toBranchId", filters.toBranchId);

      const [trfRes, branchRes] = await Promise.all([
        api.get(`/stock-transfers?${queryParams.toString()}`),
        api.get("/shops"),
      ]);

      if (trfRes.data.success) setTransfers(trfRes.data.data);
      if (branchRes.data.success) setBranches(branchRes.data.data);
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);



  const columns = [
    {
      header: "Ref #",
      render: (r) => (
        <span className="font-mono text-xs">{r.transferNumber}</span>
      ),
    },
    {
      header: "Date",
      render: (r) => (
        <span className="text-sm">{new Date(r.date).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Product",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {r.product?.name || r.productName}
          </span>
          {r.variantName && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">
              {r.variantName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Route",
      render: (r) => (
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="flex flex-col">
            <span className="text-gray-600 dark:text-gray-400">{r.fromBranchId?.name || "N/A"}</span>
            {(r.fromBranchId?.mapAddress) && (
              <span className="text-[11px] text-gray-500 max-w-[150px] truncate" title={r.fromBranchId.mapAddress}>
                 {r.fromBranchId.mapAddress}
              </span>
            )}
          </div>
          <ArrowRight size={14} className="text-gray-300" />
          <div className="flex flex-col">
            <span className="text-brand-primary dark:text-blue-400">{r.toBranchId?.name || "N/A"}</span>
            {(r.toBranchId?.mapAddress) && (
              <span className="text-[11px] text-gray-500 max-w-[150px] truncate" title={r.toBranchId.mapAddress}>
                 {r.toBranchId.mapAddress}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Quantity",
      render: (r) => <span className="text-sm font-bold">{r.quantity}</span>,
    },
  ];

  return (
    <ReportLayout title="Stock Transfer Report" subtitle="Monitor inventory movement between branches">
      <div className="space-y-3 md:space-y-6">
        {loading ? (
          <div className="space-y-3 md:space-y-6">
            <StatsSkeleton />
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : (
          <>
            <ReportSummaryCard
              title="Transfer Summary"
              totalValue={transfers.reduce((sum, e) => sum + e.quantity, 0)}
              totalLabel="Total Units"
              totalCount={transfers.length}
              countLabel="Transfers"
              segments={[
                {
                  id: "transfers",
                  label: "Total Transfers",
                  value: transfers.length,
                  color: "#3b82f6",
                  inProgressBar: true,
                },
              ]}
              loading={loading}
              currencySymbol=""
            />
            <CustomTable
              columns={columns}
              data={transfers}
              emptyMessage="No transfers found for the selected criteria."
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartDateChange={(val) =>
                setFilters((prev) => ({ ...prev, startDate: val }))
              }
              onEndDateChange={(val) =>
                setFilters((prev) => ({ ...prev, endDate: val }))
              }
              extraFilters={
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white dark:bg-dark-surface px-3 py-1.5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm min-w-[160px]">
                    <Store
                      size={14}
                      className="text-brand-primary dark:text-blue-400 flex-shrink-0"
                    />
                    <InlineSearchSelect
                      options={branches.map((b) => ({
                        value: b._id,
                        label: b.name,
                        description: b.mapAddress ? ` ${b.mapAddress}` : undefined,
                      }))}
                      value={filters.fromBranchId}
                      onChange={(val) =>
                        setFilters({ ...filters, fromBranchId: val })
                      }
                      placeholder="Source Branch"
                      className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-transparent border-none py-0"
                      allowClear
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-dark-surface px-3 py-1.5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm min-w-[160px]">
                    <Store
                      size={14}
                      className="text-brand-primary dark:text-blue-400 flex-shrink-0"
                    />
                    <InlineSearchSelect
                      options={branches.map((b) => ({
                        value: b._id,
                        label: b.name,
                        description: b.mapAddress ? ` ${b.mapAddress}` : undefined,
                      }))}
                      value={filters.toBranchId}
                      onChange={(val) =>
                        setFilters({ ...filters, toBranchId: val })
                      }
                      placeholder="Target Branch"
                      className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-transparent border-none py-0"
                      allowClear
                    />
                  </div>
                </div>
              }
              mobileMapper={{
                leading: () => (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                    <ArrowRightLeft size={20} />
                  </div>
                ),
                title: (r) => r.product?.name || r.productName,
                subtitle: (r) => (
                  <div className="flex flex-col mt-0.5">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      {r.fromBranchId?.name}
                      {(r.fromBranchId?.mapAddress) &&
                        `  ${r.fromBranchId.mapAddress}`}{" "}
                      <ArrowRight size={10} /> {r.toBranchId?.name}
                      {(r.toBranchId?.mapAddress) && `  ${r.toBranchId.mapAddress}`}
                    </div>
                  </div>
                ),
                trailing: (r) => (
                  <div className="text-right font-black text-brand-primary dark:text-blue-400">
                    {r.quantity}
                  </div>
                ),
              }}
            />
          </>
        )}
      </div>
    </ReportLayout>
  );
};

export default StockTransferReportPage;
