import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, X, Plus, Check, ShoppingCart, ArrowRight, Star } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGetServicesQuery, useGetPublicStaffQuery, useGetOffersQuery } from "../../../store/api/tenantEndpoints";
import { useGetServiceCategoriesQuery } from "../../../store/api/tenantCrudEndpoints";
import { useGetShopReviewsQuery } from "../../../store/api/homeEndpoints";
import api from "../../../api/axiosInstance";
import { useExitBooking } from "../hooks/useExitBooking";
import ExitBookingSheet from "../components/ExitBookingSheet";
import {
  addSelectedService,
  removeSelectedService,
  updateSelectedServices,
  setShopContext,
  setBookingDepartmentId,
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

const SelectServices = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { currencySymbol, salonConfig } = useAuth();
  const selectedBranchId = useSelector(selectSelectedBranchId);
  const selectedBranchAddress = useSelector(selectSelectedBranchAddress);

  const { data: categoriesData = [] } = useGetServiceCategoriesQuery(shopSlug, { skip: !shopSlug });
  const { data: servicesData = [], isLoading } = useGetServicesQuery(
    { shopSlug, branchId: selectedBranchId || undefined },
    { skip: !shopSlug }
  );

  const staffIdFromState = location.state?.staffId;
  const { data: allStaffData = [] } = useGetPublicStaffQuery(undefined, { skip: !staffIdFromState });
  const { data: offersResponse } = useGetOffersQuery(undefined, { skip: !shopSlug });

  const activeOffers = useMemo(() => {
    if (!Array.isArray(offersResponse)) return [];
    const now = new Date();
    return offersResponse.filter(o => new Date(o.endTime) > now && o.isActive !== false);
  }, [offersResponse]);

  const getOfferInfo = useCallback((item, basePrice, type, departmentId = null, variantObj = null) => {
    if (!activeOffers.length) return { hasOffer: false, price: basePrice, originalPrice: basePrice };

    const offer = activeOffers.find(o => {
      if (o.applicableType === "all") return true;
      if (o.applicableType === "all_services" && type === "service") return true;
      if (o.applicableType === "all_products" && type === "product") return true;
      if (o.applicableType === "specific") {
        if (type === "service" && o.applicableServices?.includes(item._id)) return true;
        if (type === "product" && o.applicableProducts?.includes(item._id)) return true;
        
        if (departmentId && o.applicableDepartments?.includes(departmentId)) return true;
        
        const cats = item.categories || (item.category ? [item.category] : []);
        if (type === "service" && cats.some(c => o.applicableServiceCategories?.includes(c._id || c))) return true;
        if (type === "product" && cats.some(c => o.applicableProductCategories?.includes(c._id || c))) return true;
        
        if (variantObj && o.applicableVariants?.includes(variantObj.variantId?._id || variantObj.variantId || variantObj._id)) return true;
      }
      return false;
    });

    if (!offer) return { hasOffer: false, price: basePrice, originalPrice: basePrice };

    let offerPrice = basePrice;
    if (offer.discountType === "percentage") {
      offerPrice = basePrice - (basePrice * (offer.discountValue / 100));
    } else {
      offerPrice = basePrice - offer.discountValue;
    }
    
    return { 
      hasOffer: true, 
      price: Math.max(0, offerPrice),
      originalPrice: basePrice,
      offerDetails: offer
    };
  }, [activeOffers]);

  const selectedServices = useSelector(selectSelectedServices);
  const totalAmount = useSelector(selectBookingTotal);
  const totalDuration = useSelector(selectBookingDuration);

  const [activeCategory, setActiveCategory] = useState("All");
  const [variantSheetService, setVariantSheetService] = useState(null);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedAboveCount, setSelectedAboveCount] = useState(0);
  const { showExitSheet, openExit, cancelExit, confirmExit } = useExitBooking();
  const hasAutoOpenedVariant = useRef(false);
  const categoryDropdownRef = useRef(null);

  // Shop reviews for desktop sidebar
  const { data: reviewsData } = useGetShopReviewsQuery(undefined, { skip: !shopSlug });
  const shopAvgRating = reviewsData?.avgRating || 0;
  const shopReviewTotal = reviewsData?.total || 0;

  // Shop info for desktop sidebar
  const shopName = salonConfig?.salonName || "";
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
  const shopAddress = (() => {
    if (selectedBranchAddress) return selectedBranchAddress;
    if (salonConfig?.address && salonConfig.address !== "N/A") return salonConfig.address;
    const parts = [salonConfig?.area, salonConfig?.state, salonConfig?.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  })();

  // Desktop: detect when category pills section scrolls out of view
  const desktopCategoryPillsRef = useRef(null);
  const [desktopPillsSticky, setDesktopPillsSticky] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const filteredServicesData = useMemo(() => {
    let filtered = servicesData;
    
    // Filter by staff
    if (staffIdFromState) {
        const staff = allStaffData.find(s => s._id === staffIdFromState);
        if (staff && staff.services && staff.services.length > 0) {
            const staffServiceIds = staff.services.map(sid => sid._id || sid);
            filtered = filtered.filter(s => staffServiceIds.includes(s._id));
        }
    }

    // Filter by department
    if (selectedDepartment) {
        filtered = filtered.filter(service => {
            if (service.useVariants && service.variants && service.variants.length > 0) {
                return service.variants.some(v => 
                    v.pricing && v.pricing.some(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === selectedDepartment)
                );
            } else {
                if (service.pricing && service.pricing.length > 0) {
                    return service.pricing.some(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === selectedDepartment);
                }
                return false;
            }
        });
    }

    return filtered;
  }, [servicesData, staffIdFromState, allStaffData, selectedDepartment]);

  useEffect(() => {
    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            if (res.data.success) {
                const activeDepts = res.data.data.filter(d => d.isActive);
                setDepartments(activeDepts);
                if (activeDepts.length > 0) {
                    const cartDept = selectedServices.length > 0 ? selectedServices[0].departmentId : null;
                    const passedDept = location.state?.selectedDepartment;
                    if (passedDept && activeDepts.some(d => d._id === passedDept)) {
                        setSelectedDepartment(passedDept);
                    } else if (cartDept && activeDepts.some(d => d._id === cartDept)) {
                        setSelectedDepartment(cartDept);
                    } else {
                        setSelectedDepartment(activeDepts[0]._id);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching departments", error);
        }
    };
    fetchDepartments();
  }, [location.state?.selectedDepartment]); // Run when state changes or initial load

  useEffect(() => {
    if (!selectedDepartment || servicesData.length === 0 || selectedServices.length === 0) return;
    
    let needsUpdate = false;
    const updatedServices = [];

    for (const cartItem of selectedServices) {
       const service = servicesData.find(s => s._id === cartItem._id);
       if (!service) continue;

       let isValid = false;
       if (service.useVariants && service.variants && service.variants.length > 0) {
           isValid = service.variants.some(v => 
               v.pricing && v.pricing.some(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === selectedDepartment)
           );
       } else {
           if (service.pricing && service.pricing.length > 0) {
               isValid = service.pricing.some(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === selectedDepartment);
           }
       }

       if (isValid) {
           const variantObj = cartItem.variantId ? service.variants?.find(v => (v.variantId?._id || v.variantId || v._id) === cartItem.variantId) : null;
           const priceData = getDepartmentPrice(service, !!cartItem.variantId, variantObj, selectedDepartment);
           
           if (priceData.total !== cartItem.price || selectedDepartment !== cartItem.departmentId) {
               needsUpdate = true;
               updatedServices.push({
                   ...cartItem,
                   price: priceData.total,
                   taxAmount: priceData.taxAmount,
                   taxPercentage: priceData.taxPercentage,
                   basePrice: priceData.basePrice,
                   isTaxInclusive: priceData.isTaxInclusive,
                   departmentId: selectedDepartment
               });
           } else {
               updatedServices.push(cartItem);
           }
       } else {
           needsUpdate = true; // Drop invalid item
       }
    }

    if (needsUpdate) {
        dispatch(updateSelectedServices(updatedServices));
    }
  }, [selectedDepartment, servicesData, dispatch]);

  const getDepartmentPrice = (service, isVariant = false, variantObj = null, deptOverride = null) => {
      const activeDept = deptOverride || selectedDepartment;
      if (!service) return { total: 0, originalTotal: 0, taxAmount: 0, taxPercentage: 0, isTaxInclusive: false, basePrice: 0, originalBasePrice: 0, hasOffer: false };
      
      let basePrice = 0;
      if (isVariant && variantObj) {
          const deptPrice = variantObj.pricing?.find(p => (p.department?._id || p.department) === activeDept);
          basePrice = Number(deptPrice ? deptPrice.price : (variantObj.price || 0));
      } else {
          const pricing = service?.pricing?.find(p => (p.department?._id || p.department) === activeDept);
          basePrice = Number(pricing ? pricing.price : (service?.price || 0));
      }

      const offerInfo = getOfferInfo(service, basePrice, "service", activeDept, variantObj);
      const originalBasePrice = basePrice;
      if (offerInfo.hasOffer) {
         basePrice = offerInfo.price;
      }

      const taxPct = (isVariant && variantObj && (variantObj.taxPercentage !== undefined || variantObj.taxId))
          ? (variantObj.taxPercentage || variantObj.taxId?.percentage || 0)
          : (service?.taxPercentage || service?.taxId?.percentage || 0);
          
      const isInc = (isVariant && variantObj && variantObj.isTaxInclusive !== undefined)
          ? variantObj.isTaxInclusive
          : (service?.isTaxInclusive || false);

      let taxAmount = 0;
      let total = basePrice;
      let originalTotal = originalBasePrice;

      if (taxPct > 0) {
          if (isInc) {
              taxAmount = basePrice - (basePrice / (1 + (taxPct / 100)));
          } else {
              taxAmount = basePrice * (taxPct / 100);
              total = basePrice + taxAmount;
              originalTotal = originalBasePrice + (originalBasePrice * (taxPct / 100));
          }
      }

      return { 
          total: parseFloat(total.toFixed(2)), 
          originalTotal: parseFloat(originalTotal.toFixed(2)),
          taxAmount: parseFloat(taxAmount.toFixed(2)), 
          taxPercentage: taxPct, 
          isTaxInclusive: isInc, 
          basePrice: parseFloat((isInc ? basePrice - taxAmount : basePrice).toFixed(2)),
          originalBasePrice: parseFloat(originalBasePrice.toFixed(2)),
          hasOffer: offerInfo.hasOffer,
          offerDetails: offerInfo.offerDetails
      };
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      // For desktop: check if the inline category pills have scrolled past
      if (desktopCategoryPillsRef.current) {
        const rect = desktopCategoryPillsRef.current.getBoundingClientRect();
        setDesktopPillsSticky(rect.top < 0);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close category dropdown on outside click (desktop)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setShowCategorySheet(false);
      }
    };
    if (showCategorySheet) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCategorySheet]);

  // Auto-open variant sheet if navigated from UserHome Book button with variants
  useEffect(() => {
    if (hasAutoOpenedVariant.current) return;
    const openForId = location.state?.openVariantForServiceId;
    if (openForId && servicesData.length > 0) {
      const service = servicesData.find((s) => s._id === openForId);
      if (service && service.useVariants && service.variants?.length > 0) {
        hasAutoOpenedVariant.current = true;
        setVariantSheetService(service);
      }
    }
  }, [location.state, servicesData]);

  // Scroll to pre-selected service
  const hasScrolledToTarget = useRef(null);

  useEffect(() => {
    if (servicesData.length > 0) {
      // scroll to the selected service if any, or to the openVariantForServiceId
      const targetServiceId = location.state?.openVariantForServiceId || (selectedServices.length > 0 ? selectedServices[selectedServices.length - 1]._id : null);
      
      if (targetServiceId && hasScrolledToTarget.current !== targetServiceId) {
        hasScrolledToTarget.current = targetServiceId;
        const el = document.getElementById(`service-card-${targetServiceId}`);
        if (el) {
          setTimeout(() => {
            const offset = 120;
            const top = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: "smooth" });
          }, 200);
        }
      }
    }
  }, [selectedServices, servicesData, location.state]);

  // Set shop context once
  useEffect(() => {
    if (shopSlug) {
      dispatch(
        setShopContext({
          shopSlug,
          shopName: salonConfig?.salonName || "",
          shopImage: salonConfig?.logo || null,
        })
      );
    }
  }, [shopSlug, salonConfig, dispatch]);

  const categories = useMemo(() => [{ _id: "All", name: "Featured" }, ...categoriesData], [categoriesData]);

  const servicesGrouped = useMemo(() => {
    const groups = new Map();
    for (const service of filteredServicesData) {
      const cats = service.categories?.length
        ? service.categories
        : service.category
          ? [service.category]
          : [];
      if (cats.length === 0) {
        if (!groups.has("__featured__")) groups.set("__featured__", { category: { _id: "All", name: "Featured" }, services: [] });
        groups.get("__featured__").services.push(service);
      } else {
        for (const cat of cats) {
          const catId = cat._id || cat;
          const catName = cat.name || categoriesData.find((c) => c._id === catId)?.name || "Other";
          if (!groups.has(catId)) groups.set(catId, { category: { _id: catId, name: catName }, services: [] });
          groups.get(catId).services.push(service);
          break;
        }
      }
    }
    // Order sections to match the category tab order (Featured first, then categoriesData order).
    const orderOf = (catId) => {
      if (catId === "All") return -1; // Featured / __featured__ group always first
      const idx = categoriesData.findIndex((c) => (c._id || c) === catId);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    return Array.from(groups.values()).sort(
      (a, b) => orderOf(a.category?._id) - orderOf(b.category?._id)
    );
  }, [filteredServicesData, categoriesData]);

  const categoryRefs = useRef({});
  const suppressSpyRef = useRef(false);
  const suppressTimerRef = useRef(null);

  // Find a category's section element in whichever layout (mobile/desktop) is currently visible.
  // Both layouts render the same sections, so we pick the one that is actually displayed.
  const getVisibleSection = (catId) => {
    if (!catId) return null;
    const els = document.querySelectorAll(`[data-cat-section="${CSS.escape(catId)}"]`);
    for (const el of els) {
      if (el.offsetParent !== null) return el; // offsetParent is null for display:none elements
    }
    return els[0] || null;
  };

  const scrollToCategory = (catId) => {
    setActiveCategory(catId);
    // Suppress the scroll-spy briefly so it doesn't fight the programmatic smooth scroll.
    suppressSpyRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => { suppressSpyRef.current = false; }, 700);

    if (catId === "All") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = getVisibleSection(catId);
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  // Scroll-spy: as the page scrolls, highlight the category whose section is at the top.
  useEffect(() => {
    const handleSpy = () => {
      if (suppressSpyRef.current) return;
      const threshold = 140;
      let current = "All";
      for (const group of servicesGrouped) {
        const id = group.category?._id;
        if (!id || id === "All") continue; // "All"/Featured maps to the top of the page
        const el = getVisibleSection(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - threshold <= 0) {
          current = id;
        }
      }
      setActiveCategory((prev) => (prev === current ? prev : current));
    };
    window.addEventListener("scroll", handleSpy, { passive: true });
    handleSpy();
    return () => window.removeEventListener("scroll", handleSpy);
  }, [servicesGrouped]);

  // Count how many selected service cards have scrolled above the viewport top.
  // The chip shows this count and grows/shrinks as you scroll past selected services.
  useEffect(() => {
    const handleCountAbove = () => {
      const threshold = 120;
      let count = 0;
      for (const sel of selectedServices) {
        // Find the visible card for this selected service (mobile or desktop layout)
        const cards = document.querySelectorAll(`[data-service-card="${CSS.escape(sel._id)}"]`);
        let card = null;
        for (const el of cards) {
          if (el.offsetParent !== null) { card = el; break; }
        }
        if (!card) card = cards[0];
        if (card && card.getBoundingClientRect().bottom < threshold) count += 1;
      }
      setSelectedAboveCount((prev) => (prev === count ? prev : count));
    };
    window.addEventListener("scroll", handleCountAbove, { passive: true });
    handleCountAbove();
    return () => window.removeEventListener("scroll", handleCountAbove);
  }, [selectedServices]);

  // Auto-scroll the active tab into view (centered) inside every tab bar (mobile + desktop).
  useEffect(() => {
    const containers = document.querySelectorAll("[data-tabbar]");
    containers.forEach((container) => {
      const activeBtn = container.querySelector(`[data-cat-id="${CSS.escape(activeCategory)}"]`);
      if (!activeBtn) return;
      const cRect = container.getBoundingClientRect();
      const bRect = activeBtn.getBoundingClientRect();
      const delta = (bRect.left - cRect.left) - (cRect.width / 2) + (bRect.width / 2);
      container.scrollTo({ left: container.scrollLeft + delta, behavior: "smooth" });
    });
  }, [activeCategory]);

  const isServiceSelected = (serviceId) => selectedServices.some((s) => s._id === serviceId);

  const handleServiceClick = (service) => {
    const hasVariants = service.useVariants && service.variants?.length > 0;
    if (hasVariants) {
      setVariantSheetService(service);
      return;
    }
    if (isServiceSelected(service._id)) {
      dispatch(removeSelectedService({ _id: service._id }));
    } else {
      const priceData = getDepartmentPrice(service);
      dispatch(
        addSelectedService({
          _id: service._id,
          name: service.name,
          price: priceData.total,
          duration: service.duration || 0,
          variantId: null,
          variantName: null,
          originalPrice: priceData.originalTotal,
          departmentId: selectedDepartment,
          isTaxInclusive: priceData.isTaxInclusive,
          taxPercentage: priceData.taxPercentage,
          taxAmount: priceData.taxAmount,
          basePrice: priceData.basePrice,
        })
      );
      dispatch(setBookingDepartmentId(selectedDepartment));
    }
  };

  const handleVariantSelect = (variant) => {
    if (!variantSheetService) return;
    const isSelected = selectedServices.some(
      (s) => s._id === variantSheetService._id && s.variantId === variant._id
    );
    if (isSelected) {
      dispatch(removeSelectedService({ _id: variantSheetService._id, variantId: variant._id }));
    } else {
      const priceData = getDepartmentPrice(variantSheetService, true, variant);
      dispatch(
        addSelectedService({
          _id: variantSheetService._id,
          name: variantSheetService.name,
          price: priceData.total,
          duration: variant.duration || variantSheetService.duration || 0,
          variantId: variant._id,
          variantName: variant.name || "",
          originalPrice: priceData.originalTotal,
          departmentId: selectedDepartment,
          isTaxInclusive: priceData.isTaxInclusive,
          taxPercentage: priceData.taxPercentage,
          taxAmount: priceData.taxAmount,
          basePrice: priceData.basePrice,
        })
      );
      dispatch(setBookingDepartmentId(selectedDepartment));
    }
  };

  const handleContinue = () => {
    if (selectedServices.length === 0) return;
    navigate(`/${shopSlug}/user/select-professional`);
  };

  // Back arrow: if any services are selected, confirm before leaving (selections will be cleared).
  const handleBack = () => {
    if (selectedServices.length > 0) {
      openExit();
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-dark-bg px-4 pt-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-dark-border rounded w-2/3" />
          <div className="flex gap-2">
            <div className="h-9 bg-gray-200 dark:bg-dark-border rounded-full w-20" />
            <div className="h-9 bg-gray-200 dark:bg-dark-border rounded-full w-28" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white dark:bg-dark-surface rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Category pills component (reused in desktop)
  const CategoryPills = () => (
    <div className="flex items-center gap-2">
      <div data-tabbar className="flex-1 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat._id}
            data-cat-id={cat._id}
            onClick={() => scrollToCategory(cat._id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-colors border ${activeCategory === cat._id
                ? "bg-black text-white border-black"
                : "bg-white dark:bg-dark-surface text-black dark:text-white border-gray-200 dark:border-dark-border hover:border-gray-400"
              }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {/* Category list icon */}
      <div className="relative" ref={categoryDropdownRef}>
        <button
          onClick={() => setShowCategorySheet(!showCategorySheet)}
          className="w-[38px] h-[38px] flex items-center justify-center rounded-full bg-white dark:bg-dark-surface flex-shrink-0"
          style={{ border: "1.5px solid #e8e8e8", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black dark:text-white">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {/* Desktop Dropdown */}
        {showCategorySheet && (
          <div
            className="hidden lg:block absolute right-0 top-[44px] bg-white dark:bg-dark-surface rounded-xl py-2 z-50 min-w-[220px]"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "1px solid #f0f0f0" }}
          >
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => {
                  setShowCategorySheet(false);
                  setTimeout(() => scrollToCategory(cat._id), 100);
                }}
                className="w-full text-left px-5 py-3 text-[14px] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                style={{ fontWeight: activeCategory === cat._id ? 700 : 400 }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const DepartmentPills = () => (
    departments.length > 0 && (
      <div className="flex w-full bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] relative">
        {departments.map(dept => (
          <button
            key={dept._id}
            onClick={() => {
                if (selectedDepartment !== dept._id) {
                    setSelectedDepartment(dept._id);
                }
            }}
            className={`flex-1 min-w-[100px] whitespace-nowrap py-4 text-[13px] font-bold uppercase tracking-widest transition-all relative ${selectedDepartment === dept._id ? 'text-[#6b5bfd] bg-[#6b5bfd]/5' : 'text-gray-400 hover:text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card'}`}
          >
            {dept.name}
            {selectedDepartment === dept._id && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#6b5bfd] rounded-t-full"></span>
            )}
          </button>
        ))}
      </div>
    )
  );

  return (
    <>
      {/* ===== MOBILE LAYOUT (unchanged) ===== */}
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-dark-bg pb-32 lg:hidden">
        {/* Sticky App Bar + Category Pills */}
        <div
          className="sticky top-0 z-20 bg-[#f5f5f7] dark:bg-dark-bg transition-shadow duration-200"
          style={{ boxShadow: isScrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
        >
          <div className="flex items-center justify-between px-4 h-[50px]">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card -ml-1"
              >
                <ArrowLeft size={20} strokeWidth={2} className="text-black dark:text-white" />
              </button>
              <span className="text-[16px] font-semibold text-black dark:text-white">Select services</span>
            </div>
            <button
              onClick={openExit}
              className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"
            >
              <X size={20} className="text-black dark:text-white" />
            </button>
          </div>
            {/* Department Pills */}
            <div className="mb-6">
              <DepartmentPills />
            </div>
          <div className="flex items-center gap-2 px-4 pb-3 pt-1">
            <div data-tabbar className="flex-1 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth">
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  data-cat-id={cat._id}
                  onClick={() => scrollToCategory(cat._id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-colors border ${activeCategory === cat._id
                      ? "bg-black text-white border-black"
                      : "bg-white dark:bg-dark-surface text-black dark:text-white border-gray-200 dark:border-dark-border"
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCategorySheet(true)}
              className="w-[38px] h-[38px] flex items-center justify-center rounded-full bg-white dark:bg-dark-surface flex-shrink-0"
              style={{ border: "1.5px solid #e8e8e8", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black dark:text-white">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Service Sections */}
        <div className="px-4 space-y-6 pt-2">
          {servicesGrouped.map((group, idx) => (
            <div
              key={group.category?._id || `group-${idx}`}
              data-cat-section={group.category?._id || ""}
              ref={(el) => { if (group.category?._id) categoryRefs.current[group.category._id] = el; }}
            >
              {group.category && (
                <h2 className="text-[16px] font-bold text-black dark:text-white mb-3 mt-2 uppercase tracking-tight">
                  {group.category.name}
                </h2>
              )}
              <div className="space-y-3">
                {group.services.map((service) => {
                  const hasVariants = service.useVariants && service.variants?.length > 0;
                  const selected = isServiceSelected(service._id);
                  let variantPrice = null;
                  if (hasVariants) {
                      variantPrice = Math.min(...service.variants.map((v) => getDepartmentPrice(service, true, v).total));
                  }
                  return (
                    <div
                      key={service._id}
                      id={`service-card-${service._id}`}
                      data-service-card={service._id}
                      onClick={() => handleServiceClick(service)}
                      className="rounded-2xl bg-white dark:bg-dark-surface p-4 cursor-pointer"
                      style={{
                        border: selected ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <h3 className="text-[15px] font-bold text-black dark:text-white leading-tight mb-1">{service.name}</h3>
                          <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-2">
                            {formatDuration(service.duration)}
                            {hasVariants && <> &bull; {service.variants.length} variant{service.variants.length > 1 ? "s" : ""}</>}
                          </p>
                          {service.description && (
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-2 line-clamp-2 leading-relaxed">{service.description}</p>
                          )}
                          <p className="text-[14px] font-bold text-black dark:text-white flex items-center gap-2 flex-wrap">
                            {hasVariants ? (
                              <>from {currencySymbol}{variantPrice}</>
                            ) : (
                              <>
                                {getDepartmentPrice(service).hasOffer && (
                                  <span className="text-gray-400 dark:text-gray-500 text-[11px] line-through font-semibold">
                                    {currencySymbol}{getDepartmentPrice(service).originalTotal}
                                  </span>
                                )}
                                <span>{currencySymbol}{getDepartmentPrice(service).total}</span>
                                {getDepartmentPrice(service).hasOffer && (
                                  <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">
                                    {getDepartmentPrice(service).offerDetails?.discountType === 'percentage' 
                                      ? `${getDepartmentPrice(service).offerDetails.discountValue}% OFF` 
                                      : `UP TO ${currencySymbol}${getDepartmentPrice(service).offerDetails.discountValue}`}
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                          {!hasVariants && getDepartmentPrice(service).taxPercentage > 0 && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                              {getDepartmentPrice(service).isTaxInclusive ? 'incl.' : '+'} Tax {getDepartmentPrice(service).taxPercentage}%
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 self-end">
                          {selected ? (
                            <div className="w-[36px] h-[36px] rounded-full bg-indigo-500 flex items-center justify-center">
                              <Check size={18} className="text-white" strokeWidth={2.5} />
                            </div>
                          ) : (
                            <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-white dark:bg-dark-surface" style={{ border: "1.5px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                              <Plus size={18} className="text-gray-600 dark:text-gray-400" strokeWidth={2} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {servicesData.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">No services available.</p>
          )}
        </div>

        {/* Mobile Floating Selected Count Chip — shows services scrolled above, tap to scroll up */}
        {selectedAboveCount > 0 && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-4 py-2 rounded-full"
            style={{ top: "104px", border: "1.5px solid #c7d2fe", background: "#f5f3ff", boxShadow: "0 4px 12px rgba(99,102,241,0.15)" }}
          >
            <span className="text-[13px] font-semibold text-indigo-600">
              {selectedAboveCount} selected service{selectedAboveCount > 1 ? "s" : ""} ↑
            </span>
          </button>
        )}

        {/* Mobile Fixed Bottom Bar */}
        {selectedServices.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface z-30 px-4 py-4" style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[16px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(salonConfig?.decimalPrecision ?? 2)}</p>
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
        )}
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden lg:flex lg:flex-col min-h-screen bg-[#f5f5f7] dark:bg-dark-bg">
        {/* Desktop Sticky Header */}
        <div
          className="sticky top-0 z-20 bg-[#f5f5f7] dark:bg-dark-bg transition-shadow duration-200"
          style={{ boxShadow: isScrolled ? "0 1px 4px rgba(0,0,0,0.06)" : "none" }}
        >
          <div className="max-w-[1200px] mx-auto w-full">
            {/* Top row: back arrow + title (on scroll) + X */}
            <div className="flex items-center justify-between px-8 h-[56px]">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="w-[40px] h-[40px] flex items-center justify-center rounded-full border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
                >
                  <ArrowLeft size={20} strokeWidth={2} className="text-black dark:text-white" />
                </button>
                {isScrolled && (
                  <span className="text-[16px] font-semibold text-black dark:text-white">Select services</span>
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

        {/* Sticky Category Pills - below header, only left side */}
        {desktopPillsSticky && (
          <div
            className="sticky top-[56px] z-[15] pointer-events-none"
          >
            <div className="max-w-[1200px] mx-auto w-full px-8 pr-[510px] pointer-events-auto">
              {/* Grey backing only behind the pills strip (not full width) so content doesn't bleed through */}
              <div className="bg-[#f5f5f7] dark:bg-dark-bg py-3">
                <CategoryPills />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Main Content */}
        <div className="flex-1">
          <div className="max-w-[1200px] mx-auto w-full px-8">
            {/* Two-column layout starts immediately - card aligns with breadcrumb */}
            <div className="flex gap-10 pb-16">
              {/* Left Column - Breadcrumb + Title + Pills + Services */}
              <div className="flex-1 min-w-0">
                {/* Breadcrumb */}
                <div className="pt-6 pb-1">
                  <div className="flex items-center gap-2 text-[13px] text-gray-400 dark:text-gray-500">
                    <span className="font-semibold text-black dark:text-white">Services</span>
                    <span>&gt;</span>
                    <span>Professional</span>
                    <span>&gt;</span>
                    <span>Time</span>
                    <span>&gt;</span>
                    <span>Confirm</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-[28px] font-bold text-black dark:text-white mt-2 mb-5">Select services</h1>

                {/* Inline Category Pills (scrolls away) - stays in left column only */}
                <div ref={desktopCategoryPillsRef} className="mb-6">
                  <div className="mb-4 -mx-4 lg:mx-0">
                    <DepartmentPills />
                  </div>
                  <CategoryPills />
                </div>

                {/* Selected services chip — sticky so it stays visible while scrolling (like mobile) */}
                {selectedAboveCount > 0 && (
                  <div className="sticky z-[14] mb-5 flex justify-center pointer-events-none" style={{ top: "124px" }}>
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
                      style={{ border: "1.5px solid #c7d2fe", background: "#f5f3ff", boxShadow: "0 4px 12px rgba(99,102,241,0.15)" }}
                    >
                      {selectedAboveCount} selected service{selectedAboveCount > 1 ? "s" : ""} ↑
                    </button>
                  </div>
                )}

                {/* Service Sections */}
                <div className="space-y-8">
                  {servicesGrouped.map((group, idx) => (
                    <div
                      key={group.category?._id || `group-${idx}`}
                      data-cat-section={group.category?._id || ""}
                      ref={(el) => { if (group.category?._id) categoryRefs.current[group.category._id] = el; }}
                    >
                      {group.category && (
                        <h2 className="text-[16px] font-bold text-black dark:text-white mb-4 uppercase tracking-tight">
                          {group.category.name}
                        </h2>
                      )}
                      <div className="space-y-4">
                        {group.services.map((service) => {
                          const hasVariants = service.useVariants && service.variants?.length > 0;
                          const selected = isServiceSelected(service._id);
                          let variantPrice = null;
                          if (hasVariants) {
                              variantPrice = Math.min(...service.variants.map((v) => getDepartmentPrice(service, true, v).total));
                          }

                          return (
                            <div
                              key={service._id}
                              id={`service-card-${service._id}`}
                              data-service-card={service._id}
                              onClick={() => handleServiceClick(service)}
                              className="rounded-2xl bg-white dark:bg-dark-surface p-5 cursor-pointer transition-all"
                              style={{
                                border: selected ? "2px solid #6366f1" : "1.5px solid #e5e7eb",
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h3 className="text-[16px] font-bold text-black dark:text-white leading-tight mb-1">
                                    {service.name}
                                  </h3>
                                  <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-2">
                                    {formatDuration(service.duration)}
                                    {hasVariants && <> &bull; {service.variants.length} variant{service.variants.length > 1 ? "s" : ""}</>}
                                  </p>
                                  {service.description && (
                                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">{service.description}</p>
                                  )}
                                  <p className="text-[15px] font-bold text-black dark:text-white flex items-center gap-2 flex-wrap">
                                    {hasVariants ? (
                                      <>from {currencySymbol}{variantPrice}</>
                                    ) : (
                                      <>
                                        {getDepartmentPrice(service).hasOffer && (
                                          <span className="text-gray-400 dark:text-gray-500 text-[12px] line-through font-semibold">
                                            {currencySymbol}{getDepartmentPrice(service).originalTotal}
                                          </span>
                                        )}
                                        <span>{currencySymbol}{getDepartmentPrice(service).total}</span>
                                        {getDepartmentPrice(service).hasOffer && (
                                          <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                                            {getDepartmentPrice(service).offerDetails?.discountType === 'percentage' 
                                              ? `${getDepartmentPrice(service).offerDetails.discountValue}% OFF` 
                                              : `UP TO ${currencySymbol}${getDepartmentPrice(service).offerDetails.discountValue}`}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </p>
                                  {!hasVariants && getDepartmentPrice(service).taxPercentage > 0 && (
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                                      {getDepartmentPrice(service).isTaxInclusive ? 'incl.' : '+'} Tax {getDepartmentPrice(service).taxPercentage}%
                                    </p>
                                  )}
                                </div>
                                <div className="flex-shrink-0 self-end">
                                  {selected ? (
                                    <div className="w-[40px] h-[40px] rounded-full bg-indigo-500 flex items-center justify-center">
                                      <Check size={20} className="text-white" strokeWidth={2.5} />
                                    </div>
                                  ) : (
                                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-white dark:bg-dark-surface" style={{ border: "1.5px solid #e0e0e0" }}>
                                      <Plus size={20} className="text-gray-500 dark:text-gray-400" strokeWidth={2} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {servicesData.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">No services available.</p>
                  )}
                </div>
              </div>

              {/* Right Column - Fixed Sidebar Card */}
              <div className="w-[470px] flex-shrink-0">
                {/* Spacer to maintain layout width */}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Right Card - never scrolls, centered within right area */}
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
            style={{
              border: "1px solid #e5e7eb",
            }}
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
                      {selectedServices.length > 0 && (
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
                                  {currencySymbol}{Number(service.price).toFixed(salonConfig?.decimalPrecision ?? 2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedServices.length === 0 && (
                        <div className="border-t border-gray-100 dark:border-dark-border pt-6 pb-4">
                          <p className="text-[13px] text-gray-400 dark:text-gray-500 text-center">No services selected</p>
                        </div>
                      )}
                    </div>

                    {/* Total + Continue - pinned at bottom */}
                    <div className="p-5 pt-3 mt-auto">
                      {selectedServices.length > 0 && (
                        <div className="flex items-center justify-between mb-5 pt-3 border-t border-gray-100 dark:border-dark-border">
                          <span className="text-[15px] font-bold text-black dark:text-white">Total</span>
                          <span className="text-[15px] font-bold text-black dark:text-white">{currencySymbol}{Number(totalAmount).toFixed(salonConfig?.decimalPrecision ?? 2)}</span>
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

      {/* ===== SHARED OVERLAYS ===== */}
      {variantSheetService && (
        <VariantBottomSheet
          service={variantSheetService}
          onClose={() => setVariantSheetService(null)}
          selectedServices={selectedServices}
          currencySymbol={currencySymbol}
          onToggleVariant={handleVariantSelect}
          getDepartmentPrice={getDepartmentPrice}
        />
      )}

      {showExitSheet && <ExitBookingSheet onCancel={cancelExit} onConfirm={confirmExit} />}

      {/* Categories Bottom Sheet (mobile only) */}
      {showCategorySheet && (
        <div className="lg:hidden">
          <CategoriesBottomSheet
            categories={categories}
            activeCategory={activeCategory}
            onSelect={(catId) => {
              setShowCategorySheet(false);
              setTimeout(() => scrollToCategory(catId), 100);
            }}
            onClose={() => setShowCategorySheet(false)}
          />
        </div>
      )}
    </>
  );
};

// Categories Bottom Sheet (mobile)
const CategoriesBottomSheet = ({ categories, activeCategory, onSelect, onClose }) => (
  <>
    <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} style={{ animation: "fadeIn 0.2s ease-out" }} />
    <div
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface z-50 flex flex-col rounded-t-3xl"
      style={{ animation: "slideUp 0.25s ease-out", maxHeight: "75vh" }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      <div className="flex items-center justify-between px-5 pb-3 pt-2">
        <h2 className="text-[20px] font-bold text-black dark:text-white">Categories</h2>
        <button onClick={onClose} className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card">
          <X size={18} className="text-black dark:text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => onSelect(cat._id)}
            className="w-full text-left py-4 text-[15px] font-medium text-black dark:text-white hover:text-indigo-600 transition-colors"
            style={{ fontWeight: activeCategory === cat._id ? 700 : 500 }}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
    <style>{`
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    `}</style>
  </>
);

// Variant Bottom Sheet Component
const VariantBottomSheet = ({ service, onClose, selectedServices, currencySymbol, onToggleVariant, getDepartmentPrice }) => {
  const isVariantSelected = (variantId) =>
    selectedServices.some((s) => s._id === service._id && s.variantId === variantId);

  const variantInfo = service.variants.map((v) => {
    const pData = getDepartmentPrice(service, true, v);
    return {
      id: v.variantId?._id || v.variantId || v._id,
      name: v.variantId?.name || v.name || v.displayName || "Variant",
      price: pData.total,
      originalPrice: pData.originalTotal,
      hasOffer: pData.hasOffer,
      offerDetails: pData.offerDetails,
      taxAmount: pData.taxAmount,
      taxPercentage: pData.taxPercentage,
      isTaxInclusive: pData.isTaxInclusive,
      duration: v.duration || service.duration || 0,
      gender: v.gender || service.gender || null,
      _originalVariant: v
    };
  });

  const minPrice = Math.min(...variantInfo.map((v) => v.price));
  const minDuration = Math.min(...variantInfo.map((v) => v.duration));
  const maxDuration = Math.max(...variantInfo.map((v) => v.duration));
  const durationRange =
    minDuration === maxDuration
      ? formatDuration(minDuration)
      : `${formatDuration(minDuration)} - ${formatDuration(maxDuration)}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} style={{ animation: "fadeIn 0.2s ease-out" }} />
      <div
        className="fixed bottom-0 left-0 right-0 top-[10vh] max-h-[90vh] bg-[#f5f5f7] dark:bg-dark-bg z-50 flex flex-col rounded-t-3xl overflow-hidden
          lg:inset-auto lg:top-1/2 lg:left-1/2 lg:bottom-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:max-w-[460px] lg:w-full lg:max-h-[78vh] lg:shadow-2xl"
        style={{ animation: "slideUp 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end px-4 lg:px-5 h-[56px] flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border transition-colors cursor-pointer"
          >
            <X size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-5 lg:px-7 pb-4">
          <h1 className="text-[26px] lg:text-[24px] font-bold text-black dark:text-white leading-tight mb-3">{service.name}</h1>
          {service.gender && (
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="9" r="5" />
                <path d="M12 14v8M9 19h6" />
              </svg>
              <span className="text-[13px]">{service.gender}</span>
            </div>
          )}
        </div>

        <div className="px-5 lg:px-7 pb-3">
          <h2 className="text-[18px] font-bold text-black dark:text-white">Select an option</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Required</p>
        </div>

        <div className="border-t border-gray-100 dark:border-dark-border" />

        <div className="flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-dark-surface">
            {variantInfo.map((variant, idx) => {
              const selected = isVariantSelected(variant.id);
              return (
                <div key={variant.id}>
                  <button
                    onClick={() =>
                      onToggleVariant({
                        ...variant._originalVariant,
                        _id: variant.id,
                        name: variant.name,
                        price: variant.price,
                        duration: variant.duration,
                      })
                    }
                    className="w-full flex items-center justify-between px-5 lg:px-7 py-5 text-left hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-[15px] font-bold text-black dark:text-white leading-tight mb-1">{variant.name}</p>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1.5">
                        {formatDuration(variant.duration)}
                        {variant.gender && <> &middot; {variant.gender}</>}
                      </p>
                      <p className="text-[14px] font-bold text-black dark:text-white flex items-center gap-2 flex-wrap">
                        <span>from {currencySymbol}{variant.price}</span>
                        {variant.hasOffer && (
                          <span className="text-gray-400 dark:text-gray-500 text-[11px] line-through font-semibold">
                            {currencySymbol}{variant.originalPrice}
                          </span>
                        )}
                        {variant.hasOffer && (
                          <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">
                            {variant.offerDetails?.discountType === 'percentage' 
                              ? `${variant.offerDetails.discountValue}% OFF` 
                              : `UP TO ${currencySymbol}${variant.offerDetails.discountValue}`}
                          </span>
                        )}
                      </p>
                      {variant.taxPercentage > 0 && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          {variant.isTaxInclusive ? 'incl.' : '+'} Tax {variant.taxPercentage}%
                        </p>
                      )}
                    </div>
                    <div
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        border: selected ? "none" : "2px solid #d1d5db",
                        backgroundColor: selected ? "#6366f1" : "transparent",
                      }}
                    >
                      {selected && <div className="w-[10px] h-[10px] rounded-full bg-white dark:bg-dark-surface" />}
                    </div>
                  </button>
                  {idx < variantInfo.length - 1 && <div className="border-t border-gray-200 dark:border-dark-border mx-5 lg:mx-7" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grey gap separates the variants card from the Add footer card */}
        <div className="flex-shrink-0 px-5 lg:px-7 py-5 lg:py-6 bg-white dark:bg-dark-surface mt-4 lg:mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[16px] font-bold text-black dark:text-white">from {currencySymbol}{minPrice}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">{durationRange}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="px-9 py-3.5 rounded-full text-[14px] font-semibold cursor-pointer hover:bg-black transition-colors"
              style={{ backgroundColor: "#111", color: "#fff" }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default SelectServices;
