import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, X, Calendar, ChevronDown, ArrowRight, ShoppingCart, Shuffle, Star, User, Check } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useLazyGetAppointmentSlotsQuery, useGetPublicStaffQuery } from "../../../store/api/tenantEndpoints";
import { useGetShopReviewsQuery } from "../../../store/api/homeEndpoints";
import { useExitBooking } from "../hooks/useExitBooking";
import ExitBookingSheet from "../components/ExitBookingSheet";
import { selectSelectedBranchId, selectSelectedBranchAddress } from "../../../store/slices/userAppSlice";
import {
  setSelectedDateTime,
  setSelectedStaff,
  setPerServiceStaff,
  selectSelectedServices,
  selectBookingTotal,
  selectBookingDuration,
} from "../../../store/slices/bookingFlowSlice";
import moment from "moment";

const formatDuration = (mins) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr, ${m} mins` : `${h} hr`;
};

const getServiceKey = (service) => `${service._id}:${service.variantId || ""}`;

const SelectDateTime = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currencySymbol, shopConfig } = useAuth();

  const selectedServices = useSelector(selectSelectedServices);
  const totalAmount = useSelector(selectBookingTotal);
  const totalDuration = useSelector(selectBookingDuration);
  const selectedStaff = useSelector((state) => state.bookingFlow.selectedStaff);
  const perServiceStaff = useSelector((state) => state.bookingFlow.perServiceStaff);
  const branchId = useSelector(selectSelectedBranchId);
  const selectedBranchAddress = useSelector(selectSelectedBranchAddress);

  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedTime, setSelectedTime] = useState(null);
  const [showProfessionalSheet, setShowProfessionalSheet] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  // When picking staff for a specific service: { service, key }
  const [pickingForService, setPickingForService] = useState(null);
  const { showExitSheet, openExit, cancelExit, confirmExit } = useExitBooking();

  const [fetchSlots, { data: slotsResponse, isLoading }] = useLazyGetAppointmentSlotsQuery();
  const { data: staffData = [] } = useGetPublicStaffQuery(undefined, { skip: !shopSlug });

  // Shop reviews + info for desktop sidebar
  const { data: reviewsData } = useGetShopReviewsQuery(undefined, { skip: !shopSlug });
  const shopAvgRating = reviewsData?.avgRating || 0;
  const shopReviewTotal = reviewsData?.total || 0;
  const shopName = shopConfig?.shopName || "";
  // Cover image: primary gallery image first, then coverImage/banner, finally logo
  const shopCover = (() => {
    const gallery = shopConfig?.galleryImages || [];
    if (gallery.length > 0) {
      const primary = gallery.find((img) => img.isPrimary);
      const url = (primary || gallery[0])?.url;
      if (url) return url;
    }
    return shopConfig?.coverImage || shopConfig?.banner || shopConfig?.logo || null;
  })();
  const shopAddress = (() => {
    if (selectedBranchAddress) return selectedBranchAddress;
    if (shopConfig?.address && shopConfig.address !== "N/A") return shopConfig.address;
    const parts = [shopConfig?.area, shopConfig?.state, shopConfig?.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  })();

  // Extract slots data from API response
  const slotsData = slotsResponse?.data || [];
  const isBlocked = slotsResponse?.blocked || false;
  const blockedReason = slotsResponse?.reason || "Not available";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (selectedServices.length === 0) {
      navigate(`/${shopSlug}/user/home`, { replace: true });
    }
  }, [selectedServices.length, shopSlug, navigate]);

  const dates = useMemo(() => {
    // Use maxBookingWindow from first slots response, or default 30 days
    const maxDays = slotsResponse?.maxBookingWindow || 30;
    const arr = [];
    for (let i = 0; i < maxDays; i++) {
      const d = moment().add(i, "days");
      arr.push({
        date: d.format("YYYY-MM-DD"),
        day: d.format("ddd"),
        dayNum: d.format("D"),
        month: d.format("MMM"),
      });
    }
    return arr;
  }, [slotsResponse]);

  useEffect(() => {
    if (selectedDate) {
      // Pass staffId to filter slots by staff availability
      const staffId = selectedStaff?.type === "specific" ? selectedStaff._id : undefined;
      fetchSlots({ date: selectedDate, branchId: branchId || undefined, staffId });
    }
  }, [selectedDate, fetchSlots, branchId, selectedStaff]);

  const timeSlots = useMemo(() => {
    let slots = [];
    if (slotsData && slotsData.length > 0) {
      slots = slotsData;
    } else {
      // No slots returned (shop might be closed or no settings)
      return [];
    }

    // Filter out past times if selected date is today
    const isToday = moment(selectedDate).isSame(moment(), "day");
    if (isToday) {
      const now = moment();
      slots = slots.filter((time) => {
        const slotMoment = moment(time, ["h:mm A", "h:mm a", "H:mm", "HH:mm"]);
        // Set the date to today for comparison
        slotMoment.year(now.year()).month(now.month()).date(now.date());
        return slotMoment.isAfter(now);
      });
    }

    return slots;
  }, [slotsData, selectedDate]);

  const handleContinue = () => {
    if (!selectedTime) return;
    const startTime = moment(selectedTime, "h:mm a");
    const slotsCount = Math.ceil(totalDuration / 15);
    const slotTimes = [];
    for (let i = 0; i < slotsCount; i++) {
      slotTimes.push(startTime.clone().add(i * 15, "minutes").format("h:mm A"));
    }
    dispatch(setSelectedDateTime({ date: selectedDate, slotTimes }));
    navigate(`/${shopSlug}/user/review-booking`);
  };

  // Determine display label for the professional chip
  const professionalChipLabel = useMemo(() => {
    if (selectedStaff?.type === "specific") return selectedStaff.name;
    if (selectedStaff?.type === "per-service") return "Per service";
    return "Any";
  }, [selectedStaff]);

  // ===== Shared render helpers (used by both mobile + desktop) =====
  const renderProfessionalAndCalendar = () => (
    <div className="flex items-center justify-between">
      <button
        onClick={() => setShowProfessionalSheet(true)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-dark-surface rounded-full"
        style={{ border: "1.5px solid #e8e8e8" }}
      >
        <div className="w-[24px] h-[24px] rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center">
          {selectedStaff?.photo?.url ? (
            <img src={selectedStaff.photo.url} alt={selectedStaff?.name} className="w-full h-full object-cover" />
          ) : selectedStaff?.type === "specific" ? (
            <span className="text-[10px] font-bold text-indigo-500">
              {selectedStaff.name?.charAt(0)?.toUpperCase()}
            </span>
          ) : (
            <User size={12} className="text-indigo-500" />
          )}
        </div>
        <span className="text-[13px] font-medium text-black dark:text-white">{professionalChipLabel}</span>
        <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
      </button>

      <div className="relative">
        <button
          onClick={() => setShowCalendarPicker((v) => !v)}
          className="w-[40px] h-[40px] rounded-full bg-white dark:bg-dark-surface flex items-center justify-center"
          style={{ border: "1.5px solid #e8e8e8" }}
        >
          <Calendar size={18} className="text-black dark:text-white" />
        </button>

        {/* Desktop calendar popover (anchored beside the date row) */}
        {showCalendarPicker && (
          <div className="hidden lg:block">
            {/* click-away backdrop (transparent) */}
            <div className="fixed inset-0 z-[55]" onClick={() => setShowCalendarPicker(false)} />
            <div
              className="absolute right-0 top-[48px] z-[60] bg-white dark:bg-dark-surface rounded-2xl p-2 w-[340px]"
              style={{ border: "1px solid #e5e7eb", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
            >
              <CalendarGrid
                selectedDate={selectedDate}
                maxDays={slotsResponse?.maxBookingWindow || 30}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                  setShowCalendarPicker(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDateSelector = () => (
    <div>
      <h3 className="text-[16px] font-bold text-black dark:text-white mb-3">Select a date</h3>
      <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {dates.map((d) => {
          const isSelected = d.date === selectedDate;
          return (
            <button
              key={d.date}
              onClick={() => { setSelectedDate(d.date); setSelectedTime(null); }}
              className="flex-shrink-0 flex flex-col items-center justify-center w-[68px] h-[88px] rounded-2xl transition-colors"
              style={{
                backgroundColor: isSelected ? "#6366f1" : "#fff",
                color: isSelected ? "#fff" : "#000",
                border: isSelected ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb",
              }}
            >
              <span className={`text-[12px] font-medium ${isSelected ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>{d.day}</span>
              <span className={`text-[20px] font-bold mt-0.5 ${isSelected ? "text-white" : "text-black dark:text-white"}`}>
                {d.dayNum}
              </span>
              <span className={`text-[11px] font-medium ${isSelected ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>{d.month}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTimePicker = () => (
    <div>
      <h3 className="text-[16px] font-bold text-black dark:text-white mb-3">Pick a time</h3>
      <div className="grid grid-cols-3 gap-2">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[52px] bg-white dark:bg-dark-surface rounded-xl animate-pulse" />
            ))}
          </>
        ) : isBlocked || (timeSlots.length === 0 && slotsResponse) ? (
          /* Fully booked / Closed state */
          <div className="flex flex-col items-center justify-center py-16 col-span-3">
            <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-5">
              <Calendar size={24} className="text-indigo-500" />
            </div>
            <h3 className="text-[16px] font-bold text-black dark:text-white text-center mb-1">
              {isBlocked && blockedReason === "Shop Closed"
                ? "Closed on this date"
                : selectedStaff?.type === "specific"
                ? `${selectedStaff.name} is fully booked on this date`
                : "Fully booked on this date"}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center mb-5">
              {(() => {
                const nextDate = dates.find((d) => d.date !== selectedDate);
                return nextDate ? `Available from ${nextDate.day}, ${nextDate.dayNum} ${nextDate.month}` : "";
              })()}
            </p>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  const nextDate = dates.find((d) => d.date !== selectedDate);
                  if (nextDate) {
                    setSelectedDate(nextDate.date);
                    setSelectedTime(null);
                  }
                }}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-black dark:text-white"
                style={{ border: "1.5px solid #e8e8e8" }}
              >
                Go to next available date
              </button>
              <button
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-black dark:text-white"
                style={{ border: "1.5px solid #e8e8e8" }}
              >
                Join waitlist
              </button>
            </div>
          </div>
        ) : timeSlots.length === 0 && !slotsResponse ? (
          <div className="text-center py-8 col-span-3">
            <p className="text-gray-500 dark:text-gray-400 text-[14px] font-medium">Select a date to see available times</p>
          </div>
        ) : (
          timeSlots.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className="py-3 px-3 rounded-xl bg-white dark:bg-dark-surface text-center text-[13px] font-medium text-black dark:text-white transition-colors"
                style={{
                  border: isSelected ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb",
                  backgroundColor: isSelected ? "#fafaff" : "#fff",
                }}
              >
                {time}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ===== MOBILE LAYOUT ===== */}
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
                Select date and time
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
          <h1 className="text-[24px] font-bold text-black dark:text-white">Select date and time</h1>
        </div>

        {/* Professional chip + calendar */}
        <div className="px-4 mb-5">{renderProfessionalAndCalendar()}</div>

        {/* Date selector */}
        <div className="px-4 mb-6">{renderDateSelector()}</div>

        {/* Time picker */}
        <div className="px-4">{renderTimePicker()}</div>

        {/* Bottom Bar */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface z-30 px-4 py-4"
          style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[16px] font-bold text-black dark:text-white">
                {currencySymbol}{Number(totalAmount).toFixed(shopConfig?.decimalPrecision ?? 2)}
              </p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                <ShoppingCart size={11} />
                {selectedServices.length} item{selectedServices.length > 1 ? "s" : ""} &bull; {formatDuration(totalDuration)}
              </p>
            </div>
            <button
              onClick={handleContinue}
              disabled={!selectedTime}
              className="flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#111" }}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
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
                  <span className="text-[16px] font-semibold text-black dark:text-white">Select date and time</span>
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
                    <span className="font-semibold text-black dark:text-white">Time</span>
                    <span>&gt;</span>
                    <span>Confirm</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-[28px] font-bold text-black dark:text-white mt-2 mb-6">Select date and time</h1>

                {/* Professional chip + calendar */}
                <div className="mb-6">{renderProfessionalAndCalendar()}</div>

                {/* Date selector */}
                <div className="mb-8">{renderDateSelector()}</div>

                {/* Time picker */}
                {renderTimePicker()}
              </div>

              {/* Right Column - spacer to reserve sidebar width */}
              <div className="w-[470px] flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Fixed Right Card */}
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
          <div
            className="rounded-2xl bg-white dark:bg-dark-surface flex flex-col w-full"
            style={{ border: "1px solid #e5e7eb" }}
          >
            {/* Shop Info */}
            <div className="p-5 pb-4">
              <div className="flex items-start gap-3">
                {shopCover ? (
                  <img
                    src={shopCover}
                    alt={shopName}
                    className="w-[60px] h-[60px] rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-[60px] h-[60px] rounded-lg bg-gray-100 dark:bg-dark-card flex items-center justify-center flex-shrink-0">
                    <span className="text-[20px] font-bold text-gray-400 dark:text-gray-500">
                      {shopName ? shopName.charAt(0).toUpperCase() : "S"}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-black dark:text-white leading-tight">{shopName}</h3>
                  {shopAvgRating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[13px] font-bold">{Number(shopAvgRating).toFixed(1)}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={12} fill={shopAvgRating >= s ? "#f59e0b" : "none"} color="#f59e0b" />
                        ))}
                      </div>
                      <span className="text-[12px] text-gray-500 dark:text-gray-400">({shopReviewTotal})</span>
                    </div>
                  )}
                  {shopAddress && (
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{shopAddress}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Services + chosen date/time */}
            <div className="flex-1 overflow-y-auto px-5">
              {selectedServices.length > 0 ? (
                <div className="border-t border-gray-100 dark:border-dark-border pt-4 space-y-4">
                  {(selectedDate || selectedTime) && (
                    <div className="pb-3 mb-1 border-b border-gray-100 dark:border-dark-border">
                      <p className="text-[14px] font-semibold text-black dark:text-white">
                        {moment(selectedDate).format("ddd, D MMM YYYY")}
                      </p>
                      {selectedTime && (
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Starts at {selectedTime}</p>
                      )}
                    </div>
                  )}
                  {selectedServices.map((service, idx) => (
                    <div key={`${service._id}-${service.variantId || idx}`}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-[14px] font-semibold text-black dark:text-white leading-tight">
                            {service.name}
                            {service.variantName && <span className="text-gray-500 dark:text-gray-400"> - {service.variantName}</span>}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatDuration(service.duration)} with {professionalChipLabel === "Any" ? "any professional" : professionalChipLabel}
                          </p>
                        </div>
                        <span className="text-[14px] font-semibold text-black dark:text-white flex-shrink-0">
                          {currencySymbol}{Number(service.price).toFixed(shopConfig?.decimalPrecision ?? 2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-t border-gray-100 dark:border-dark-border pt-6 pb-4">
                  <p className="text-[13px] text-gray-400 dark:text-gray-500 text-center">No services selected</p>
                </div>
              )}
            </div>

            {/* Total + Continue */}
            <div className="p-5 pt-3 mt-auto">
              {selectedServices.length > 0 && (
                <div className="flex items-center justify-between mb-5 pt-3 border-t border-gray-100 dark:border-dark-border">
                  <span className="text-[15px] font-bold text-black dark:text-white">Total</span>
                  <span className="text-[15px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(shopConfig?.decimalPrecision ?? 2)}</span>
                </div>
              )}
              <button
                onClick={handleContinue}
                disabled={!selectedTime}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all"
                style={{
                  backgroundColor: selectedTime ? "#111" : "#d1d5db",
                  cursor: selectedTime ? "pointer" : "not-allowed",
                }}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SHARED OVERLAYS ===== */}
      {/* Per-service Professional Selection Sheet */}
      {showProfessionalSheet && !pickingForService && (
        <PerServiceProfessionalSheet
          services={selectedServices}
          perServiceStaff={perServiceStaff}
          onClose={() => setShowProfessionalSheet(false)}
          onPickForService={(service) => {
            setPickingForService({
              service,
              key: getServiceKey(service),
            });
          }}
        />
      )}

      {/* Single-service Staff Picker Sheet */}
      {pickingForService && (
        <ServiceStaffPickerSheet
          service={pickingForService.service}
          serviceKey={pickingForService.key}
          staffData={staffData}
          currentStaff={perServiceStaff[pickingForService.key]}
          currencySymbol={currencySymbol}
          onClose={() => setPickingForService(null)}
          onSelect={(staff) => {
            dispatch(setPerServiceStaff({ key: pickingForService.key, staff }));
            // Update overall selectedStaff status
            const updatedPerService = {
              ...perServiceStaff,
              [pickingForService.key]: staff,
            };
            const allKeys = selectedServices.map(getServiceKey);
            const hasAnyOverride = allKeys.some((k) => updatedPerService[k]);
            if (hasAnyOverride) {
              dispatch(setSelectedStaff({ type: "per-service", name: "Per service" }));
            }
            setPickingForService(null);
          }}
        />
      )}

      {/* Calendar Picker Bottom Sheet (mobile only — desktop uses the popover above) */}
      {showCalendarPicker && (
        <div className="lg:hidden">
          <CalendarPickerSheet
            selectedDate={selectedDate}
            maxDays={slotsResponse?.maxBookingWindow || 30}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
              setShowCalendarPicker(false);
            }}
            onClose={() => setShowCalendarPicker(false)}
          />
        </div>
      )}

      {/* Exit Confirmation */}
      {showExitSheet && <ExitBookingSheet onCancel={cancelExit} onConfirm={confirmExit} />}
    </>
  );
};

// Reusable Calendar Grid (shared by mobile bottom sheet + desktop popover)
const CalendarGrid = ({ selectedDate, maxDays, onSelect }) => {
  const [viewMonth, setViewMonth] = useState(() => moment(selectedDate));

  const today = moment().startOf("day");
  const maxDate = moment().add(maxDays, "days").startOf("day");

  const daysInMonth = viewMonth.daysInMonth();
  const firstDayOfWeek = moment(viewMonth).startOf("month").day(); // 0=Sun
  const monthLabel = viewMonth.format("MMMM YYYY");

  const canGoPrev = moment(viewMonth).startOf("month").isAfter(today.clone().startOf("month").subtract(1, "day"));
  const canGoNext = moment(viewMonth).endOf("month").isBefore(maxDate);

  const prevMonth = () => {
    if (canGoPrev) setViewMonth((m) => moment(m).subtract(1, "month"));
  };
  const nextMonth = () => {
    if (canGoNext) setViewMonth((m) => moment(m).add(1, "month"));
  };

  const isDateSelectable = (day) => {
    const date = moment(viewMonth).date(day);
    return date.isSameOrAfter(today) && date.isSameOrBefore(maxDate);
  };
  const isSelected = (day) => moment(viewMonth).date(day).format("YYYY-MM-DD") === selectedDate;
  const isToday = (day) => moment(viewMonth).date(day).isSame(today, "day");

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card disabled:opacity-30"
        >
          <span className="text-[18px] text-black dark:text-white">‹</span>
        </button>
        <h3 className="text-[15px] font-bold text-black dark:text-white">{monthLabel}</h3>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card disabled:opacity-30"
        >
          <span className="text-[18px] text-black dark:text-white">›</span>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[12px] font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-2 pb-3">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const selectable = isDateSelectable(day);
          const selected = isSelected(day);
          const todayMark = isToday(day);
          return (
            <button
              key={day}
              onClick={() => {
                if (selectable) onSelect(moment(viewMonth).date(day).format("YYYY-MM-DD"));
              }}
              disabled={!selectable}
              className="flex items-center justify-center py-1.5"
            >
              <div
                className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[14px] font-medium transition-colors"
                style={{
                  backgroundColor: selected ? "#6366f1" : todayMark ? "#f0f0f0" : "transparent",
                  color: selected ? "#fff" : !selectable ? "#d1d5db" : "#111",
                }}
              >
                {day}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Calendar Picker Bottom Sheet (mobile)
const CalendarPickerSheet = ({ selectedDate, maxDays, onSelect, onClose }) => {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface z-[70] rounded-t-3xl pt-2 pb-4"
        style={{ animation: "slideUp 0.25s ease-out", maxHeight: "70vh" }}
      >
        <div className="flex justify-center pt-1 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <CalendarGrid selectedDate={selectedDate} maxDays={maxDays} onSelect={onSelect} />
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

// Per-service Professional Sheet (lists all selected services with their assigned staff)
const PerServiceProfessionalSheet = ({ services, perServiceStaff, onClose, onPickForService }) => {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 top-[10vh] max-h-[90vh] bg-[#f5f5f7] dark:bg-dark-bg z-50 flex flex-col rounded-t-3xl
          lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-full lg:max-w-[560px] lg:max-h-[80vh] lg:shadow-2xl"
        style={{ animation: "slideUp 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-end px-4 h-[56px] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"
          >
            <X size={20} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Title */}
        <div className="px-5 pb-5">
          <h1 className="text-[26px] font-bold text-black dark:text-white leading-tight">Select professional</h1>
        </div>

        {/* Service list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {services.map((service) => {
            const key = getServiceKey(service);
            const assigned = perServiceStaff[key];
            const photo = assigned?.photo?.url;
            return (
              <div
                key={key}
                className="bg-white dark:bg-dark-surface rounded-2xl p-4"
                style={{ border: "1.5px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <h3 className="text-[15px] font-bold text-black dark:text-white leading-tight">
                  {service.name}{service.variantName ? ` - ${service.variantName}` : ""}
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 mb-3">
                  {formatDuration(service.duration)}
                  {service.gender && <> &middot; {service.gender}</>}
                </p>
                {/* Staff picker chip */}
                <button
                  onClick={() => onPickForService(service)}
                  className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 bg-white dark:bg-dark-surface rounded-full"
                  style={{ border: "1.5px solid #e8e8e8" }}
                >
                  <div className="w-[26px] h-[26px] rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt={assigned?.name} className="w-full h-full object-cover" />
                    ) : assigned?.name ? (
                      <span className="text-[10px] font-bold text-indigo-500">
                        {assigned.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User size={13} className="text-indigo-500" />
                    )}
                  </div>
                  <span className="text-[13px] font-medium text-black dark:text-white">
                    {assigned?.name || "No preference"}
                  </span>
                  <ChevronDown size={13} className="text-gray-400 dark:text-gray-500" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

// Single-service Staff Picker Sheet (shows list of staff to pick from for a specific service)
const ServiceStaffPickerSheet = ({ service, currentStaff, staffData, currencySymbol, onClose, onSelect }) => {
  const isCurrentNoPreference = !currentStaff;
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 top-[10vh] max-h-[90vh] bg-[#f5f5f7] dark:bg-dark-bg z-[70] flex flex-col rounded-t-3xl
          lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-full lg:max-w-[560px] lg:max-h-[80vh] lg:shadow-2xl"
        style={{ animation: "slideUp 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-end px-4 h-[56px] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"
          >
            <X size={20} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Title */}
        <div className="px-5 pb-5">
          <h1 className="text-[26px] font-bold text-black dark:text-white leading-tight">{service.name}</h1>
        </div>

        {/* Staff list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {/* No preference */}
          <button
            onClick={() => onSelect(null)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-dark-surface text-left"
            style={{
              border: isCurrentNoPreference ? "1.5px solid #6366f1" : "1.5px solid #f0f0f0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div className="w-[48px] h-[48px] rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Shuffle size={20} className="text-indigo-600" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-black dark:text-white leading-tight">No preference</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Maximum availability</p>
            </div>
            {isCurrentNoPreference ? (
              <div className="w-[32px] h-[32px] rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                <Check size={16} className="text-white" strokeWidth={2.5} />
              </div>
            ) : (
              <div
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-black dark:text-white"
                style={{ border: "1.5px solid #e8e8e8" }}
              >
                Select
              </div>
            )}
          </button>

          {/* Staff members */}
          {staffData.map((staff) => {
            const isSelected = currentStaff?._id === staff._id;
            const photo = staff.photo?.url || staff.photo?.path;
            const rating = staff.rating || 5.0;
            return (
              <button
                key={staff._id}
                onClick={() =>
                  onSelect({
                    _id: staff._id,
                    name: staff.name,
                    photo: staff.photo,
                    role: staff.role,
                  })
                }
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-dark-surface text-left"
                style={{
                  border: isSelected ? "1.5px solid #6366f1" : "1.5px solid #f0f0f0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-[56px] h-[56px] rounded-full overflow-hidden bg-gray-100 dark:bg-dark-card">
                    {photo ? (
                      <img src={photo} alt={staff.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                        <span className="text-[20px] font-bold text-indigo-400">
                          {staff.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute -bottom-1 -left-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-dark-surface rounded-full"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                  >
                    <Star size={10} fill="#FBBF24" color="#FBBF24" />
                    <span className="text-[10px] font-bold text-black dark:text-white">{rating}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-black dark:text-white leading-tight">{staff.name}</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{staff.role || "Stylist"}</p>
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">View profile</p>
                  <p className="text-[14px] font-bold text-black dark:text-white mt-1">
                    from {currencySymbol}{service.price || 0}
                  </p>
                </div>
                {isSelected ? (
                  <div className="w-[32px] h-[32px] rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Check size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div
                    className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-black dark:text-white"
                    style={{ border: "1.5px solid #e8e8e8" }}
                  >
                    Select
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default SelectDateTime;
