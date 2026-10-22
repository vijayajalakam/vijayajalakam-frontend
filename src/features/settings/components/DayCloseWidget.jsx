import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock, CheckCircle2, AlertCircle, RefreshCw, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../api/axiosInstance";
import moment from "moment";
import * as exportUtils from "../../../utils/exportUtils";
import Snackbar from "../../../components/shared/Snackbar";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import CustomTextField from "../../../components/shared/CustomTextField";
import { useAuth } from "../../auth/hooks/useAuth";
import { 
  useGetCurrentSessionQuery, 
  useOpenCounterSessionMutation, 
  useCloseCounterSessionMutation 
} from "../../../store/api/counterSessionEndpoints";
import { useGetAdminProfileQuery } from "../../../store/api/tenantCrudEndpoints";

const DayCloseWidget = ({ fullWidth = false }) => {
  const { hasPermission, isAdmin, user } = useAuth();
  
  // RTK Query Hooks for Performance
  const { data: sessionRes, isLoading, isFetching, refetch } = useGetCurrentSessionQuery(undefined, {
    pollingInterval: 60000, // Refresh every minute automatically
  });
  const [openSessionMutation, { isLoading: isOpening }] = useOpenCounterSessionMutation();
  const [closeSessionMutation, { isLoading: isClosing }] = useCloseCounterSessionMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  
  // Form states for opening
  const [openingBalance, setOpeningBalance] = useState(0);

  const canManage = isAdmin || user?.role === "SHOP_ADMIN" || hasPermission("settings:day_closing:general:manage");

  const showSnack = useCallback((message, type = "success") => setSnack({ message, type }), []);

  const { data: adminProfileData, isLoading: profileLoading } = useGetAdminProfileQuery();
  const isDayClosingEnabled = adminProfileData ? (adminProfileData.salon?.isDayClosingEnabled || false) : null;

  const handleOpenCounter = async () => {
    try {
      const res = await openSessionMutation({
        openingBalance: Number(openingBalance),
        openingPaymentMethod: "CASH"
      }).unwrap();
      if (res.success) {
        showSnack("Counter opened successfully", "success");
        setIsOpen(false);
      }
    } catch (err) {
      showSnack(err?.data?.message || err?.message || "Failed to open counter", "error");
    }
  };

  const handleCloseCounter = async () => {
    setIsConfirmCloseOpen(false);
    try {
      const res = await closeSessionMutation().unwrap();
      if (res.success && res.data) {
        showSnack("Counter closed successfully", "success");
        setIsOpen(false);
        
        // Auto-generate and send WhatsApp report
        try {
          const row = res.data;
          const data = [
            { metric: "Session Date", value: moment(row.openedAt).format("DD MMM YYYY hh:mm A") },
            { metric: "Opened By", value: row.openedBy?.name || "System" },
            { metric: "Closed By", value: row.closedBy?.name || "-" },
            { metric: "Closed At", value: row.closedAt ? moment(row.closedAt).format("DD MMM YYYY hh:mm A") : "-" },
            { metric: "Opening Balance", value: `${row.openingBalance?.toFixed(2) || "0.00"} (${row.openingPaymentMethod})` },
            { metric: "Expected Balance", value: row.closingDetails?.expectedClosingBalance?.toFixed(2) || "-" },
            { metric: "", value: "" },
            { metric: "--- SALES BREAKDOWN ---", value: "" },
            { metric: "Total Sales", value: row.closingDetails?.totalSales?.toFixed(2) || "0.00" },
            { metric: "Cash Sales", value: row.closingDetails?.cashSales?.toFixed(2) || "0.00" },
            { metric: "UPI Sales", value: row.closingDetails?.upiSales?.toFixed(2) || "0.00" },
            { metric: "Card Sales", value: row.closingDetails?.cardSales?.toFixed(2) || "0.00" },
            { metric: "Cash In Hand", value: ((row.closingDetails?.cashSales || 0) + (row.openingBalance || 0)).toFixed(2) },
            { metric: "", value: "" },
            { metric: "--- PAYMENTS & RECEIPTS ---", value: "" },
            { metric: "Total Receipts", value: row.closingDetails?.totalReceipts?.toFixed(2) || "0.00" },
            { metric: "Total Payments", value: row.closingDetails?.totalPayments?.toFixed(2) || "0.00" },
          ];

          if (row.closingDetails?.staffSales && row.closingDetails.staffSales.length > 0) {
            data.push({ metric: "", value: "" });
            data.push({ metric: "--- STAFF PERFORMANCE ---", value: "" });
            row.closingDetails.staffSales.forEach(staff => {
              data.push({ metric: staff.staffName || staff.name, value: `Sales: ${staff.totalAmount?.toFixed(2) || staff.amount?.toFixed(2) || "0.00"}` });
            });
          }

          const exportColumns = [
            { header: "Metric", key: "metric" },
            { header: "Value", key: "value" }
          ];

          showSnack("Generating and sending report...", "success");
          
          const pdfBlob = await exportUtils.exportToPDF(
            data,
            exportColumns,
            `Counter_Session_${moment(row.openedAt).format("DD_MMM_YYYY")}.pdf`,
            { returnBlob: true }
          );

          const formData = new FormData();
          formData.append("file", pdfBlob, `Day_Close_Report_${moment(row.openedAt).format("DD_MMM_YYYY")}.pdf`);

          const whatsappRes = await api.post("/counter-session/report/whatsapp", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });

          if (whatsappRes.data?.success) {
            showSnack("Day Closing report sent to Owner successfully!", "success");
          } else {
            showSnack(whatsappRes.data?.message || "Failed to send WhatsApp report", "error");
          }
        } catch (whatsappError) {
          console.error("WhatsApp Send Error:", whatsappError);
          showSnack("Counter closed, but failed to send WhatsApp report", "error");
        }
      }
    } catch (err) {
      showSnack(err?.data?.message || err?.message || "Failed to close counter", "error");
    }
  };

  // Only hide widget if we have confirmed the feature is disabled
  if (isDayClosingEnabled === false) return null;

  // Premium Skeleton loading state prevents layout pop-in
  if (isDayClosingEnabled === null || isLoading || profileLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-dark-surface animate-pulse border border-gray-200 dark:border-dark-border">
        <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        <div className="w-20 h-4 rounded bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
      </div>
    );
  }

  const sessionData = sessionRes?.data ? sessionRes : null;
  const isCounterOpen = sessionData?.status === "open";
  const stats = sessionData?.data?.stats;
  const submitting = isOpening || isClosing;

  return (
    <>
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      
      <div className={fullWidth ? "w-full" : ""}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${fullWidth ? "w-full justify-center" : ""} ${
            isCounterOpen ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:border-emerald-500/30" 
              : "bg-red-50 text-red-500 border border-transparent hover:border-red-200 dark:bg-red-500/10 dark:hover:border-red-500/20"
          }`}
        >
          <Clock size={18} className={isCounterOpen ? "animate-pulse" : ""} />
          <span className="text-sm font-bold">
            {isCounterOpen ? "Counter Open" : "Counter Closed"}
          </span>
        </button>

        {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/10 backdrop-blur-[2px]" 
                onClick={() => setIsOpen(false)} 
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="fixed top-0 bottom-0 right-0 w-full sm:w-[600px] bg-white dark:bg-[#121212] border-l border-gray-100 dark:border-dark-border z-[99999] flex flex-col shadow-2xl"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-white/50 dark:bg-[#121212]/50 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Day Closing</h3>
                      <p className="text-xs text-gray-500 font-medium">Manage your daily counter</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={refetch} disabled={isFetching} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all disabled:opacity-50">
                      <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-none relative">
                  {/* Inside Sheet Skeleton Loader overlay if refetching aggressively */}
                  {isFetching && !sessionData && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-[#121212]/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="animate-pulse space-y-4 w-full px-6">
                        <div className="h-20 bg-gray-200 dark:bg-dark-surface rounded-2xl w-full"></div>
                        <div className="h-32 bg-gray-200 dark:bg-dark-surface rounded-2xl w-full"></div>
                      </div>
                    </div>
                  )}

                  {isCounterOpen ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-brand-primary/5 border border-brand-primary/20 p-4 rounded-2xl">
                        <div className="flex items-center gap-3 text-brand-primary">
                          <CheckCircle2 size={24} />
                          <div>
                            <p className="text-base font-bold">Counter is Active</p>
                            <p className="text-xs font-medium opacity-80">
                              Since {new Date(sessionData.data.session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stats Summary */}
                      {stats && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Today's Summary</h4>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 transition-all hover:shadow-md">
                              <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold mb-1 uppercase tracking-wider leading-tight">Opening Balance</p>
                              <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                                {(sessionData?.data?.session?.openingBalance || 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 transition-all hover:shadow-md">
                              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1 uppercase tracking-wider leading-tight">Cash In Hand</p>
                              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                {((stats.cashSales || 0) + (stats.totalReceipts || 0) - (stats.totalPayments || 0) + (sessionData?.data?.session?.openingBalance || 0)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-gray-50 dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-dark-border transition-all hover:shadow-md">
                              <p className="text-xs text-gray-500 font-semibold mb-1">Total Sales</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{(stats.totalSales || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-dark-border transition-all hover:shadow-md">
                              <p className="text-xs text-gray-500 font-semibold mb-1">Cash Sales</p>
                              <p className="text-xl font-bold text-brand-primary">{(stats.cashSales || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-dark-border transition-all hover:shadow-md">
                              <p className="text-xs text-gray-500 font-semibold mb-1">UPI Sales</p>
                              <p className="text-xl font-bold text-indigo-500">{(stats.upiSales || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-dark-border transition-all hover:shadow-md">
                              <p className="text-xs text-gray-500 font-semibold mb-1">Card/Other Sales</p>
                              <p className="text-xl font-bold text-purple-500">{(stats.cardSales || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-dark-border transition-all hover:shadow-md">
                              <p className="text-xs text-gray-500 font-semibold mb-1">Receipts</p>
                              <p className="text-xl font-bold text-emerald-500">{(stats.totalReceipts || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-dark-border transition-all hover:shadow-md">
                              <p className="text-xs text-gray-500 font-semibold mb-1">Payments</p>
                              <p className="text-xl font-bold text-red-500">{(stats.totalPayments || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Staff Sales */}
                      {stats?.staffSales?.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Sales Performance</h4>
                          <div className="space-y-2">
                            {stats.staffSales.map((staff, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-dark-surface p-3 rounded-xl border border-gray-100 dark:border-dark-border hover:shadow-sm transition-all">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{staff.name}</span>
                                <span className="text-sm font-bold text-brand-primary">{staff.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-red-500 bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
                        <AlertCircle size={24} />
                        <div>
                          <p className="text-base font-bold">Counter is Closed</p>
                          <p className="text-xs font-medium opacity-80">Open counter to start billing</p>
                        </div>
                      </div>

                      <div className="space-y-5 pt-2">
                        <CustomTextField
                          label="Opening Balance"
                          type="number"
                          value={openingBalance}
                          onChange={(e) => setOpeningBalance(e.target.value)}
                          placeholder="0.00"
                        />
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Payment Method
                          </label>
                          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">Cash</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card mt-auto z-20 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                  {isCounterOpen ? (
                    canManage && (
                      <button
                        onClick={() => {
                          setIsConfirmCloseOpen(true);
                        }}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-base font-bold transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        {submitting ? "Closing..." : "Close Day Counter"}
                        {!submitting && <ArrowRight size={18} />}
                      </button>
                    )
                  ) : (
                    canManage && (
                      <button
                        onClick={handleOpenCounter}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl text-base font-bold transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {submitting ? "Opening..." : "Start Day Counter"}
                        {!submitting && <ArrowRight size={18} />}
                      </button>
                    )
                  )}
                </div>

              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmCloseOpen}
        onClose={() => setIsConfirmCloseOpen(false)}
        onConfirm={handleCloseCounter}
        title="Close Day Counter"
        message="Are you sure you want to close the counter for the day? This will finalize today's transactions."
        confirmLabel={submitting ? "Closing..." : "Close Counter"}
        type="danger"
      />
    </>
  );
};

export default DayCloseWidget;
