import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, X, Shuffle, UserPlus, Star, ArrowRight, ShoppingCart, Check } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGetPublicStaffQuery } from "../../../store/api/tenantEndpoints";
import { useGetShopReviewsQuery } from "../../../store/api/homeEndpoints";
import { useExitBooking } from "../hooks/useExitBooking";
import ExitBookingSheet from "../components/ExitBookingSheet";
import {
  setSelectedStaff,
  selectSelectedServices,
  selectBookingTotal,
  selectBookingDuration,
} from "../../../store/slices/bookingFlowSlice";
import { selectSelectedBranchId, selectSelectedBranchAddress } from "../../../store/slices/userAppSlice";

const formatDuration = (mins) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr, ${m} mins` : `${h} hr`;
};

const SelectProfessional = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currencySymbol, shopConfig } = useAuth();

  const { data: staffData = [], isLoading } = useGetPublicStaffQuery(undefined, { skip: !shopSlug });
  const selectedServices = useSelector(selectSelectedServices);
  const selectedBranchId = useSelector(selectSelectedBranchId);
  const selectedBranchAddress = useSelector(selectSelectedBranchAddress);
  const totalAmount = useSelector(selectBookingTotal);
  const totalDuration = useSelector(selectBookingDuration);
  const currentSelectedStaff = useSelector((state) => state.bookingFlow.selectedStaff);

  const [isScrolled, setIsScrolled] = useState(false);
  const [pickedStaffId, setPickedStaffId] = useState(() => {
    if (currentSelectedStaff?.type === "no-preference") return "__none__";
    if (currentSelectedStaff?.type === "per-service") return "__per_service__";
    if (currentSelectedStaff?._id) return currentSelectedStaff._id;
    return "__none__"; // Default to "No preference"
  });
  const { showExitSheet, openExit, cancelExit, confirmExit } = useExitBooking();

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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Redirect back if no services selected
  useEffect(() => {
    if (selectedServices.length === 0) {
      navigate(`/${shopSlug}/user/home`, { replace: true });
    }
  }, [selectedServices.length, shopSlug, navigate]);

  // Default to "No preference" if nothing was previously selected
  useEffect(() => {
    if (!currentSelectedStaff) {
      dispatch(setSelectedStaff({ _id: null, name: "No preference", type: "no-preference" }));
    }
  }, [currentSelectedStaff, dispatch]);

  const handleSelectNoPreference = () => {
    setPickedStaffId("__none__");
    dispatch(setSelectedStaff({ _id: null, name: "No preference", type: "no-preference" }));
  };

  const handleSelectPerService = () => {
    setPickedStaffId("__per_service__");
    dispatch(setSelectedStaff({ _id: null, name: "Per service", type: "per-service" }));
  };

  const handleSelectStaff = (staff) => {
    setPickedStaffId(staff._id);
    dispatch(
      setSelectedStaff({
        _id: staff._id,
        name: staff.name,
        photo: staff.photo,
        role: staff.role,
        type: "specific",
      })
    );
  };

  const handleContinue = () => {
    if (!pickedStaffId) {
      // Default to no preference if nothing selected
      handleSelectNoPreference();
    }
    navigate(`/${shopSlug}/user/select-datetime`);
  };

  // Staff filtered by branch + selected services (shared by both layouts)
  const filteredStaff = useMemo(() => {
    return staffData.filter((staff) => {
      if (selectedBranchId && staff.branchId && staff.branchId !== selectedBranchId) return false;
      if (!selectedServices || selectedServices.length === 0) return true;
      if (!staff.services || staff.services.length === 0) return false;
      return selectedServices.some((sel) =>
        staff.services.some((sid) => (sid._id || sid) === sel._id)
      );
    });
  }, [staffData, selectedBranchId, selectedServices]);

  // ===== Reusable option rows (render helpers, not components) =====
  const renderNoPreference = () => (
    <button
      onClick={handleSelectNoPreference}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-dark-surface text-left transition-all"
      style={{ border: pickedStaffId === "__none__" ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb" }}
    >
      <div className="w-[48px] h-[48px] rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <Shuffle size={20} className="text-indigo-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-black dark:text-white leading-tight">No preference</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Maximum availability</p>
      </div>
      {pickedStaffId === "__none__" ? (
        <div className="w-[32px] h-[32px] rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Check size={16} className="text-white" strokeWidth={2.5} />
        </div>
      ) : (
        <div className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-black dark:text-white" style={{ border: "1.5px solid #e8e8e8" }}>
          Select
        </div>
      )}
    </button>
  );

  const renderPerService = () => (
    <button
      onClick={handleSelectPerService}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-dark-surface text-left transition-all"
      style={{ border: pickedStaffId === "__per_service__" ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb" }}
    >
      <div className="w-[48px] h-[48px] rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <UserPlus size={20} className="text-indigo-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-black dark:text-white leading-tight">Select professional per service</p>
      </div>
      {pickedStaffId === "__per_service__" ? (
        <div className="w-[32px] h-[32px] rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Check size={16} className="text-white" strokeWidth={2.5} />
        </div>
      ) : (
        <div className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-black dark:text-white" style={{ border: "1.5px solid #e8e8e8" }}>
          Select
        </div>
      )}
    </button>
  );

  const renderStaffRow = (staff) => {
    const isSelected = pickedStaffId === staff._id;
    const photo = staff.photo?.url || staff.photo?.path;
    const rating = staff.avgRating || staff.rating || 0;
    return (
      <button
        key={staff._id}
        onClick={() => handleSelectStaff(staff)}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-dark-surface text-left transition-all"
        style={{ border: isSelected ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb" }}
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
          {rating > 0 && (
            <div
              className="absolute -bottom-1 -left-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-dark-surface rounded-full"
              style={{ border: "1px solid #f0f0f0" }}
            >
              <Star size={10} fill="#FBBF24" color="#FBBF24" />
              <span className="text-[10px] font-bold text-black dark:text-white">{Number(rating).toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-black dark:text-white leading-tight">{staff.name}</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{staff.designation || staff.role || "Staff"}</p>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">View profile</p>
        </div>
        {isSelected ? (
          <div className="w-[32px] h-[32px] rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <Check size={16} className="text-white" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-black dark:text-white" style={{ border: "1.5px solid #e8e8e8" }}>
            Select
          </div>
        )}
      </button>
    );
  };

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
                Select professional
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
          <h1 className="text-[24px] font-bold text-black dark:text-white">Select professional</h1>
        </div>

        {/* Options */}
        <div className="px-4 space-y-3">
          {renderNoPreference()}
          {renderPerService()}
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[88px] bg-white dark:bg-dark-surface rounded-2xl animate-pulse" />
              ))}
            </>
          ) : (
            filteredStaff.map((staff) => renderStaffRow(staff))
          )}
        </div>

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
              className="flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold text-white"
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
                  <span className="text-[16px] font-semibold text-black dark:text-white">Select professional</span>
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
                    <span className="font-semibold text-black dark:text-white">Professional</span>
                    <span>&gt;</span>
                    <span>Time</span>
                    <span>&gt;</span>
                    <span>Confirm</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-[28px] font-bold text-black dark:text-white mt-2 mb-6">Select professional</h1>

                {/* Options */}
                <div className="space-y-4">
                  {renderNoPreference()}
                  {renderPerService()}
                  {isLoading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[88px] bg-white dark:bg-dark-surface rounded-2xl animate-pulse" />
                      ))}
                    </>
                  ) : (
                    filteredStaff.map((staff) => renderStaffRow(staff))
                  )}
                </div>
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

            {/* Selected Services */}
            <div className="flex-1 overflow-y-auto px-5">
              {selectedServices.length > 0 ? (
                <div className="border-t border-gray-100 dark:border-dark-border pt-4 space-y-4">
                  {selectedServices.map((service, idx) => (
                    <div key={`${service._id}-${service.variantId || idx}`}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-[14px] font-semibold text-black dark:text-white leading-tight">
                            {service.name}
                            {service.variantName && <span className="text-gray-500 dark:text-gray-400"> - {service.variantName}</span>}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatDuration(service.duration)} with any professional
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
                disabled={selectedServices.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all"
                style={{
                  backgroundColor: selectedServices.length > 0 ? "#111" : "#d1d5db",
                  cursor: selectedServices.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation */}
      {showExitSheet && <ExitBookingSheet onCancel={cancelExit} onConfirm={confirmExit} />}
    </>
  );
};

export default SelectProfessional;
