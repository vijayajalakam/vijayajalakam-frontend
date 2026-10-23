import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Mail, Phone, Download, UserCheck, Clock, UserX, ChevronLeft, ChevronRight, Edit, Calendar, LayoutGrid, List, ChevronDown } from "lucide-react";
import { useGetAttendanceReportQuery, useSaveAttendanceMutation, useGetAdminStaffQuery } from "../../../store/api/tenantCrudEndpoints";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import { usePagination } from "../../../hooks/usePagination";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import toast from "react-hot-toast";
import * as exportUtils from "../../../utils/exportUtils";

const StaffAttendanceReportPage = () => {
  const { hasPermission, shopConfig } = useAuth();
  const navigate = useNavigate();
  
  // View mode state
  const [viewMode, setViewMode] = useState("calendar"); // "chart" | "list" | "calendar"
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  
  // States for List View
  const today = new Date().toLocaleDateString("en-CA");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  // States for Chart/Calendar View
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { pagination, onPageChange, updatePagination, resetPagination } = usePagination({ initialLimit: 20 });
  
  const [editingStaff, setEditingStaff] = useState(null);

  // Calculate fetch dates based on viewMode
  const chartStartDate = `${currentMonth}-01`;
  const nextMonthDate = new Date(currentMonth + "-01");
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  nextMonthDate.setDate(0);
  const chartEndDate = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-${String(nextMonthDate.getDate()).padStart(2, "0")}`;

  const fetchStart = viewMode === "list" ? startDate : chartStartDate;
  const fetchEnd = viewMode === "list" ? endDate : chartEndDate;

  // Fetch Attendance Records
  const { data: serverStaff = [], isFetching: loading } = useGetAttendanceReportQuery(
    { startDate: fetchStart, endDate: fetchEnd },
    { skip: !fetchStart || !fetchEnd }
  );
  
  // Fetch All Staff to show in Chart/Calendar even if they have no records
  const { data: allStaff = [] } = useGetAdminStaffQuery(undefined, { skip: viewMode === "list" });
  
  const [saveAttendanceApi] = useSaveAttendanceMutation();

  // List View Handlers
  const handlePrevDay = () => {
    const diff = new Date(endDate) - new Date(startDate);
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    
    dStart.setDate(dStart.getDate() - 1);
    
    if (diff === 0) {
      setStartDate(dStart.toISOString().split("T")[0]);
      setEndDate(dStart.toISOString().split("T")[0]);
    } else {
      const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));
      dStart.setDate(dStart.getDate() - daysDiff);
      dEnd.setDate(dEnd.getDate() - daysDiff - 1);
      setStartDate(dStart.toISOString().split("T")[0]);
      setEndDate(dEnd.toISOString().split("T")[0]);
    }
  };

  const handleNextDay = () => {
    const diff = new Date(endDate) - new Date(startDate);
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    
    dEnd.setDate(dEnd.getDate() + 1);
    
    if (diff === 0) {
      setStartDate(dEnd.toISOString().split("T")[0]);
      setEndDate(dEnd.toISOString().split("T")[0]);
    } else {
      const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));
      dStart.setDate(dStart.getDate() + daysDiff + 1);
      dEnd.setDate(dEnd.getDate() + daysDiff);
      setStartDate(dStart.toISOString().split("T")[0]);
      setEndDate(dEnd.toISOString().split("T")[0]);
    }
  };

  const handleChangeStatus = async (staffId, date, status) => {
    try {
      await saveAttendanceApi({
        date,
        records: [{ staff: staffId, status }]
      }).unwrap();
      
      setEditingStaff(null);
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Filter staff locally based on search term for List View
  const listStaffData = useMemo(() => {
    if (!searchTerm) return serverStaff;
    const query = searchTerm.toLowerCase();
    return serverStaff.filter(item => 
      item.staff?.name?.toLowerCase().includes(query) || 
      item.staff?.employeeId?.toLowerCase().includes(query) ||
      item.staff?.phone?.includes(query)
    );
  }, [serverStaff, searchTerm]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, startDate, endDate, currentMonth, viewMode, resetPagination]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000);
      if (searchTerm) params.append("search", searchTerm);
      params.append("skipStats", "true");

      const res = await api.get(`/admin/staff?${params.toString()}`);
      if (res.data.success) {
        let exportData = [];
        res.data.data.forEach(s => {
          exportData.push({
            "Staff Name": s.name,
            Designation: s.designation || "Staff",
            Phone: s.phone || "N/A"
          });
        });
        return exportData;
      }
      return [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const [isExportingChart, setIsExportingChart] = useState(false);

  const handleChartExport = async () => {
    if (isExportingChart || staffChartData.length === 0) return;
    try {
      setIsExportingChart(true);
      toast.loading("Generating PDF...", { id: "export-chart" });

      const columns = [
        { header: "Staff Member", exportValue: (row) => row.staff.name },
        ...daysInMonth.map(date => {
          const d = new Date(date);
          const dayNum = String(d.getDate()).padStart(2, '0');
          return {
            header: dayNum,
            exportValue: (row) => {
              const status = row.attendance[date]?.status;
              if (status === "Present") return "P";
              if (status === "Half Day") return "HD";
              if (status === "Absent") return "A";
              
              // Check off day
              const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayName = dayNamesFull[d.getDay()];
              let isOffDay = false;
              if (row.staff.shifts && row.staff.shifts.length > 0) {
                const shift = row.staff.shifts.find(s => s.day === dayName);
                if (shift && !shift.active) isOffDay = true;
              } else if (dayName === 'Sunday') {
                isOffDay = true;
              }
              
              if (isOffDay) return "OFF";
              return "-";
            }
          };
        })
      ];

      await exportUtils.exportToPDF(
        staffChartData,
        columns,
        `staff-attendance-${currentMonth}.pdf`,
        {
          title: "Staff Attendance Chart",
          subtitle: `Monthly Attendance for ${new Date(currentMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          shopDetails: shopConfig,
          orientation: "l" // Landscape to fit the columns
        }
      );

      toast.success("Export successful", { id: "export-chart" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF", { id: "export-chart" });
    } finally {
      setIsExportingChart(false);
    }
  };

  // List View Summary Data
  const summaryData = useMemo(() => {
    const presentCount = serverStaff.filter(s => s.attendanceStatus === "Present").length;
    const halfDayCount = serverStaff.filter(s => s.attendanceStatus === "Half Day").length;
    const absentCount = serverStaff.filter(s => s.attendanceStatus === "Absent").length;

    return {
      total: serverStaff.length,
      segments: [
        {
          label: "Present",
          value: presentCount,
          color: "#10b981", // emerald
        },
        {
          label: "Half Day",
          value: halfDayCount,
          color: "#f59e0b", // amber
        },
        {
          label: "Absent",
          value: absentCount,
          color: "#f43f5e", // rose
        },
      ],
    };
  }, [serverStaff]);

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} - ${days[d.getDay()]}`;
  };

  const listColumns = [
    {
      header: "Staff Member",
      exportValue: (item) => `${item.staff.name} (${item.staff.designation || "Staff"})`,
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.staff.photo?.url ? (
            <img
              src={item.staff.photo.url}
              alt={item.staff.name}
              className="w-9 h-9 rounded-xl object-cover border border-blue-100/50 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100/50 flex-shrink-0">
              {item.staff.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {item.staff.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
              {item.staff.designation || "Staff"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Contact",
      exportValue: (item) =>
        `Email: ${item.staff.email || "N/A"} | Phone: ${item.staff.phone || "N/A"}`,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
            <Phone size={12} className="text-gray-400 dark:text-gray-500" />
            <span>{item.staff.phone || "N/A"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      exportValue: (item) => item.attendanceStatus,
      render: (item) => {
        let bgColor = "bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-400";
        let Icon = null;
        
        if (item.attendanceStatus === "Present") {
          bgColor = "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800";
          Icon = UserCheck;
        } else if (item.attendanceStatus === "Half Day") {
          bgColor = "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800";
          Icon = Clock;
        } else if (item.attendanceStatus === "Absent") {
          bgColor = "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-100 dark:border-rose-800";
          Icon = UserX;
        }

        return (
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide flex items-center w-fit gap-1.5 ${bgColor}`}
            >
              {Icon && <Icon size={12} />}
              {item.attendanceStatus}
            </span>
            {item.otHours > 0 && (
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                {item.otHours}hr OT
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // ==============================
  // Chart/Calendar View Logic
  // ==============================
  const daysInMonth = useMemo(() => {
    const dates = [];
    const [year, month] = currentMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }, [currentMonth]);

  const staffChartData = useMemo(() => {
    if (viewMode === "list") return [];
    
    // Create a map of all staff
    const map = {};
    
    // First, populate all staff
    allStaff.forEach(staff => {
      map[staff._id] = {
        staff,
        attendance: {},
      };
    });
    
    // Then populate the records fetched for this month
    serverStaff.forEach(record => {
      const staffId = record.staff._id;
      if (!map[staffId]) {
        map[staffId] = {
          staff: record.staff,
          attendance: {},
        };
      }
      map[staffId].attendance[record.date] = {
        status: record.attendanceStatus,
        otHours: record.otHours || 0
      };
    });
    
    // Filter by search query
    let result = Object.values(map);
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.staff.name?.toLowerCase().includes(query) || 
        item.staff.employeeId?.toLowerCase().includes(query)
      );
    }
    
    // Sort by name
    return result.sort((a, b) => (a.staff.name || "").localeCompare(b.staff.name || ""));
  }, [allStaff, serverStaff, viewMode, searchTerm]);

  const renderViewToggle = () => (
    <div className="relative z-30">
      <button
        onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
        className="w-full flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors outline-none"
      >
        {viewMode === "chart" && <><LayoutGrid size={14} className="text-brand-primary" /> Chart View</>}
        {viewMode === "list" && <><List size={14} className="text-brand-primary" /> List View</>}
        {viewMode === "calendar" && <><Calendar size={14} className="text-brand-primary" /> Calendar View</>}
        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isViewMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsViewMenuOpen(false)} />
          <div className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-lg z-50 py-1.5 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => { setViewMode("calendar"); setIsViewMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card text-xs font-bold transition-colors ${viewMode === "calendar" ? "text-brand-primary bg-brand-primary/5" : "text-gray-700 dark:text-gray-300"}`}>
              <Calendar size={16} className={viewMode === "calendar" ? "text-brand-primary" : "text-gray-400 dark:text-gray-500"} /> Calendar View
            </button>
            <button onClick={() => { setViewMode("chart"); setIsViewMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card text-xs font-bold transition-colors ${viewMode === "chart" ? "text-brand-primary bg-brand-primary/5" : "text-gray-700 dark:text-gray-300"}`}>
              <LayoutGrid size={16} className={viewMode === "chart" ? "text-brand-primary" : "text-gray-400 dark:text-gray-500"} /> Chart View
            </button>
            <button onClick={() => { setViewMode("list"); setIsViewMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card text-xs font-bold transition-colors ${viewMode === "list" ? "text-brand-primary bg-brand-primary/5" : "text-gray-700 dark:text-gray-300"}`}>
              <List size={16} className={viewMode === "list" ? "text-brand-primary" : "text-gray-400 dark:text-gray-500"} /> List View
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <ReportLayout
      title="Staff Attendance Report"
      subtitle={viewMode !== "list" ? `Monthly Attendance for ${new Date(currentMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })}` : (startDate === endDate ? `View attendance for ${startDate}` : `View attendance from ${startDate} to ${endDate}`)}
    >
      <ReportSummaryCard
        title="Attendance Summary"
        totalValue={summaryData.segments.find(s => s.label === "Present")?.value || 0}
        totalCount={summaryData.total}
        segments={summaryData.segments}
        loading={loading}
        totalLabel="Total Present"
        countLabel="Total Evaluations"
        isCurrency={false}
      />

      {viewMode === "calendar" ? (
        <div className="flex flex-col gap-6">
          {/* Header Controls for Calendar View */}
          <div className="p-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="w-full">
                {renderViewToggle()}
              </div>
              <div className="relative group w-full sm:w-auto">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-brand-primary" />
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm font-bold outline-none focus:border-brand-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          {/* Calendar Grid Cards */}
          {loading && staffChartData.length === 0 ? (
            <div className="p-12 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border">Loading calendar data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {staffChartData.map((row) => {
                const [year, month] = currentMonth.split("-").map(Number);
                const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
                const blanks = Array.from({ length: firstDayOfMonth });
                
                return (
                  <div key={row.staff._id} className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-5 flex flex-col gap-5 transition-all duration-300">
                    <div className="flex items-center gap-3 border-b border-gray-100 dark:border-dark-border pb-4">
                      {row.staff.photo?.url ? (
                        <img src={row.staff.photo.url} alt={row.staff.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-dark-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 flex items-center justify-center font-black text-sm shrink-0">
                          {row.staff.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-black text-gray-900 dark:text-white truncate">{row.staff.name}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider truncate">{row.staff.designation || "Staff"}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1.5">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-[9px] font-black text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest mb-1">{day}</div>
                      ))}
                      
                      {blanks.map((_, i) => (
                        <div key={`blank-${i}`} className="w-full aspect-square" />
                      ))}
                      
                      {daysInMonth.map(date => {
                        const attendanceRecord = row.attendance[date] || {};
                        const status = attendanceRecord.status;
                        const otHours = attendanceRecord.otHours || 0;
                        const d = new Date(date);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isToday = date === today;
                        const dayNum = d.getDate();
                        const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const dayName = dayNamesFull[d.getDay()];
                        
                        let isOffDay = false;
                        if (row.staff.shifts && row.staff.shifts.length > 0) {
                          const shift = row.staff.shifts.find(s => s.day === dayName);
                          if (shift && !shift.active) {
                            isOffDay = true;
                          }
                        } else {
                          if (dayName === 'Sunday') {
                            isOffDay = true;
                          }
                        }
                        
                        let cellClass = "w-full aspect-square rounded-lg flex flex-col items-center justify-center relative transition-transform border outline-none focus:outline-none ";
                        
                        if (isOffDay) {
                          cellClass += "bg-gray-100 border-gray-200 dark:bg-dark-bg dark:border-dark-border text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-80 ";
                        } else if (status === "Present") {
                          cellClass += "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 ";
                        } else if (status === "Half Day") {
                          cellClass += "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 ";
                        } else if (status === "Absent") {
                          cellClass += "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 text-rose-700 dark:text-rose-400 ";
                        } else {
                          cellClass += "bg-white border-dashed border-gray-200 dark:bg-dark-surface dark:border-dark-border text-gray-600 dark:text-gray-300 ";
                          if (isWeekend) cellClass += " bg-gray-50/50 dark:bg-dark-card text-gray-400 dark:text-gray-500 border-solid border-gray-100 dark:border-dark-border";
                        }
                        
                        if (isToday) cellClass += " ring-2 ring-brand-primary ring-offset-1 dark:ring-offset-dark-surface";
                        
                        return (
                          <div
                            key={date}
                            className={cellClass}
                            title={isOffDay ? "Shift Off Day" : `${row.staff.name} - ${date} (${status || "Not Marked"}${otHours > 0 ? `, ${otHours}hr OT` : ''})`}
                          >
                            <span className="text-xs font-black">{dayNum}</span>
                            {otHours > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-black text-white shadow-sm ring-1 ring-white dark:ring-dark-surface">
                                {otHours}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {staffChartData.length === 0 && !loading && (
                 <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                   No staff data found.
                 </div>
              )}
            </div>
          )}
          
          {/* Legend for Calendar View */}
          <div className="p-4 bg-white border border-gray-200 dark:border-dark-border dark:bg-dark-surface rounded-xl flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-emerald-50 border border-emerald-200" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-amber-50 border border-amber-200" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-rose-50 border border-rose-200" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Off Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md border border-dashed border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Not Marked</span>
            </div>
          </div>
        </div>
      ) : viewMode === "chart" ? (
        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl flex flex-col">
          {/* Header Controls */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="w-full">
                {renderViewToggle()}
              </div>
              <div className="relative group w-full sm:w-auto">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-brand-primary" />
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm font-bold outline-none focus:border-brand-primary cursor-pointer"
                />
              </div>
              <button
                onClick={handleChartExport}
                disabled={isExportingChart || staffChartData.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
          
          {/* Chart Table / Grid */}
          <div className="overflow-x-auto">
            {loading && staffChartData.length === 0 ? (
              <div className="p-12 flex items-center justify-center text-gray-500 dark:text-gray-400">Loading chart data...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 dark:bg-dark-card px-2 md:px-4 py-3 border-b border-r border-gray-200 dark:border-dark-border text-xs font-bold text-gray-500 dark:text-gray-400 min-w-[130px] md:min-w-[220px]">
                      Staff Member
                    </th>
                    {daysInMonth.map(date => {
                      const d = new Date(date);
                      const dayNum = d.getDate();
                      const dayName = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = date === today;
                      return (
                        <th key={date} className={`px-1.5 py-2 border-b border-gray-200 dark:border-dark-border text-center min-w-[44px] ${isWeekend ? "bg-gray-50 dark:bg-dark-card" : "bg-white dark:bg-dark-surface"}`}>
                          <div className={`flex flex-col items-center justify-center rounded-lg p-1 ${isToday ? "bg-brand-primary/10 text-brand-primary" : ""}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? "text-brand-primary" : "text-gray-400 dark:text-gray-500"}`}>{dayName}</span>
                            <span className={`text-sm font-black ${isToday ? "text-brand-primary" : (isWeekend ? "text-gray-400" : "text-gray-700 dark:text-gray-300")}`}>{dayNum}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {staffChartData.map((row) => (
                    <tr key={row.staff._id} className="group">
                      <td className="sticky left-0 z-10 bg-white dark:bg-dark-surface group-hover:bg-gray-50 dark:hover:bg-dark-card dark:group-hover:bg-dark-card px-2 md:px-4 py-3 border-b border-r border-gray-200 dark:border-dark-border transition-colors">
                        <div className="flex items-center gap-2 md:gap-3">
                          {row.staff.photo?.url ? (
                            <img
                              src={row.staff.photo.url}
                              alt={row.staff.name}
                              className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg object-cover border border-gray-200 dark:border-dark-border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0">
                              {row.staff.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-white truncate">{row.staff.name}</span>
                            <span className="hidden md:block text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider truncate">{row.staff.designation || "Staff"}</span>
                          </div>
                        </div>
                      </td>
                      {daysInMonth.map(date => {
                        const attendanceRecord = row.attendance[date] || {};
                        const status = attendanceRecord.status;
                        const otHours = attendanceRecord.otHours || 0;
                        const d = new Date(date);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const dayName = dayNamesFull[d.getDay()];
                        
                        let isOffDay = false;
                        if (row.staff.shifts && row.staff.shifts.length > 0) {
                          const shift = row.staff.shifts.find(s => s.day === dayName);
                          if (shift && !shift.active) {
                            isOffDay = true;
                          }
                        } else {
                          if (dayName === 'Sunday') {
                            isOffDay = true;
                          }
                        }
                        
                        let innerClass = "w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black tracking-tighter mx-auto transition-transform ";
                        let text = "";
                        
                        if (isOffDay) {
                          innerClass += "bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60 ";
                          text = "OFF";
                        } else if (status === "Present") {
                          innerClass += "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 ";
                          text = "P";
                        } else if (status === "Half Day") {
                          innerClass += "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 ";
                          text = "HD";
                        } else if (status === "Absent") {
                          innerClass += "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800 ";
                          text = "A";
                        } else {
                          innerClass += "border border-dashed border-gray-200 dark:border-dark-border text-gray-300 dark:text-gray-600 ";
                          text = "-";
                        }
                        
                        return (
                          <td key={date} className={`px-1 py-1.5 border-b border-gray-200 dark:border-dark-border align-middle ${isWeekend ? "bg-gray-50 dark:bg-dark-card" : ""}`}>
                            <div
                              className="w-full text-center"
                              title={isOffDay ? "Shift Off Day" : `${row.staff.name} - ${date} (${status || "Not Marked"}${otHours > 0 ? `, ${otHours}hr OT` : ''})`}
                            >
                              <div className={`${innerClass} relative`}>
                                {text}
                                {otHours > 0 && (
                                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-500 text-[6px] font-black text-white shadow-sm">
                                    {otHours}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {staffChartData.length === 0 && !loading && (
                     <tr>
                       <td colSpan={daysInMonth.length + 1} className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                         No staff data found.
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Legend */}
          <div className="p-3 md:p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center text-[8px] font-black text-emerald-700">P</div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200 flex items-center justify-center text-[8px] font-black text-amber-700">HD</div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-100 border border-rose-200 flex items-center justify-center text-[8px] font-black text-rose-700">A</div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-200 dark:bg-dark-border border border-gray-300 dark:border-dark-border flex items-center justify-center text-[6px] font-black text-gray-500 dark:text-gray-400">OFF</div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Off Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-dashed border-gray-200 dark:border-dark-border flex items-center justify-center text-[8px] font-black text-gray-300">-</div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Not Marked</span>
            </div>
          </div>
        </div>
      ) : (
        <CustomTable
          columns={listColumns}
          data={listStaffData}
          loading={loading}
          searchPlaceholder="Search staff name..."
          onExport={hasPermission('reports:staff:staff_attendance_report:export') ? handleExport : undefined}
          isRefreshing={loading}
          emptyMessage="No attendance records found for the selected date(s)."
          renderRowHeader={(item, prevItem) => {
            if (!prevItem || item.date !== prevItem.date) {
              return (
                <div className="flex items-center gap-2 text-brand-primary dark:text-blue-400 font-black text-sm uppercase tracking-wide">
                  {formatDateLabel(item.date)}
                </div>
              );
            }
            return null;
          }}
          headerActions={
            <div className="flex items-center gap-1">
              <button 
                onClick={handlePrevDay}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card transition-all active:scale-95"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleNextDay}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card transition-all active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          }
          tabs={[
            { id: "all", label: "All", count: listStaffData.length },
            {
              id: "Present",
              label: "Present",
              count: summaryData.segments.find((s) => s.label === "Present")?.value || 0,
            },
            {
              id: "Half Day",
              label: "Half Day",
              count: summaryData.segments.find((s) => s.label === "Half Day")?.value || 0,
            },
            {
              id: "Absent",
              label: "Absent",
              count: summaryData.segments.find((s) => s.label === "Absent")?.value || 0,
            },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          extraFilters={renderViewToggle()}
          
          pagination={{
            ...pagination,
            onPageChange,
          }}
        />
      )}

      {/* Global Menupopup for Managing Status using Portal */}
      {editingStaff && createPortal(
        <>
          {/* Invisible backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setEditingStaff(null)}
          />
          <div 
            className="fixed z-50 w-36 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-200 dark:border-dark-border overflow-hidden animate-in fade-in duration-200"
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
            <div className="h-px bg-gray-100 dark:bg-dark-border" />
            <button 
              onClick={() => { handleChangeStatus(editingStaff.item.staff._id, editingStaff.item.date, "Half Day"); setEditingStaff(null); }}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-2"
            >
              <Clock size={14} />
              Half Day
            </button>
            <div className="h-px bg-gray-100 dark:bg-dark-border" />
            <button 
              onClick={() => { handleChangeStatus(editingStaff.item.staff._id, editingStaff.item.date, "Absent"); setEditingStaff(null); }}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-2"
            >
              <UserX size={14} />
              Absent
            </button>
          </div>
        </>,
        document.body
      )}
    </ReportLayout>
  );
};

export default StaffAttendanceReportPage;
