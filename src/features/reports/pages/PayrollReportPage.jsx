import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Wallet, User, DollarSign, Download, Loader2, Trash2 } from "lucide-react";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import moment from "moment";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import CustomTable from "../../../components/shared/CustomTable";
import CustomMonthPicker from "../../../components/shared/CustomMonthPicker";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useDeletePayrollMutation } from "../../../store/api/payrollEndpoints";

const PayrollReportPage = () => {
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRecords: 0, totalNetSalary: 0, totalGrossSalary: 0 });
  
  const { pagination, onPageChange, updatePagination, resetPagination } = usePagination({ initialLimit: 20 });

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletePayroll] = useDeletePayrollMutation();

  const handleDelete = async (id) => {
    try {
      await deletePayroll(id).unwrap();
      showSnack("Payroll deleted successfully");
      setDeleteConfirm(null);
      fetchHistory();
    } catch (err) {
      showSnack(err.data?.message || err.message || "Failed to delete payroll", "error");
    }
  };

  // Filters
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(moment().endOf("month").format("YYYY-MM-DD"));
  const [searchQuery, setSearchQuery] = useState("");

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: startDate || "",
        endDate: endDate || "",
        page: pagination.page,
        limit: pagination.limit,
      });
      const res = await api.get(`/payroll/history?${params.toString()}`);
      setRecords(res.data.data || []);
      setSummary(res.data.summary || { totalRecords: 0, totalNetSalary: 0, totalGrossSalary: 0 });
      if (res.data.pagination) updatePagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      showSnack("Failed to load payroll history", "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, pagination.page, pagination.limit, updatePagination]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    resetPagination();
  }, [startDate, resetPagination]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.staff?.name?.toLowerCase().includes(q) ||
        r.staff?.employeeId?.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const summaryData = useMemo(() => {
    return {
      total: summary.totalNetSalary || 0,
      count: summary.totalRecords || 0,
      segments: [
        {
          id: "Gross",
          label: "Total Gross",
          value: summary.totalGrossSalary || 0,
          color: "#8b5cf6",
          inProgressBar: false,
        },
        {
          id: "Net",
          label: "Total Net",
          value: summary.totalNetSalary || 0,
          color: "#10b981",
          inProgressBar: true,
        },
      ],
    };
  }, [summary]);

  const columns = [
    {
      header: "Staff",
      exportValue: (row) => row.staff?.name || "—",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {row.staff?.photo?.url ? (
              <img src={row.staff.photo.url} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <User size={14} className="text-brand-primary dark:text-blue-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{row.staff?.name || "—"}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{row.staff?.employeeId || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Wage Type",
      exportValue: (row) => row.wageType,
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
            row.wageType === "Daily"
              ? "bg-violet-50 text-violet-600 border border-violet-100"
              : "bg-blue-50 text-blue-600 border border-blue-100"
          }`}>
            {row.wageType}
          </span>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
            {row.month.includes("_to_") 
              ? `${moment(row.month.split("_to_")[0]).format("DD MMM")} - ${moment(row.month.split("_to_")[1]).format("DD MMM")}`
              : moment(`${row.month}-01`).format("MMM YYYY")}
          </span>
        </div>
      ),
    },
    {
      header: "Basic",
      align: "right",
      exportValue: (row) => row.basicSalary || 0,
      render: (row) => (
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 notranslate">
          {currencySymbol}{formatDisplayNumber(row.basicSalary || 0)}
        </span>
      ),
    },
    {
      header: "Attendance",
      align: "center",
      exportValue: (row) => `${row.totalPresentDays}P / ${row.totalHalfDays}H / ${row.totalAbsentDays}A`,
      render: (row) => (
        <div className="text-xs font-bold tracking-wider bg-gray-50 dark:bg-dark-card px-2 py-1 rounded-lg border border-gray-100 dark:border-dark-border inline-block">
          <span className="text-emerald-500" title="Present Days">{row.totalPresentDays}P</span>
          <span className="text-gray-300 mx-1">/</span>
          <span className="text-amber-500" title="Half Days">{row.totalHalfDays}H</span>
          <span className="text-gray-300 mx-1">/</span>
          <span className="text-rose-500" title="Absent Days">{row.totalAbsentDays}A</span>
        </div>
      ),
    },
    {
      header: "Net Salary",
      align: "right",
      exportValue: (row) => row.netSalary || 0,
      render: (row) => (
        <div className="flex flex-col items-end">
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
            {currencySymbol}{formatDisplayNumber(row.netSalary || 0)}
          </span>
          <span className="text-[10px] text-gray-400 font-bold uppercase">
            {(row.totalAllowances || row.totalDeductions) ? (
              <span className="flex gap-1">
                {row.totalAllowances > 0 && <span className="text-emerald-400">+{row.totalAllowances}</span>}
                {row.totalDeductions > 0 && <span className="text-rose-400">-{row.totalDeductions}</span>}
              </span>
            ) : "No Adj"}
          </span>
        </div>
      ),
    },
    {
      header: "Processed On",
      align: "right",
      exportValue: (row) => new Date(row.createdAt).toLocaleDateString(),
      render: (row) => (
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {moment(row.createdAt).format("DD MMM YY")}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end">
          {hasPermission('hrm:payroll:process') && (
            <button
              onClick={() => setDeleteConfirm(row._id)}
              className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95"
              title="Delete Payroll"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate || "",
        endDate: endDate || "",
        page: "1",
        limit: "100000",
      });
      const res = await api.get(`/payroll/history?${params.toString()}`);
      return res.data.success ? res.data.data : [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const monthLabel = (startDate && endDate) 
    ? `${moment(startDate).format("DD MMM")} - ${moment(endDate).format("DD MMM YYYY")}` 
    : moment().format("MMMM YYYY");

  return (
    <ReportLayout 
      title={`Payroll Report — ${monthLabel}`} 
      subtitle="Analyze staff salaries and payouts"
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      
      <ReportSummaryCard
        title="Payroll Analysis"
        totalValue={summaryData.total}
        totalLabel="Total Net Salary"
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
        hideCountLabel={true}
      />

      <CustomTable
        columns={columns}
        data={filteredRecords}
        loading={loading}
        onRefresh={fetchHistory}
        isRefreshing={loading}
        onExport={hasPermission('reports:staff:payroll_report:export') ? handleExport : undefined}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        emptyMessage="No payroll records found for this month."
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100 font-bold overflow-hidden">
              {row.staff?.photo?.url ? (
                <img src={row.staff.photo.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-blue-400" />
              )}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.staff?.name || "Unknown"}
            </div>
          ),
          subtitle: (row) => {
            const period = row.month.includes("_to_") 
              ? `${moment(row.month.split("_to_")[0]).format("DD MMM")} - ${moment(row.month.split("_to_")[1]).format("DD MMM")}`
              : moment(`${row.month}-01`).format("MMM YYYY");
            return (
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                {row.wageType} • {period}
              </div>
            );
          },
          trailing: (row) => (
            <div className="text-right">
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
                {currencySymbol}{formatDisplayNumber(row.netSalary || 0)}
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                {moment(row.createdAt).format("DD MMM")}
              </span>
            </div>
          ),
          actions: (row) => (
            <div className="flex flex-wrap gap-2 pt-2">
              {hasPermission('hrm:payroll:process') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row._id); }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-bold hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-100"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          ),
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Payroll Record?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action will delete the payroll record and revert the accounting transaction. This cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-bg/50 border-t border-gray-100 dark:border-dark-border flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ReportLayout>
  );
};

export default PayrollReportPage;

