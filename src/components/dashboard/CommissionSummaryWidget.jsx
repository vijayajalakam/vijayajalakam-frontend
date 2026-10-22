import React, { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useTheme } from "../shared/ThemeContext";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { getDynamicPortalPath } from "../../utils/portalUtils";

const CommissionSummaryWidget = ({ className = "" }) => {
  const { currencySymbol, hasPermission, shopSlug, portalRole } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [commissionData, setCommissionData] = useState({
    totalPending: 0,
    totalEarned: 0,
    staffCount: 0,
    topStaff: [],
  });
  const [loading, setLoading] = useState(true);
  const [settleLoading, setSettleLoading] = useState(false);

  // Settlement confirmation modal state
  const [settleModal, setSettleModal] = useState({
    open: false,
    loading: false,
    notes: "",
  });

  const fetchCommissionSummary = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toLocaleDateString("en-CA");
      const res = await api.get(
        `/invoices/commission-summary?startDate=${today}&endDate=${today}`
      );
      
      if (res.data.success) {
        const data = res.data.data || [];
        const summary = res.data.summary || {};
        
        // Get top 3 staff with pending commissions
        const topStaff = data
          .filter(staff => staff.pendingCommission > 0)
          .sort((a, b) => b.pendingCommission - a.pendingCommission)
          .slice(0, 3);

        setCommissionData({
          totalPending: summary.totalPending || 0,
          totalEarned: summary.totalCommission || 0,
          staffCount: data.filter(staff => staff.pendingCommission > 0).length,
          topStaff,
        });
      }
    } catch (error) {
      console.error("Failed to fetch commission summary:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasPermission('reports:staff:staff_commission:view')) {
      fetchCommissionSummary();
    }
  }, [fetchCommissionSummary, hasPermission]);

  const handleSettleAll = () => {
    if (commissionData.totalPending <= 0) return;
    setSettleModal({
      open: true,
      loading: false,
      notes: "",
    });
  };

  const confirmSettle = async () => {
    setSettleModal((prev) => ({ ...prev, loading: true }));
    try {
      const today = new Date().toLocaleDateString("en-CA");
      const payload = {
        notes: settleModal.notes || "Bulk commission settlement from dashboard",
        startDate: today,
        endDate: today,
      };

      const res = await api.post("/invoices/settle-commission", payload);
      if (res.data.success) {
        setSettleModal({
          open: false,
          loading: false,
          notes: "",
        });
        fetchCommissionSummary(); // Refresh data
      }
    } catch (err) {
      console.error("Settlement failed:", err);
      setSettleModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleViewReport = () => {
    navigate(getDynamicPortalPath(shopSlug, portalRole, "/admin/reports/staff-commission"));
  };

  // Don't render if user doesn't have permission
  if (!hasPermission('reports:staff:staff_commission:view')) {
    return null;
  }

  return (
    <>
      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-dark-surface p-6 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-none flex flex-col justify-between ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Staff Commissions
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Today's pending settlements
            </p>
          </div>
          <div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg">
            <Wallet size={20} />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border shadow-none">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2 w-1/3" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full justify-between">
            {/* Summary Stats - Column wise inside beautiful card UI */}
            <div className="flex flex-col gap-3">
              {/* Pending */}
              <div className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/15 rounded-xl border border-amber-100/50 dark:border-amber-900/25 shadow-none">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100/60 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      Pending
                    </span>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Commission due for settlement</h4>
                  </div>
                </div>
                <div className="text-base font-black text-amber-700 dark:text-amber-300 notranslate">
                  {currencySymbol}{commissionData.totalPending.toLocaleString()}
                </div>
              </div>

              {/* Earned */}
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-950/15 rounded-xl border border-emerald-100/50 dark:border-emerald-900/25 shadow-none">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      Earned
                    </span>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Total commissions earned today</h4>
                  </div>
                </div>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-300 notranslate">
                  {currencySymbol}{commissionData.totalEarned.toLocaleString()}
                </div>
              </div>

              {/* Staff */}
              <div className="flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-950/15 rounded-xl border border-blue-100/50 dark:border-blue-900/25 shadow-none">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100/60 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Users size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Staff
                    </span>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Unsettled staff members</h4>
                  </div>
                </div>
                <div className="text-base font-black text-blue-700 dark:text-blue-300">
                  {commissionData.staffCount}
                </div>
              </div>
            </div>

            {/* Settle All Button at bottom */}
            {!loading && commissionData.totalPending > 0 && hasPermission('reports:staff:staff_commission:settle') && (
              <button
                onClick={handleSettleAll}
                disabled={settleLoading}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-60 whitespace-nowrap shadow-sm hover:shadow"
              >
                {settleLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Settle All ({currencySymbol}{commissionData.totalPending.toLocaleString()})</span>
                  </>
                )}
              </button>
            )}

            {/* Success Message */}
            {commissionData.totalPending === 0 && (
              <div className="flex items-center justify-center gap-2 py-4 mt-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/30">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  All commissions settled for today
                </p>
              </div>
            )}
          </div>
        )}
      </Motion.div>

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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white dark:bg-dark-surface rounded-2xl p-6 max-w-md w-full"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                <Wallet size={24} className="text-emerald-500" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                Settle All Commissions
              </h3>

              {/* Info */}
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5 leading-relaxed">
                This will settle all pending commissions for today ({currencySymbol}{commissionData.totalPending.toLocaleString()}). 
                Individual entries will be created for each staff member.
              </p>

              {/* Total Pending Info */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 flex items-center justify-between mb-5">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                    Total Settlement
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 notranslate">
                    {currencySymbol}{commissionData.totalPending.toLocaleString()}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-2 mb-5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">
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
                  className="w-full bg-gray-50 dark:bg-dark-card rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none h-20"
                  placeholder="Add settlement notes..."
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-5">
                <AlertCircle
                  size={16}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                  This action will process payments for {commissionData.staffCount} staff member{commissionData.staffCount !== 1 ? 's' : ''} 
                  and cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setSettleModal((prev) => ({ ...prev, open: false }))
                  }
                  disabled={settleModal.loading}
                  className="flex-1 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSettle}
                  disabled={settleModal.loading}
                  className="flex-1 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-60"
                >
                  {settleModal.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm Settlement"
                  )}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CommissionSummaryWidget;