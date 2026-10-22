import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Download,
  Wallet,
  AlertCircle,
  Send,
} from "lucide-react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import CommissionFilterModal from "../../../components/shared/CommissionFilterModal";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useSettleCommissionMutation } from "../../../store/api/tenantEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";

const StaffCommissionReport = () => {
  const { currencySymbol, hasPermission } = useAuth();
  const [settleCommissionMut] = useSettleCommissionMutation();

  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [staffList, setStaffList] = useState([]);
  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    staff: [],
  });
  const [summary, setSummary] = useState({
    totalCommission: 0,
    totalPaid: 0,
    totalPending: 0,
    staffCount: 0,
  });

  // Settlement confirmation modal state
  const [settleModal, setSettleModal] = useState({
    open: false,
    loading: false,
    mode: "all", // "all" or "individual"
    staff: null,
    amount: "",
    notes: "",
  });

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get("/admin/staff");
      if (res.data.success) {
        const filteredStaff = res.data.data.filter((s) => s.role === "staff");
        setStaffList(filteredStaff);
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(
        `/invoices/commission-summary?${params.toString()}`,
      );
      if (res.data.success) {
        let data = res.data.data;

        // Filter by selected staff if any
        if (filters.staff?.length > 0) {
          data = data.filter((d) => filters.staff.includes(d.staffId));
        }

        setStaffData(data);
        setSummary(
          res.data.summary || {
            totalCommission: 0,
            totalPaid: 0,
            totalPending: 0,
            staffCount: 0,
          },
        );
      }
    } catch (err) {
      console.error("Failed to fetch commission summary:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSettleAll = () => {
    if (summary.totalPending <= 0) return;
    setSettleModal({
      open: true,
      loading: false,
      mode: "all",
      staff: null,
      amount: summary.totalPending.toString(),
      notes: "",
    });
  };

  const confirmSettle = async () => {
    setSettleModal((prev) => ({ ...prev, loading: true }));
    try {
      const payload = {
        notes: settleModal.notes,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };

      if (settleModal.mode === "individual" && settleModal.staff) {
        payload.staffId = settleModal.staff.staffId;
        payload.payAmount = Number(settleModal.amount);
      }

      await settleCommissionMut(payload).unwrap();
      
      setSettleModal({
        open: false,
        loading: false,
        mode: "all",
        staff: null,
        amount: "",
        notes: "",
      });
      fetchReport(); // Refresh local data
    } catch (err) {
      console.error("Settlement failed:", err);
      setSettleModal((prev) => ({ 
        ...prev, 
        loading: false,
        error: rtkErrorMessage(err, "Settlement failed")
      }));
    }
  };

  const handleSettleIndividual = (row) => {
    setSettleModal({
      open: true,
      loading: false,
      mode: "individual",
      staff: row,
      amount: row.pendingCommission.toString(),
      notes: "",
    });
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(
        `/invoices/commission-summary?${params.toString()}`,
      );
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const summaryData = useMemo(() => {
    return {
      total: summary.totalPending,
      count: summary.staffCount,
      segments: [
        {
          label: "Total Earned",
          value: summary.totalCommission,
          color: "#8b5cf6",
          inProgressBar: true,
        },
        {
          label: "Total Settled",
          value: summary.totalPaid,
          color: "#10b981",
          inProgressBar: true,
        },
        {
          label: "Pending",
          value: summary.totalPending,
          color: "#f59e0b",
          inProgressBar: true,
        },
      ],
    };
  }, [summary]);

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
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
              {row.invoiceCount} Invoice{row.invoiceCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Total Sales",
      exportValue: (row) => row.totalSales?.toLocaleString() || "0",
      render: (row) => (
        <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
          {currencySymbol}
          {(row.totalSales || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Commission Earned",
      exportValue: (row) => row.totalCommission?.toLocaleString() || "0",
      render: (row) => (
        <span className="text-sm font-black text-purple-600 notranslate">
          {currencySymbol}
          {Math.round(row.totalCommission || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Settled",
      exportValue: (row) => row.totalPaid?.toLocaleString() || "0",
      render: (row) => (
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
          {currencySymbol}
          {Math.round(row.totalPaid || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Pending",
      exportValue: (row) => row.pendingCommission?.toLocaleString() || "0",
      render: (row) => (
        <div className="flex flex-col">
          <span
            className={`text-sm font-black notranslate ${row.pendingCommission > 0 ? "text-amber-600" : "text-gray-400 dark:text-gray-500"}`}
          >
            {currencySymbol}
            {Math.round(row.pendingCommission || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <button
          onClick={() => handleSettleIndividual(row)}
          disabled={row.pendingCommission <= 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95
            ${
              row.pendingCommission > 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white"
                : "bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
        >
          <Wallet size={12} />
          Settle
        </button>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Staff Commission Report"
      subtitle="Track and manage staff commission details"
    >
      <ReportSummaryCard
        title="Staff Commission Overview"
        totalValue={Math.round(summary.totalPending || 0)}
        totalCount={summary.staffCount}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
        totalLabel="Total Pending"
        countLabel="Staff Members"
      />

      <CustomTable
        columns={columns}
        data={staffData}
        loading={loading}
        onRefresh={fetchReport}
        isRefreshing={loading}
        onExport={hasPermission('reports:staff:staff_commission:export') ? handleExport : undefined}
        emptyMessage="No staff commission data found."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        onFilterClick={() => setIsFilterModalOpen(true)}
        filterCount={
          filters.staff.length > 0 || filters.startDate
            ? filters.staff.length + (filters.startDate ? 1 : 0)
            : 0
        }
        extraFilters={
          hasPermission('reports:staff:staff_commission:settle') && (
            <button
              onClick={handleSettleAll}
              disabled={loading || summary.totalPending <= 0}
              className={`h-10 w-10 md:w-auto md:px-4 flex items-center justify-center gap-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95
                ${
                  summary.totalPending > 0
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-dark-border"
                }`}
            >
              <Send size={14} />
              <span className="hidden md:inline">Settle All</span>
            </button>
          )
        }
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {row.staffPhoto?.url ? (
                <img
                  src={row.staffPhoto.url}
                  alt={row.staffName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                (row.staffName?.charAt(0) || "U").toUpperCase()
              )}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.staffName}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.invoiceCount} Invoices • Earned: {currencySymbol}
              {(row.totalCommission || 0).toLocaleString()}
            </div>
          ),
          trailing: (row) => (
            <div className="text-right flex flex-col items-end gap-1">
              <div className={`text-sm font-black notranslate ${row.pendingCommission > 0 ? "text-amber-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                {currencySymbol}{(row.pendingCommission > 0 ? row.pendingCommission : row.totalCommission || 0).toLocaleString()}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${row.pendingCommission > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"}`}>
                {row.pendingCommission > 0 ? "Pending" : "Settled"}
              </span>
            </div>
          ),
        }}
      />

      {/* Settlement Confirmation Modal */}
      <AnimatePresence>
        {settleModal.open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                !settleModal.loading &&
                setSettleModal((prev) => ({ ...prev, open: false }))
              }
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            />
            <Motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white dark:bg-dark-surface rounded-3xl shadow-2xl p-8 max-w-md w-full overflow-hidden"
            >
              {/* Header Design */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-green-500" />

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 flex items-center justify-center mx-auto mb-5 mt-2">
                <Wallet size={28} className="text-emerald-500" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-gray-900 dark:text-white text-center mb-2">
                {settleModal.mode === "all"
                  ? "Settle All"
                  : `Settle: ${settleModal.staff?.staffName}`}
              </h3>

              {/* Info */}
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed px-4">
                {settleModal.mode === "all"
                  ? "Are you sure you want to settle all pending amounts? This will process full payments for everyone."
                  : "Enter the amount to settle for this staff member. You can pay partial or full amounts."}
              </p>

              {/* Staff Profile Section for Individual Mode */}
              {settleModal.mode === "individual" && settleModal.staff && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-card/50 rounded-[20px] border border-gray-100 dark:border-dark-border/50 mb-6">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/10 flex-shrink-0">
                    {settleModal.staff.staffPhoto?.url ? (
                      <img
                        src={settleModal.staff.staffPhoto.url}
                        alt={settleModal.staff.staffName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (settleModal.staff.staffName?.charAt(0) || "U").toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {settleModal.staff.staffName}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      {settleModal.staff.invoiceCount} Total Invoices
                    </span>
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="space-y-4">
                {/* Total Pending Info */}
                <div className="bg-gradient-to-br from-emerald-50/50 to-green-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                      Total Pending
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 notranslate">
                      {currencySymbol}
                      {Math.round(settleModal.mode === "all"
                        ? summary.totalPending
                        : settleModal.staff?.pendingCommission || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                </div>

                {/* Amount Input for Individual Mode */}
                {settleModal.mode === "individual" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Settlement Amount
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-black">
                        {currencySymbol}
                      </div>
                      <input
                        type="number"
                        value={settleModal.amount}
                        onChange={(e) =>
                          setSettleModal((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl py-4 pl-8 pr-4 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="0.00"
                        max={settleModal.staff?.pendingCommission}
                      />
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={settleModal.notes}
                    onChange={(e) =>
                      setSettleModal((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none h-20"
                    placeholder="Add a remark..."
                  />
                </div>
              </div>

              {/* Warning for Bulk */}
              {settleModal.mode === "all" && (
                <div className="mt-6 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <AlertCircle
                    size={18}
                    className="text-amber-500 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    This will settle all pending amounts across all staff
                    members. Individual entries will be created in their
                    respective statements.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() =>
                    setSettleModal((prev) => ({ ...prev, open: false }))
                  }
                  disabled={settleModal.loading}
                  className="flex-1 px-6 py-4 bg-gray-50 dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-dark-card text-gray-600 dark:text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSettle}
                  disabled={
                    settleModal.loading ||
                    (settleModal.mode === "individual" &&
                      (!settleModal.amount || Number(settleModal.amount) <= 0))
                  }
                  className="flex-1 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-60"
                >
                  {settleModal.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <CommissionFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        staff={staffList}
        initialFilters={filters}
      />
    </ReportLayout>
  );
};

export default StaffCommissionReport;
