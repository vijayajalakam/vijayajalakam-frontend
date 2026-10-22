import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Wallet, ChevronDown, ChevronUp, Calendar, Check, AlertCircle,
  Loader2, Search, User, Clock, IndianRupee, Filter,
  UserCheck, UserX, MinusCircle, X, Download, FileText, FileSpreadsheet, Send
} from "lucide-react";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import CustomMonthPicker from "../../../components/shared/CustomMonthPicker";
import BottomSheet from "../../../components/shared/BottomSheet";
import { useCurrency } from "../../../hooks/useCurrency";
import { exportToExcel, exportPayrollPDF } from "../../../utils/exportUtils";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import moment from "moment";
import { 
  useGetPayrollDataQuery, 
  useProcessPayrollMutation, 
  useSendPayrollSlipMutation,
  useUpdateAttendanceMutation
} from "../../../store/api/payrollEndpoints";

const PayrollSkeleton = () => (
  <div className="flex flex-col gap-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 dark:bg-dark-border animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 sm:w-40 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse hidden sm:block" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-20 sm:w-24 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
              <div className="h-3 w-24 sm:w-32 bg-gray-200 dark:bg-dark-border rounded animate-pulse hidden sm:block" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-6 w-20 sm:w-24 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
          <div className="w-5 h-5 bg-gray-200 dark:bg-dark-border rounded-md animate-pulse shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

const WAGE_TYPE_OPTIONS = [
  { value: "Monthly", label: "Monthly" },
  { value: "Daily", label: "Daily" },
];

const STATUS_COLORS = {
  Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Half Day": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Off: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  Unmarked: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  Future: "bg-gray-50 text-gray-300 dark:bg-gray-800/50 dark:text-gray-600",
};

const STATUS_ABBR = {
  Present: "P",
  "Half Day": "H",
  Absent: "A",
  Off: "â€”",
  Unmarked: "?",
  Future: "",
};

const PayrollPage = () => {
  const { salonConfig } = useAuth();
  const { currencySymbol, formatDisplay } = useCurrency();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [processing, setProcessing] = useState(null);
  const [processingAll, setProcessingAll] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [confirmProcessAll, setConfirmProcessAll] = useState(false);
  const [confirmStaffId, setConfirmStaffId] = useState(null);
  
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedStaffForSend, setSelectedStaffForSend] = useState(null);
  const [sendingSlip, setSendingSlip] = useState(false);
  
  const [showSendAllModal, setShowSendAllModal] = useState(false);
  const [sendingAllSlips, setSendingAllSlips] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(moment().format("YYYY-MM"));
  const [wageType, setWageType] = useState("Monthly");
  const [startDate, setStartDate] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(moment().endOf("month").format("YYYY-MM-DD"));
  const [staffSearch, setStaffSearch] = useState("");

  // Staff list for dropdown
  const [staffList, setStaffList] = useState([]);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const { data: payrollRes, isLoading: loading, refetch } = useGetPayrollDataQuery({
    wageType: wageType !== "All" ? wageType : undefined,
    month: wageType !== "Daily" ? selectedMonth : undefined,
    startDate: wageType === "Daily" ? startDate : undefined,
    endDate: wageType === "Daily" ? endDate : undefined
  });
  const payrollData = payrollRes?.data || [];

  const [processPayroll] = useProcessPayrollMutation();
  const [sendSlip] = useSendPayrollSlipMutation();
  const [updateAttendance] = useUpdateAttendanceMutation();

  const handleChangeStatus = async (staffId, date, status) => {
    try {
      await updateAttendance({
        date,
        records: [{ staff: staffId, status }]
      }).unwrap();
    } catch (err) {
      console.error(err);
      showSnack(err.data?.message || err.message || "Failed to update attendance", "error");
    }
  };

  const handleProcess = (staffId) => {
    setExpandedId(null);
    setConfirmStaffId(staffId);
  };

  const executeProcess = async (staffId) => {
    setProcessing(staffId);
    try {
      const res = await processPayroll({
        staffId,
        month: selectedMonth,
        wageType,
        startDate: wageType === "Daily" ? startDate : undefined,
        endDate: wageType === "Daily" ? endDate : undefined,
      }).unwrap();
      showSnack(res.message || "Payroll processed successfully");
      setConfirmStaffId(null);
    } catch (err) {
      showSnack(err.data?.message || err.message || "Failed to process payroll", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessAll = () => {
    const unprocessedStaff = filteredData.filter(item => !item.isProcessed);
    if (unprocessedStaff.length === 0) {
      showSnack("No staff available to process", "error");
      return;
    }
    setConfirmProcessAll(true);
  };

  const executeProcessAll = async () => {
    const unprocessedStaff = filteredData.filter(item => !item.isProcessed);
    
    setProcessingAll(true);
    let successCount = 0;
    for (const item of unprocessedStaff) {
      try {
        await processPayroll({
          staffId: item.staff._id,
          month: selectedMonth,
          wageType,
          startDate: wageType === "Daily" ? startDate : undefined,
          endDate: wageType === "Daily" ? endDate : undefined,
        }).unwrap();
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }
    
    showSnack(`Successfully processed ${successCount} out of ${unprocessedStaff.length} payrolls`);
    setProcessingAll(false);
    setConfirmProcessAll(false);
  };

  const filteredData = useMemo(() => {
    if (!staffSearch) return payrollData;
    return payrollData.filter((item) => item.staff._id === staffSearch);
  }, [payrollData, staffSearch]);

  // Summary
  const unprocessedData = filteredData.filter((d) => !d.isProcessed);
  const totalGross = unprocessedData.reduce((s, d) => s + (d.grossSalary || 0), 0);
  const totalAllowances = unprocessedData.reduce((s, d) => s + (d.totalAllowances || 0), 0);
  const totalDeductions = unprocessedData.reduce((s, d) => s + (d.totalDeductions || 0), 0);
  const totalNet = unprocessedData.reduce((s, d) => s + (d.netSalary || 0), 0);
  const totalProcessed = filteredData.filter((d) => d.isProcessed).length;

  const monthLabel = wageType === "Daily" 
    ? `${moment(startDate).format("DD MMM")} - ${moment(endDate).format("DD MMM YYYY")}`
    : moment(`${selectedMonth}-01`).format("MMMM YYYY");

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      showSnack("No data to export", "error");
      return;
    }
    const columns = [
      { header: "Staff Name", key: "staffName", exportValue: (row) => row.staff.name },
      { header: "Designation", key: "designation", exportValue: (row) => row.staff.designation || "Staff" },
      { header: "Wage Type", key: "wageType" },
      { header: "Basic Salary", key: "basicSalary" },
      { header: "Gross Salary", key: "grossSalary" },
      { header: "Total Allowances", key: "totalAllowances" },
      { header: "Total Deductions", key: "totalDeductions" },
      { header: "Net Salary", key: "netSalary" },
      { header: "Status", key: "status", exportValue: (row) => row.isProcessed ? "Processed" : "Pending" },
    ];
    exportToExcel(filteredData, columns, `Payroll_${wageType}_${monthLabel}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (filteredData.length === 0) {
      showSnack("No data to export", "error");
      return;
    }
    try {
      await exportPayrollPDF(filteredData, monthLabel, salonConfig, currencySymbol, selectedMonth);
      showSnack("PDF exported successfully");
    } catch (error) {
      console.error(error);
      showSnack("Failed to export PDF", "error");
    }
  };

  const handleSendSlip = async () => {
    if (!selectedStaffForSend) return;
    setSendingSlip(true);
    try {
      const staffPayrollData = filteredData.find(item => item.staff._id === selectedStaffForSend._id);
      if (!staffPayrollData) throw new Error("Staff payroll data not found");

      showSnack("Generating salary slip...", "info");
      await new Promise(resolve => setTimeout(resolve, 50));

      // Generate PDF in Base64
      const base64Pdf = await exportPayrollPDF([staffPayrollData], monthLabel, salonConfig, currencySymbol, selectedMonth, true);

      // Send to backend
      const res = await sendSlip({
        staffId: selectedStaffForSend._id,
        pdfBase64: base64Pdf,
        monthLabel: monthLabel
      }).unwrap();

      showSnack(res.message || "Salary slip sent successfully");
    } catch (error) {
      console.error("Send slip error:", error);
      showSnack(error.data?.message || error.message || "Failed to send salary slip", "error");
    } finally {
      setSendingSlip(false);
      setShowSendModal(false);
      setSelectedStaffForSend(null);
    }
  };

  const handleSendAllSlips = () => {
    const processedStaff = filteredData.filter((d) => d.isProcessed);
    if (processedStaff.length === 0) {
      showSnack("No processed payrolls to send.", "error");
      return;
    }
    
    setShowSendAllModal(false);
    showSnack(`Background task started: Sending ${processedStaff.length} salary slips.`, "success");
    
    (async () => {
      let successCount = 0;
      for (const item of processedStaff) {
        try {
          // Yield to main thread to prevent UI freezing
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const base64Pdf = await exportPayrollPDF([item], monthLabel, salonConfig, currencySymbol, selectedMonth, true);
          const res = await sendSlip({
            staffId: item.staff._id,
            pdfBase64: base64Pdf,
            monthLabel: monthLabel
          }).unwrap();
          
          if (res.success) {
            successCount++;
          }
        } catch (error) {
          console.error("Failed to send slip for " + item.staff.name, error);
        }
      }
      console.log(`Finished background send: ${successCount}/${processedStaff.length}`);
    })();
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden relative">
      {snack.message && (
        <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ message: "", type: "success" })} />
      )}

      {/* Header / Filters */}
      <div className="p-4 md:p-6 border-b border-gray-100 dark:border-dark-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 bg-white dark:bg-dark-bg z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="pr-24 sm:pr-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet size={20} className="text-brand-primary" />
              Payroll — {monthLabel}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {filteredData.length} staff • {totalProcessed} processed • Total {formatDisplay(totalNet)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 w-full sm:w-auto pb-1 sm:pb-0">


            {/* Wage Type */}
            <div className="w-[100px] sm:w-[120px] shrink-0">
              <CustomDropdown
                value={wageType}
                onChange={(e) => setWageType(e.target.value)}
                options={WAGE_TYPE_OPTIONS}
                buttonClassName="w-full h-10 flex items-center justify-between bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-xs sm:text-sm px-2 sm:px-3 outline-none focus:ring-1 focus:ring-brand-primary truncate"
              />
            </div>

            {/* Date Selection */}
            <div className="flex-1 min-w-[100px] sm:w-auto shrink-0 h-10">
              {wageType === "Daily" ? (
                <div className="flex items-center gap-1 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-2 h-full w-full">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-full bg-transparent text-[10px] sm:text-sm focus:outline-none w-[45%]"
                  />
                  <span className="text-gray-400 text-[10px] sm:text-sm">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-full bg-transparent text-[10px] sm:text-sm focus:outline-none w-[45%]"
                  />
                </div>
              ) : (
                <CustomMonthPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  className="w-full h-full"
                />
              )}
            </div>

            {/* Staff Search Dropdown */}
            <div className="min-w-[140px] sm:w-auto sm:max-w-[200px] shrink-0">
              <CustomDropdown
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                options={[
                  { value: "", label: "All Staff" },
                  ...payrollData.map((item) => ({ value: item.staff._id, label: item.staff.name }))
                ]}
                buttonClassName="w-full h-10 flex items-center justify-between bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-xs sm:text-sm px-2 sm:px-3 outline-none focus:ring-1 focus:ring-brand-primary truncate"
              />
            </div>

            {/* Export Dropdown */}
            <div className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto shrink-0" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex shrink-0 items-center gap-2 px-3 sm:px-4 h-10 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-xs sm:text-sm font-bold text-[#1a2340] dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card transition-colors outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <Download size={16} /> EXPORT
              </button>

              {showExportMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border p-1.5 shadow-xl z-[100] flex flex-col gap-1 rounded-xl">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportPDF();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                  >
                    <FileText size={16} className="text-rose-600" />
                    <span>PDF Document</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportExcel();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    <span>Excel Sheet</span>
                  </button>
                  <div className="w-full h-px bg-gray-100 dark:bg-dark-border my-0.5"></div>
                  <button
                    onClick={() => {
                      setShowSendAllModal(true);
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer"
                  >
                    <Send size={16} className="text-brand-primary" />
                    <span>Send Salary Slips</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-dark-bg relative">
        {/* Staff List */}
        {loading ? (
          <PayrollSkeleton />
        ) : filteredData.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <User size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-sm">No staff found for the selected filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredData.map((item) => {
            const isExpanded = expandedId === item.staff._id;

            let pCount = 0, hCount = 0, aCount = 0, offCount = 0;
            Object.values(item.attendance?.daily || {}).forEach(status => {
              if (status === "Present") pCount++;
              else if (status === "Half Day") hCount++;
              else if (status === "Absent") aCount++;
              else if (status === "Off") offCount++;
            });

            return (
              <div
                key={item.staff._id}
                className={`bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden transition-all flex flex-col`}
              >
                {/* Collapsed Card view */}
                <div
                  className={`flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors gap-2 sm:gap-4`}
                  onClick={() => setExpandedId(isExpanded ? null : item.staff._id)}
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border overflow-hidden shrink-0">
                      {item.staff.photo?.url ? (
                        <img src={item.staff.photo.url} alt={item.staff.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-lg bg-gray-50 dark:bg-dark-bg">
                          {item.staff.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-center min-w-0 space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-[14px] sm:text-[16px] uppercase tracking-tight leading-none truncate">
                          {item.staff.name}
                        </h4>
                        <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 leading-tight">
                          {item.wageType}
                        </span>
                        {item.isProcessed && (
                          <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-wider leading-tight">
                            <Check size={10} strokeWidth={3} className="mr-0.5" /> Processed
                          </span>
                        )}
                      </div>
                      
                      {/* Sub-info row */}
                      <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-[12px] truncate">
                        <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">{item.staff.designation || 'Staff'}</span>
                        <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">&bull;</span>
                        
                        {/* Attendance inline */}
                        <div className="flex items-center gap-1.5 font-bold tracking-tight">
                          <span className="text-emerald-600 dark:text-emerald-400">{pCount}P</span>
                          <span className="text-orange-500 dark:text-orange-400">{hCount}H</span>
                          <span className="text-rose-500 dark:text-rose-400">{aCount}A</span>
                          <span className="text-gray-400 dark:text-gray-500">{offCount}Off</span>
                          {item.totalOtHours > 0 && (
                            <span className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400">
                              <Clock size={11} strokeWidth={2.5} />
                              {item.totalOtHours}hr OT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex flex-col text-right">
                      <span className="text-[15px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-none tracking-tight">
                        {formatDisplay(item.netSalary)}
                      </span>
                      {item.isProcessed && (
                        <span className="sm:hidden text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-0.5 tracking-wider">
                          Processed
                        </span>
                      )}
                      {!item.isProcessed && (
                        <span className="sm:hidden text-[9px] font-medium text-gray-400 uppercase mt-0.5 tracking-wider">
                          Net Pay
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 bg-gray-50 dark:bg-dark-surface rounded-full p-1 sm:p-1.5">
                      <ChevronDown size={16} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
      
      {/* Global Totals Footer */}
      {filteredData.length > 0 && (
        <div className="bg-white dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between z-[40]">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-4 md:mb-0 w-full md:w-auto">
            {/* All 4 items - Forced side-by-side in one row on mobile and desktop */}
            <div className="flex items-center justify-between gap-2 sm:gap-6 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              <div className="shrink-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Gross</p>
                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-0.5">{formatDisplay(totalGross)}</p>
              </div>
              <div className="shrink-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Allowances</p>
                <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+{formatDisplay(totalAllowances)}</p>
              </div>
              <div className="shrink-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deductions</p>
                <p className="text-sm sm:text-base font-bold text-red-500 dark:text-red-400 mt-0.5">-{formatDisplay(totalDeductions)}</p>
              </div>
              
              {/* Net Pay */}
              <div className="pl-3 sm:pl-4 border-l-2 border-gray-100 dark:border-dark-border shrink-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Net Pay</p>
                <p className="text-base sm:text-xl font-black text-[#1a2340] dark:text-blue-400 mt-0.5">{formatDisplay(totalNet)}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleProcessAll}
            disabled={processingAll || filteredData.filter(item => !item.isProcessed).length === 0}
            className="w-full md:w-auto mt-2 md:mt-0 flex shrink-0 items-center justify-center gap-2 px-8 py-3.5 bg-[#172046] hover:bg-[#172046]/90 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {processingAll && <Loader2 size={16} className="animate-spin" />}
            Save All Payroll
          </button>
        </div>
      )}

      {/* Expanded Content Side Sheet / Bottom Sheet */}
      {(() => {
        const item = expandedId ? filteredData.find(i => i.staff._id === expandedId) : null;
        if (!item) return null;

        let blanks = [];
        let daysInMonth = [];
        if (wageType === "Daily") {
          const sDate = moment(startDate).startOf('day');
          const eDate = moment(endDate).startOf('day');
          const firstDayOfWeek = sDate.toDate().getDay();
          blanks = Array.from({ length: firstDayOfWeek });
          const daysDiff = eDate.diff(sDate, 'days') + 1;
          for (let d = 0; d < daysDiff; d++) {
            daysInMonth.push(moment(sDate).add(d, 'days').format("YYYY-MM-DD"));
          }
        } else {
          const [year, month] = selectedMonth.split("-").map(Number);
          const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
          blanks = Array.from({ length: firstDayOfMonth });
          const daysInMonthCount = moment(`${selectedMonth}-01`).endOf("month").date();
          for (let d = 1; d <= daysInMonthCount; d++) {
            daysInMonth.push(`${selectedMonth}-${String(d).padStart(2, "0")}`);
          }
        }

        let paidLeavesRemaining = item.attendance?.paidLeavesUsed || 0;
        const paidLeaveCoverage = {};
        
        // Pass 1: Prioritize full Absent days
        daysInMonth.forEach(date => {
          if (paidLeavesRemaining <= 0) return;
          if (item.attendance.daily[date] === "Absent") {
            if (paidLeavesRemaining >= 1) {
              paidLeaveCoverage[date] = 1;
              paidLeavesRemaining -= 1;
            } else if (paidLeavesRemaining === 0.5) {
              paidLeaveCoverage[date] = 0.5;
              paidLeavesRemaining -= 0.5;
            }
          }
        });

        // Pass 2: Apply any remaining paid leave to Half Days
        daysInMonth.forEach(date => {
          if (paidLeavesRemaining <= 0) return;
          if (item.attendance.daily[date] === "Half Day") {
            if (paidLeavesRemaining >= 0.5) {
              paidLeaveCoverage[date] = 0.5;
              paidLeavesRemaining -= 0.5;
            }
          }
        });

        const expandedContentNode = (
          <div className="grid grid-cols-1 gap-6">
            {/* Calendar */}
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                <Calendar size={14} /> {monthLabel}
              </h3>
              <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-2 sm:p-3">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-[10px] sm:text-xs font-black text-gray-400 text-center uppercase tracking-wider mb-1">{day}</div>
                  ))}
                  {blanks.map((_, i) => <div key={`blank-${i}`} className="w-full h-8 sm:h-9" />)}
                  {daysInMonth.map(date => {
                    const status = item.attendance.daily[date] || "Future";
                    const otHours = item.attendance.dailyOtHours?.[date] || 0;
                    const d = new Date(date);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const dayNum = d.getDate();
                    
                    let cellClass = "w-full h-8 sm:h-9 rounded-md flex items-center justify-center relative border text-xs sm:text-sm font-bold ";
                    if (status === "Off") cellClass += "bg-gray-100 border-gray-200 dark:bg-dark-bg dark:border-dark-border text-gray-400 opacity-80 ";
                    else if (status === "Present") cellClass += "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 ";
                    else if (status === "Half Day") {
                      if (paidLeaveCoverage[date]) {
                        cellClass += "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 ";
                      } else {
                        cellClass += "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 ";
                      }
                    }
                    else if (status === "Absent") {
                      if (paidLeaveCoverage[date]) {
                        cellClass += "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 ";
                      } else {
                        cellClass += "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 text-rose-700 dark:text-rose-400 ";
                      }
                    }
                    else {
                      cellClass += "bg-white border-dashed border-gray-200 dark:bg-dark-surface dark:border-dark-border text-gray-500 dark:text-gray-300 ";
                      if (isWeekend) cellClass += "bg-gray-50/50 dark:bg-dark-card text-gray-400 border-solid border-gray-100";
                    }
                    
                    if (date === moment().format("YYYY-MM-DD")) cellClass += " ring-2 ring-brand-primary";
                    
                    return (
                      <button
                        key={date}
                        onClick={(e) => {
                          if (status === "Off" || item.isProcessed) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setEditingStaff(editingStaff?.item?.id === `${item.staff._id}_${date}` ? null : { item: { staff: item.staff, date, id: `${item.staff._id}_${date}` }, rect });
                        }}
                        disabled={status === "Off" || item.isProcessed}
                        className={cellClass + (status !== "Off" && !item.isProcessed ? " hover:scale-105 cursor-pointer" : "")}
                        title={`${date} (${status}${otHours > 0 ? `, ${otHours}hr OT` : ''})`}
                      >
                        <span className="font-bold relative z-10 flex items-baseline">
                          {dayNum}
                          {status === "Half Day" && <span className="text-[9px] font-black ml-0.5 opacity-60">H</span>}
                        </span>
                        {otHours > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white dark:ring-dark-surface z-20">
                            {otHours}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Mini Legend */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-dark-border">
                  {[
                    { label: "Present", cls: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20" },
                    { label: "Half", cls: "bg-amber-50 border-amber-200 dark:bg-amber-900/20" },
                    { label: "Absent", cls: "bg-rose-50 border-rose-200 dark:bg-rose-900/20" },
                    { label: "Paid Leave", cls: "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20" },
                    { label: "Off", cls: "bg-gray-100 border-gray-200 dark:bg-dark-bg" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded border ${l.cls}`} />
                      <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="flex flex-col">
              <h3 className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                <IndianRupee size={14} /> Salary Breakdown
              </h3>
              <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 sm:p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-center text-sm pb-3 mb-3 border-b border-gray-100 dark:border-dark-border">
                  <span className="text-gray-500 font-medium">Basic & Working Days</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 dark:text-white">{formatDisplay(item.basicSalary)}</span>
                    <span className="text-gray-300 mx-2">&bull;</span>
                    <span className="font-medium text-gray-500 dark:text-gray-400">{item.attendance.presentDays}P + {item.attendance.halfDays}H / {item.attendance.totalWorkingDays}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm pb-3 mb-3 border-b border-gray-100 dark:border-dark-border">
                  <span className="text-gray-500 font-medium">Paid Leaves</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 dark:text-white">{item.attendance.paidLeavesUsed || 0} Used</span>
                    <span className="text-gray-300 mx-2">&bull;</span>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Out of {item.attendance.paidLeavesTotal || 0}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm pb-3 mb-3 border-b border-gray-100 dark:border-dark-border">
                  <span className="text-gray-500 font-medium">Calculated Basic</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatDisplay(item.calculatedSalary)}</span>
                </div>

                <div className="flex justify-between text-sm pb-3 mb-3 border-b border-gray-100 dark:border-dark-border">
                  <span className="text-gray-500 font-medium">Allowances</span>
                  <div className="flex flex-wrap justify-end gap-2 text-gray-400 font-medium w-2/3">
                    {item.allowances.length > 0 
                      ? item.allowances.map(a => (
                          <span key={a.name} className="text-emerald-600 dark:text-emerald-400">
                            +{a.name} ({a.isPercentage ? `${a.amount}%: ${currencySymbol}${(a.finalAmount || 0).toLocaleString("en-IN")}` : `${currencySymbol}${(a.finalAmount || 0).toLocaleString("en-IN")}`})
                          </span>
                        )) 
                      : <span>&mdash;</span>}
                  </div>
                </div>

                {item.totalOtHours > 0 && (
                  <div className="flex justify-between items-center text-sm pb-3 mb-3 border-b border-gray-100 dark:border-dark-border">
                    <span className="text-gray-500 font-medium flex flex-col">
                      OT Pay
                      <span className="text-[10px] text-gray-400">{item.totalOtHours}hr @ {currencySymbol}{item.otRatePerHour}/hr</span>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatDisplay(item.otPay || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm pb-3 mb-3 border-b border-gray-100 dark:border-dark-border">
                  <span className="text-gray-500 font-medium">Deductions</span>
                  <div className="flex flex-wrap justify-end gap-2 text-gray-400 font-medium w-2/3">
                    {item.deductions.length > 0 
                      ? item.deductions.map(d => (
                          <span key={d.name} className="text-red-500 dark:text-red-400">
                            -{d.name} ({d.isPercentage ? `${d.amount}%: ${currencySymbol}${(d.finalAmount || 0).toLocaleString("en-IN")}` : `${currencySymbol}${(d.finalAmount || 0).toLocaleString("en-IN")}`})
                          </span>
                        )) 
                      : <span>&mdash;</span>}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm pb-4 mb-4 border-b border-gray-100 dark:border-dark-border">
                  <span className="font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Gross Salary</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatDisplay(item.grossSalary)}</span>
                </div>

                <div className="mt-auto pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#1a2340] dark:text-blue-400 uppercase tracking-widest mb-1">Net Pay</p>
                    <p className="text-2xl sm:text-3xl font-black text-[#1a2340] dark:text-blue-400 leading-none">{formatDisplay(item.netSalary)}</p>
                  </div>
                  
                  <div className="w-full sm:w-auto min-w-[180px]">
                    {item.isProcessed ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 rounded-xl font-bold border border-emerald-200 dark:border-emerald-800/50 text-center flex items-center justify-center gap-1.5">
                          <Check size={16} /> Processed {moment(item.payrollRecord?.createdAt).format("DD MMM")}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStaffForSend(item.staff);
                            setShowSendModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1a2340] hover:bg-[#1a2340]/90 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                          <Send size={16} />
                          Send Slip
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {!item.allAttendanceMarked && (
                          <div className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg font-medium border border-orange-200 dark:border-orange-800/50 text-center flex items-center justify-center gap-1">
                            <AlertCircle size={12} /> {item.attendance.unmarkedDays} unmarked day(s).
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProcess(item.staff._id);
                          }}
                          disabled={processing === item.staff._id}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1a2340] hover:bg-[#1a2340]/90 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processing === item.staff._id ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                          Save Payroll
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        if (isMobile) {
          return (
            <BottomSheet
              isOpen={Boolean(expandedId)}
              onClose={() => setExpandedId(null)}
              title={`Payroll - ${item.staff.name}`}
            >
              {expandedContentNode}
            </BottomSheet>
          );
        }

        return createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300"
              onClick={() => setExpandedId(null)}
            />
            <div
              className="fixed top-0 right-0 h-full w-full max-w-[500px] bg-white dark:bg-dark-surface z-[60] flex flex-col border-l border-gray-200 dark:border-dark-border"
              style={{ animation: "slideInRight 0.3s ease-out forwards" }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
                    {item.staff.name}
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                    Payroll Details
                  </span>
                </div>
                <button
                  onClick={() => setExpandedId(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/50 dark:bg-dark-bg/30">
                {expandedContentNode}
              </div>
            </div>
          </>,
          document.body
        );
      })()}

      {/* Global Menupopup for Managing Status */}
      {editingStaff && createPortal(
        <>
          {/* Invisible backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-[140]"
            onClick={() => setEditingStaff(null)}
          />
          <div 
            className="fixed z-[150] w-36 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-200 dark:border-dark-border overflow-hidden animate-in fade-in duration-200"
            style={{ 
              top: editingStaff.rect.bottom + 4, 
              left: Math.max(10, editingStaff.rect.right - 144)
            }}
          >
            <button 
              onClick={() => { handleChangeStatus(editingStaff.item.staff._id, editingStaff.item.date, "Present"); setEditingStaff(null); }}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2"
            >
              <UserCheck size={14} />
              Present
            </button>
            <button 
              onClick={() => { handleChangeStatus(editingStaff.item.staff._id, editingStaff.item.date, "Half Day"); setEditingStaff(null); }}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-2"
            >
              <Clock size={14} />
              Half Day
            </button>
            <button 
              onClick={() => { handleChangeStatus(editingStaff.item.staff._id, editingStaff.item.date, "Absent"); setEditingStaff(null); }}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-dark-border"
            >
              <UserX size={14} />
              Absent
            </button>
            <button 
              onClick={() => { handleChangeStatus(editingStaff.item.staff._id, editingStaff.item.date, "Unmarked"); setEditingStaff(null); }}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors flex items-center gap-2"
            >
              <MinusCircle size={14} />
              Clear
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Confirm Save Individual Payroll Modal */}
      {confirmStaffId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {(() => {
              const item = filteredData.find(i => i.staff._id === confirmStaffId);
              if (!item) return null;
              return (
                <>
                  <div className="p-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Save Payroll?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                      You are about to save the payroll record for <span className="font-bold text-gray-900 dark:text-white">{item.staff.name}</span>. This action cannot be undone.
                    </p>
                    
                    <div className="bg-gray-50 dark:bg-dark-bg/50 rounded-xl p-4 border border-gray-100 dark:border-dark-border space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-dark-border">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Period</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{monthLabel}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-dark-border">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gross</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDisplay(item.grossSalary)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-dark-border">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deductions</span>
                        <span className="text-sm font-bold text-red-500 dark:text-red-400">-{formatDisplay(item.totalDeductions)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Net Pay</span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatDisplay(item.netSalary)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-dark-bg/50 border-t border-gray-100 dark:border-dark-border flex gap-3">
                    <button
                      onClick={() => setConfirmStaffId(null)}
                      disabled={processing === confirmStaffId}
                      className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-card transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => executeProcess(confirmStaffId)}
                      disabled={processing === confirmStaffId}
                      className="flex-1 px-4 py-3 rounded-xl font-bold bg-[#1a2340] hover:bg-[#1a2340]/90 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing === confirmStaffId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Confirm Save
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Confirm Save All Payroll Modal */}
      {confirmProcessAll && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            {(() => {
              const unprocessedStaff = filteredData.filter(item => !item.isProcessed);
              const bulkNet = unprocessedStaff.reduce((s, d) => s + (d.netSalary || 0), 0);
              return (
                <>
                  <div className="p-6 pb-4 border-b border-gray-100 dark:border-dark-border">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Save All Payroll?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                      You are about to bulk process payroll for <span className="font-bold text-gray-900 dark:text-white">{unprocessedStaff.length}</span> staff members.
                    </p>
                  </div>
                  
                  <div className="overflow-y-auto p-6 bg-gray-50/50 dark:bg-dark-bg/30 flex-1">
                    <div className="space-y-3">
                      {unprocessedStaff.map(item => (
                        <div key={item.staff._id} className="flex justify-between items-center bg-white dark:bg-dark-card p-3 rounded-xl border border-gray-100 dark:border-dark-border">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.staff.name}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.wageType}</span>
                          </div>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatDisplay(item.netSalary)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Total Net Pay</span>
                      <span className="text-2xl font-black text-[#1a2340] dark:text-blue-400">{formatDisplay(bulkNet)}</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmProcessAll(false)}
                        disabled={processingAll}
                        className="flex-1 px-4 py-3.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-card transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeProcessAll}
                        disabled={processingAll}
                        className="flex-[2] px-4 py-3.5 rounded-xl font-bold bg-[#172046] hover:bg-[#172046]/90 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingAll ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Confirm Save All
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Send Slip Modal */}
      {showSendModal && selectedStaffForSend && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="p-6 text-center border-b border-gray-100 dark:border-dark-border">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Send Salary Slip</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Send the {monthLabel} salary slip to <strong className="text-gray-900 dark:text-white">{selectedStaffForSend.name}</strong>?
                <br /><br />
                It will be sent via Email and WhatsApp (if configured).
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-bg flex gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedStaffForSend(null);
                }}
                disabled={sendingSlip}
                className="flex-1 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSlip}
                disabled={sendingSlip}
                className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {sendingSlip ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Send Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send All Slips Modal */}
      {showSendAllModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="p-6 text-center border-b border-gray-100 dark:border-dark-border">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Send All Salary Slips</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Send salary slips to <strong className="text-gray-900 dark:text-white">{filteredData.filter((d) => d.isProcessed).length}</strong> processed staff members?
                <br /><br />
                They will be sent via Email and WhatsApp (if configured).
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-bg flex gap-3">
              <button
                onClick={() => setShowSendAllModal(false)}
                disabled={sendingAllSlips}
                className="flex-1 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendAllSlips}
                disabled={sendingAllSlips}
                className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                {sendingAllSlips ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Send All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PayrollPage;
