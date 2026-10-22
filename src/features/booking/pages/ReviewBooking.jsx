import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, X, Calendar, Clock, Star, ArrowRight, CreditCard, Loader, Phone, ChevronDown } from "lucide-react";
import moment from "moment";
import { useAuth } from "../../auth/hooks/useAuth";
import api from "../../../api/axiosInstance";
import {
  setPaymentMethod,
  selectSelectedServices,
  selectBookingTotal,
  selectBookingDuration,
  selectBookingDepartmentId,
  selectBookingBaseTotal,
  selectBookingTaxTotal,
} from "../../../store/slices/bookingFlowSlice";
import { selectSelectedBranchId, selectSelectedBranchAddress } from "../../../store/slices/userAppSlice";
import { appApi } from "../../../store/api/appApi";
import Snackbar from "../../../components/shared/Snackbar";
import { useExitBooking } from "../hooks/useExitBooking";
import ExitBookingSheet from "../components/ExitBookingSheet";

const formatDuration = (mins) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr, ${m} mins` : `${h} hr`;
};

const ReviewBooking = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currencySymbol, salonConfig, user, updateUser } = useAuth();

  const selectedServices = useSelector(selectSelectedServices);
  const totalAmount = useSelector(selectBookingTotal);
  const totalDuration = useSelector(selectBookingDuration);
  const selectedStaff = useSelector((state) => state.bookingFlow.selectedStaff);
  const perServiceStaff = useSelector((state) => state.bookingFlow.perServiceStaff);
  const selectedDate = useSelector((state) => state.bookingFlow.selectedDate);
  const selectedSlotTimes = useSelector((state) => state.bookingFlow.selectedSlotTimes);
  const paymentMethod = useSelector((state) => state.bookingFlow.paymentMethod);
  const selectedBranchId = useSelector(selectSelectedBranchId);
  const selectedBranchAddress = useSelector(selectSelectedBranchAddress);
  const departmentId = useSelector(selectBookingDepartmentId);
  const baseTotal = useSelector(selectBookingBaseTotal);
  const taxTotal = useSelector(selectBookingTaxTotal);

  const [isScrolled, setIsScrolled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [savingPhone, setSavingPhone] = useState(false);
  const { showExitSheet, openExit, cancelExit, confirmExit } = useExitBooking();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (selectedServices.length === 0 || !selectedDate) {
      navigate(`/${shopSlug}/user/select-services`, { replace: true });
    }
  }, [selectedServices.length, selectedDate, shopSlug, navigate]);

  useEffect(() => {
    if (salonConfig?.isRazorpayEnabled) {
      dispatch(setPaymentMethod("PAY_NOW"));
    } else {
      dispatch(setPaymentMethod("PAY_LATER"));
    }
  }, [salonConfig?.isRazorpayEnabled, dispatch]);

  const startTime = selectedSlotTimes?.[0] || "";
  const endTime = selectedSlotTimes?.length
    ? moment(selectedSlotTimes[selectedSlotTimes.length - 1], "h:mm A").add(15, "minutes").format("h:mm a")
    : "";

  const dateLabel = selectedDate ? moment(selectedDate).format("dddd, D MMMM") : "";

  const shopName = salonConfig?.salonName || "Shop";
  const shopAddress = selectedBranchAddress || (() => {
    const parts = [];
    if (salonConfig?.address && salonConfig.address !== "N/A") parts.push(salonConfig.address);
    else {
      if (salonConfig?.area) parts.push(salonConfig.area);
      if (salonConfig?.state) parts.push(salonConfig.state);
      if (salonConfig?.country) parts.push(salonConfig.country);
    }
    return parts.length > 0 ? parts.join(", ") : "";
  })();
  const shopRating = salonConfig?.avgRating || 4.9;
  const shopReviewsCount = salonConfig?.reviewsCount || 0;
  // Cover image: primary gallery image first, then coverImage/banner, finally logo
  const shopCover = (() => {
    const gallery = salonConfig?.galleryImages || [];
    if (gallery.length > 0) {
      const primary = gallery.find((img) => img.isPrimary);
      const url = (primary || gallery[0])?.url;
      if (url) return url;
    }
    return salonConfig?.coverImage || salonConfig?.banner || salonConfig?.logo || null;
  })();

  // Mobile: go to the standalone confirm-pay screen.
  const handleMobileContinue = () => navigate(`/${shopSlug}/user/confirm-pay`);

  // Desktop: payment options live on this screen, so confirm submits directly.
  const handleDesktopConfirm = async () => {
    const userPhone = user?.phone;
    if (!userPhone || userPhone === "N/A" || userPhone.trim() === "") {
      setShowPhoneSheet(true);
      return;
    }
    
    if (paymentMethod === "PAY_NOW" && salonConfig?.isRazorpayEnabled) {
      await processRazorpayPayment();
    } else {
      await submitBooking();
    }
  };

  const processRazorpayPayment = async () => {
    setSubmitting(true);
    try {
      const orderRes = await api.post("/appointments/razorpay/create-order", {
        amount: totalAmount,
        currency: salonConfig?.currency || "INR",
        receipt: `booking_${Date.now()}`,
      });

      if (!orderRes.data.success) {
        setSubmitting(false);
        return setSnack({ message: "Failed to create payment order", type: "error" });
      }

      const { orderId, apiKey, amount, currency } = orderRes.data.data;

      // Load Razorpay SDK if not already loaded
      const loadRazorpay = () => new Promise((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded) {
        setSubmitting(false);
        return setSnack({ message: "Razorpay SDK failed to load", type: "error" });
      }

      const rzpOptions = {
        key: apiKey,
        amount,
        currency,
        name: salonConfig?.salonName || "Salon Booking",
        description: "Payment for booking",
        order_id: orderId,
        handler: async function (response) {
          try {
            setSubmitting(true);
            await submitBooking(response.razorpay_payment_id);
          } catch (err) {
            setSnack({ message: "Booking failed after payment", type: "error" });
            setSubmitting(false);
          }
        },
        prefill: {
          name: user?.name || "",
          contact: user?.phone || "",
          email: user?.email || "",
          method: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "upi_intent" : "upi_qr"
        },
        theme: {
          color: "#111"
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          }
        }
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on("payment.failed", function (response) {
        setSnack({ message: response.error.description || "Payment failed", type: "error" });
        setSubmitting(false);
      });
      rzp.open();

    } catch (err) {
      setSnack({ message: "Could not initiate payment", type: "error" });
      setSubmitting(false);
    }
  };

  const handleSavePhone = async () => {
    if (!phoneNumber.trim() || phoneNumber.trim().length < 7) {
      setSnack({ message: "Please enter a valid phone number", type: "error" });
      return;
    }
    setSavingPhone(true);
    try {
      const res = await api.put("/user/profile", {
        name: user?.name,
        phone: phoneNumber.trim(),
        countryCode,
      });
      if (res.data.success) {
        updateUser({ phone: phoneNumber.trim(), countryCode });
        setShowPhoneSheet(false);
        setSnack({ message: "Phone number saved!", type: "success" });
        setTimeout(() => submitBooking(), 300);
      } else {
        setSnack({ message: res.data.message || "Failed to save phone number", type: "error" });
      }
    } catch (err) {
      setSnack({ message: err.response?.data?.message || "Failed to save phone number", type: "error" });
    } finally {
      setSavingPhone(false);
    }
  };

  const submitBooking = async (razorpayPaymentId = null) => {
    setSubmitting(true);
    try {
      const payload = {
        services: selectedServices.map((s) => {
          const key = `${s._id}:${s.variantId || ""}`;
          const perServiceAssigned = perServiceStaff[key];
          return {
            serviceId: s._id,
            variantId: s.variantId || undefined,
            price: s.basePrice !== undefined ? s.basePrice : s.price,
            variantName: s.variantName || undefined,
            staffId: perServiceAssigned?._id || undefined,
            isTaxInclusive: s.isTaxInclusive || false,
            taxPercentage: s.taxPercentage || 0,
          };
        }),
        date: selectedDate,
        slotTimes: selectedSlotTimes,
        branchId: selectedBranchId || undefined,
        departmentId: departmentId || undefined,
        staffId: selectedStaff?.type === "specific" ? selectedStaff._id : undefined,
        paymentMethod: paymentMethod === "PAY_NOW" ? "ONLINE" : "CASH",
        paymentStatus: paymentMethod === "PAY_NOW" ? "Paid" : "Unpaid",
        razorpayPaymentId,
      };

      const res = await api.post("/appointments", payload);
      if (res.data.success) {
        const appointmentId = res.data.data?._id;

        dispatch(appApi.util.invalidateTags([
          { type: "Appointment", id: "GLOBAL_LIST" },
          { type: "Appointment", id: "LIST" },
        ]));
        navigate(`/${shopSlug}/user/appointment-confirmed`, {
          state: { appointmentId },
          replace: true,
        });
      } else {
        setSnack({ message: res.data.message || "Failed to book", type: "error" });
        setSubmitting(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to book appointment";
      if (msg.includes("maximum booking capacity") || msg.includes("blocked")) {
        setSnack({ message: "This time slot is no longer available. Please select another time.", type: "error" });
        setTimeout(() => navigate(`/${shopSlug}/user/select-datetime`, { replace: true }), 1500);
      } else {
        setSnack({ message: msg, type: "error" });
      }
      setSubmitting(false);
    }
  };

  // ===== Shared render helpers =====
  const renderShopInfo = () => (
    <div className="flex items-start gap-3">
      <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-card flex-shrink-0">
        {shopCover ? (
          <img src={shopCover} alt={shopName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold">
            {shopName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-bold text-black dark:text-white leading-tight">{shopName}</h3>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[12px] font-bold text-black dark:text-white">{shopRating}</span>
          <div className="flex items-center gap-0.5 ml-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={10} fill="#FBBF24" color="#FBBF24" />
            ))}
          </div>
          {shopReviewsCount > 0 && (
            <span className="text-[12px] text-gray-500 dark:text-gray-400 ml-1">({shopReviewsCount})</span>
          )}
        </div>
        {shopAddress && <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 truncate">{shopAddress}</p>}
      </div>
    </div>
  );

  const renderDateTime = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
        <span className="text-[14px] font-semibold text-black dark:text-white">{dateLabel}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <Clock size={16} className="text-gray-500 dark:text-gray-400" />
        <span className="text-[14px] font-semibold text-black dark:text-white">
          {startTime}-{endTime} ({formatDuration(totalDuration)} duration)
        </span>
      </div>
    </div>
  );

  const renderServiceLines = () => (
    <div className="space-y-3">
      {selectedServices.map((service, idx) => {
        const key = `${service._id}:${service.variantId || ""}`;
        const staffName = selectedStaff?.type === "specific" ? selectedStaff.name : perServiceStaff?.[key]?.name;
        
        return (
        <div key={`${service._id}-${service.variantId || ""}-${idx}`} className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[14px] font-medium text-black dark:text-white leading-tight">
              {service.name}{service.variantName ? ` - ${service.variantName}` : ""}
            </p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDuration(service.duration)} {staffName ? `with ${staffName}` : "with any professional"}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[14px] font-bold text-black dark:text-white">
              {currencySymbol}{Number(service.price).toFixed(salonConfig?.decimalPrecision ?? 2)}
            </p>
            {service.originalPrice && service.originalPrice > service.price && (
              <p className="text-[12px] text-gray-400 dark:text-gray-500 line-through">
                {currencySymbol}{Number(service.originalPrice).toFixed(salonConfig?.decimalPrecision ?? 2)}
              </p>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );

  // Payment options card (desktop merged screen)
  const renderPaymentOptions = () => (
    <div className="bg-white dark:bg-dark-surface rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
      {/* Pay now in full (disabled for now) */}
      <button
        onClick={() => dispatch(setPaymentMethod("PAY_NOW"))}
        className="w-full flex items-center justify-between p-5 text-left"
        disabled={!salonConfig?.isRazorpayEnabled}
        style={{ opacity: salonConfig?.isRazorpayEnabled ? 1 : 0.5, cursor: salonConfig?.isRazorpayEnabled ? "pointer" : "not-allowed" }}
      >
        <div>
          <p className="text-[15px] font-bold text-black dark:text-white">Pay now in full</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Save time in store</p>
        </div>
        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
          style={{
            border: paymentMethod === "PAY_NOW" ? "none" : "2px solid #d1d5db",
            backgroundColor: paymentMethod === "PAY_NOW" ? "#6366f1" : "transparent",
          }}
        >
          {paymentMethod === "PAY_NOW" && <div className="w-[8px] h-[8px] rounded-full bg-white dark:bg-dark-surface" />}
        </div>
      </button>

      <div className="border-t border-gray-100 dark:border-dark-border" />

      {/* Pay in store later */}
      <button
        onClick={() => dispatch(setPaymentMethod("PAY_LATER"))}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
      >
        <div>
          <p className="text-[15px] font-bold text-black dark:text-white">Pay in store later</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">No deposit is required</p>
        </div>
        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
          style={{
            border: paymentMethod === "PAY_LATER" ? "none" : "2px solid #d1d5db",
            backgroundColor: paymentMethod === "PAY_LATER" ? "#6366f1" : "transparent",
          }}
        >
          {paymentMethod === "PAY_LATER" && <div className="w-[8px] h-[8px] rounded-full bg-white dark:bg-dark-surface" />}
        </div>
      </button>
    </div>
  );

  return (
    <>
      {/* ===== MOBILE LAYOUT (review only — Continue goes to confirm-pay) ===== */}
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-dark-bg pb-32 lg:hidden">
        {/* Sticky App Bar */}
        <div
          className="sticky top-0 z-20 bg-[#f5f5f7] dark:bg-dark-bg transition-shadow duration-200"
          style={{ boxShadow: isScrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
        >
          <div className="flex items-center justify-between px-4 h-[56px]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card -ml-1"
              >
                <ArrowLeft size={20} strokeWidth={2} className="text-black dark:text-white" />
              </button>
              <span
                className="text-[15px] font-semibold text-black dark:text-white transition-opacity duration-200"
                style={{ opacity: isScrolled ? 1 : 0 }}
              >
                Review and continue
              </span>
            </div>
            <button
              onClick={openExit}
              className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"
            >
              <X size={20} className="text-black dark:text-white" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="px-4 pt-2 pb-5">
          <h1 className="text-[24px] font-bold text-black dark:text-white">Review and continue</h1>
        </div>

        {/* Main Card */}
        <div className="px-4 mb-6">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-4" style={{ border: "1.5px solid #e5e7eb" }}>
            <div className="pb-4">{renderShopInfo()}</div>
            <div className="border-t border-gray-100 dark:border-dark-border" />
            <div className="py-4">{renderDateTime()}</div>
            <div className="border-t border-gray-100 dark:border-dark-border" />
            <div className="py-4">{renderServiceLines()}</div>
            <div className="border-t border-gray-100 dark:border-dark-border" />
            {taxTotal > 0 ? (
              <>
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="text-[14px] font-medium text-black dark:text-white">{currencySymbol}{Number(baseTotal).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
                </div>
                <div className="pt-3 flex items-center justify-between">
                  <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">Taxes</span>
                  <span className="text-[14px] font-medium text-black dark:text-white">{currencySymbol}{Number(taxTotal).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
                  <span className="text-[15px] font-bold text-black dark:text-white">Total</span>
                  <span className="text-[15px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
                </div>
              </>
            ) : (
              <div className="pt-4 flex items-center justify-between">
                <span className="text-[15px] font-bold text-black dark:text-white">Total</span>
                <span className="text-[15px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
              </div>
            )}
            <div className="pt-4 mt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
              <span className="text-[14px] text-black dark:text-white">Discounts and rewards</span>
              <button
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-black dark:text-white"
                style={{ border: "1.5px solid #e8e8e8" }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* More details */}
        <div className="px-4">
          <h2 className="text-[20px] font-bold text-black dark:text-white mb-3">More details</h2>
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 flex flex-col gap-3" style={{ border: "1.5px solid #e5e7eb" }}>
            <div>
              <p className="text-[15px] font-bold text-black dark:text-white">Cancellation policy</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Cancel for free anytime</p>
            </div>
            {salonConfig?.isRazorpayEnabled && (
              <>
                <div className="border-t border-gray-100 dark:border-dark-border" />
                <div>
                  <p className="text-[15px] font-bold text-black dark:text-white flex items-center gap-2"><CreditCard size={16} /> Secured by Razorpay</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Pay easily via UPI apps like GPay, PhonePe, Paytm, or scan the QR code.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface z-30 px-4 py-4"
          style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">Total</p>
              <p className="text-[16px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(salonConfig?.decimalPrecision ?? 2)}</p>
            </div>
            <button
              onClick={handleMobileContinue}
              className="px-7 py-3.5 rounded-full text-[14px] font-semibold text-white"
              style={{ backgroundColor: "#111" }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT (merged review + confirm/pay) ===== */}
      <div className="hidden lg:flex lg:flex-col min-h-screen bg-[#f5f5f7] dark:bg-dark-bg">
        {/* Desktop Sticky Header */}
        <div
          className="sticky top-0 z-20 bg-[#f5f5f7] dark:bg-dark-bg transition-shadow duration-200"
          style={{ boxShadow: isScrolled ? "0 1px 4px rgba(0,0,0,0.06)" : "none" }}
        >
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="flex items-center justify-between px-8 h-[56px]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="w-[40px] h-[40px] flex items-center justify-center rounded-full border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
                >
                  <ArrowLeft size={20} strokeWidth={2} className="text-black dark:text-white" />
                </button>
                {isScrolled && (
                  <span className="text-[16px] font-semibold text-black dark:text-white">Review and confirm</span>
                )}
              </div>
              <button
                onClick={openExit}
                className="w-[40px] h-[40px] flex items-center justify-center rounded-full border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
              >
                <X size={20} className="text-black dark:text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Main Content */}
        <div className="flex-1">
          <div className="max-w-[1200px] mx-auto w-full px-8">
            <div className="flex gap-10 pb-16">
              {/* Left Column */}
              <div className="flex-1 min-w-0">
                {/* Breadcrumb */}
                <div className="pt-6 pb-1">
                  <div className="flex items-center gap-2 text-[13px] text-gray-400 dark:text-gray-500">
                    <button onClick={() => navigate(`/${shopSlug}/user/select-services`)} className="hover:text-black dark:text-white hover:underline transition-colors">Services</button>
                    <span>&gt;</span>
                    <button onClick={() => navigate(`/${shopSlug}/user/select-professional`)} className="hover:text-black dark:text-white hover:underline transition-colors">Professional</button>
                    <span>&gt;</span>
                    <button onClick={() => navigate(`/${shopSlug}/user/select-datetime`)} className="hover:text-black dark:text-white hover:underline transition-colors">Time</button>
                    <span>&gt;</span>
                    <span className="font-semibold text-black dark:text-white">Confirm</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-[28px] font-bold text-black dark:text-white mt-2 mb-6">Review and confirm</h1>

                {/* Payment options */}
                {renderPaymentOptions()}

                {/* Payment method (only if Pay Now) */}
                {paymentMethod === "PAY_NOW" && (
                  <>
                    <h2 className="text-[20px] font-bold text-black dark:text-white mt-8 mb-3">Payment method</h2>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 flex items-center gap-3" style={{ border: "1px solid #e5e7eb" }}>
                      <div className="w-[44px] h-[44px] rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <CreditCard size={20} className="text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-bold text-black dark:text-white">No payment method</p>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Add credit/debit or gift card</p>
                      </div>
                      <button
                        className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                        style={{ border: "1.5px solid #e8e8e8" }}
                      >
                        Add
                      </button>
                    </div>
                  </>
                )}

                {/* More details */}
                <h2 className="text-[20px] font-bold text-black dark:text-white mt-8 mb-3">More details</h2>
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 flex flex-col gap-4" style={{ border: "1px solid #e5e7eb" }}>
                  <div>
                    <p className="text-[15px] font-bold text-black dark:text-white">Cancellation policy</p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Cancel for free anytime</p>
                  </div>
                  {salonConfig?.isRazorpayEnabled && (
                    <>
                      <div className="border-t border-gray-100 dark:border-dark-border" />
                      <div>
                        <p className="text-[15px] font-bold text-black dark:text-white flex items-center gap-2"><CreditCard size={16} /> Secured by Razorpay</p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">On the next screen, you will be able to scan a QR code to pay quickly via UPI or choose any other payment method.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column - spacer to reserve sidebar width */}
              <div className="w-[470px] flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Fixed Right Card - booking summary + Confirm */}
        <div
          className="fixed z-10 flex items-stretch"
          style={{
            width: "450px",
            height: "calc(100vh - 80px)",
            top: "80px",
            right: "max(20px, calc((100vw - 1200px) / 2 + 20px))",
            paddingTop: "28px",
            paddingBottom: "28px",
          }}
        >
          <div className="rounded-2xl bg-white dark:bg-dark-surface flex flex-col w-full" style={{ border: "1px solid #e5e7eb" }}>
            {/* Shop Info */}
            <div className="p-5 pb-4">{renderShopInfo()}</div>

            {/* Date/time + Selected Services */}
            <div className="flex-1 overflow-y-auto px-5">
              <div className="border-t border-gray-100 dark:border-dark-border pt-4">
                {(dateLabel || startTime) && (
                  <div className="pb-4 mb-1 border-b border-gray-100 dark:border-dark-border space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-[13px] font-semibold text-black dark:text-white">{dateLabel}</span>
                    </div>
                    {startTime && (
                      <div className="flex items-center gap-2.5">
                        <Clock size={15} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-[13px] font-semibold text-black dark:text-white">
                          {startTime}-{endTime} ({formatDuration(totalDuration)} duration)
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-4 pt-1">
                  {selectedServices.map((service, idx) => {
                    const key = `${service._id}:${service.variantId || ""}`;
                    const staffName = selectedStaff?.type === "specific" ? selectedStaff.name : perServiceStaff?.[key]?.name;

                    return (
                    <div key={`${service._id}-${service.variantId || idx}`}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-[14px] font-semibold text-black dark:text-white leading-tight">
                            {service.name}
                            {service.variantName && <span className="text-gray-500 dark:text-gray-400"> - {service.variantName}</span>}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatDuration(service.duration)} {staffName ? `with ${staffName}` : "with any professional"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[14px] font-semibold text-black dark:text-white block">
                            {currencySymbol}{Number(service.price).toFixed(salonConfig?.decimalPrecision ?? 2)}
                          </span>
                          {service.originalPrice && service.originalPrice > service.price && (
                            <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500 line-through block mt-0.5">
                              {currencySymbol}{Number(service.originalPrice).toFixed(salonConfig?.decimalPrecision ?? 2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Total + Confirm */}
            <div className="p-5 pt-3 mt-auto">
              {taxTotal > 0 && (
                <div className="space-y-3 mb-4 pt-4 border-t border-gray-100 dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="text-[13px] font-medium text-black dark:text-white">{currencySymbol}{Number(baseTotal).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Taxes</span>
                    <span className="text-[13px] font-medium text-black dark:text-white">{currencySymbol}{Number(taxTotal).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
                  </div>
                </div>
              )}
              <div className={`flex items-center justify-between mb-5 ${taxTotal === 0 ? 'pt-3 border-t border-gray-100 dark:border-dark-border' : 'pt-4 border-t border-gray-100 dark:border-dark-border'}`}>
                <span className="text-[15px] font-bold text-black dark:text-white">Total</span>
                <span className="text-[15px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
              </div>
              <button
                onClick={handleDesktopConfirm}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: "#111" }}
              >
                {submitting ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <>
                    {paymentMethod === "PAY_NOW" ? "Pay now" : "Confirm"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SHARED OVERLAYS ===== */}
      <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ ...snack, message: "" })} />

      {showExitSheet && <ExitBookingSheet onCancel={cancelExit} onConfirm={confirmExit} />}

      {showPhoneSheet && (
        <PhoneNumberSheet
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          onSave={handleSavePhone}
          onClose={() => setShowPhoneSheet(false)}
          saving={savingPhone}
        />
      )}
    </>
  );
};

// Phone Number Sheet (bottom sheet on mobile, centered modal on desktop)
const COUNTRY_CODES = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
  { code: "+966", country: "SA", flag: "🇸🇦" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
  { code: "+60", country: "MY", flag: "🇲🇾" },
  { code: "+94", country: "LK", flag: "🇱🇰" },
  { code: "+92", country: "PK", flag: "🇵🇰" },
  { code: "+880", country: "BD", flag: "🇧🇩" },
];

const PhoneNumberSheet = ({ countryCode, setCountryCode, phoneNumber, setPhoneNumber, onSave, onClose, saving }) => {
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const inputRef = useRef(null);
  const currentCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        style={{ animation: "phoneSheetFadeIn 0.2s ease-out" }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface z-50 flex flex-col rounded-t-3xl max-h-[70vh]
          lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-full lg:max-w-[440px] lg:max-h-[80vh] lg:shadow-2xl"
        style={{ animation: "phoneSheetSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 bg-gray-200 dark:bg-dark-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-[40px] h-[40px] rounded-full bg-indigo-50 flex items-center justify-center">
              <Phone size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-black dark:text-white">Add phone number</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">Required to confirm your booking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
          >
            <X size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-8">
          <div className="mt-2">
            <label className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Mobile number
            </label>
            <div
              className="flex items-center gap-0 rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid #e8e8e8", backgroundColor: "#fafafa" }}
            >
              <button
                onClick={() => setShowCountryPicker(!showCountryPicker)}
                className="flex items-center gap-1.5 px-4 py-4 border-r border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
              >
                <span className="text-[18px]">{currentCountry.flag}</span>
                <span className="text-[14px] font-semibold text-black dark:text-white">{countryCode}</span>
                <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
              </button>
              <input
                ref={inputRef}
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Enter your number"
                className="flex-1 px-4 py-4 text-[15px] font-medium text-black dark:text-white bg-transparent outline-none placeholder:text-gray-400"
                maxLength={15}
              />
            </div>
          </div>

          {showCountryPicker && (
            <div
              className="mt-2 bg-white dark:bg-dark-surface rounded-2xl overflow-hidden max-h-[180px] overflow-y-auto"
              style={{ border: "1.5px solid #f0f0f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            >
              {COUNTRY_CODES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCountryCode(c.code);
                    setShowCountryPicker(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left"
                  style={{ backgroundColor: c.code === countryCode ? "#f0f0ff" : "transparent" }}
                >
                  <span className="text-[18px]">{c.flag}</span>
                  <span className="text-[14px] font-medium text-black dark:text-white">{c.country}</span>
                  <span className="text-[13px] text-gray-500 dark:text-gray-400 ml-auto">{c.code}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onSave}
            disabled={saving || !phoneNumber.trim()}
            className="w-full mt-5 py-4 rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#111" }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size={16} className="animate-spin" />
                Saving...
              </span>
            ) : (
              "Save & Continue"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes phoneSheetFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes phoneSheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default ReviewBooking;
