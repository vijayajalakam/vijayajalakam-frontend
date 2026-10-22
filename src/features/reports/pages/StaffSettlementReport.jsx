import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Download,
  Trash2,
  AlertCircle,
  HandCoins,
  Calendar,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPayouts,
  deletePayout,
  resetDeleteState,
} from "../../../store/slices/payoutSlice";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../../../api/axiosInstance";

const StaffSettlementReport = () => {
  const dispatch = useDispatch();
  const { currencySymbol } = useAuth();

  const { payouts, loading, deleteLoading, deleteError, deleteSuccess } =
    useSelector((state) => state.payouts);

  const [searchTerm, setSearchTerm] = useState("");
  const [staffList, setStaffList] = useState([]);

  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedStaff, setSelectedStaff] = useState("all");

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    payout: null,
  });

  // Fetch staff list for filter dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get("/admin/staff?role=staff");
        if (res.data?.success) setStaffList(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch staff members:", err);
      }
    };
    fetchStaff();
  }, []);

  // Fetch payouts whenever filters change
  const loadReport = useCallback(() => {
    dispatch(
      fetchPayouts({
        startDate,
        endDate,
        staffId: selectedStaff,
      })
    );
  }, [dispatch, startDate, endDate, selectedStaff]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Handle delete success
  useEffect(() => {
    if (deleteSuccess) {
      Promise.resolve().then(() => {
        setDeleteModal({ open: false, payout: null });
        dispatch(resetDeleteState());
      });
    }
  }, [deleteSuccess, dispatch]);

  const handleDelete = () => {
    if (deleteModal.payout?._id) {
      dispatch(deletePayout(deleteModal.payout._id));
    }
  };

  // Filter payouts by search
  const filteredPayouts = useMemo(() => {
    if (!searchTerm.trim()) return payouts;
    const q = searchTerm.toLowerCase();
    return payouts.filter((p) => {
      const staffName = (p.staff?.name || "").toLowerCase();
      const settleNum = (p.settlementNumber || "").toLowerCase();
      return staffName.includes(q) || settleNum.includes(q);
    });
  }, [payouts, searchTerm]);

  // Summary stats
  const summary = useMemo(() => {
    const total = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
    const count = payouts.length;
    const staffSet = new Set(
      payouts.map((p) => p.staff?._id?.toString() || p.staff?.toString())
    );
    return { totalAmount: total, count, staffCount: staffSet.size };
  }, [payouts]);

  // Export handler
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("limit", "100000");
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedStaff !== "all") params.append("staffId", selectedStaff);
      const res = await api.get(`/invoices/payouts?${params.toString()}`);
      return (res.data?.data || []).map((p) => ({
        "Settlement Number": p.settlementNumber || "-",
        Date: p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "-",
        "Staff Member": p.staff?.name || "Unknown",
        Amount: p.amount || 0,
        "Payment Method": p.paymentMethod || "CASH",
        Notes: p.notes || "-",
      }));
    } catch {
      return [];
    }
  };

  const columns = [
    {
      header: "Date",
      exportValue: (row) =>
        row.paidAt ? new Date(row.paidAt).toLocaleDateString() : "-",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {row.paidAt
                ? new Date(row.paidAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-"}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {row.paidAt
                ? new Date(row.paidAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Settlement No.",
      exportValue: (row) => row.settlementNumber || "-",
      render: (row) => (
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg tracking-wide">
          {row.settlementNumber || "-"}
        </span>
      ),
    },
    {
      header: "Staff Member",
      exportValue: (row) => row.staff?.name || "Unknown",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.staff?.photo?.url ? (
            <img
              src={row.staff.photo.url}
              alt={row.staff.name}
              className="w-9 h-9 rounded-xl object-cover border border-blue-100/50 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm border border-purple-100/50 flex-shrink-0">
              {(row.staff?.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 leading-tight">
              {row.staff?.name || "Unknown Staff"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Amount",
      exportValue: (row) => row.amount || 0,
      render: (row) => (
        <span className="font-bold text-emerald-600 text-sm">
          {currencySymbol}
          {(row.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Notes",
      exportValue: (row) => row.notes || "-",
      render: (row) => (
        <span className="text-xs text-gray-500 font-medium truncate max-w-[160px] block">
          {row.notes || "-"}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <div className="flex justify-end">
          <button
            onClick={() => setDeleteModal({ open: true, payout: row })}
            className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95"
            title="Delete Settlement"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <ReportLayout
      title="Staff Settlement Report"
      subtitle="Settlement history from commission payouts"
    >
      <ReportSummaryCard
        title="Settlement Overview"
        totalValue={summary.totalAmount}
        totalCount={summary.count}
        segments={[
          {
            label: "Total Settled",
            value: summary.totalAmount,
            color: "#10b981",
            inProgressBar: true,
          },
          {
            label: "Settlements",
            value: summary.count,
            color: "#8b5cf6",
            inProgressBar: false,
          },
          {
            label: "Staff Members",
            value: summary.staffCount,
            color: "#f59e0b",
            inProgressBar: false,
          },
        ]}
        loading={loading}
        currencySymbol={currencySymbol}
        totalLabel="Total Settled"
        countLabel="Settlements"
      />

      <CustomTable
        columns={columns}
        data={filteredPayouts}
        loading={loading}
        onRefresh={loadReport}
        onExport={handleExport}
        isRefreshing={loading}
        emptyMessage="No settlements found for the selected period."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        extraFilters={
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="border border-gray-200 rounded-xl text-sm focus:ring-indigo-500 py-2 px-3 bg-white"
          >
            <option value="all">All Staff</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        }
        mobileMapper={{
          leading: () => (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center font-bold text-lg flex-shrink-0">
              <HandCoins size={20} />
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 text-sm">
              {row.staff?.name || "Unknown Staff"}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {row.settlementNumber || "-"} •{" "}
              {row.paidAt
                ? new Date(row.paidAt).toLocaleDateString()
                : "-"}
            </div>
          ),
          trailing: (row) => (
            <div className="text-sm font-bold text-emerald-600">
              {currencySymbol}{(row.amount || 0).toLocaleString()}
            </div>
          ),
        }}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() =>
                !deleteLoading &&
                setDeleteModal({ open: false, payout: null })
              }
            />
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                  Delete Settlement?
                </h3>
                <p className="text-center text-gray-500 text-sm mb-2">
                  This will delete settlement{" "}
                  <span className="font-semibold text-gray-700">
                    {deleteModal.payout?.settlementNumber}
                  </span>{" "}
                  for{" "}
                  <span className="font-semibold text-gray-700">
                    {deleteModal.payout?.staff?.name}
                  </span>
                </p>
                <p className="text-center text-gray-500 text-sm mb-6">
                  The commission status of all related invoices will revert
                  back to <strong>Pending</strong>.
                </p>

                {deleteError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {deleteError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setDeleteModal({ open: false, payout: null })
                    }
                    disabled={deleteLoading}
                    className="flex-1 py-2.5 px-4 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 py-2.5 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </ReportLayout>
  );
};

export default StaffSettlementReport;
