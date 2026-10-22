import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import moment from "moment";
import { Calendar as CalendarIcon, Save, Search, UserCheck, Clock, UserX, User, Hash, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useGetAdminStaffQuery, useGetAttendanceQuery, useSaveAttendanceMutation } from "../../../store/api/tenantCrudEndpoints";
import Snackbar from "../../../components/shared/Snackbar";
import CustomDropdown from "../../../components/shared/CustomDropdown";

const AttendanceSkeleton = () => (
  <div className="flex flex-col space-y-4">
    {/* Global Controls Skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 pb-2">
      <div className="h-4 w-24 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
      <div className="h-8 w-full sm:w-[320px] bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse" />
    </div>

    {/* Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div 
          key={i} 
          className="p-4 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl flex flex-col gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-dark-border animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-1.5 mt-auto">
            <div className="h-9 flex-1 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse" />
            <div className="h-9 flex-1 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse" />
            <div className="h-9 flex-1 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AttendanceManager = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [selectedDate, setSelectedDate] = useState(location.state?.date || moment().format("YYYY-MM-DD"));
  const [searchQuery, setSearchQuery] = useState("");
  
  const [attendanceData, setAttendanceData] = useState({});
  const [snack, setSnack] = useState({ message: "", type: "success" });

  // Fetch staff for the current branch/shop
  const { data: staffList = [], isLoading: loadingStaff } = useGetAdminStaffQuery();
  
  // Fetch attendance for the selected date
  const { data: serverAttendance, isLoading: loadingAttendance } = useGetAttendanceQuery({ date: selectedDate });
  
  const [saveAttendanceApi, { isLoading: isSaving }] = useSaveAttendanceMutation();

  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [otPopup, setOtPopup] = useState(null);
  const [pressTimer, setPressTimer] = useState(null);

  const startPress = (staffId, otHours) => {
    const timer = setTimeout(() => {
      setOtPopup({ staffId, hours: otHours.toString() });
    }, 600);
    setPressTimer(timer);
  };

  const endPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  // Sync server data to local state whenever the date changes or new data arrives
  useEffect(() => {
    if (serverAttendance && serverAttendance.staffRecords) {
      const newAttendance = {};
      serverAttendance.staffRecords.forEach(record => {
        if (!record.staff || !record.staff._id) return;
        newAttendance[`${selectedDate}_${record.staff._id}`] = {
          status: record.status,
          otHours: record.otHours || 0
        };
      });
      setAttendanceData(newAttendance);
    } else {
      // If no server attendance, reset to empty
      setAttendanceData({});
    }
  }, [serverAttendance, selectedDate]);

  // Get the day name for the selected date
  const getDayName = (dateString) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateString);
    return days[d.getDay()];
  };

  const selectedDayName = getDayName(selectedDate);

  // Filter staff based on shifts and search query
  const displayStaff = staffList.filter(staff => {
    // 1. Filter by shift (hide if inactive on the selected day)
    let isDayActive = true;
    
    if (staff.shifts && staff.shifts.length > 0) {
      const shiftForDay = staff.shifts.find(s => s.day === selectedDayName);
      if (shiftForDay && !shiftForDay.active) {
        isDayActive = false;
      }
    } else {
      // If shifts are not defined for a staff, use the system default: Sunday is off
      if (selectedDayName === 'Sunday') {
        isDayActive = false;
      }
    }

    if (!isDayActive) return false;

    // 2. Filter by search query (selected staff ID)
    if (searchQuery) {
      return staff._id === searchQuery;
    }

    return true;
  });

  const handleStatusChange = (staffId, status) => {
    const recordKey = `${selectedDate}_${staffId}`;
    const newAttendance = { ...attendanceData };
    
    const current = newAttendance[recordKey] || {};
    newAttendance[recordKey] = {
      status,
      otHours: current.otHours || 0
    };
    
    setAttendanceData(newAttendance);
  };

  const handleGlobalStatusChange = (status) => {
    if (displayStaff.length === 0) return;
    
    setAttendanceData(prev => {
      const newAttendance = { ...prev };
      displayStaff.forEach(staff => {
        const recordKey = `${selectedDate}_${staff._id}`;
        const current = newAttendance[recordKey] || {};
        newAttendance[recordKey] = {
          status,
          otHours: current.otHours || 0
        };
      });
      return newAttendance;
    });
  };

  const handleOtChange = (staffId, hours) => {
    const recordKey = `${selectedDate}_${staffId}`;
    const newAttendance = { ...attendanceData };
    
    const current = newAttendance[recordKey] || {};
    newAttendance[recordKey] = {
      status: current.status || "Present",
      otHours: Number(hours) || 0
    };
    
    setAttendanceData(newAttendance);
    setOtPopup(null);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleSave = async () => {
    if (displayStaff.length === 0) {
      showSnack("No active staff to save attendance for.", "error");
      return;
    }

    try {
      // Format data for the backend payload
      const records = [];
      displayStaff.forEach(staff => {
        const recordKey = `${selectedDate}_${staff._id}`;
        const data = attendanceData[recordKey] || { status: "Present", otHours: 0 };
        records.push({
          staff: staff._id,
          status: data.status,
          otHours: data.otHours || 0
        });
      });

      if (records.length === 0) {
        showSnack("Please mark attendance for at least one staff member.", "error");
        return;
      }

      await saveAttendanceApi({ date: selectedDate, records }).unwrap();
      showSnack("Attendance saved successfully!");
    } catch (err) {
      console.error("Failed to save attendance", err);
      showSnack("Failed to save attendance. Please try again.", "error");
    }
  };

  const getStatusColor = (status, isSelected) => {
    if (!isSelected) return "bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover border-transparent";
    
    switch (status) {
      case "Present":
        return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "Half Day":
        return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "Absent":
        return "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800";
      default:
        return "bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 border-transparent";
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden">
      {snack.message && (
        <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ message: "", type: "success" })} />
      )}

      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-100 dark:border-dark-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 bg-white dark:bg-dark-bg z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Staff Attendance
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Mark attendance for {selectedDayName}. Staff off on this day are hidden.
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-3 w-full sm:w-auto flex-wrap lg:flex-nowrap">
          <div className="flex-1 min-w-[120px] sm:w-auto sm:max-w-[200px] shrink-0">
            <CustomDropdown
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              options={[
                { value: "", label: "All Staff" },
                ...staffList.map((s) => ({ value: s._id, label: s.name }))
              ]}
              buttonClassName="w-full h-10 flex items-center justify-between bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white px-2 sm:px-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all truncate"
            />
          </div>

          <div className="flex items-center gap-0.5 shrink-0 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl h-10">
            <button onClick={handlePrevDay} className="h-full px-1.5 sm:px-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors rounded-l-xl flex items-center justify-center">
              <ChevronLeft size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
            <div className="relative group flex items-center h-full">
              <CalendarIcon size={14} className="absolute left-2 text-gray-400 dark:text-gray-500 hidden sm:block" />
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-[100px] sm:w-auto sm:pl-8 pr-1 sm:pr-3 h-full bg-transparent text-xs sm:text-sm outline-none cursor-pointer font-medium transition-all text-center sm:text-left"
              />
            </div>
            <button onClick={handleNextDay} className="h-full px-1.5 sm:px-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors rounded-r-xl flex items-center justify-center">
              <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || loadingStaff || loadingAttendance}
            className="shrink-0 w-10 h-10 p-0 sm:w-auto sm:px-6 bg-brand-primary hover:bg-brand-secondary text-white text-sm font-semibold rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
            title="Save Attendance"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="hidden sm:inline ml-2">{isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-dark-bg">
        {loadingStaff || loadingAttendance ? (
          <AttendanceSkeleton />
        ) : displayStaff.length === 0 ? (
          <div className="text-center p-12 text-gray-500 dark:text-gray-400">
            <UserCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="font-bold text-gray-900 dark:text-white mb-1">No staff found</p>
            <p className="text-sm">Either no staff matches your search or all staff have a shift off on this day.</p>
          </div>
        ) : (() => {
          const allPresent = displayStaff.length > 0 && displayStaff.every(staff => (attendanceData[`${selectedDate}_${staff._id}`]?.status || "Present") === "Present");
          const allHalfDay = displayStaff.length > 0 && displayStaff.every(staff => attendanceData[`${selectedDate}_${staff._id}`]?.status === "Half Day");
          const allAbsent = displayStaff.length > 0 && displayStaff.every(staff => attendanceData[`${selectedDate}_${staff._id}`]?.status === "Absent");

          return (
            <div className="flex flex-col space-y-4">
              {/* Global Controls Header */}


              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayStaff.map(staff => {
                const recordKey = `${selectedDate}_${staff._id}`;
                const currentStatus = attendanceData[recordKey]?.status || "Present";
                const currentOtHours = attendanceData[recordKey]?.otHours || 0;

                return (
                  <div 
                    key={staff._id}
                    onPointerDown={() => startPress(staff._id, currentOtHours)}
                    onPointerUp={endPress}
                    onPointerLeave={endPress}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setOtPopup({ staffId: staff._id, hours: currentOtHours.toString() });
                    }}
                    className="relative overflow-hidden p-3 sm:p-4 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl flex flex-col gap-3 sm:gap-4 select-none cursor-pointer"
                  >
                    {!attendanceData[recordKey] && (
                      <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-bl-xl border-l border-b border-amber-200/50 dark:border-amber-800/50">
                        Not Marked
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border overflow-hidden shrink-0 mt-1">
                        {staff.photo?.url ? (
                          <img src={staff.photo.url} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-lg bg-gray-50 dark:bg-dark-bg">
                            {staff.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1 sm:pt-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate leading-tight">
                            {staff.name}
                          </h4>
                          {currentOtHours > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 shrink-0">
                              {currentOtHours}hr OT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                            {staff.designation || 'Staff'}
                          </span>
                          {staff.employeeId && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center">
                                <Hash size={10} className="mr-0.5" />
                                {staff.employeeId}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 w-full mt-auto">
                      <button
                        onClick={() => handleStatusChange(staff._id, "Present")}
                        className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 sm:py-2 px-1 text-sm sm:text-[11px] font-bold rounded-lg border transition-colors ${getStatusColor("Present", currentStatus === "Present")}`}
                      >
                        <span className="sm:hidden">P</span>
                        <UserCheck size={14} className="hidden sm:block" />
                        <span className="hidden sm:inline">Present</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(staff._id, "Half Day")}
                        className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 sm:py-2 px-1 text-sm sm:text-[11px] font-bold rounded-lg border transition-colors ${getStatusColor("Half Day", currentStatus === "Half Day")}`}
                      >
                        <span className="sm:hidden">H</span>
                        <Clock size={14} className="hidden sm:block" />
                        <span className="hidden sm:inline">Half Day</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(staff._id, "Absent")}
                        className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 sm:py-2 px-1 text-sm sm:text-[11px] font-bold rounded-lg border transition-colors ${getStatusColor("Absent", currentStatus === "Absent")}`}
                      >
                        <span className="sm:hidden">A</span>
                        <UserX size={14} className="hidden sm:block" />
                        <span className="hidden sm:inline">Absent</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* OT Popup Modal */}
      {otPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-brand-primary" />
                Add Overtime
              </h3>
              <button
                onClick={() => setOtPopup(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter total overtime hours for this day. Set to 0 to remove.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  OT Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={otPopup.hours}
                  onChange={(e) => setOtPopup({ ...otPopup, hours: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all dark:text-white outline-none"
                  placeholder="e.g. 2"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-dark-border flex justify-end gap-2 bg-gray-50 dark:bg-dark-bg">
              <button
                onClick={() => setOtPopup(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleOtChange(otPopup.staffId, otPopup.hours)}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-secondary rounded-lg transition-colors"
              >
                Save OT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
