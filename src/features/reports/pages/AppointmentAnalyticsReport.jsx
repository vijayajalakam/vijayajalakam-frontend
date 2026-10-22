import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  UserX,
  Clock,
  Filter,
  BarChart2,
  Users,
  PieChart,
} from "lucide-react";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import toast from "react-hot-toast";
import DateRangePicker from "../../../components/shared/DateRangePicker";
import CustomDropdown from "../../../components/shared/CustomDropdown";

const AppointmentAnalyticsReport = () => {
  const { portalRole, shopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShowCustomers: 0,
    peakBookingHours: [],
    peakBookingDays: [],
  });

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    branchId: "",
    staffId: "",
  });
  
  const [branches, setBranches] = useState([]);
  const [staffs, setStaffs] = useState([]);

  useEffect(() => {
    fetchBranches();
    fetchStaffs();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchStaffs = async () => {
    try {
      const res = await api.get("/admin/staff");
      if (res.data.success) {
        setStaffs(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching staffs:", error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = "/appointments/analytics/report?";
      if (filters.startDate) url += `startDate=${filters.startDate}&`;
      if (filters.endDate) url += `endDate=${filters.endDate}&`;
      if (filters.branchId) url += `branchId=${filters.branchId}&`;
      if (filters.staffId) url += `staffId=${filters.staffId}&`;

      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      branchId: "",
      staffId: "",
    });
  };

  // UI Components
  const StatCard = ({ title, value, icon: Icon, colorClass, bgColorClass }) => (
    <div className={`p-5 rounded-2xl border border-gray-100 dark:border-dark-border ${bgColorClass} transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-800`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorClass} bg-white/60 dark:bg-dark-surface/60 backdrop-blur-sm border border-white/20 dark:border-white/5`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          {value || 0}
        </p>
        <h3 className="text-gray-500 dark:text-gray-400 text-[13px] font-bold mt-1 uppercase tracking-wider">
          {title}
        </h3>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-dark-bg relative min-h-[calc(100vh-150px)] md:h-[calc(100vh-150px)] border border-gray-100 dark:border-dark-border rounded-2xl overflow-hidden m-4 md:m-6">
      {/* Header Section */}
      <div className="p-4 md:p-6 border-b border-gray-100 dark:border-dark-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 bg-white dark:bg-dark-bg z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart size={24} className="text-brand-primary dark:text-blue-400" />
            Appointment Analytics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Comprehensive overview of your booking performance
          </p>
        </div>
        
        {/* Filters on Right Side */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onStartDateChange={(val) => setFilters(prev => ({ ...prev, startDate: val }))}
            onEndDateChange={(val) => setFilters(prev => ({ ...prev, endDate: val }))}
          />

          {branches.length > 0 && (
            <div className="w-[160px]">
              <CustomDropdown
                value={filters.branchId}
                onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
                options={[{ value: "", label: "All Branches" }, ...branches.map(b => ({ value: b._id, label: b.name }))]}
                placeholder="All Branches"
                variant="compact"
                icon={Filter}
              />
            </div>
          )}

          {staffs.length > 0 && (
            <div className="w-[160px]">
              <CustomDropdown
                value={filters.staffId}
                onChange={(e) => setFilters(prev => ({ ...prev, staffId: e.target.value }))}
                options={[{ value: "", label: "All Staff" }, ...staffs.map(s => ({ value: s._id, label: s.name }))]}
                placeholder="All Staff"
                variant="compact"
                icon={Users}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary"></div>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatCard
                title="Total Appointments"
                value={data.totalAppointments}
                icon={CalendarDays}
                colorClass="text-blue-600 dark:text-blue-400"
                bgColorClass="bg-white dark:bg-dark-card"
              />
              <StatCard
                title="Completed"
                value={data.completedAppointments}
                icon={CheckCircle}
                colorClass="text-green-600 dark:text-green-400"
                bgColorClass="bg-white dark:bg-dark-card"
              />
              <StatCard
                title="Cancelled"
                value={data.cancelledAppointments}
                icon={XCircle}
                colorClass="text-red-600 dark:text-red-400"
                bgColorClass="bg-white dark:bg-dark-card"
              />
              <StatCard
                title="No-Shows"
                value={data.noShowCustomers}
                icon={UserX}
                colorClass="text-orange-600 dark:text-orange-400"
                bgColorClass="bg-white dark:bg-dark-card"
              />
            </div>

            {/* Detailed Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Peak Booking Hours */}
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 transition-colors hover:border-gray-200 dark:hover:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="text-indigo-500" size={20} />
                      Peak Booking Hours
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Most popular time slots</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {data.peakBookingHours && data.peakBookingHours.length > 0 ? (
                    data.peakBookingHours.slice(0, 5).map((item, index) => {
                      const maxCount = data.peakBookingHours[0].count;
                      const percentage = Math.round((item.count / maxCount) * 100);
                      return (
                        <div key={index} className="flex items-center gap-4 group">
                          <div className="w-20 text-sm font-bold text-gray-700 dark:text-gray-300">
                            {item.hour}
                          </div>
                          <div className="flex-1 bg-gray-100 dark:bg-dark-surface rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-1000 group-hover:bg-indigo-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-12 text-right text-sm font-black text-gray-900 dark:text-white">
                            {item.count}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500 font-medium">No data available</div>
                  )}
                </div>
              </div>

              {/* Peak Booking Days */}
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 transition-colors hover:border-gray-200 dark:hover:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <CalendarDays className="text-teal-500" size={20} />
                      Peak Booking Days
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Most active days of the week</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {data.peakBookingDays && data.peakBookingDays.length > 0 ? (
                    data.peakBookingDays.slice(0, 7).map((item, index) => {
                      const maxCount = data.peakBookingDays[0].count;
                      const percentage = Math.round((item.count / maxCount) * 100);
                      return (
                        <div key={index} className="flex items-center gap-4 group">
                          <div className="w-24 text-sm font-bold text-gray-700 dark:text-gray-300">
                            {item.day}
                          </div>
                          <div className="flex-1 bg-gray-100 dark:bg-dark-surface rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-teal-500 h-full rounded-full transition-all duration-1000 group-hover:bg-teal-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-12 text-right text-sm font-black text-gray-900 dark:text-white">
                            {item.count}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500 font-medium">No data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentAnalyticsReport;
