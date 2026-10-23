import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, CheckCircle2, CalendarPlus, MapPin, MessageCircle, Store, Smartphone, Download } from "lucide-react";
import moment from "moment";
import { useAuth } from "../../auth/hooks/useAuth";
import api from "../../../api/axiosInstance";
import { BookingDetailsScreenSkeleton } from "../../../components/user/skeletons";

const formatDuration = (mins) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
};

// ─── Calendar Helpers ───────────────────────────────────────────────────────

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

const addToPhoneCalendar = ({ title, startTime, endTime, description, location }) => {
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

  // Fallback: generate .ics file
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

// ─── Calendar Bottom Sheet ──────────────────────────────────────────────────

const CalendarSheet = ({ isOpen, onClose, eventData }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !eventData) return null;

  const { title, startTime, endTime, description, location } = eventData;

  const handleGoogleCalendar = () => {
    const url = buildGoogleCalendarUrl({ title, startTime, endTime, description, location });
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handlePhoneCalendar = () => {
    addToPhoneCalendar({ title, startTime, endTime, description, location });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-300" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-surface rounded-t-[20px]"
        style={{ animation: "slideUp 0.3s ease-out forwards" }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-dark-border" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-black dark:text-white">Add to Calendar</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center">
            <X size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="mx-5 mb-4 p-3 bg-gray-50 dark:bg-dark-card rounded-xl">
          <p className="text-[14px] font-semibold text-black dark:text-white truncate">{title}</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            {startTime.format("ddd, MMM D, YYYY")} &bull; {startTime.format("h:mm A")} – {endTime.format("h:mm A")}
          </p>
          {location && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate"> {location}</p>}
        </div>

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
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold text-[14px] hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={isCancelling}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-[14px] hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
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

const BookingDetails = () => {
  const { shopSlug, appointmentId } = useParams();
  const navigate = useNavigate();
  const { currencySymbol, shopConfig } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branchLocation, setBranchLocation] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelBooking = async () => {
    try {
      setIsCancelling(true);
      const res = await api.put(`/appointments/my/${appointmentId}/cancel`);
      if (res.data.success) {
        setBooking(prev => ({ ...prev, status: "cancelled" }));
        setShowCancelModal(false);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/appointments/my/${appointmentId}`);
        if (res.data.success) {
          const appointmentData = res.data.data;
          setBooking(appointmentData);
          
          // Use populated branchId data directly if available
          if (appointmentData.branchId && typeof appointmentData.branchId === 'object' && appointmentData.branchId.mapAddress) {
            setBranchLocation(appointmentData.branchId);
          } else {
            // Try to fetch branch location separately
            const branchId = appointmentData.branchId?._id || appointmentData.branchId;
            if (branchId) {
              try {
                const branchRes = await api.get(`/shops/${branchId}`);
                if (branchRes.data.success && branchRes.data.data) {
                  setBranchLocation(branchRes.data.data);
                }
              } catch (e) {
                // Fallback: fetch all branches and find matching or use selected
                try {
                  const allBranches = await api.get("/shops");
                  if (allBranches.data.success && allBranches.data.data?.length > 0) {
                    const match = allBranches.data.data.find(b => b._id === branchId);
                    const userSelected = localStorage.getItem("selectedBranchId");
                    const selectedMatch = userSelected ? allBranches.data.data.find(b => b._id === userSelected) : null;
                    setBranchLocation(match || selectedMatch || allBranches.data.data[0]);
                  }
                } catch (e2) { /* ignore */ }
              }
            } else {
              // No branchId - use user's selected branch or first
              try {
                const allBranches = await api.get("/shops");
                if (allBranches.data.success && allBranches.data.data?.length > 0) {
                  const userSelected = localStorage.getItem("selectedBranchId");
                  const selectedMatch = userSelected ? allBranches.data.data.find(b => b._id === userSelected) : null;
                  setBranchLocation(selectedMatch || allBranches.data.data[0]);
                }
              } catch (e) { /* ignore */ }
            }
          }
        }
        // Fetch cover image from business config gallery
        try {
          const profileRes = await api.get("/admin/profile");
          if (profileRes.data.success) {
            const galleryImages = profileRes.data.data?.salon?.galleryImages;
            if (galleryImages && galleryImages.length > 0) {
              const primary = galleryImages.find(img => img.isPrimary);
              const cover = primary || galleryImages[0];
              if (cover?.url) setCoverImage(cover.url);
            }
          }
        } catch (e) {
          // ignore
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [appointmentId]);

  if (loading) {
    return <BookingDetailsScreenSkeleton />;
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-surface flex flex-col items-center justify-center px-5">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Booking not found</p>
        <button
          onClick={() => navigate(`/${shopSlug}/user/bookings`)}
          className="px-5 py-2.5 rounded-full bg-black text-white text-[14px] font-semibold"
        >
          Back to bookings
        </button>
      </div>
    );
  }

  const shopName = booking.shopId?.name || shopConfig?.shopName || "Shop";
  
  // Build branch address - prioritize mapAddress from the booked branch
  const shopAddress = (() => {
    // First check the populated branchId on the booking itself
    if (booking.branchId && typeof booking.branchId === 'object') {
      if (booking.branchId.mapAddress) return booking.branchId.mapAddress;
      if (booking.branchId.address) return booking.branchId.address;
    }
    // Then check branchLocation (fetched separately)
    if (branchLocation?.mapAddress) return branchLocation.mapAddress;
    if (branchLocation?.address) return branchLocation.address;
    const shopAddr = shopConfig?.address;
    if (shopAddr && shopAddr !== "N/A") return shopAddr;
    // Build from shopConfig parts
    const parts = [shopConfig?.area, shopConfig?.state, shopConfig?.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  })();
  
  // Get cover image from shopConfig gallery or fallback
  const galleryImages = shopConfig?.galleryImages || [];
  const primaryGallery = galleryImages.find(img => img.isPrimary);
  const gallerycover = primaryGallery?.url || galleryImages[0]?.url || null;
  const heroImage = coverImage || gallerycover || booking.shopId?.galleryImage || booking.shopId?.image?.url || null;

  const startTime = booking.slotTimes?.[0] || "";
  const dateLabel = booking.date ? moment(booking.date).format("dddd, D MMM") : "";
  const isToday = booking.date ? moment(booking.date).isSame(moment(), "day") : false;
  const dateDisplay = isToday ? "Today" : dateLabel;

  const totalDuration = booking.duration || booking.services?.reduce((sum, s) => sum + (s.serviceId?.duration || 0), 0) || 0;


  const openDirections = () => {
    if (branchLocation?.latitude && branchLocation?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${branchLocation.latitude},${branchLocation.longitude}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else {
      const query = encodeURIComponent(shopAddress || shopName);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
    }
  };

  const openWhatsApp = () => {
    const whatsappNumber = shopConfig?.whatsapp || shopConfig?.phone || "";
    if (whatsappNumber) {
      // Remove any non-digit characters except +
      const cleanNumber = whatsappNumber.replace(/[^\d+]/g, "");
      const message = encodeURIComponent(`Hi ${shopName}, I have a query about my booking on ${dateDisplay} at ${startTime}.`);
      window.open(`https://wa.me/${cleanNumber}?text=${message}`, "_blank", "noopener,noreferrer");
    }
  };

  // Safely calculate tax amount if invoice tax missing
  const getCalculatedTax = () => {
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

  const getCalculatedAmount = () => {
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

  const taxAmount = getCalculatedTax();
  const totalAmount = getCalculatedAmount();

  const handleDownloadInvoice = async () => {
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

  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface pb-20">
      {/* Hero Image */}
      <div className="relative h-[280px] w-full bg-gray-200 dark:bg-dark-border overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={shopName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
            <span className="text-white text-[48px] font-bold opacity-50">{shopName.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Close button - top right */}
        <button
          onClick={() => navigate(shopSlug ? `/${shopSlug}/user/bookings` : "/user/bookings")}
          className="absolute top-4 right-4 w-[38px] h-[38px] rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          <X size={18} className="text-white" />
        </button>

        {/* Shop name on image */}
        <div className="absolute bottom-5 left-5 right-5">
          <h1 className="text-white text-[26px] font-bold leading-tight">{shopName}</h1>
          {shopAddress && (
            <p className="text-white/80 text-[13px] mt-1">{shopAddress}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-8">
        {/* Status Badges Container */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          {/* Confirmed pill */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            booking.status === "cancelled" ? "bg-red-500" :
            booking.status === "completed" ? "bg-green-500" :
            "bg-indigo-500"
          }`}>
            {booking.status === "cancelled" ? (
               <X size={14} className="text-white" />
            ) : (
               <CheckCircle2 size={14} className="text-white" />
            )}
            <span className="text-[12px] font-semibold text-white">
               {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "Confirmed"}
            </span>
          </div>

          {/* Payment Status Pill */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            booking.paymentStatus === "Paid" ? "bg-emerald-500" : "bg-amber-500"
          }`}>
            <span className="text-[12px] font-semibold text-white">
               {booking.paymentStatus === "Paid" ? "Paid Online" : "Pay In Store"}
            </span>
          </div>
        </div>

        {/* Time */}
        <h2 className="text-[24px] font-bold text-black dark:text-white leading-tight">
          {dateDisplay} at {startTime}
        </h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1 mb-6">{formatDuration(totalDuration)} duration</p>

        {/* Quick actions */}
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{ border: "1.5px solid #f0f0f0" }}
        >
          {[
            { icon: CalendarPlus, label: "Add to calendar", color: "#6366f1", onClick: () => setShowCalendarSheet(true) },
            { icon: MapPin, label: "Get directions", color: "#6366f1", onClick: openDirections },
            { icon: MessageCircle, label: "Send message", color: "#6366f1", onClick: openWhatsApp },
            { icon: Store, label: "Venue details", color: "#6366f1", onClick: () => navigate(`/${shopSlug}/user/home`) },
            ...(booking.status === "completed" && booking.invoice ? [{ icon: Download, label: "Download Invoice", color: "#6366f1", onClick: handleDownloadInvoice }] : []),
          ].map((item, idx, arr) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.onClick}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                style={{ borderBottom: idx < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}
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

        {/* Overview */}
        <h2 className="text-[20px] font-bold text-black dark:text-white mb-3">Overview</h2>
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ border: "1.5px solid #f0f0f0" }}
        >
          {(booking.services || []).map((s, idx) => (
            <div key={idx} className="flex items-start justify-between py-2">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[14px] font-bold text-black dark:text-white leading-tight">
                  {s.serviceId?.name || "Service"}{s.variantName ? ` ${s.variantName}` : ""}
                </p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatDuration(s.serviceId?.duration || 0)}
                </p>
              </div>
              <p className="text-[14px] font-bold text-black dark:text-white flex-shrink-0">
                {currencySymbol}{Number(s.price || 0).toFixed(shopConfig?.decimalPrecision ?? 2)}
              </p>
            </div>
          ))}

          {/* Totals */}
          <div className="border-t border-gray-100 dark:border-dark-border mt-3 pt-3 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-black dark:text-white">{currencySymbol}{Number(totalAmount - taxAmount).toFixed(shopConfig?.decimalPrecision ?? 2)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500 dark:text-gray-400">Tax</span>
              <span className="text-black dark:text-white">{currencySymbol}{Number(taxAmount).toFixed(shopConfig?.decimalPrecision ?? 2)}</span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-gray-50">
              <span className="text-[14px] font-bold text-black dark:text-white">Total</span>
              <span className="text-[14px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(shopConfig?.decimalPrecision ?? 2)}</span>
            </div>
          </div>
        </div>

        {/* Cancellation Section */}
        {(() => {
          const dateOnly = moment(booking.date).format("YYYY-MM-DD");
          const time = booking.slotTimes?.[0] || "12:00 PM";
          const start = moment(`${dateOnly} ${time}`, ["YYYY-MM-DD h:mm A", "YYYY-MM-DD H:mm", "YYYY-MM-DD HH:mm"]);
          const validStart = start.isValid() ? start : moment(booking.date);
          const isUpcoming = validStart.isSameOrAfter(moment());
          return booking.status !== "cancelled" && booking.status !== "completed" && booking.status !== "no_show" && isUpcoming && (
            <div className="mt-8">
              <h2 className="text-[20px] font-bold text-red-600 mb-3">Cancel Booking</h2>
              <div className="rounded-2xl p-4 bg-red-50 border border-red-100">
                <p className="text-[13px] text-red-800 mb-4">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-3 rounded-xl bg-white dark:bg-dark-surface border border-red-200 text-red-600 font-bold text-[14px] hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancel Appointment
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Calendar Bottom Sheet */}
      {booking && (() => {
        const serviceNames = (booking.services || []).map(s => s.serviceId?.name || "Service").join(", ");
        const dateOnly = moment(booking.date).format("YYYY-MM-DD");
        const time = booking.slotTimes?.[0] || "12:00 PM";
        const start = moment(`${dateOnly} ${time}`, ["YYYY-MM-DD h:mm A", "YYYY-MM-DD H:mm", "YYYY-MM-DD HH:mm"]);
        const validStart = start.isValid() ? start : moment(booking.date);
        const durationMins = totalDuration || 30;
        const end = moment(validStart).add(durationMins, "minutes");
        const title = `${serviceNames} at ${shopName}`;
        const description = [
          `Service: ${serviceNames}`,
          totalDuration ? `Duration: ${formatDuration(totalDuration)}` : "",
          `Shop: ${shopName}`,
          shopAddress ? `Address: ${shopAddress}` : "",
        ].filter(Boolean).join("\n");

        return (
          <CalendarSheet
            isOpen={showCalendarSheet}
            onClose={() => setShowCalendarSheet(false)}
            eventData={{
              title,
              startTime: validStart,
              endTime: end,
              description,
              location: shopAddress,
            }}
          />
        );
      })()}

      <CancelConfirmModal 
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelBooking}
        isCancelling={isCancelling}
      />
    </div>
  );
};

export default BookingDetails;
