import { useEffect, useState, useCallback, useMemo } from "react";
import {
  useGetAdminDashboardQuery,
  useGetAppointmentsQuery,
  useGetInvoicesQuery,
} from "../../../store/api/tenantEndpoints";
import { useGetStaffAttendanceQuery, useGetAdminProfileQuery } from "../../../store/api/tenantCrudEndpoints";
import { useGetCurrentSessionQuery } from "../../../store/api/counterSessionEndpoints";
import {
  StatsSkeleton,
  ChartSkeleton,
  TimelineSkeleton,
} from "../../../components/shared/Skeleton";
import StatsGrid from "../../../components/shared/StatsGrid";
import {
  Users,
  Calendar,
  TrendingUp,
  Scissors,
  Clock,
  CheckCircle2,
  Play,
  Timer,
  Briefcase,
  Wallet,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  BarChart2,
  Activity,
  Store,
  RefreshCcw,
  MessageCircle,
  Loader2,
  XCircle,
  AlertCircle,
  Box,
  CreditCard,
  Lightbulb,
  HeartPulse,
  Sparkles,
  Trophy,
} from "lucide-react";
import { motion as Motion } from "framer-motion";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import DayCloseWidget from "../../settings/components/DayCloseWidget";
import { useTheme } from "../../../components/shared/ThemeContext";
import moment from "moment";
import { io } from "socket.io-client";
import api, { getSocketURL } from "../../../api/axiosInstance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { useGetIntegrationStatusQuery } from "../../../store/api/integrationEndpoints";
import CommissionSummaryWidget from "../../../components/dashboard/CommissionSummaryWidget";
import DashboardSection from "../../../components/dashboard/DashboardSection";
import InsightCard from "../../../components/dashboard/InsightCard";
import PerformanceList from "../../../components/dashboard/PerformanceList";

const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

const Dashboard = () => {
  const { user, currencySymbol } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isAdmin = user?.role === "shop-admin" || user?.role === "super-admin" || user?.role === "SHOP_ADMIN" || user?.role === "SUPER_ADMIN";
  const isStaff = user?.role === "staff" || user?.role === "STAFF";

  // WhatsApp connection state
  const [whatsappStatus, setWhatsappStatus] = useState({
    isConnected: false,
    phoneNumber: null,
    loading: true,
  });
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Day Closing counter session
  const { data: adminProfileData } = useGetAdminProfileQuery();
  const isDayClosingEnabled = adminProfileData?.salon?.isDayClosingEnabled || false;
  const { data: sessionRes } = useGetCurrentSessionQuery(undefined, {
    skip: !isDayClosingEnabled,
    pollingInterval: 60000,
  });
  const isCounterOpen = sessionRes?.status === "open";
  const counterOpenedAt = sessionRes?.data?.session?.openedAt;

  // Live elapsed timer
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!isCounterOpen || !counterOpenedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isCounterOpen, counterOpenedAt]);

  const elapsed = useMemo(() => {
    if (!isCounterOpen || !counterOpenedAt) return "";
    const diff = Math.max(0, now - new Date(counterOpenedAt).getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [isCounterOpen, counterOpenedAt, now]);

  const {
    data: adminDash,
    isSuccess: adminDashOk,
    isLoading: adminDashLoading,
    isError: adminDashErr,
  } = useGetAdminDashboardQuery(undefined, { skip: !isAdmin });

  const skipAppointments = isAdmin && (adminDashLoading || adminDashOk);

  const { data: appointmentsList, isLoading: appointmentsLoading } =
    useGetAppointmentsQuery(undefined, { skip: skipAppointments });

  const skipStaffInvoices = !isStaff || (isAdmin && adminDashOk);

  const { data: invoicesPayload, isLoading: invoicesLoading } =
    useGetInvoicesQuery(undefined, { skip: skipStaffInvoices });

  const { data: staffAttendanceRes, isLoading: staffAttendanceLoading } = 
    useGetStaffAttendanceQuery({ date: moment().format("YYYY-MM-DD") }, { skip: !isStaff });

  //eslint-disable-next-line
  const { data: integrationStatusRes, isLoading: integrationStatusLoading } =
    useGetIntegrationStatusQuery();

  const staffInvoiceList = useMemo(() => {
    if (!invoicesPayload?.success) return [];
    const d = invoicesPayload.data;
    return Array.isArray(d) ? d : [];
  }, [invoicesPayload]);

  const loading = useMemo(() => {
    if (isAdmin && adminDashLoading) return true;
    const fallback = !isAdmin || (isAdmin && adminDashErr);
    if (!fallback) return false;
    return (
      appointmentsLoading || 
      (isStaff && !skipStaffInvoices && invoicesLoading) ||
      (isStaff && staffAttendanceLoading)
    );
  }, [
    isAdmin,
    adminDashLoading,
    adminDashErr,
    appointmentsLoading,
    isStaff,
    skipStaffInvoices,
    invoicesLoading,
    staffAttendanceLoading,
  ]);

  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalUsers: 0,
    totalStaff: 0,
    totalRevenue: 0,
    profitToday: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsTotal: 0,
    lowStockCount: 0,
    noShowsCount: 0,
    outstandingReceivables: 0,
    retentionRate: 0,
  });

  // Detailed data for charts and lists
  const [serviceData, setServiceData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [paymentMethodBreakdown, setPaymentMethodBreakdown] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Fetch WhatsApp status on mount and poll periodically
  useEffect(() => {
    let cancelled = false;
    let pollInterval = null;

    const fetchWhatsAppStatus = async () => {
      try {
        const response = await api.get("/whatsapp/status");
        if (cancelled) return;
        if (response.data.success) {
          setWhatsappStatus({
            isConnected: response.data.data.isConnected,
            phoneNumber: response.data.data.phoneNumber,
            loading: false,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching WhatsApp status:", error);
        setWhatsappStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    // Initial fetch
    fetchWhatsAppStatus();

    // Poll every 10 seconds to keep status updated
    pollInterval = setInterval(() => {
      fetchWhatsAppStatus();
    }, 10000);

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Setup socket connection for real-time WhatsApp status updates
  useEffect(() => {
    const socketUrl = getSocketURL();
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      if (user?.shopId) {
        socket.emit("join-shop", user.shopId);
      }
    });

    socket.on("whatsapp-status", (data) => {
      if (data.status === "connected") {
        setWhatsappStatus({
          isConnected: true,
          phoneNumber: data.phoneNumber,
          loading: false,
        });
        setIsReconnecting(false);
      } else if (data.status === "disconnected") {
        setWhatsappStatus({
          isConnected: false,
          phoneNumber: null,
          loading: false,
        });
        setIsReconnecting(false);
      } else if (
        data.status === "retrying" ||
        data.status === "authenticating"
      ) {
        setWhatsappStatus((prev) => ({ ...prev, loading: true }));
      }
    });

    return () => {
      if (user?.shopId) {
        socket.emit("leave-shop", user.shopId);
      }
      socket.close();
    };
  }, [user?.shopId]);

  // Handle WhatsApp reconnection
  const handleWhatsAppReconnect = async () => {
    setIsReconnecting(true);
    try {
      const response = await api.post("/whatsapp/initialize");
      if (response.data.success) {
        // Status will be updated via socket
        console.log("WhatsApp reconnection initiated");
      }
    } catch (error) {
      console.error("Error reconnecting WhatsApp:", error);
      setIsReconnecting(false);
      alert(error.response?.data?.message || "Failed to reconnect WhatsApp");
    }
  };

  const processChartData = useCallback(
    (appointments, staffInvoices = []) => {
      let mySales = 0;
      let myCommission = 0;

      if (isStaff && staffInvoices.length > 0) {
        const todayStr = moment().format("YYYY-MM-DD");
        const todaysInvoices = staffInvoices.filter(inv => 
          moment(inv.date || inv.createdAt).format("YYYY-MM-DD") === todayStr
        );
        mySales = todaysInvoices.reduce(
          (sum, inv) => sum + (inv.amount || 0),
          0,
        );
        myCommission = todaysInvoices.reduce(
          (sum, inv) => sum + (inv.commissionAmount || 0),
          0,
        );
      }

      const filteredApps = isAdmin
        ? appointments
        : appointments.filter((a) => {
            const invoiceStaffId = a.invoice?.staff?._id || a.invoice?.staff;
            const appointmentStaffId = a.staff?._id || a.staff;
            return (
              String(invoiceStaffId) === String(user._id) ||
              String(appointmentStaffId) === String(user._id)
            );
          });

      const serviceMap = {};
      filteredApps.forEach((app) => {
        if (app.services) {
          app.services.forEach((s) => {
            serviceMap[s.name] = (serviceMap[s.name] || 0) + 1;
          });
        }
      });
      const pieData = Object.keys(serviceMap)
        .map((name) => ({
          name,
          value: serviceMap[name],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      setServiceData(pieData);

      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = moment().subtract(i, "months");
        chartData.push({
          name: d.format("MMM"),
          key: d.format("YYYY-MM"),
          appointments: 0,
          revenue: 0,
        });
      }

      filteredApps.forEach((app) => {
        const key = moment(app.date).format("YYYY-MM");
        const bin = chartData.find((c) => c.key === key);
        if (bin) {
          bin.appointments += 1;
          if (app.status === "completed") {
            const amt =
              app.invoice?.amount ||
              app.services?.reduce((sum, s) => sum + (s.price || 0), 0) ||
              0;
            bin.revenue += amt;
          }
        }
      });
      setRevenueData(chartData);

      const todayStr = moment().format("YYYY-MM-DD");
      const todaysFilteredApps = filteredApps.filter(app => moment(app.date).format("YYYY-MM-DD") === todayStr);

      const recent = [...todaysFilteredApps]
        .sort((a, b) => {
          const dateTimeA = moment(
            `${moment(a.date).format("YYYY-MM-DD")} ${a.slotTimes?.[0] || "00:00"}`,
            "YYYY-MM-DD HH:mm",
          );
          const dateTimeB = moment(
            `${moment(b.date).format("YYYY-MM-DD")} ${b.slotTimes?.[0] || "00:00"}`,
            "YYYY-MM-DD HH:mm",
          );
          return dateTimeB.diff(dateTimeA);
        })
        .slice(0, 6);
      setRecentActivity(recent);

      const upcoming = [...todaysFilteredApps]
        .filter(app => app.status !== "completed" && app.status !== "cancelled")
        .sort((a, b) => {
          const dateTimeA = moment(
            `${moment(a.date).format("YYYY-MM-DD")} ${a.slotTimes?.[0] || "00:00"}`,
            "YYYY-MM-DD HH:mm",
          );
          const dateTimeB = moment(
            `${moment(b.date).format("YYYY-MM-DD")} ${b.slotTimes?.[0] || "00:00"}`,
            "YYYY-MM-DD HH:mm",
          );
          return dateTimeA.diff(dateTimeB); // ascending for upcoming
        })
        .slice(0, 6);
      setUpcomingAppointments(upcoming);

      if (isStaff) {
        setStats((prev) => ({
          ...prev,
          totalRevenue: mySales,
          totalAppointments: todaysFilteredApps.length,
          totalCommission: myCommission,
        }));
      }
    },
    // [isAdmin, isStaff, user?._id],
    [isAdmin, isStaff, user],
  );

  useEffect(() => {
    const intialRunFn = () => {
      if (!isAdmin || !adminDashOk || !adminDash) return;
      setStats({
        totalAppointments: adminDash.totalAppointments,
        totalUsers: adminDash.totalUsers,
        totalStaff: adminDash.totalStaff,
        totalRevenue: adminDash.totalRevenue,
        profitToday: adminDash.profitToday || 0,
        pendingPaymentsCount: adminDash.pendingPaymentsCount || 0,
        pendingPaymentsTotal: adminDash.pendingPaymentsTotal || 0,
        lowStockCount: adminDash.lowStockCount || 0,
        noShowsCount: adminDash.noShowsCount || 0,
        outstandingReceivables: adminDash.outstandingReceivables || 0,
        retentionRate: adminDash.retentionRate || 0,
      });

      if (adminDash.monthlyBreakdown) {
        setRevenueData(adminDash.monthlyBreakdown);
      }
      if (adminDash.serviceDistribution) {
        setServiceData(adminDash.serviceDistribution);
      }
      const todayStr = moment().format("YYYY-MM-DD");

      if (adminDash.recentActivity) {
        setRecentActivity(adminDash.recentActivity.filter(app => moment(app.date).format("YYYY-MM-DD") === todayStr));
      }
      if (adminDash.upcomingAppointments) {
        setUpcomingAppointments(adminDash.upcomingAppointments.filter(app => moment(app.date).format("YYYY-MM-DD") === todayStr));
      }
      if (adminDash.staffPerformance) {
        const validStaff = adminDash.staffPerformance
          .filter((s) => {
            const name = (s.name || "").toLowerCase().trim();
            return name !== "unknown" && name !== "unassigned";
          })
          .slice(0, 5);
        setStaffPerformance(validStaff);
      }
      if (adminDash.topCustomers) {
        const validCustomers = adminDash.topCustomers
          .filter((c) => {
            const name = (c.name || "").toLowerCase().trim();
            return name !== "local customer" && name !== "unknown" && name !== "walk-in";
          })
          .slice(0, 5);
        setTopCustomers(validCustomers);
      }
      if (adminDash.paymentMethodBreakdown) {
        setPaymentMethodBreakdown(adminDash.paymentMethodBreakdown);
      }
      if (adminDash.attendanceStats) {
        setAttendanceStats(adminDash.attendanceStats.filter(record => record.staff && (record.staff.name || record.staff.firstName || record.staff.username)));
      }
    };

    intialRunFn();
  }, [isAdmin, adminDashOk, adminDash]);

  useEffect(() => {
    const fallbackFn = () => {
      const fallback = !isAdmin || (isAdmin && adminDashErr);
      if (!fallback) return;
      if (!appointmentsList) return;
      processChartData(appointmentsList, staffInvoiceList);
    };
    fallbackFn();
  }, [
    isAdmin,
    adminDashErr,
    appointmentsList,
    staffInvoiceList,
    processChartData,
  ]);

  const getStats = () => {
    if (isAdmin) {
      return [
        {
          label: "Today's Revenue",
          value: (
            <span className="notranslate">
              {currencySymbol}
              {(stats.totalRevenue || 0).toLocaleString()}
            </span>
          ),
          icon: Wallet,
          color: isDark
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-emerald-50 text-emerald-600",
        },
        {
          label: "Profit Today",
          value: (
            <span className="notranslate">
              {currencySymbol}
              {(stats.profitToday || 0).toLocaleString()}
            </span>
          ),
          icon: CircleDollarSign,
          color: isDark
            ? "bg-indigo-500/10 text-indigo-400"
            : "bg-indigo-50 text-indigo-600",
        },
        {
          label: "Today's Appointments",
          value: stats.totalAppointments || 0,
          icon: Calendar,
          color: isDark
            ? "bg-blue-500/10 text-blue-400"
            : "bg-blue-50 text-blue-600",
        },
        {
          label: "Active Staff",
          value: stats.totalStaff || 0,
          icon: Scissors,
          color: isDark
            ? "bg-purple-500/10 text-purple-400"
            : "bg-purple-50 text-purple-600",
        },
        {
          label: "Total Clients",
          value: stats.totalUsers || 0,
          icon: Users,
          color: isDark
            ? "bg-amber-500/10 text-amber-400"
            : "bg-amber-50 text-amber-600",
        },
        {
          label: "Pending Payments",
          value: stats.pendingPaymentsCount || 0,
          icon: AlertCircle,
          color: isDark
            ? "bg-rose-500/10 text-rose-400"
            : "bg-rose-50 text-rose-600",
        },
      ];
    } else {
      return [
        {
          label: "My Sales Today",
          value: (
            <span className="notranslate">
              {currencySymbol}
              {(stats.totalRevenue || 0).toLocaleString()}
            </span>
          ),
          icon: Wallet,
          color: isDark
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-emerald-50 text-emerald-600",
        },
        {
          label: "My Commission Today",
          value: (
            <span className="notranslate">
              {currencySymbol}
              {(stats.totalCommission || 0).toLocaleString()}
            </span>
          ),
          icon: CircleDollarSign,
          color: isDark
            ? "bg-violet-500/10 text-violet-400"
            : "bg-violet-50 text-violet-600",
        },
        {
          label: "Jobs Today",
          value: stats.totalAppointments || 0,
          icon: Briefcase,
          color: isDark
            ? "bg-blue-500/10 text-blue-400"
            : "bg-blue-50 text-blue-600",
        },
        {
          label: "Today's Attendance",
          value: (
            <span className={
              staffAttendanceRes?.status === 'Present' ? 'text-emerald-600 dark:text-emerald-400' :
              staffAttendanceRes?.status === 'Absent' ? 'text-rose-600 dark:text-rose-400' :
              staffAttendanceRes?.status === 'Half Day' ? 'text-amber-500 dark:text-amber-400' :
              'text-gray-500'
            }>
              {staffAttendanceRes?.status || "Not Marked"}
            </span>
          ),
          icon: Clock,
          color: staffAttendanceRes?.status === 'Present'
            ? "bg-emerald-500/10 text-emerald-400"
            : staffAttendanceRes?.status === 'Absent'
              ? "bg-rose-500/10 text-rose-400"
              : staffAttendanceRes?.status === 'Half Day'
                ? "bg-amber-500/10 text-amber-400"
                : isDark ? "bg-gray-500/10 text-gray-400" : "bg-gray-100 text-gray-500",
        },
      ];
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <StatsGrid stats={getStats()} loading={loading} isDashboard={true}>
        {/* WhatsApp Card - rendered inside the stats grid */}
        {integrationStatusRes?.data?.isWhatsappEnabled && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="col-span-1 sm:col-span-2 lg:col-span-1 bg-white dark:bg-dark-surface rounded-[1.5rem] py-3.5 px-5 border border-gray-100 dark:border-dark-border shadow-none transition-all duration-200 h-full flex flex-col justify-center"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  whatsappStatus.isConnected
                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400"
                }`}
              >
                <MessageCircle size={16} />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block truncate">
                  WhatsApp
                </span>
                <div className="flex items-center gap-1.5">
                  {whatsappStatus.loading ? (
                    <div className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin text-gray-400" />
                      <span className="text-xs font-bold text-gray-400">Checking...</span>
                    </div>
                  ) : whatsappStatus.isConnected ? (
                    <span className="text-sm font-black text-green-600 dark:text-green-400 leading-none truncate">
                      {whatsappStatus.phoneNumber ? `+${whatsappStatus.phoneNumber}` : "Connected"}
                    </span>
                  ) : (
                    <span className="text-sm font-black text-red-500 dark:text-red-400 leading-none">
                      Disconnected
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <button
                  onClick={!whatsappStatus.isConnected ? handleWhatsAppReconnect : undefined}
                  disabled={isReconnecting || whatsappStatus.loading}
                  className={`h-7 inline-flex items-center gap-1 px-2.5 rounded-full text-[10px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    whatsappStatus.loading
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-default"
                      : whatsappStatus.isConnected
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default"
                      : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  }`}
                >
                  {whatsappStatus.loading ? (
                    <><Loader2 size={10} className="animate-spin" /> Checking...</>
                  ) : isReconnecting ? (
                    <><Loader2 size={10} className="animate-spin" /> Connecting...</>
                  ) : whatsappStatus.isConnected ? (
                    <><CheckCircle2 size={10} /> Active</>
                  ) : (
                    <><RefreshCcw size={10} /> Connect</>
                  )}
                </button>
              </div>
            </div>
          </Motion.div>
        )}

        {/* Opening Balance & Day Counter Combined Card */}
        {isDayClosingEnabled && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="col-span-1 sm:col-span-2 lg:col-span-1 bg-white dark:bg-dark-surface rounded-[1.5rem] py-3.5 px-5 border border-gray-100 dark:border-dark-border shadow-none transition-all duration-200 h-full flex flex-col justify-center relative overflow-hidden group"
          >
            {/* Background Accent */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-colors ${isCounterOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
            
            <div className="flex items-start justify-between mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl flex-shrink-0 ${isCounterOpen ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400"}`}>
                  <Wallet size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white leading-none">Opening Balance</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCounterOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {isCounterOpen ? "Counter Open" : "Counter Closed"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-gray-900 dark:text-white notranslate leading-none">
                  {currencySymbol}{(sessionRes?.data?.session?.openingBalance || 0).toLocaleString()}
                </div>
                {isCounterOpen && (
                  <div className="text-[11px] font-black text-brand-primary mt-1.5">
                    Sales: {currencySymbol}{(sessionRes?.data?.stats?.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto relative z-10 flex items-center gap-2">
              {isCounterOpen && (
                <div className="flex-1">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-card rounded-lg p-2 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-1.5">
                      <Timer size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 font-mono">
                        {elapsed || "00:00:00"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className={`${isCounterOpen ? 'shrink-0' : 'w-full'} flex items-center`}>
                <DayCloseWidget fullWidth={!isCounterOpen} />
              </div>
            </div>
          </Motion.div>
        )}
      </StatsGrid>


      {loading ? (
        <div className="space-y-4">
          {/* Row 1 Skeleton (420px) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-dark-surface p-6 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-none h-[420px] flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
                    <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  </div>
                  <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse shrink-0" />
                </div>
                <div className="flex-1 space-y-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-16 bg-gray-50 dark:bg-dark-card rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Row 2 Skeleton (480px) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-dark-surface p-6 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-none h-[480px] flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
                    <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  </div>
                  <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse shrink-0" />
                </div>
                {i === 2 ? (
                  <div className="flex-1 bg-gray-50 dark:bg-dark-card rounded-xl animate-pulse" />
                ) : i === 3 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full border-[16px] border-gray-100 dark:border-gray-800 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex-1 space-y-4">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-16 bg-gray-50 dark:bg-dark-card rounded-xl animate-pulse" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <CommissionSummaryWidget className="col-span-1 h-[420px]" />
              
              <DashboardSection 
                title="Operations & Activity" 
                subtitle="Upcoming & Recent Jobs"
                icon={Activity}
                iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                className="lg:col-span-1 h-[420px]"
                delay={0.2}
              >
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex gap-4 border-b border-gray-100 dark:border-dark-border mb-4">
                    <button 
                      onClick={() => setActiveTab('upcoming')}
                      className={`text-sm font-bold pb-2 uppercase transition-colors ${activeTab === 'upcoming' ? 'text-gray-900 dark:text-white border-b-2 border-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                      UPCOMING TODAY
                    </button>
                    <button 
                      onClick={() => setActiveTab('recent')}
                      className={`text-sm font-bold pb-2 uppercase transition-colors ${activeTab === 'recent' ? 'text-gray-900 dark:text-white border-b-2 border-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                      RECENT COMPLETED
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pr-1">
                    {(activeTab === 'upcoming' ? upcomingAppointments : recentActivity).length > 0 ? (
                      (activeTab === 'upcoming' ? upcomingAppointments : recentActivity).map((item, i) => {
                        const serviceCounts = {};
                        (item.services || []).forEach(s => {
                          const sName = s.serviceId?.name || s.name || 'Service';
                          const fullName = s.variantName ? `${sName} • ${s.variantName}` : sName;
                          serviceCounts[fullName] = (serviceCounts[fullName] || 0) + 1;
                        });
                        const servicesDisplay = Object.entries(serviceCounts).map(([name, count]) => count > 1 ? `${name} *${count}` : name).join(", ") || "Service";

                        return (
                          <div
                            key={i}
                            className="flex gap-4 items-center p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border shadow-none hover:bg-gray-100/70 dark:hover:bg-dark-card/60 transition-all duration-200 group shrink-0"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {servicesDisplay}
                              </p>
                              <div className="flex flex-col">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-1">
                                  {item.user?.name || "Guest"} • {moment(item.date).format("MMM DD")} • {item.slotTimes?.[0] ? moment(item.slotTimes[0], ["HH:mm", "h:mm A"]).format("h:mm A") : "No Time"}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-dark-surface rounded-md text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-dark-border shadow-sm tracking-wide">
                                    <Users size={12} />
                                    {item.staff?.name || (item.services && item.services.length > 0 && item.services[0].staffId?.name) || "Unassigned"}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="text-[10px] uppercase font-black px-2.5 py-1.5 rounded-lg border bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
                                {item.status}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic opacity-40">
                        {activeTab === 'upcoming' ? "No upcoming appointments" : "No recent activity"}
                      </div>
                    )}
                  </div>
                </div>
              </DashboardSection>

              <DashboardSection 
                title="Staff Attendance" 
                subtitle="Today's team status"
                icon={Clock}
                iconColor="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                className="lg:col-span-1 h-[420px]"
                delay={0.3}
              >
                <div className="h-full overflow-y-auto scrollbar-hide pr-1">
                  {attendanceStats.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceStats.map((record, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border shadow-none">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{record.staff?.name || record.staff?.firstName || record.staff?.username}</span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>{record.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">No attendance marked today</p>
                    </div>
                  )}
                </div>
              </DashboardSection>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <DashboardSection 
              title="Staff Performance" 
              subtitle="Completed jobs this month"
              icon={Trophy}
              iconColor="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
              className="lg:col-span-1 h-[480px]"
              delay={0.4}
            >
              <div className="h-full overflow-y-auto scrollbar-hide">
                <PerformanceList items={staffPerformance} type="staff" />
              </div>
            </DashboardSection>

            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-1 bg-white dark:bg-dark-surface p-6 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-none h-[480px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Revenue Trend
                  </h3>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Income over the last 6 months
                  </p>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={isDark ? 0.3 : 0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: isDark ? "#94a3b8" : "#6b7280",
                        fontSize: 12,
                      }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: isDark ? "#94a3b8" : "#6b7280",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1e293b" : "#fff",
                        borderRadius: "12px",
                        border: isDark ? "1px solid #334155" : "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        color: isDark ? "#f1f5f9" : "#111827",
                      }}
                      itemStyle={{ color: isDark ? "#f1f5f9" : "#111827" }}
                      labelStyle={{
                        color: isDark ? "#94a3b8" : "#6b7280",
                        fontWeight: "bold",
                        marginBottom: "4px",
                      }}
                      formatter={(value) => [
                        <span className="notranslate font-bold" key="val">
                          {currencySymbol}
                          {value.toLocaleString()}
                        </span>,
                        "Revenue",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Motion.div>

            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              className="lg:col-span-1 bg-white dark:bg-dark-surface p-6 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-none h-[480px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Services
                  </h3>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Top Categories
                  </p>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <PieIcon size={20} />
                </div>
              </div>
              <div className="flex-1 w-full flex items-center justify-center">
                {serviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {serviceData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1e293b" : "#fff",
                          borderRadius: "12px",
                          border: isDark ? "1px solid #334155" : "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ color: isDark ? "#f1f5f9" : "#111827" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-sm italic opacity-40">
                    No records found
                  </p>
                )}
              </div>
            </Motion.div>
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <DashboardSection 
                title="Customer Retention" 
                subtitle="Returning vs New"
                icon={HeartPulse}
                iconColor="bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                className="lg:col-span-1 h-[480px]"
                delay={0.6}
              >
                <div className="flex flex-col items-center justify-center h-full pt-4">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100 dark:text-dark-card" />
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={`${(stats.retentionRate / 100) * 351} 351`} className="text-rose-500" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.retentionRate}%</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 text-center">of your customers have booked more than once.</p>
                </div>
              </DashboardSection>

              <DashboardSection 
                title="Top Customers" 
                subtitle="Highest spend this month"
                icon={Users}
                iconColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                className="lg:col-span-1 h-[480px]"
                delay={0.7}
              >
                <div className="h-full overflow-y-auto scrollbar-hide">
                  <PerformanceList items={topCustomers} type="customer" />
                </div>
              </DashboardSection>

              <DashboardSection 
                title="Alerts & Finance" 
                subtitle="Needs your attention"
                icon={AlertCircle}
                iconColor="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                className="lg:col-span-1 h-[480px] flex flex-col"
                delay={0.8}
              >
                <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
                  <div className="grid grid-cols-1 gap-4 mt-2 pb-4">
                    <InsightCard 
                      type={stats.lowStockCount > 0 ? "warning" : "success"}
                      title="Inventory Stock"
                      content={stats.lowStockCount > 0 ? `${stats.lowStockCount} products are running low on stock and need reordering.` : "All products are adequately stocked."}
                    />
                    <InsightCard 
                      type={stats.pendingPaymentsCount > 0 ? "danger" : "success"}
                      title="Outstanding Receivables"
                      content={stats.pendingPaymentsCount > 0 ? `You have ${stats.pendingPaymentsCount} pending payments totaling ${currencySymbol}${(stats.outstandingReceivables || 0).toLocaleString()}.` : "All invoices have been paid."}
                    />
                    <InsightCard 
                      type={stats.noShowsCount > 0 ? "warning" : "info"}
                      title="No Shows"
                      content={stats.noShowsCount > 0 ? `There have been ${stats.noShowsCount} no-shows this month.` : "Great! No missed appointments this month."}
                    />
                    <InsightCard 
                      type="info"
                      title="Payment Methods"
                      content={`Most popular: ${paymentMethodBreakdown.length > 0 ? [...paymentMethodBreakdown].sort((a,b) => b.value - a.value)[0].name : "N/A"}`}
                    />
                  </div>
                </div>
              </DashboardSection>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default Dashboard;
