import { useEffect, useState, useCallback } from "react";
import api from "../../../api/axiosInstance";
import moment from "moment";
import DateRangePicker from "../../../components/shared/DateRangePicker";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  X,
  CheckCircle,
  Check,
  ShoppingBag,
  Percent,
  Tag,
  Calculator,
  Receipt,
  Users,
  Store,
  Phone,
  Mail,
  MapPin,
  Package,
  Truck,
  ClipboardList,
  Home,
  XCircle,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet
} from "lucide-react";
import { TimelineSkeleton, CalendarSkeleton } from "../../../components/shared/Skeleton";
import { motion as Motion, AnimatePresence } from "framer-motion";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import StaffCalendarView from "../../../features/appointments/components/StaffCalendarView";

const BookingsTimeline = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { currencySymbol, user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [startDate, setStartDate] = useState(() => moment().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(() => moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState(window.innerWidth >= 768 ? "grid" : "list"); // "list" or "grid"
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [carrierTrackingId, setCarrierTrackingId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [updatingShipment, setUpdatingShipment] = useState(false);

  useEffect(() => {
    if (selectedBooking) {
      setCarrierTrackingId(selectedBooking.shipping?.carrierTrackingId || "");
      setCarrier(selectedBooking.shipping?.carrier || "");
      setExpectedDeliveryDate(
        selectedBooking.shipping?.expectedDeliveryDate 
          ? moment(selectedBooking.shipping.expectedDeliveryDate).format("YYYY-MM-DD")
          : ""
      );
    }
  }, [selectedBooking]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      // Send explicit timezone-aware ISO boundaries (12:00 AM to 11:59 PM local time)
      // This ensures the backend receives the correct UTC range regardless of server timezone
      const startOfDay = moment(startDate).startOf('day').toISOString();
      const endOfDay = moment(endDate).endOf('day').toISOString();
      const res = await api.get(`/appointments?startDate=${encodeURIComponent(startOfDay)}&endDate=${encodeURIComponent(endOfDay)}`);
      if (res.data.success) {
        const sorted = res.data.data
          .filter(a => a.services && a.services.length > 0)
          .sort((a, b) => {
          const timeA = a.slotTimes?.[0] || "00:00";
          const timeB = b.slotTimes?.[0] || "00:00";
          return moment(timeA, ["HH:mm", "h:mm A"]).diff(
            moment(timeB, ["HH:mm", "h:mm A"]),
          );
        });
        setAppointments(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get(`/public/staff`);
      if (res.data.success) {
        let list = res.data.data;
        if (user?.role === 'staff') {
          list = list.filter(s => s._id === user._id || s.id === user._id || s._id === user.id);
        }
        setStaffList(list);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchAppointments();
    fetchStaff();
  }, [fetchAppointments, fetchStaff]);

  useEffect(() => {
    const handleBackgroundRefresh = () => {
      console.log("[BookingsPage] New booking received event, refreshing list in background...");
      fetchAppointments();
    };

    window.addEventListener("new-booking-received", handleBackgroundRefresh);
    return () => {
      window.removeEventListener("new-booking-received", handleBackgroundRefresh);
    };
  }, [fetchAppointments]);

  const handleReassignBooking = async (booking, newStaffId, targetMinutes, newTimeStr) => {
    try {
      // Reassign to the new staff and update the slot time
      const updatedStaffId = newStaffId === 'unassigned' ? null : newStaffId;
      const updatedSlotTimes = [newTimeStr];

      // Assuming we update the appointment's primary staff and its slotTime
      const payload = {
        staff: updatedStaffId,
        slotTimes: updatedSlotTimes
      };

      // Also update the first service staffId if applicable
      if (booking.services && booking.services.length > 0) {
         payload.services = booking.services.map(s => ({
            ...s,
            staffId: updatedStaffId,
            serviceId: s.serviceId?._id || s.serviceId,
            variantId: s.variantId?._id || s.variantId
         }));
      }

      const res = await api.put(`/appointments/${booking._id}`, payload);
      if (res.data.success) {
        showSnack("Booking reassigned successfully", "success");
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
      showSnack("Failed to reassign booking", "error");
    }
  };

  const handleComplete = (id, e) => {
    if (e) e.stopPropagation();
    const booking = appointments.find((a) => a._id === id);
    if (booking) {
      // Determine the correct route based on user role
      let routePath = "staff"; // default
      if (user?.role === "SHOP_ADMIN") {
        routePath = "shop-admin";
      } else if (user?.role === "staff") {
        routePath = "staff";
      } else if (user?.role === "SUPER_ADMIN") {
        routePath = "super-admin";
      }
      navigate(`/${shopSlug}/${routePath}/invoice`, { state: { booking } });
    }
  };

  const handleCancel = (id, e) => {
    if (e) e.stopPropagation();
    const app = appointments.find((a) => a._id === id);
    if (app) {
      setAppointmentToCancel(app);
      setIsCancelModalOpen(true);
    }
  };

  const confirmCancel = async () => {
    if (!appointmentToCancel) return;
    try {
      await api.put(`/appointments/${appointmentToCancel._id}/cancel`);
      showSnack("Appointment cancelled successfully", "success");
      fetchAppointments();
    } catch (err) {
      console.error(err);
      showSnack("Failed to cancel appointment", "error");
    } finally {
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
    }
  };

  const openBookingDetails = (app) => {
    setSelectedBooking(app);
    setIsSheetOpen(true);
  };

  const handleUpdateShipping = async (newStatus = null) => {
    if (!selectedBooking) return;
    try {
      setUpdatingShipment(true);
      const payload = {
        shipping: {
          ...selectedBooking.shipping,
          carrierTrackingId,
          carrier,
          expectedDeliveryDate
        }
      };
      if (newStatus) payload.status = newStatus;

      const res = await api.put(`/appointments/${selectedBooking._id}`, payload);
      if (res.data.success) {
        showSnack("Shipping details updated", "success");
        setSelectedBooking(res.data.data);
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
      showSnack("Failed to update shipping", "error");
    } finally {
      setUpdatingShipment(false);
    }
  };

  const getFinancials = (app) => {
    if (!app) return { subtotal: 0, tax: 0, discount: 0, roundoff: 0, total: 0 };

    if (app.invoice) {
      return {
        subtotal: app.invoice.amount || 0,
        tax: app.invoice.taxAmount || 0,
        discount: app.invoice.discount || 0,
        roundoff: app.invoice.roundOffAmount || 0,
        total: (app.invoice.amount || 0) + (app.invoice.taxAmount || 0) - (app.invoice.discount || 0) + (app.invoice.roundOffAmount || 0)
      };
    }

    let subtotal = 0;
    let taxTotal = 0;
    
    (app.services || []).forEach(s => {
      if (!s) return;
      // serviceId may be null if the service was deleted — fall back to the subdoc itself
      const sInfo = (s.serviceId && typeof s.serviceId === "object") ? s.serviceId : s;
      let price = Number(s.price) || 0;
      const taxPct = s.taxPercentage !== undefined ? Number(s.taxPercentage) : (Number(sInfo?.taxPercentage) || Number(sInfo?.taxId?.percentage) || 0);
      const isInc = s.isTaxInclusive !== undefined ? s.isTaxInclusive : (sInfo?.isTaxInclusive || false);
      
      const variantId = s.variantId?._id || s.variantId;
      const deptIdStr = typeof app.departmentId === "object" 
        ? (app.departmentId?._id || app.departmentId?.id)?.toString() 
        : app.departmentId?.toString();

      if (!price && variantId && variantId !== "base" && sInfo?.variants) {
        const variantObj = sInfo.variants.find(v => (v.variantId?._id || v.variantId || v._id)?.toString() === variantId.toString());
        if (variantObj) {
          const vPricing = variantObj.pricing?.find(p => (p.department?._id || p.department)?.toString() === deptIdStr);
          price = Number(vPricing?.price) || Number(variantObj.pricing?.[0]?.price) || Number(sInfo?.price) || 0;
        }
      }
      
      const qty = Number(s.quantity) || Number(s.qty) || 1;
      const lineTotal = price * qty;
      const lineTax = isInc ? lineTotal - (lineTotal / (1 + (taxPct / 100))) : lineTotal * (taxPct / 100);
      const lineExTax = isInc ? (lineTotal - lineTax) : lineTotal;
      
      subtotal += lineExTax;
      taxTotal += lineTax;
    });

    (app.products || []).forEach(p => {
      if (!p) return;
      const pPrice = Number(p.price) || 0;
      const qty = Number(p.quantity) || Number(p.qty) || 1;
      const taxPct = p.taxPercentage !== undefined ? Number(p.taxPercentage) : (Number(p.taxPercent) || 0);
      const isInc = p.isTaxInclusive !== undefined ? p.isTaxInclusive : false;
      
      const lineTotal = pPrice * qty;
      const lineTax = isInc ? lineTotal - (lineTotal / (1 + (taxPct / 100))) : lineTotal * (taxPct / 100);
      const lineExTax = isInc ? (lineTotal - lineTax) : lineTotal;
      
      subtotal += lineExTax;
      taxTotal += lineTax;
    });

    const beforeRoundOff = subtotal + taxTotal - (Number(app.discount) || 0);
    const roundOffAmount = 0;
    const roundedTotal = beforeRoundOff;

    return {
      subtotal,
      tax: taxTotal,
      discount: Number(app.discount) || 0,
      roundoff: roundOffAmount,
      total: roundedTotal
    };
  };

  const formatDisplayPrice = (val) => {
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-10">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <div className="bg-white dark:bg-dark-surface rounded-2xl md:rounded-[2rem] border-y border-gray-100 dark:border-dark-border">
          {/* Header */}
          <div className="px-4 py-4 md:px-6 md:py-5 rounded-t-2xl md:rounded-t-[2rem] border-b border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-card/30 flex flex-col gap-4 relative">
            {/* Mobile: Title and Badge */}
            <div className="flex items-center justify-between md:hidden">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Bookings
                </h3>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                  {startDate === endDate 
                    ? (moment(startDate).isSame(moment(), "day") ? "Today, " : "") + moment(startDate).format("MMMM Do, YYYY")
                    : `${moment(startDate).format("MMM Do")} - ${moment(endDate).format("MMMM Do, YYYY")}`
                  }
                </span>
              </div>
              
              <div className="flex bg-brand-primary/5 dark:bg-brand-primary/10 px-2.5 py-1.5 rounded-xl w-fit">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-brand-primary dark:text-blue-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                  Bookings
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-brand-primary text-white text-[8px] tracking-normal font-black">
                    {appointments.filter(a => ["pending", "booked", "confirmed", "shipped", "out_for_delivery"].includes(a.status?.toLowerCase())).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop: All in one row */}
            <div className="hidden md:flex md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white group whitespace-nowrap">
                  Bookings
                  <span className="block text-xs font-bold text-gray-400 group-hover:text-brand-primary dark:text-blue-400 transition-colors mt-0.5">
                    {startDate === endDate 
                      ? (moment(startDate).isSame(moment(), "day") ? "Today, " : "") + moment(startDate).format("MMMM Do, YYYY")
                      : `${moment(startDate).format("MMM Do")} - ${moment(endDate).format("MMMM Do, YYYY")}`
                    }
                  </span>
                </h3>
                
                <div className="flex bg-brand-primary/5 dark:bg-brand-primary/10 px-3 py-2 rounded-xl md:rounded-2xl w-fit">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary dark:text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                    Bookings
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-brand-primary text-white text-[8px] tracking-normal font-black">
                      {appointments.filter(a => ["pending", "booked", "confirmed", "shipped", "out_for_delivery"].includes(a.status?.toLowerCase())).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Unified Controls - Row for both Mobile and Desktop */}
            <div className="flex items-center gap-2 w-full md:w-auto md:absolute md:top-[18px] md:right-6">
              <button
                onClick={() => {
                  const today = moment().format("YYYY-MM-DD");
                  setStartDate(today);
                  setEndDate(today);
                }}
                className="h-10 px-3 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:text-brand-primary hover:border-brand-primary/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 flex items-center justify-center"
              >
                Today
              </button>
              <div className="flex-1 md:flex-none min-w-0">
                <DateRangePicker 
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowViewSettings(!showViewSettings)}
                  className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all border ${showViewSettings ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : "bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border text-gray-500 hover:text-brand-primary hover:border-brand-primary/30"}`}
                  title="View Settings"
                >
                  <SlidersHorizontal size={16} />
                </button>
                <AnimatePresence>
                  {showViewSettings && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowViewSettings(false)}
                      />
                      <Motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-gray-100 dark:border-dark-border overflow-hidden z-50"
                      >
                        <div className="p-1">
                          <button
                            onClick={() => { setViewMode("grid"); setShowViewSettings(false); }}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${viewMode === "grid" ? "bg-brand-primary/10 text-brand-primary font-bold" : "text-gray-600 hover:bg-gray-50 dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-card"}`}
                          >
                            <LayoutGrid size={16} /> Staff View
                          </button>
                          <button
                            onClick={() => { setViewMode("list"); setShowViewSettings(false); }}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${viewMode === "list" ? "bg-brand-primary/10 text-brand-primary font-bold" : "text-gray-600 hover:bg-gray-50 dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-card"}`}
                          >
                            <List size={16} /> List View
                          </button>
                        </div>
                      </Motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className={`bg-white dark:bg-dark-surface min-h-[400px] ${viewMode === "grid" ? "" : "p-3 md:p-4"}`}>
            {loading ? (
              viewMode === "grid" ? (
                <div className="p-3 md:p-4"><CalendarSkeleton columns={Math.max(4, staffList.length + 1)} /></div>
              ) : (
                <TimelineSkeleton items={4} />
              )
            ) : appointments.filter(a => ["pending", "booked", "confirmed", "shipped", "out_for_delivery"].includes(a.status?.toLowerCase())).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-gray-50 dark:bg-dark-card p-4 rounded-full mb-3">
                  <Calendar size={32} className="text-gray-300" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Bookings</h3>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  {startDate === endDate 
                    ? (moment(startDate).isSame(moment(), "day") 
                        ? "No appointments scheduled for today." 
                        : `No bookings found for ${moment(startDate).format("MMM Do")}.`)
                    : `No bookings found between ${moment(startDate).format("MMM Do")} - ${moment(endDate).format("MMM Do")}.`
                  }
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <StaffCalendarView 
                appointments={appointments.filter(a => ["pending", "booked", "confirmed", "shipped", "out_for_delivery"].includes(a.status?.toLowerCase()))}
                staffList={staffList}
                onBookingClick={openBookingDetails}
                onReassignBooking={handleReassignBooking}
              />
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[15px] md:before:left-[19px] before:w-0.5 before:bg-gray-100 dark:bg-dark-card dark:before:bg-dark-border pl-0 md:pl-2">
                {appointments
                  .filter(a => ["pending", "booked", "confirmed", "shipped", "out_for_delivery"].includes(a.status?.toLowerCase()))
                  .map((app, idx) => {
                    const isCompleted = ["completed", "delivered"].includes(app.status);
                    const isCancelled = app.status === "cancelled";
                    const financials = getFinancials(app);

                    return (
                      <Motion.div
                        key={app._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="relative pl-7 md:pl-8 group cursor-pointer"
                        onClick={() => openBookingDetails(app)}
                      >
                        {/* Dot */}
                        <div className={`absolute left-[9px] md:left-[13px] top-6 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border-[2px] md:border-[3px] border-white dark:border-dark-surface shadow-sm z-10 ${isCompleted ? "bg-emerald-500" : isCancelled ? "bg-red-400" : "bg-brand-primary"}`} />

                        <div className={`relative flex flex-col sm:flex-row sm:items-center p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-200 group gap-3 md:gap-4 ${isCompleted ? "bg-emerald-50/20 border-emerald-100/50" : isCancelled ? "bg-red-50/20 border-red-100/50" : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border"}`}>
                          
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Time Display */}
                            <div className="flex flex-col items-center justify-center min-w-[2.5rem] md:min-w-[3rem] h-10 md:h-12 bg-gray-50 dark:bg-dark-card rounded-xl">
                              {app.slotTimes?.length > 0 ? (
                                <>
                                  <span className="text-[10px] md:text-xs font-black text-gray-900 dark:text-white leading-none">
                                    {moment(app.slotTimes[0], ["HH:mm", "h:mm A"]).format("h:mm")}
                                  </span>
                                  <span className="text-[7px] md:text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase leading-none mt-0.5">
                                    {moment(app.slotTimes[0], ["HH:mm", "h:mm A"]).format("A")}
                                  </span>
                                </>
                              ) : (
                                <ShoppingBag size={14} className="text-user-gold" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1">
                                <div className={`flex flex-col gap-0.5 min-w-0 flex-1 ${isCompleted ? "text-emerald-900" : "text-gray-900 dark:text-white"}`}>
                                  {(app.services || []).map((s, sIdx) => {
                                    const staffObj = s?.staffId || app.staff;
                                    let staffName = staffObj?.name || staffObj?.firstName || staffObj?.username;
                                    
                                    // If staffObj is just an ID string, or if we couldn't find the name, look it up in staffList
                                    if (!staffName && staffObj) {
                                      const staffId = typeof staffObj === 'string' ? staffObj : staffObj._id;
                                      const foundStaff = staffList.find(staff => staff._id === staffId || staff.id === staffId);
                                      if (foundStaff) {
                                        staffName = foundStaff.name || foundStaff.firstName || foundStaff.username;
                                      }
                                    }

                                    return (
                                    <div key={`svc-${s?._id || sIdx}-${sIdx}`} className="flex flex-col">
                                      <span className="text-[12px] md:text-[13px] font-black leading-tight truncate">
                                        {(s?.serviceId?.name || s?.name || "Service")} { (s?.variantName || s?.variantId?.name) && `• ${s?.variantName || s?.variantId?.name}` } x {s?.quantity || 1}
                                        {staffName && <span className="text-gray-500 dark:text-gray-400 font-medium ml-1">with {staffName}</span>}
                                      </span>
                                    </div>
                                    );
                                  })}
                                  {(app.products || []).map((p, pIdx) => (
                                    <div key={`prod-${p?._id || pIdx}-${pIdx}`} className="flex flex-col">
                                      <span className="text-[12px] md:text-[13px] font-black leading-tight truncate">
                                        {(p?.product?.name || p?.name || "Product")} { (p?.variantName || p?.variantId?.name) && `• ${p?.variantName || p?.variantId?.name}` } x {p?.quantity || p?.qty || 1}
                                      </span>
                                    </div>
                                  ))}
                                  {(!app.services?.length && !app.products?.length) && (
                                    <span className="text-[12px] font-black opacity-50 italic">No Items</span>
                                  )}
                                </div>
                                {/* Amount and Status - shown on mobile, hidden on desktop */}
                                <div className="md:hidden flex flex-col items-end gap-1">
                                  <span className={`text-[11px] md:text-[12px] font-black whitespace-nowrap notranslate ${isCompleted ? "text-emerald-700" : "text-brand-primary dark:text-blue-400"}`}>
                                    {currencySymbol}{formatDisplayPrice(financials.total)}
                                  </span>
                                  {app.paymentStatus && (
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                      app.paymentStatus === "Paid" 
                                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 text-emerald-600 dark:text-emerald-400" 
                                        : "bg-amber-50 border-amber-100 text-amber-600"
                                    }`}>
                                      {app.paymentStatus === "Paid" ? "Paid" : "Pay in store"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                  <User size={10} className="text-user-gold" />
                                  <span className="max-w-[80px] md:max-w-none truncate">{app.user?.name || "Guest"}</span>
                                </span>
                                {app.user?.phone && (
                                  <a 
                                    href={`tel:${app.user.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 text-gray-400 hover:text-brand-primary dark:text-blue-400 transition-colors border-l border-gray-200 dark:border-dark-border pl-2"
                                  >
                                    <Phone size={10} />
                                    {app.user.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Amount and Status - centered on desktop */}
                          <div className="hidden md:flex flex-col items-center justify-center min-w-[100px] gap-1">
                            <span className={`text-[14px] font-black whitespace-nowrap notranslate ${isCompleted ? "text-emerald-700" : "text-brand-primary dark:text-blue-400"}`}>
                              {currencySymbol}{formatDisplayPrice(financials.total)}
                            </span>
                            {app.paymentStatus && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                app.paymentStatus === "Paid" 
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 text-emerald-600 dark:text-emerald-400" 
                                  : "bg-amber-50 border-amber-100 text-amber-600"
                              }`}>
                                {app.paymentStatus === "Paid" ? "Paid" : "Pay in store"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-dark-border/50">
                            {/* Status or Actions */}
                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                              {!isCompleted && !isCancelled && (
                                <>
                                  <button 
                                    onClick={(e) => handleComplete(app._id, e)} 
                                    className="flex-1 sm:flex-none px-4 py-2 bg-brand-primary text-white rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all whitespace-nowrap"
                                  >
                                    Complete
                                  </button>
                                  <button 
                                    onClick={(e) => handleCancel(app._id, e)} 
                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              )}
                              {isCompleted && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[8px] uppercase tracking-widest">
                                  <Check size={12} /> {app.status === "delivered" ? "Delivered" : "Completed"}
                                </div>
                              )}
                              {isCancelled && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl font-black text-[8px] uppercase tracking-widest">
                                  <X size={12} /> Cancelled
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <ConfirmModal
          isOpen={isCancelModalOpen}
          onClose={() => { setIsCancelModalOpen(false); setAppointmentToCancel(null); }}
          onConfirm={confirmCancel}
          title="Cancel Booking"
          message={`Are you sure you want to cancel the booking for ${appointmentToCancel?.user?.name || "Guest"}?`}
          confirmLabel="Yes, Cancel"
        />

        {/* Booking Details Sidesheet */}
        <AnimatePresence>
          {isSheetOpen && selectedBooking && (
            <>
              {/* Backdrop */}
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSheetOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
              />
              {/* Sheet Container */}
              <Motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-full sm:max-w-[480px] bg-white dark:bg-dark-surface shadow-2xl z-[70] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${["completed", "delivered"].includes(selectedBooking.status) ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-brand-primary/10 text-brand-primary dark:text-blue-400"}`}>
                      <ShoppingBag size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">Booking Details</h3>
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                        {selectedBooking.status} • {moment(selectedBooking.date).format("MMM DD, YYYY")}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSheetOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-8 custom-scrollbar">
                  
                  {/* Customer Info */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Customer Profile</h4>
                    <div className="p-4 bg-gray-50/50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-user-gold/10 flex items-center justify-center text-user-gold font-black text-lg shrink-0">
                        {(selectedBooking.user?.name || "G")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-black text-gray-900 dark:text-white mb-2">
                          {selectedBooking.user?.name || "Guest Customer"}
                        </h5>
                        <div className="space-y-2.5">
                          {selectedBooking.user?.phone && (
                            <a 
                              href={`tel:${selectedBooking.user.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-primary dark:text-blue-400 transition-colors"
                            >
                              <Phone size={12} className="text-brand-primary dark:text-blue-400" />
                              {selectedBooking.user.phone}
                            </a>
                          )}
                          {selectedBooking.user?.email && (
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
                              <Mail size={12} className="text-brand-primary dark:text-blue-400" />
                              {selectedBooking.user.email}
                            </div>
                          )}
                          <div className="flex items-start gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                            <MapPin size={12} className="text-brand-primary dark:text-blue-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              {(() => {
                                const da = selectedBooking.deliveryAddress;
                                if (da && da.address) {
                                  return (
                                    <>
                                      <span className="text-[9px] text-brand-primary dark:text-blue-400 font-black uppercase block mb-0.5 tracking-wider">Delivery Address</span>
                                      <p className="line-clamp-2">{[da.address, da.city, da.state, da.postalCode].filter(Boolean).join(", ")}</p>
                                    </>
                                  );
                                }
                                const u = selectedBooking.user;
                                if (!u) return "No customer info";
                                const parts = [u.address, u.city, u.state, u.postalCode].filter(Boolean);
                                return (
                                  <>
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase block mb-0.5 tracking-wider">Profile Address</span>
                                    <p className="line-clamp-2">{parts.length > 0 ? parts.join(", ") : "No address provided"}</p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Product Fulfillment Section */}
                  {(selectedBooking.products?.length > 0) && (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Shipping Details</h4>
                        <div className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary dark:text-blue-400 text-[8px] font-black uppercase rounded-md border border-brand-primary/20">
                          Logistics
                        </div>
                      </div>

                      <div className="p-5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Carrier</label>
                            <input 
                              type="text"
                              value={carrier}
                              onChange={(e) => setCarrier(e.target.value)}
                              placeholder="e.g. FedEx"
                              className="w-full px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Tracking ID</label>
                            <input 
                              type="text"
                              value={carrierTrackingId}
                              onChange={(e) => setCarrierTrackingId(e.target.value)}
                              placeholder="# Tracking No."
                              className="w-full px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-full">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Expected Delivery</label>
                            <input 
                              type="date"
                              value={expectedDeliveryDate}
                              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Update Status</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'shipped', label: 'Shipped', icon: Package, color: 'blue' },
                              { id: 'out_for_delivery', label: 'In Transit', icon: Truck, color: 'indigo' },
                            ].map((s) => (
                              <button
                                key={s.id}
                                disabled={updatingShipment}
                                onClick={() => handleUpdateShipping(s.id)}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                  selectedBooking.status === s.id 
                                    ? `bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20` 
                                    : `bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-brand-primary/50`
                                }`}
                              >
                                <s.icon size={14} />
                                {s.label}
                              </button>
                            ))}
                            <button
                              disabled={updatingShipment}
                              onClick={() => handleUpdateShipping()}
                              className="col-span-full py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-primary dark:text-blue-400 transition-all rounded-xl"
                            >
                              {updatingShipment ? "Updating..." : "Save Tracking Only"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Schedule Info */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Schedule Info</h4>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="p-4 bg-gray-50/50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border">
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1.5">Appointment</p>
                        <p className="text-[11px] md:text-xs font-black text-gray-900 dark:text-white">
                          {moment(selectedBooking.date).format("MMM DD, YYYY")}
                        </p>
                        <p className="text-[10px] font-black text-brand-primary dark:text-blue-400 mt-1">
                          {selectedBooking.slotTimes?.join(", ") || "No Time"}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50/50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border">
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1.5">Resource</p>
                        <p className="text-[11px] md:text-xs font-black text-gray-900 dark:text-white truncate">
                          {selectedBooking.staff?.name || "Pending"}
                        </p>
                        <p className="text-[10px] font-black text-user-gold mt-1 uppercase tracking-widest">
                          {selectedBooking.staff?.role || "System"}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Items Detailed List */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Order Breakdown</h4>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border divide-y divide-gray-50 dark:divide-dark-border/30 overflow-hidden">
                      {[
                        ...(selectedBooking.services || []).map(s => ({ ...s, type: "Service" })),
                        ...(selectedBooking.products || []).map(p => ({ ...p, type: "Product" }))
                      ].map((item, idx) => {
                        if (!item) return null;
                        const name = item.serviceId?.name || item.product?.name || item.name || "Item";
                        const variant = item.variantName || item.variantId?.name || "";
                        const qty = Number(item.quantity) || Number(item.qty) || 1;
                        const price = Number(item.price) || 0;
                        const taxPct = Number(item.taxPercentage) || Number(item.taxPercent) || 0;
                        const isInc = item.isTaxInclusive || false;
                        const displayPrice = isInc ? price : price + (price * (taxPct / 100));
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-black text-gray-900 dark:text-white truncate">
                                {name} {variant && <span className="text-gray-400 dark:text-gray-500 font-bold ml-1">({variant})</span>}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase mt-0.5">
                                {item.type} • {qty} x {currencySymbol}{displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <p className="text-[12px] font-black text-gray-900 dark:text-white ml-4 whitespace-nowrap">
                              {currencySymbol}{(displayPrice * qty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Financial Summary */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Payment Summary</h4>
                    <div className="p-5 bg-gray-900 dark:bg-dark-card rounded-2xl border border-gray-800 dark:border-dark-border shadow-xl space-y-4">
                      {(() => {
                        const f = getFinancials(selectedBooking);
                        return (
                          <>
                            <div className="space-y-2.5">
                              <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 dark:text-gray-500">
                                <span>Subtotal</span>
                                <span className="notranslate">{currencySymbol}{formatDisplayPrice(f.subtotal)}</span>
                              </div>
                              {f.tax > 0 && (
                                <div className="flex justify-between items-center text-[11px] font-bold text-emerald-400">
                                  <span>Tax (Included)</span>
                                  <span className="notranslate">{currencySymbol}{formatDisplayPrice(f.tax)}</span>
                                </div>
                              )}
                              {f.discount > 0 && (
                                <div className="flex justify-between items-center text-[11px] font-bold text-rose-400">
                                  <span>Discount Applied</span>
                                  <span className="notranslate">- {currencySymbol}{formatDisplayPrice(f.discount)}</span>
                                </div>
                              )}
                              {f.roundoff !== 0 && (
                                <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 dark:text-gray-500">
                                  <span>Rounding</span>
                                  <span className="notranslate">{f.roundoff > 0 ? "+" : ""}{currencySymbol}{formatDisplayPrice(Math.abs(f.roundoff))}</span>
                                </div>
                              )}
                            </div>
                            <div className="pt-4 border-t border-gray-800 dark:border-dark-border flex justify-between items-end">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Grand Total</span>
                                <span className="text-xl md:text-2xl font-black text-white notranslate">{currencySymbol}{formatDisplayPrice(f.total)}</span>
                              </div>
                              <div className="flex gap-2">
                                {selectedBooking.paymentMethod && (() => {
                                  let Icon = CreditCard;
                                  const pm = selectedBooking.paymentMethod.toLowerCase();
                                  if (pm.includes('cash')) Icon = Banknote;
                                  else if (pm.includes('upi') || pm.includes('online') || pm.includes('wallet')) Icon = Smartphone;

                                  return (
                                    <div className="px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 shadow-sm bg-gray-800 text-gray-200 border-gray-700 dark:bg-dark-surface/50 dark:text-gray-300 dark:border-dark-border">
                                      <Icon size={10} className="opacity-80" />
                                      {selectedBooking.paymentMethod}
                                    </div>
                                  );
                                })()}
                                {selectedBooking.paymentStatus && (
                                  <div className="px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest mb-1 bg-gray-800 text-gray-200 border-gray-700 dark:bg-dark-surface/50 dark:text-gray-300 dark:border-dark-border">
                                    {selectedBooking.paymentStatus === "Paid" ? "Paid" : "Pay In Store"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </section>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface flex gap-3">
                  {!["completed", "delivered", "cancelled"].includes(selectedBooking.status) && (
                    <>
                      <button 
                        onClick={(e) => { handleComplete(selectedBooking._id, e); setIsSheetOpen(false); }}
                        className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 active:scale-[0.98] transition-all"
                      >
                        Checkout
                      </button>
                      <button 
                        onClick={(e) => { handleCancel(selectedBooking._id, e); setIsSheetOpen(false); }}
                        className="px-6 py-4 bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-2xl border border-gray-100 dark:border-dark-border transition-all group"
                      >
                        <X size={20} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </>
                  )}
                  {["completed", "delivered"].includes(selectedBooking.status) && (
                    <div className="w-full py-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-sm">
                      <CheckCircle size={18} /> {selectedBooking.status === "delivered" ? "Delivered" : "Completed"}
                    </div>
                  )}
                  {selectedBooking.status === "cancelled" && (
                    <div className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-sm">
                      <XCircle size={18} /> Cancellation Logged
                    </div>
                  )}
                </div>
              </Motion.div>
            </>
          )}
        </AnimatePresence>
    </div>
  );
};

export default BookingsTimeline;
