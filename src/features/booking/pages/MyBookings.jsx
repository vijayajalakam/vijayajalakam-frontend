import React, { useEffect, useMemo, useState, useRef } from "react";
import { Calendar, Search, RefreshCw, Smartphone, Globe, X, MapPin, CalendarPlus, MessageCircle, Store, Download } from "lucide-react";
import moment from "moment";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useGetMyGlobalBookingsQuery } from "../../../store/api/tenantEndpoints";
import { addSelectedService, setShopContext, clearBookingFlow } from "../../../store/slices/bookingFlowSlice";
import { BookingsScreenSkeleton } from "../../../components/user/skeletons";
import UserDesktopShell from "../../../components/user/UserDesktopShell";
import api from "../../../api/axiosInstance";

const fallbackImages = [
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1521590832167-7bfcbaa6362d?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&q=80&w=600",
];

const getBookingMoment = (booking) => {
  const dateOnly = moment(booking.date).format("YYYY-MM-DD");
  const time = booking.slotTimes?.[0] || "12:00 AM";
  const m = moment(`${dateOnly} ${time}`, [
    "YYYY-MM-DD h:mm A",
    "YYYY-MM-DD H:mm",
    "YYYY-MM-DD HH:mm",
  ]);
  return m.isValid() ? m : moment(booking.date);
};

// ─── Calendar Helpers ───────────────────────────────────────────────────────

/**
 * Build a Google Calendar URL from booking data
 */
const buildGoogleCalendarUrl = ({ title, startTime, endTime, description, location }) => {
  const fmt = "YYYYMMDDTHHmmss";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startTime.format(fmt)}/${endTime.format(fmt)}`,
    details: description,
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Add event to phone calendar via Flutter native bridge or .ics fallback
 */
const addToPhoneCalendar = ({ title, startTime, endTime, description, location }) => {
  // Try Flutter native handler first (for mobile app)
  if (window.flutter_inappwebview?.callHandler) {
    window.flutter_inappwebview.callHandler("flutterAddToCalendar", {
      title,
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString(),
      description,
      location: location || "",
    });
    return;
  }

  // Fallback: generate .ics file for download (works on all platforms)
  const formatICS = (m) => m.utc().format("YYYYMMDDTHHmmss") + "Z";
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vijayajalakam//Booking//EN",
    "BEGIN:VEVENT",
    `DTSTART:${formatICS(startTime)}`,
    `DTEND:${formatICS(endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location || ""}`,
    `STATUS:CONFIRMED`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── Add to Calendar Bottom Sheet ───────────────────────────────────────────

const CalendarBottomSheet = ({ isOpen, onClose, booking, getShopName, getShopAddress, getDuration }) => {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const shopName = getShopName(booking);
  const when = getBookingMoment(booking);
  const duration = getDuration(booking);
  const durationMinutes = booking.services?.reduce((sum, s) => sum + ((s.serviceId || s)?.duration || 0), 0) || 30;
  const endTime = moment(when).add(durationMinutes, "minutes");
  const serviceName = booking.services?.[0]?.serviceId?.name || booking.services?.[0]?.name || "Appointment";
  const location = getShopAddress(booking);

  const title = `${serviceName} at ${shopName}`;
  const description = [
    `Service: ${serviceName}`,
    duration ? `Duration: ${duration}` : "",
    `Shop: ${shopName}`,
    location ? `Address: ${location}` : "",
  ].filter(Boolean).join("\n");

  const handleGoogleCalendar = () => {
    const url = buildGoogleCalendarUrl({ title, startTime: when, endTime, description, location });
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handlePhoneCalendar = () => {
    addToPhoneCalendar({ title, startTime: when, endTime, description, location });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-surface rounded-t-[20px] animate-slide-up"
        style={{ animation: "slideUp 0.3s ease-out forwards" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-dark-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-black dark:text-white">Add to Calendar</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center"
          >
            <X size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Event Preview */}
        <div className="mx-5 mb-4 p-3 bg-gray-50 dark:bg-dark-card rounded-xl">
          <p className="text-[14px] font-semibold text-black dark:text-white truncate">{title}</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            {when.format("ddd, MMM D, YYYY")} &bull; {when.format("h:mm A")} – {endTime.format("h:mm A")}
          </p>
          {location && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate"> {location}</p>
          )}
        </div>

        {/* Options */}
        <div className="px-5 pb-8 space-y-3">
          <button
            onClick={handlePhoneCalendar}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Smartphone size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-[15px] font-semibold text-black dark:text-white">Phone Calendar</p>
              <p className="text-[12px] text-gray-400 dark:text-gray-500">Add to your device's default calendar</p>
            </div>
          </button>

          <button
            onClick={handleGoogleCalendar}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M18.316 5.684H5.684v12.632h12.632V5.684z" fill="#fff"/>
                <path d="M18.316 23.368l4.632-4.632h-4.632v4.632z" fill="#EA4335"/>
                <path d="M23 18.684V5.316L18.316 1v4.684H5.684V1L1 5.316v13.368L5.684 23h12.632l4.684-4.316z" fill="#FBBC04"/>
                <path d="M18.316 18.684H5.684V23h12.632v-4.316z" fill="#34A853"/>
                <path d="M5.684 18.684V5.684H1v13.368L5.684 23v-4.316z" fill="#188038"/>
                <path d="M18.316 5.684V1L23 5.316v.368h-4.684z" fill="#1967D2"/>
                <path d="M5.684 5.684H1v.368L5.684 1v4.684z" fill="#1967D2"/>
                <path d="M18.316 5.684H5.684v12.632h12.632V5.684z" fill="#fff"/>
                <path d="M8.5 16.2V8.4h1.8l2.7 5.4 2.7-5.4h1.8v7.8h-1.5v-5.7l-2.4 4.8h-1.2l-2.4-4.8v5.7H8.5z" fill="#4285F4" opacity="0"/>
                <path d="M9.2 15.5v-1.2h2.4v-1.2H9.8v-1.2h1.8v-1.2H9.2V9.5h3.6v6H9.2z" fill="#EA4335" opacity="0"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[15px] font-semibold text-black dark:text-white">Google Calendar</p>
              <p className="text-[12px] text-gray-400 dark:text-gray-500">Open in Google Calendar</p>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const CancelConfirmModal = ({ isOpen, onClose, onConfirm, isCancelling }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={!isCancelling ? onClose : undefined} />
      <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-full max-w-[320px] relative z-10 shadow-xl" style={{ animation: "scaleUp 0.2s ease-out forwards" }}>
        <h3 className="text-[18px] font-bold text-black dark:text-white mb-2 text-center">Cancel Booking?</h3>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 text-center mb-6">
          Are you sure you want to cancel this booking? This action cannot be undone.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold text-[14px] hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card cursor-pointer"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={isCancelling}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-[14px] hover:bg-red-700 disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {isCancelling ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : "Yes, Cancel"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const MyBookings = () => {
  const { currencySymbol } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { data: bookingsData = [], isLoading: loading, refetch } = useGetMyGlobalBookingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [isScrolled, setIsScrolled] = useState(false);
  const [calendarBooking, setCalendarBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModalId, setShowCancelModalId] = useState(null);

  const handleCancelBookingDesktop = async (bookingId) => {
    try {
      setIsCancelling(true);
      const res = await api.put(`/appointments/my/${bookingId}/cancel`);
      if (res.data.success) {
        refetch();
        setSelectedBooking(prev => prev?._id === bookingId ? { ...prev, status: "cancelled" } : prev);
        setShowCancelModalId(null);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { upcoming, completed, past, cancelled } = useMemo(() => {
    const now = moment(nowTick);
    const enriched = bookingsData.map((b) => ({ booking: b, when: getBookingMoment(b) }));
    const uList = [];
    const cList = [];
    const pList = [];
    const canList = [];

    for (const { booking, when } of enriched) {
      const status = booking.status?.toLowerCase() || 'pending';
      if (status === 'cancelled') {
        canList.push({ booking, when });
      } else if (status === 'completed' || status === 'delivered') {
        cList.push({ booking, when });
      } else if (when.isBefore(now) || status === 'no_show') {
        pList.push({ booking, when });
      } else {
        uList.push({ booking, when });
      }
    }

    uList.sort((a, b) => a.when.valueOf() - b.when.valueOf());
    cList.sort((a, b) => b.when.valueOf() - a.when.valueOf());
    pList.sort((a, b) => b.when.valueOf() - a.when.valueOf());
    canList.sort((a, b) => b.when.valueOf() - a.when.valueOf());

    return {
      upcoming: uList.map((x) => x.booking),
      completed: cList.map((x) => x.booking),
      past: pList.map((x) => x.booking),
      cancelled: canList.map((x) => x.booking),
    };
  }, [bookingsData, nowTick]);

  // Auto-select booking on desktop (from navigation state or first booking)
  useEffect(() => {
    const stateBookingId = location.state?.selectedBookingId;
    if (stateBookingId) {
      const found = [...upcoming, ...past].find(b => b._id === stateBookingId);
      if (found) {
        setSelectedBooking(found);
        return;
      }
    }
    if (!selectedBooking && (upcoming.length > 0 || past.length > 0)) {
      setSelectedBooking(upcoming[0] || past[0]);
    }
  }, [upcoming, past, location.state]);

  const handleDownloadInvoice = async (booking) => {
    if (!booking.invoice?._id) return;
    try {
      const res = await api.get(`/invoices/${booking.invoice._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${booking.invoice._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download invoice');
    }
  };

  const getShopImage = (booking) => {
    if (booking.shopId?.galleryImage) return booking.shopId.galleryImage;
    if (booking.shopId?.image?.url) return booking.shopId.image.url;
    if (booking.shop?.image?.url) return booking.shop.image.url;
    const idStr = booking.shopId?._id?.toString?.() || booking.shopId?.slug || "default";
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    return fallbackImages[Math.abs(hash) % fallbackImages.length];
  };

  const getShopName = (booking) =>
    booking.shopId?.name || booking.shop?.name || "Unknown Shop";

  const getShopCurrency = (booking) =>
    booking.shopId?.currencySymbol || booking.shop?.currencySymbol || currencySymbol || "₹";

  const getShopAddress = (booking) =>
    booking.branchId?.mapAddress || booking.branchId?.address || booking.shopId?.address || booking.shop?.address || "";

  const getBookingAmount = (booking) => {
    if (!booking) return 0;
    if (booking.invoice?.amount) {
      return booking.invoice.amount + (booking.invoice.taxAmount || booking.invoice.tax || 0);
    }
    let total = 0;
    booking.services?.forEach(s => {
      const serviceObj = s.serviceId || s;
      const price = s.price || serviceObj?.price || 0;
      const taxPct = s.taxPercentage !== undefined ? s.taxPercentage : (serviceObj?.taxPercentage || serviceObj?.taxId?.percentage || 0);
      const isInc = s.isTaxInclusive !== undefined ? s.isTaxInclusive : (serviceObj?.isTaxInclusive || false);
      const taxAmt = isInc ? 0 : price * (taxPct / 100);
      total += price + taxAmt;
    });
    booking.products?.forEach(p => {
      const prodObj = p.product || p;
      const price = p.price || prodObj?.price || 0;
      const qty = p.quantity || 1;
      const taxPct = p.taxPercentage !== undefined ? p.taxPercentage : (p.taxPercent || prodObj?.taxPercentage || prodObj?.taxId?.percentage || 0);
      const isInc = p.isTaxInclusive !== undefined ? p.isTaxInclusive : (prodObj?.isTaxInclusive || false);
      const lineTotal = price * qty;
      const taxAmt = isInc ? 0 : lineTotal * (taxPct / 100);
      total += lineTotal + taxAmt;
    });
    return total;
  };

  const getBookingTax = (booking) => {
    if (!booking) return 0;
    if (booking.invoice?.taxAmount !== undefined && booking.invoice?.taxAmount > 0) return booking.invoice.taxAmount;
    if (booking.invoice?.tax !== undefined && booking.invoice?.tax > 0) return booking.invoice.tax;
    
    let tax = 0;
    booking.services?.forEach(s => {
      const serviceObj = s.serviceId || s;
      const price = s.price || serviceObj?.price || 0;
      const taxPct = s.taxPercentage !== undefined ? s.taxPercentage : (serviceObj?.taxPercentage || serviceObj?.taxId?.percentage || 0);
      const isInc = s.isTaxInclusive !== undefined ? s.isTaxInclusive : (serviceObj?.isTaxInclusive || false);
      tax += isInc ? price - (price / (1 + taxPct / 100)) : price * (taxPct / 100);
    });
    booking.products?.forEach(p => {
      const prodObj = p.product || p;
      const price = p.price || prodObj?.price || 0;
      const qty = p.quantity || 1;
      const taxPct = p.taxPercentage !== undefined ? p.taxPercentage : (p.taxPercent || prodObj?.taxPercentage || prodObj?.taxId?.percentage || 0);
      const isInc = p.isTaxInclusive !== undefined ? p.isTaxInclusive : (prodObj?.isTaxInclusive || false);
      const lineTotal = price * qty;
      tax += isInc ? lineTotal - (lineTotal / (1 + taxPct / 100)) : lineTotal * (taxPct / 100);
    });
    return tax;
  };

  const getTimeUntil = (booking) => {
    const when = getBookingMoment(booking);
    const now = moment(nowTick);
    const diffMs = when.diff(now);
    if (diffMs <= 0) return "Past due";
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor(totalMinutes / 60);
    if (days >= 1) return `In ${days} day${days > 1 ? "s" : ""}`;
    if (hours >= 1) return `In ${hours} hour${hours > 1 ? "s" : ""}`;
    return `In ${Math.max(totalMinutes, 1)} min${totalMinutes > 1 ? "s" : ""}`;
  };

  const getDuration = (booking) => {
    const totalMinutes = booking.services?.reduce((sum, s) => sum + ((s.serviceId || s)?.duration || 0), 0) || 0;
    if (totalMinutes === 0) return "";
    if (totalMinutes < 60) return `${totalMinutes} mins`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours} hr${mins > 0 ? ` ${mins} min` : ""}`;
  };

  const getPrimaryItemLabel = (booking) => {
    const shopName = getShopName(booking);
    const serviceName = booking.services?.[0]?.serviceId?.name;
    const productName = booking.products?.[0]?.product?.name;
    const itemName = serviceName || productName || "Booking";
    const more = (booking.services?.length || 0) + (booking.products?.length || 0) > 1 ? "..." : "";
    return `${shopName} ${itemName}${more}`;
  };

  const getItemCountString = (booking) => {
    const total = (booking.services?.length || 0) + (booking.products?.length || 0);
    return `${total} item${total !== 1 ? "s" : ""}`;
  };

  const goToShop = (booking) => {
    const slug = booking.tenantSlug || booking.shopId?.slug || booking.shop?.slug;
    if (slug && booking._id) {
      navigate(`/${slug}/user/booking/${booking._id}`);
    } else if (slug) {
      navigate(`/${slug}/user/home`);
    }
  };

  const openDirections = (booking) => {
    if (booking.branchId?.latitude && booking.branchId?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${booking.branchId.latitude},${booking.branchId.longitude}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else {
      const address = booking.branchId?.mapAddress || getShopAddress(booking) || getShopName(booking);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
    }
  };

  const openWhatsApp = (booking) => {
    const whatsappNumber = booking.branchId?.phone || booking.shopId?.whatsapp || booking.shopId?.phone || booking.shop?.phone || "";
    if (whatsappNumber) {
      const shopName = getShopName(booking);
      const when = getBookingMoment(booking);
      const dateDisplay = when.format("ddd, MMM D, YYYY");
      const startTime = when.format("h:mm A");
      const cleanNumber = whatsappNumber.replace(/[^\d+]/g, "");
      const message = encodeURIComponent(`Hi ${shopName}, I have a query about my booking on ${dateDisplay} at ${startTime}.`);
      window.open(`https://wa.me/${cleanNumber}?text=${message}`, "_blank", "noopener,noreferrer");
    } else {
      alert("No contact number available for this venue.");
    }
  };

  const handleRebook = (booking) => {
    const slug = booking.tenantSlug || booking.shopId?.slug || booking.shop?.slug;
    if (!slug) return;

    // Clear previous booking flow and set up new one
    dispatch(clearBookingFlow());
    dispatch(setShopContext({
      shopSlug: slug,
      shopName: getShopName(booking),
      shopImage: booking.shopId?.galleryImage || booking.shopId?.image?.url || null,
    }));

    // Pre-select the services from this booking
    const services = booking.services || [];
    for (const s of services) {
      const serviceObj = s.serviceId || s;
      if (serviceObj?._id || serviceObj) {
        dispatch(addSelectedService({
          _id: serviceObj._id || serviceObj,
          name: serviceObj.name || s.name || "Service",
          price: s.price || serviceObj.price || 0,
          duration: serviceObj.duration || 0,
          variantId: s.variantId?._id || s.variantId || undefined,
          variantName: s.variantId?.name || s.variantName || undefined,
        }));
      }
    }

    navigate(`/${slug}/user/select-services`);
  };

  if (loading) {
    return (
      <UserDesktopShell activeItem="activity">
        <div className="hidden md:block">
          <h1 className="text-[26px] font-bold text-black dark:text-white mb-6">Bookings</h1>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-dark-border">
                <div className="h-[180px] bg-gray-100 dark:bg-dark-card animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-1/2 bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="md:hidden">
          <BookingsScreenSkeleton />
        </div>
      </UserDesktopShell>
    );
  }

  return (
    <UserDesktopShell activeItem="activity">
    <div className="min-h-screen bg-white dark:bg-dark-surface pb-24">
      {/* Sticky App Bar — mobile only */}
      <div
        className="sticky top-0 z-20 bg-white dark:bg-dark-surface transition-shadow duration-200 md:hidden"
        style={{ boxShadow: isScrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
      >
        <div className="flex items-center justify-between px-4 h-[56px]">
          <span
            className="text-[16px] font-semibold text-black dark:text-white transition-opacity duration-200"
            style={{ opacity: isScrolled ? 1 : 0 }}
          >
            Activity
          </span>
          <button
            className="w-[36px] h-[36px] rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center bg-white dark:bg-dark-surface transition-opacity duration-200"
            style={{ opacity: isScrolled ? 1 : 0, pointerEvents: isScrolled ? "auto" : "none" }}
          >
            <Search size={16} className="text-gray-900 dark:text-white" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Header — mobile only */}
      <div className="pt-2 px-5 pb-5 flex items-center justify-between md:hidden">
        <h1 className="text-black dark:text-white" style={{ fontSize: "30px", fontWeight: 600, lineHeight: 1.1 }}>Activity</h1>
        <button className="w-[42px] h-[42px] rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center bg-white dark:bg-dark-surface">
          <Search size={18} className="text-gray-900 dark:text-white" strokeWidth={1.8} />
        </button>
      </div>

      {/* Desktop heading */}
      <div className="hidden md:block mb-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[26px] font-bold text-black dark:text-white">Bookings</h1>
          <button className="w-9 h-9 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors">
            <Search size={16} className="text-gray-700 dark:text-gray-300" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ===== DESKTOP: 2-column layout (left: list, right: detail) ===== */}
      <div className="hidden md:flex gap-8">
        {/* Left Column — Lists */}
        <div className="w-[420px] shrink-0 space-y-8">
          {(() => {
            const renderDesktopList = (title, list, showEmptyState = false) => {
              if (list.length === 0 && !showEmptyState) return null;
              return (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-[18px] font-bold text-black dark:text-white">{title}</h2>
                    <span className="text-[14px] text-gray-400 dark:text-gray-500">{list.length}</span>
                  </div>

                  {list.length === 0 ? (
                    <div className="border border-gray-200 dark:border-dark-border rounded-2xl p-8 text-center">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Calendar size={20} className="text-purple-400" />
                      </div>
                      <h3 className="text-[16px] font-bold text-black dark:text-white mb-1">No upcoming appointments</h3>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">Your upcoming appointments will appear here when you book</p>
                      <button onClick={() => navigate("/user/search")} className="px-5 py-2 border border-gray-200 dark:border-dark-border rounded-full text-[13px] font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card transition-colors cursor-pointer bg-white dark:bg-dark-surface">
                        Search venues
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {list.map((booking) => {
                        const shopName = getShopName(booking);
                        const when = getBookingMoment(booking);
                        const displayDate = when.isSame(moment(), "day") ? "Today" : when.isSame(moment().add(1, "day"), "day") ? "Tomorrow" : when.format("ddd, MMM D, YYYY");
                        const timeStr = when.format("h:mm A");
                        const amount = getBookingAmount(booking);
                        const isSelected = selectedBooking?._id === booking._id;

                        return (
                          <div
                            key={booking._id}
                            onClick={() => setSelectedBooking(booking)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20/30' : 'border border-gray-200 dark:border-dark-border hover:border-gray-300'}`}
                          >
                            <div className="w-[80px] h-[60px] rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-card shrink-0">
                              <img src={getShopImage(booking)} alt={shopName} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[14px] font-bold text-black dark:text-white truncate">{shopName}</h4>
                              <p className="text-[12px] text-gray-500 dark:text-gray-400">{displayDate} at {timeStr}</p>
                              <div className="flex flex-col gap-1 mt-0.5">
                                <p className="text-[12px] text-gray-500 dark:text-gray-400">{getShopCurrency(booking)}{amount.toFixed(2)} · {getItemCountString(booking)}</p>
                                {booking.paymentStatus && (
                                  <div>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                      booking.paymentStatus === "Paid" 
                                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 text-emerald-600 dark:text-emerald-400" 
                                        : "bg-amber-50 border-amber-100 text-amber-600"
                                    }`}>
                                      {booking.paymentStatus === "Paid" ? "Paid" : "Pay in store"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {title !== 'Upcoming' && title !== 'Cancelled' && (
                                <button onClick={(e) => { e.stopPropagation(); handleRebook(booking); }} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 mt-0.5 bg-transparent border-none cursor-pointer p-0">
                                  Book again
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <>
                {renderDesktopList("Upcoming", upcoming, true)}
                {renderDesktopList("Completed", completed)}
                {renderDesktopList("Past", past)}
                {renderDesktopList("Cancelled", cancelled)}
              </>
            );
          })()}
        </div>

        {/* Right Column — Selected booking full detail */}
        <div className="flex-1 min-w-0 sticky top-[90px] self-start max-h-[calc(100vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {selectedBooking ? (() => {
            const booking = selectedBooking;
            const shopName = getShopName(booking);
            const when = getBookingMoment(booking);
            const displayDate = when.format("ddd, MMM D, YYYY");
            const timeStr = when.format("h:mm A");
            const duration = getDuration(booking);
            const status = booking.status?.toLowerCase();
            const amount = getBookingAmount(booking);
            const taxAmount = getBookingTax(booking);
            const currency = getShopCurrency(booking);
            const services = booking.services || [];
            const products = booking.products || [];
            const staffName = services[0]?.staffId?.name || services[0]?.staff?.name || null;
            const shopAddress = getShopAddress(booking);

            return (
              <div className="border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden">
                {/* Large Image */}
                <div className="relative h-[240px] w-full">
                  <img src={getShopImage(booking)} alt={shopName} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5">
                    <h3 className="text-white text-[24px] font-bold leading-tight">{shopName}</h3>
                    {shopAddress && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin size={13} className="text-white/80 shrink-0" />
                        <p className="text-white/90 text-[13px] font-medium truncate">{shopAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail Content */}
                <div className="p-6">
                  {/* Status badge */}
                  {status && status !== "confirmed" && status !== "pending" && (
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold ${
                        status === "completed" ? "bg-green-50 text-green-700" :
                        status === "cancelled" ? "bg-red-50 text-red-600" :
                        status === "no_show" ? "bg-red-50 text-red-600" :
                        "bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400"
                      }`}>
                        {status === "no_show" ? "No show" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  )}

                  {/* Date & Time */}
                  <h4 className="text-[20px] font-bold text-black dark:text-white mb-1">{displayDate} at {timeStr}</h4>
                  {duration && <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-5">{duration} duration</p>}

                  {/* Action buttons */}
                  <div
                    className="rounded-2xl overflow-hidden mb-8 border border-gray-100 dark:border-dark-border"
                  >
                    {[
                      { icon: CalendarPlus, label: "Add to calendar", color: "#6366f1", onClick: () => setCalendarBooking(booking) },
                      { icon: MapPin, label: "Get directions", color: "#6366f1", onClick: () => openDirections(booking) },
                      { icon: MessageCircle, label: "Send message", color: "#6366f1", onClick: () => openWhatsApp(booking) },
                      { icon: Store, label: "Venue details", color: "#6366f1", onClick: () => goToShop(booking) },
                      ...(status === "completed" && booking.invoice ? [{ icon: Download, label: "Download Invoice", color: "#6366f1", onClick: () => handleDownloadInvoice(booking) }] : []),
                      ...(past.some(p => p._id === booking._id) ? [{ icon: RefreshCw, label: "Book again", color: "#6366f1", onClick: () => handleRebook(booking) }] : []),
                    ].map((item, idx, arr) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={item.onClick}
                          className={`w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors bg-transparent border-none cursor-pointer ${idx < arr.length - 1 ? "border-b border-gray-100 dark:border-dark-border" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-[40px] h-[40px] rounded-full bg-indigo-50 flex items-center justify-center">
                              <Icon size={18} style={{ color: item.color }} />
                            </div>
                            <span className="text-[14px] font-medium text-black dark:text-white">{item.label}</span>
                          </div>
                          <span className="text-[18px] text-gray-300">›</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Overview — Services & Products */}
                  <div className="mt-6">
                    <h3 className="text-[18px] font-bold text-black dark:text-white mb-4">Overview</h3>
                    <div className="space-y-3">
                      {services.map((s, idx) => {
                        const svc = s.serviceId || s;
                        const svcName = svc?.name || s.name || "Service";
                        const svcDuration = svc?.duration || s.duration || 0;
                        const svcPrice = s.price || svc?.price || 0;
                        const variantName = s.variantName || s.variantId?.name || svc?.variantName || "";
                        const staffObj = s?.staffId || s?.staff || booking.staff;
                        const svcStaffName = staffObj?.name || staffObj?.firstName;
                        return (
                          <div key={idx} className="flex justify-between items-start">
                            <div>
                              <p className="text-[14px] font-semibold text-black dark:text-white">{svcName}{variantName ? ` - ${variantName}` : ""}</p>
                              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                                {svcDuration > 0 ? `${svcDuration} min` : ""}{svcStaffName ? ` with ${svcStaffName}` : ""}
                              </p>
                            </div>
                            <span className="text-[14px] font-medium text-black dark:text-white shrink-0">{currency}{svcPrice}</span>
                          </div>
                        );
                      })}
                      {products.map((p, idx) => {
                        const prod = p.product || p;
                        const prodName = prod?.name || p.name || p.productName || "Product";
                        const variantName = p.variantName || p.variantId?.name || prod?.variantName || "";
                        const qty = p.quantity || 1;
                        const lineTotal = (p.price || 0) * qty;
                        return (
                          <div key={`p-${idx}`} className="flex justify-between items-start">
                            <div>
                              <p className="text-[14px] font-semibold text-black dark:text-white">{prodName}{variantName ? ` - ${variantName}` : ""}</p>
                              <p className="text-[13px] text-gray-500 dark:text-gray-400">Qty: {qty}</p>
                            </div>
                            <span className="text-[14px] font-medium text-black dark:text-white shrink-0">{currency}{lineTotal}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totals */}
                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-dark-border space-y-2">
                      <div className="flex justify-between text-[13px] text-gray-500 dark:text-gray-400">
                        <span>Subtotal</span>
                        <span>{currency}{(amount - taxAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[13px] text-gray-500 dark:text-gray-400">
                        <span>Tax</span>
                        <span>{currency}{taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[15px] font-bold text-black dark:text-white pt-2 mt-2 border-t border-gray-50">
                        <span>Total</span>
                        <span>{currency}{amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Reference */}
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
                    <p className="text-[12px] text-gray-400 dark:text-gray-500">Booking reference {booking._id?.slice(-8).toUpperCase()}</p>
                  </div>

                  {/* Cancellation Section */}
                  {booking.status !== "cancelled" && booking.status !== "completed" && booking.status !== "no_show" && (
                    <div className="mt-8">
                      <h2 className="text-[20px] font-bold text-red-600 mb-3">Cancel Booking</h2>
                      <div className="rounded-2xl p-4 bg-red-50 border border-red-100">
                        <p className="text-[13px] text-red-800 mb-4">
                          Are you sure you want to cancel this booking? This action cannot be undone.
                        </p>
                        <button
                          onClick={() => setShowCancelModalId(booking._id)}
                          className="w-full py-3 rounded-xl bg-white dark:bg-dark-surface border border-red-200 text-red-600 font-bold text-[14px] hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="border border-gray-200 dark:border-dark-border rounded-2xl p-10 text-center">
              <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-[14px] text-gray-500 dark:text-gray-400">Select a booking to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== MOBILE: Original single-column layout ===== */}
      <div className="md:hidden px-5 space-y-8">
        {(() => {
          const renderMobileUpcomingList = (list) => {
            if (list.length === 0) return null;
            return (
              <section>
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="text-[18px] font-bold text-black dark:text-white">Upcoming</h2>
                  <span
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-border"
                  >
                    {list.length}
                  </span>
                </div>

                <div className="space-y-4">
                  {list.map((booking) => {
                    const shopName = getShopName(booking);
                    const when = getBookingMoment(booking);
                    const displayDate = when.isSame(moment(), "day")
                      ? "Today"
                      : when.isSame(moment().add(1, "day"), "day")
                      ? "Tomorrow"
                      : when.format("dddd, MMM D");
                    const timeStr = when.format("h:mm a");
                    const duration = getDuration(booking);
                    const amount = getBookingAmount(booking);

                    return (
                      <div
                        key={booking._id}
                        onClick={() => goToShop(booking)}
                        className="rounded-2xl overflow-hidden cursor-pointer border border-gray-200 dark:border-dark-border"
                        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
                      >
                        {/* Image */}
                        <div className="relative h-[160px] w-full">
                          <img src={getShopImage(booking)} alt={shopName} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4">
                            <p className="text-white/80 text-[12px] font-medium mb-0.5">{getTimeUntil(booking)}</p>
                            <h3 className="text-white text-[20px] font-bold truncate leading-tight">{shopName}</h3>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 bg-white dark:bg-dark-surface">
                          <h4 className="text-[15px] font-bold text-black dark:text-white mb-1">
                            {displayDate} at {timeStr}
                          </h4>
                          <div className="flex flex-col gap-1 mb-2">
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate font-medium">
                              {duration && <>{duration} &bull; </>}
                              {getShopCurrency(booking)}{amount.toFixed(2)} &bull; {getPrimaryItemLabel(booking)}
                            </p>
                            {booking.paymentStatus && (
                              <div>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                  booking.paymentStatus === "Paid" 
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-amber-50 border-amber-100 text-amber-600"
                                }`}>
                                  {booking.paymentStatus === "Paid" ? "Paid" : "Pay in store"}
                                </span>
                              </div>
                            )}
                          </div>
                          {getShopAddress(booking) && (
                            <p className="text-[12px] text-gray-400 dark:text-gray-500 mb-4 truncate">
                               {getShopAddress(booking)}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => { e.stopPropagation(); openDirections(booking); }}
                              className="px-4 py-2 rounded-full text-[13px] font-semibold text-black dark:text-white border border-gray-200 dark:border-dark-border"
                            >
                              Get directions
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCalendarBooking(booking); }}
                              className="w-[38px] h-[38px] rounded-full flex items-center justify-center border border-gray-200 dark:border-dark-border"
                            >
                              <Calendar size={16} className="text-gray-700 dark:text-gray-300" strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          };

          const renderMobilePastList = (title, list) => {
            if (list.length === 0) return null;
            return (
              <section>
                <h2 className="text-[18px] font-bold text-black dark:text-white mb-4">{title}</h2>
                <div className="space-y-4">
                  {list.map((booking) => {
                    const shopName = getShopName(booking);
                    const when = getBookingMoment(booking);
                    const displayDate = when.format("ddd, D MMM, YYYY");
                    const timeStr = when.format("h:mm a");
                    const amount = getBookingAmount(booking);

                    return (
                      <div
                        key={booking._id}
                        onClick={() => goToShop(booking)}
                        className="flex items-center gap-3 py-2 cursor-pointer"
                      >
                        {/* Image */}
                        <div className="w-[56px] h-[56px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-dark-card">
                          <img src={getShopImage(booking)} alt={shopName} className="w-full h-full object-cover" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[14px] font-bold text-black dark:text-white truncate leading-tight mb-0.5">{shopName}</h4>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate font-medium">
                            {displayDate} at {timeStr}
                          </p>
                          <div className="flex flex-col gap-1 mt-0.5">
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate font-medium">
                              {getShopCurrency(booking)}{amount.toFixed(2)} &bull; {getItemCountString(booking)}
                            </p>
                            {booking.paymentStatus && (
                              <div>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                  booking.paymentStatus === "Paid" 
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-amber-50 border-amber-100 text-amber-600"
                                }`}>
                                  {booking.paymentStatus === "Paid" ? "Paid" : "Pay in store"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rebook */}
                        {title !== 'Cancelled' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRebook(booking); }}
                            className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold text-black dark:text-white border border-gray-200 dark:border-dark-border"
                          >
                            Rebook
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          };

          return (
            <>
              {renderMobileUpcomingList(upcoming)}
              {renderMobilePastList("Completed", completed)}
              {renderMobilePastList("Past", past)}
              {renderMobilePastList("Cancelled", cancelled)}
              {upcoming.length === 0 && completed.length === 0 && past.length === 0 && cancelled.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={22} className="text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[16px] font-bold text-black dark:text-white mb-1">No activity yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-[13px]">When you book an appointment, it will show up here.</p>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Calendar Bottom Sheet */}
      <CalendarBottomSheet
        isOpen={!!calendarBooking}
        onClose={() => setCalendarBooking(null)}
        booking={calendarBooking}
        getShopName={getShopName}
        getShopAddress={getShopAddress}
        getDuration={getDuration}
      />

        <CancelConfirmModal 
          isOpen={!!showCancelModalId}
          onClose={() => setShowCancelModalId(null)}
          onConfirm={() => handleCancelBookingDesktop(showCancelModalId)}
          isCancelling={isCancelling}
        />
      </div>
    </UserDesktopShell>
  );
};

export default MyBookings;
