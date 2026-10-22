import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGetServicesQuery, useGetShopsQuery, useGetPublicStaffQuery } from "../../../store/api/tenantEndpoints";
import { useGetServiceCategoriesQuery } from "../../../store/api/tenantCrudEndpoints";
import { useGetPublicShopsQuery, useGetShopReviewsQuery, useSubmitShopReviewMutation, useToggleShopFavoriteMutation } from "../../../store/api/homeEndpoints";
import api from "../../../api/axiosInstance";
import { HomeScreenSkeleton } from "../../../components/user/skeletons";
import {
  Share2,
  Heart,
  ArrowLeft,
  MapPin,
  Star,
  CheckCircle2,
  CreditCard,
  Baby,
  Car,
  Train,
  Send,
  User,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Calendar,
  Wallet,
  LogOut,
  List,
  Sun,
  Moon
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { selectSelectedBranchId, selectSelectedBranchAddress, setBranch, clearBranch } from "../../../store/slices/userAppSlice";
import { addSelectedService, setShopContext, setSelectedStaff as setBookingStaff } from "../../../store/slices/bookingFlowSlice";
import DesktopFooter from "../../../components/user/DesktopFooter";
import { useTheme } from "../../../components/shared/ThemeContext";
import moment from "moment";

const UserHome = () => {
  const { shopSlug } = useParams();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Persist the shop slug so that API calls from global routes (e.g. /user/bookings)
  // can still resolve the correct tenant context.
  useEffect(() => {
    if (shopSlug) {
      localStorage.setItem("lastShopSlug", shopSlug);
    }
  }, [shopSlug]);

  // Scroll to top when loading the shop profile
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [shopSlug]);

  const navigate = useNavigate();
  const { salonConfig, currencySymbol, user, logout } = useAuth();
  
  const shopName = salonConfig?.salonName || "Backyard Barbers";
  const isDefaultShop = !shopSlug || shopSlug === "undefined" || shopSlug === "vijayajalakam";
  const selectedBranchAddress = useSelector(selectSelectedBranchAddress);

  // Build address from available fields — prefer the selected branch's Google Maps address
  const shopAddress = (() => {
    if (selectedBranchAddress) return selectedBranchAddress;
    const parts = [];
    if (salonConfig?.address && salonConfig.address !== "N/A") parts.push(salonConfig.address);
    else {
      if (salonConfig?.area) parts.push(salonConfig.area);
      if (salonConfig?.state) parts.push(salonConfig.state);
      if (salonConfig?.country) parts.push(salonConfig.country);
    }
    return parts.length > 0 ? parts.join(", ") : "Address not provided";
  })();
  
  // Branch Selection State
  const selectedBranchId = useSelector(selectSelectedBranchId);
  const [showBranchSheet, setShowBranchSheet] = useState(false);
  const [branchAutoSelected, setBranchAutoSelected] = useState(false);

  // Fetch branches for this shop
  const { data: branches = [], isLoading: branchesLoading } = useGetShopsQuery(shopSlug, { skip: !shopSlug });

  // Auto-select branch: if only 1 branch, select it automatically; if multiple, select nearest
  useEffect(() => {
    if (branchesLoading || branches.length === 0) return;
    
    // Check if current selection is valid for this shop
    const currentBranchValid = selectedBranchId && branches.some(b => b._id === selectedBranchId);
    
    // If already valid, mark as auto-selected and skip
    if (currentBranchValid) {
      setBranchAutoSelected(true);
      return;
    }
    
    // Need to select a branch
    if (branches.length === 1) {
      // Single branch — auto-select without showing sheet
      const branch = branches[0];
      dispatch(setBranch({ id: branch._id, name: branch.name, address: branch.mapAddress || branch.address || "", shopSlug }));
      setBranchAutoSelected(true);
    } else if (branches.length > 1) {
      // Try to auto-select nearest branch using saved user location
      let autoSelected = false;
      try {
        const saved = localStorage.getItem("vijayajalakam_user_location");
        if (saved) {
          const loc = JSON.parse(saved);
          if (loc.lat && loc.lng) {
            // Calculate distance for each branch that has coordinates
            const branchesWithDist = branches
              .filter(b => b.latitude && b.longitude)
              .map(b => {
                const R = 6371;
                const dLat = ((b.latitude - loc.lat) * Math.PI) / 180;
                const dLon = ((b.longitude - loc.lng) * Math.PI) / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos((loc.lat * Math.PI)/180) * Math.cos((b.latitude * Math.PI)/180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return { ...b, distance: R * c };
              })
              .sort((a, b) => a.distance - b.distance);
            
            if (branchesWithDist.length > 0) {
              const nearest = branchesWithDist[0];
              dispatch(setBranch({ id: nearest._id, name: nearest.name, address: nearest.mapAddress || nearest.address || "", shopSlug }));
              autoSelected = true;
            }
          }
        }
      } catch {}
      
      if (!autoSelected) {
        // No location or no branches with coordinates — select first branch
        const first = branches[0];
        dispatch(setBranch({ id: first._id, name: first.name, address: first.mapAddress || first.address || "", shopSlug }));
      }
      setBranchAutoSelected(true);
    }
  }, [branches, branchesLoading, shopSlug, selectedBranchId, dispatch]);

  // Reset branch auto-selection when shop changes
  useEffect(() => {
    setBranchAutoSelected(false);
  }, [shopSlug]);

  const handleBranchSelect = (branch) => {
    dispatch(setBranch({ id: branch._id, name: branch.name, address: branch.mapAddress || branch.address || "", shopSlug }));
    setShowBranchSheet(false);
  };

  // Data Fetching — pass branchId to filter services by selected branch
  const { data: categoriesData = [], isLoading: catsLoading } = useGetServiceCategoriesQuery(shopSlug, { skip: !shopSlug });
  const { data: servicesData = [], isLoading: servicesLoading } = useGetServicesQuery(
    { shopSlug, branchId: selectedBranchId || undefined },
    { skip: !shopSlug }
  );

  // Fetch public staff for Team section
  const { data: staffData = [] } = useGetPublicStaffQuery(undefined, { skip: !shopSlug });

  // Filter staff by selected branch
  const branchStaff = useMemo(() => {
    if (!selectedBranchId) return staffData;
    return staffData.filter(s => !s.branchId || s.branchId === selectedBranchId);
  }, [staffData, selectedBranchId]);

  const isLoading = catsLoading || servicesLoading || branchesLoading;

  // Fetch nearby public shops for "Venues nearby" section (pass user location for distance sorting)
  const nearbyUserLocation = useMemo(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.lat && loc.lng) return { lat: loc.lat, lng: loc.lng };
      }
    } catch {}
    return null;
  }, []);
  const { data: nearbyShops = [] } = useGetPublicShopsQuery(nearbyUserLocation);

  // Calculate distance and sort nearby shops
  const nearbyShopsSorted = useMemo(() => {
    const filtered = nearbyShops.filter(s => s.slug !== shopSlug);
    if (!nearbyUserLocation) return filtered;
    
    const withDistance = filtered.map(shop => {
      let minDist = Infinity;
      const branchAddrs = shop.branchAddresses || shop.branches || [];
      for (const b of branchAddrs) {
        if (b.latitude && b.longitude) {
          const R = 6371;
          const dLat = ((b.latitude - nearbyUserLocation.lat) * Math.PI) / 180;
          const dLon = ((b.longitude - nearbyUserLocation.lng) * Math.PI) / 180;
          const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos((nearbyUserLocation.lat*Math.PI)/180)*Math.cos((b.latitude*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
          const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
          if (d < minDist) minDist = d;
        }
      }
      // Fallback: check shop-level lat/lng
      if (minDist === Infinity && shop.latitude && shop.longitude) {
        const R = 6371;
        const dLat = ((shop.latitude - nearbyUserLocation.lat) * Math.PI) / 180;
        const dLon = ((shop.longitude - nearbyUserLocation.lng) * Math.PI) / 180;
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos((nearbyUserLocation.lat*Math.PI)/180)*Math.cos((shop.latitude*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
        minDist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
      }
      return { ...shop, _distance: minDist === Infinity ? null : Math.round(minDist) };
    });
    
    return withDistance.sort((a, b) => {
      if (a._distance === null && b._distance === null) return 0;
      if (a._distance === null) return 1;
      if (b._distance === null) return -1;
      return a._distance - b._distance;
    });
  }, [nearbyShops, shopSlug, nearbyUserLocation]);

  // Build gallery images - use galleryImages from config, fallback to logo
  const galleryImages = (() => {
    const images = [];
    // Use gallery images if available (sorted by order, primary first)
    if (salonConfig?.galleryImages && salonConfig.galleryImages.length > 0) {
      const sorted = [...salonConfig.galleryImages].sort((a, b) => {
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        return a.order - b.order;
      });
      return sorted.map(img => img.url);
    }
    // Fallback to logo/banner/coverImage
    if (salonConfig?.logo) images.push(salonConfig.logo);
    if (salonConfig?.banner && salonConfig.banner !== salonConfig?.logo) images.push(salonConfig.banner);
    if (salonConfig?.coverImage && !images.includes(salonConfig.coverImage)) images.push(salonConfig.coverImage);
    // Ensure at least 3 images for the grid
    if (images.length === 0) images.push("https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200");
    if (images.length === 1) images.push(images[0]);
    if (images.length === 2) images.push(images[0]);
    return images;
  })();

  const [activeTab, setActiveTab] = useState("Photos");
  const [activeCategory, setActiveCategory] = useState("All");
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        if (res.data?.success) {
          const activeDepts = res.data.data.filter(d => d.isActive);
          setDepartments(activeDepts);
          if (activeDepts.length > 0) {
            setSelectedDepartment(activeDepts[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    if (shopSlug) fetchDepartments();
  }, [shopSlug]);

  const getDepartmentPrice = (service, isVariant = false, variantObj = null, deptOverride = null) => {
      const activeDept = deptOverride || selectedDepartment;
      if (!service) return { total: 0, taxAmount: 0, taxPercentage: 0, isTaxInclusive: false, basePrice: 0 };
      
      let basePrice = 0;
      if (isVariant && variantObj) {
          const deptPrice = variantObj.pricing?.find(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === activeDept);
          basePrice = deptPrice ? deptPrice.price : (variantObj.price || 0);
      } else {
          const pricing = service?.pricing?.find(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === activeDept);
          basePrice = pricing ? pricing.price : (service?.price || 0);
      }


      const taxPct = (isVariant && variantObj && (variantObj.taxPercentage !== undefined || variantObj.taxId))
          ? (variantObj.taxPercentage || variantObj.taxId?.percentage || 0)
          : (service?.taxPercentage || service?.taxId?.percentage || 0);
          
      const isInc = (isVariant && variantObj && variantObj.isTaxInclusive !== undefined)
          ? variantObj.isTaxInclusive
          : (service?.isTaxInclusive || false);

      let taxAmount = 0;
      let total = basePrice;

      if (taxPct > 0) {
          if (isInc) {
              taxAmount = basePrice - (basePrice / (1 + (taxPct / 100)));
          } else {
              taxAmount = basePrice * (taxPct / 100);
              total = basePrice + taxAmount;
          }
      }

      return { 
          total: parseFloat(total.toFixed(2)), 
          taxAmount: parseFloat(taxAmount.toFixed(2)), 
          taxPercentage: taxPct, 
          isTaxInclusive: isInc, 
          basePrice: parseFloat(basePrice.toFixed(2)) 
      };
  };

  const [serviceVisibleCount, setServiceVisibleCount] = useState(10);
  const [reviewVisibleCount, setReviewVisibleCount] = useState(4);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDesktopBranchPopup, setShowDesktopBranchPopup] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffModalTab, setStaffModalTab] = useState("profile");
  const [staffModalScrolled, setStaffModalScrolled] = useState(false);
  const [staffReviewRating, setStaffReviewRating] = useState(5);
  const [staffReviewComment, setStaffReviewComment] = useState("");
  const [staffReviewSubmitting, setStaffReviewSubmitting] = useState(false);
  const [staffReviews, setStaffReviews] = useState([]);
  
  const servicesRef = useRef(null);
  const teamRef = useRef(null);
  const portfolioRef = useRef(null);
  const otherRef = useRef(null);
  const aboutRef = useRef(null);
  const reviewsRef = useRef(null);

  // Mobile-specific refs (since both layouts are in DOM, refs would conflict)
  const mobileServicesRef = useRef(null);
  const mobileTeamRef = useRef(null);
  const mobilePortfolioRef = useRef(null);
  const mobileOtherRef = useRef(null);
  const mobileAboutRef = useRef(null);
  const mobileReviewsRef = useRef(null);

  // Scroll to services section if URL has #services hash
  useEffect(() => {
    if (location.hash === "#services") {
      const timer = setTimeout(() => {
        if (servicesRef.current) {
          servicesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  const tabs = ["Photos", "Services", "Team", "Portfolio", "Reviews", "About", "Other"];
  const mobileTabs = ["Photos", "About", "Services", "Team", "Portfolio", "Reviews", "Other"];

  // Shop Reviews — RTK Query (cached, auto-refetch on invalidation)
  const { data: reviewsData, isLoading: shopReviewsLoading } = useGetShopReviewsQuery(shopSlug, { skip: !shopSlug });
  const shopReviews = reviewsData?.reviews || [];
  const shopAvgRating = reviewsData?.avgRating || 0;
  const shopReviewTotal = reviewsData?.total || 0;
  const [submitShopReview] = useSubmitShopReviewMutation();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSnack, setReviewSnack] = useState("");

  // Image Carousel State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = useRef(null);

  // Gallery Modal State
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Scroll state - show sticky header only after scrolling past hero
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header: desktop after gallery (460px), mobile after hero (320px)
      const isMobile = window.innerWidth < 768;
      setShowStickyHeader(window.scrollY > (isMobile ? 320 : 460));

      // Update active tab based on scroll position
      const offset = 120;
      
      // Desktop order: Services, Reviews, About, Other (matches desktop DOM order)
      // Mobile order: About, Services, Reviews, Other (matches mobile DOM order)
      const sections = isMobile 
        ? [
            { ref: mobileAboutRef, tab: "About" },
            { ref: mobileServicesRef, tab: "Services" },
            { ref: mobileTeamRef, tab: "Team" },
            { ref: mobilePortfolioRef, tab: "Portfolio" },
            { ref: mobileReviewsRef, tab: "Reviews" },
            { ref: mobileOtherRef, tab: "Other" },
          ]
        : [
            { ref: servicesRef, tab: "Services" },
            { ref: teamRef, tab: "Team" },
            { ref: portfolioRef, tab: "Portfolio" },
            { ref: reviewsRef, tab: "Reviews" },
            { ref: aboutRef, tab: "About" },
            { ref: otherRef, tab: "Other" },
          ];
      
      let currentTab = "Photos";
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section.ref.current) {
          const top = section.ref.current.getBoundingClientRect().top;
          if (top <= offset) {
            currentTab = section.tab;
          }
        }
      }
      setActiveTab(currentTab);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImageIndex < galleryImages.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      } else if (diff < 0 && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
    }
    touchStartX.current = null;
  };

  // Favorite State — use nearby shops data (already cached by RTK Query) to find shop ID
  const [isFavorite, setIsFavorite] = useState(false);
  const [toggleFavoriteMutation] = useToggleShopFavoriteMutation();

  // Derive shop ID from the already-fetched nearbyShops data (no extra API call)
  const currentShopId = useMemo(() => {
    if (!nearbyShops || nearbyShops.length === 0) return null;
    const shop = nearbyShops.find(s => s.slug === shopSlug);
    return shop?._id?.toString() || null;
  }, [nearbyShops, shopSlug]);

  // Check favorite status from localStorage (instant, no API call)
  useEffect(() => {
    if (!currentShopId) return;
    try {
      const saved = localStorage.getItem("vijayajalakam_favorites");
      const favs = saved ? JSON.parse(saved) : [];
      setIsFavorite(favs.includes(currentShopId));
    } catch {
      // ignore
    }
  }, [currentShopId]);

  const toggleFavorite = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) {
      setReviewSnack("Please login to add favorites");
      return;
    }

    if (!currentShopId) return;

    const newVal = !isFavorite;
    setIsFavorite(newVal);

    // Update localStorage immediately for instant feedback
    try {
      const saved = localStorage.getItem("vijayajalakam_favorites");
      let favs = saved ? JSON.parse(saved) : [];
      if (newVal) {
        if (!favs.includes(currentShopId)) favs.push(currentShopId);
      } else {
        favs = favs.filter(f => f !== currentShopId);
      }
      localStorage.setItem("vijayajalakam_favorites", JSON.stringify(favs));
    } catch {
      // ignore
    }

    // Sync with backend via RTK Query mutation
    try {
      await toggleFavoriteMutation({ shopId: currentShopId, isFavorite }).unwrap();
    } catch {
      // Revert on failure
      setIsFavorite(!newVal);
    }
  }, [user, currentShopId, isFavorite, toggleFavoriteMutation]);

  // Share handler
  const handleShare = useCallback(async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: shopName,
      text: `Check out ${shopName}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setReviewSnack("Link copied to clipboard!");
      } catch {
        // Final fallback
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setReviewSnack("Link copied to clipboard!");
      }
    }
  }, [shopName]);

  // Fetch shop reviews — handled by RTK Query (useGetShopReviewsQuery above)

  // Fetch staff reviews when a staff member is selected
  useEffect(() => {
    if (!selectedStaff) { setStaffReviews([]); return; }
    setStaffModalScrolled(false);
    const fetchStaffReviews = async () => {
      try {
        const res = await api.get(`/reviews/item/Staff/${selectedStaff._id}`);
        if (res.data.success) {
          setStaffReviews(res.data.data || []);
        }
      } catch { setStaffReviews([]); }
    };
    fetchStaffReviews();
  }, [selectedStaff]);

  const handleShopReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setReviewSnack("Please login to submit a review");
      return;
    }
    if (!reviewComment.trim()) return;

    try {
      setReviewSubmitting(true);
      await submitShopReview({
        itemType: "Shop",
        rating: reviewRating,
        comment: reviewComment,
      }).unwrap();
      setReviewComment("");
      setReviewRating(5);
      setReviewSnack("Review submitted successfully!");
    } catch (err) {
      setReviewSnack(err?.data?.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };
  
  // Process Categories and Services
  const categories = [{ _id: "All", name: "Featured" }, ...categoriesData];
  const displayServices = (activeCategory === "All" 
    ? servicesData 
    : servicesData.filter(s => {
        if (s.categories && Array.isArray(s.categories)) {
          return s.categories.some(c => (c._id || c) === activeCategory);
        }
        return (s.category?._id || s.category) === activeCategory;
      })).filter(s => {
        if (!selectedDepartment) return true;
        if (s.useVariants && s.variants && s.variants.length > 0) {
            return s.variants.some(v => 
                v.pricing && v.pricing.some(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === selectedDepartment)
            );
        } else {
            if (s.pricing && s.pricing.length > 0) {
                return s.pricing.some(p => (p.departmentId?._id || p.departmentId || p.department?._id || p.department) === selectedDepartment);
            }
            return false;
        }
      });

  const scrollToSection = (tab) => {
    setActiveTab(tab);
    let ref = null;
    const isMobile = window.innerWidth < 768;
    if (tab === "Services") ref = isMobile ? mobileServicesRef : servicesRef;
    if (tab === "Team") ref = isMobile ? mobileTeamRef : teamRef;
    if (tab === "Portfolio") ref = isMobile ? mobilePortfolioRef : portfolioRef;
    if (tab === "Other") ref = isMobile ? mobileOtherRef : otherRef;
    if (tab === "About") ref = isMobile ? mobileAboutRef : aboutRef;
    if (tab === "Reviews") ref = isMobile ? mobileReviewsRef : reviewsRef;
    
    if (ref && ref.current) {
      const yOffset = -60;
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else if (tab === "Photos") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatDuration = (mins) => {
    if (!mins) return "";
    if (mins < 60) return `${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} hr${m > 0 ? ` ${m} mins` : ''}`;
  };

  if (isLoading) {
    return <HomeScreenSkeleton />;
  }

  return (
    <>
    {/* ===== DESKTOP LAYOUT ===== */}
    <div className="hidden md:block min-h-screen bg-white dark:bg-dark-surface font-sans">
      {/* Top Navbar - hides when scrolled past gallery */}
      <header className={`sticky top-0 z-50 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border transition-transform duration-300 ${showStickyHeader ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="flex items-center h-[64px] max-w-[1400px] mx-auto px-4">
          <a href="/" className="shrink-0 mr-10 no-underline">
            <span className="text-[22px] font-extrabold tracking-tight text-black dark:text-white lowercase">vijayajalakam</span>
          </a>
          <div className="flex-1 flex justify-center">
            <div 
              onClick={() => navigate('/user/search')}
              className="flex items-center border border-gray-200 dark:border-dark-border rounded-full h-[44px] w-full max-w-[520px] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 px-5 flex-1 border-r border-gray-200 dark:border-dark-border h-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span className="text-[13px] text-gray-400 dark:text-gray-500 font-medium">Search shops</span>
              </div>
              <div className="flex items-center gap-2 px-5 flex-1 h-full">
                <MapPin size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <span className="text-[13px] text-gray-400 dark:text-gray-500 font-medium truncate">{(() => { try { const s = localStorage.getItem("vijayajalakam_user_location"); if (s) { const l = JSON.parse(s); return l.name ? `${l.name}, ${(l.region || '').split(',')[0]}` : 'Current location'; } } catch {} return 'Current location'; })()}</span>
              </div>
              <button className="w-[36px] h-[36px] bg-black rounded-full flex items-center justify-center shrink-0 mr-[4px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </div>
          </div>
          <div className="shrink-0 ml-10 flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
                className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-dark-border pl-1 pr-2.5 py-1 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center overflow-hidden">
                  {user?.photo?.url || user?.photo?.path || (typeof user?.photo === 'string' && user.photo) || user?.profileImage ? (
                    <img 
                      src={user.photo?.url || user.photo?.path || (typeof user?.photo === 'string' ? user.photo : user.profileImage)} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">
                      {user?.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                    </span>
                  )}
                </div>
                <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                  <div className="absolute right-0 top-12 z-50 w-[240px] bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden">
                    {/* User Name */}
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border">
                      <p className="text-[16px] font-bold text-black dark:text-white">{user?.name || "Guest"}</p>
                    </div>
                    {/* Menu Items */}
                    <div className="py-2">
                      <button 
                        onClick={() => { setShowProfileDropdown(false); navigate(`/${shopSlug}/user/profile`); }}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left"
                      >
                        <User size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-[14px] text-gray-800 dark:text-gray-100 font-medium">Profile</span>
                      </button>
                      <button 
                        onClick={() => { setShowProfileDropdown(false); navigate(`/${shopSlug}/user/bookings`); }}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left"
                      >
                        <Calendar size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-[14px] text-gray-800 dark:text-gray-100 font-medium">Bookings</span>
                      </button>
                      <button 
                        onClick={() => { setShowProfileDropdown(false); navigate(`/${shopSlug}/user/favourites`); }}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left"
                      >
                        <Heart size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-[14px] text-gray-800 dark:text-gray-100 font-medium">Favourites</span>
                      </button>
                    </div>
                    {/* Logout */}
                    <div className="border-t border-gray-100 dark:border-dark-border py-2">
                      <button 
                        onClick={async () => { setShowProfileDropdown(false); await logout(); navigate(`/${shopSlug}/login`); }}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left"
                      >
                        <LogOut size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-[14px] text-gray-800 dark:text-gray-100 font-medium">Log out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-4 py-4 text-[13px] text-gray-500 dark:text-gray-400">
        <a href="/" className="hover:text-black dark:text-white no-underline text-gray-500">Home</a>
        <span className="mx-2">›</span>
        <span className="text-gray-900 dark:text-white font-medium">{shopName}</span>
      </div>

      {/* Shop Title + Rating + Status */}
      <div className="max-w-[1400px] mx-auto px-4 pb-5">
        <h1 className="text-[36px] font-bold text-black dark:text-white leading-tight tracking-tight">{shopName}</h1>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {shopAvgRating > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold">{Number(shopAvgRating).toFixed(1)}</span>
              <div className="flex">
                {[1,2,3,4,5].map(s => <Star key={s} size={15} fill={shopAvgRating >= s ? "#f59e0b" : "none"} color="#f59e0b" />)}
              </div>
              <span className="text-[14px] text-blue-600 font-medium">({shopReviewTotal})</span>
            </div>
          )}
          <span className="text-[14px] text-gray-300">·</span>
          {/* Open/Closed Status */}
          {(() => {
            const operatingHours = salonConfig?.operatingHours || [];
            const now = new Date();
            const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
            const todayData = operatingHours.find(d => d.day === todayName);
            const isOpenToday = todayData ? todayData.isOpen : true;
            const formatTime12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; const hour12 = h % 12 || 12; return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`; };
            const daysOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

            if (isOpenToday) {
              const startTime = todayData?.startTime || '09:00';
              const endTime = todayData?.endTime || '21:00';
              const [sh, sm] = startTime.split(':').map(Number);
              const [eh, em] = endTime.split(':').map(Number);
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const startMinutes = sh * 60 + sm;
              const endMinutes = eh * 60 + em;
              if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                return <span className="text-[14px]"><span className="text-green-600 font-semibold">Open</span><span className="text-gray-500 dark:text-gray-400"> – closes at {formatTime12(endTime)}</span></span>;
              } else if (currentMinutes < startMinutes) {
                return <span className="text-[14px]"><span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span><span className="text-gray-500"> – opens today at {formatTime12(startTime)}</span></span>;
              } else {
                const todayIdx = daysOrder.indexOf(todayName);
                for (let i = 1; i <= 7; i++) {
                  const nextDay = daysOrder[(todayIdx + i) % 7];
                  const nextData = operatingHours.find(d => d.day === nextDay);
                  if (!nextData || nextData.isOpen) {
                    return <span className="text-[14px]"><span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span><span className="text-gray-500"> – opens on {nextDay} at {formatTime12(nextData?.startTime || '09:00')}</span></span>;
                  }
                }
              }
            } else {
              const todayIdx = daysOrder.indexOf(todayName);
              for (let i = 1; i <= 7; i++) {
                const nextDay = daysOrder[(todayIdx + i) % 7];
                const nextData = operatingHours.find(d => d.day === nextDay);
                if (!nextData || nextData.isOpen) {
                  return <span className="text-[14px]"><span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span><span className="text-gray-500"> – opens on {nextDay} at {formatTime12(nextData?.startTime || '09:00')}</span></span>;
                }
              }
            }
            return <span className="text-[14px] text-orange-600 dark:text-orange-400 font-semibold">Closed</span>;
          })()}
          <span className="text-[14px] text-gray-300">·</span>
          <span className="text-[14px] text-gray-600 dark:text-gray-400">{shopAddress}</span>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopAddress)}`} target="_blank" rel="noopener noreferrer" className="text-[14px] text-blue-600 font-semibold hover:underline ml-1">Get directions</a>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={handleShare} className="w-9 h-9 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors">
              <Share2 size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={toggleFavorite} className="w-9 h-9 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors">
              <Heart size={16} className={isFavorite ? "text-red-500 fill-red-500" : "text-gray-600 dark:text-gray-400"} />
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery Grid - Fresha-style layout */}
      <div className="max-w-[1400px] mx-auto px-4 mb-10">
        {(() => {
          // Always show 3 images in the grid - duplicate if needed
          const gridImages = [...galleryImages];
          while (gridImages.length < 3) {
            gridImages.push(gridImages[gridImages.length - 1] || gridImages[0]);
          }
          return (
            <div className="grid gap-3" style={{ height: '480px', gridTemplateColumns: '65% 35%', gridTemplateRows: '1fr 1fr' }}>
              {/* Large image - spans both rows on the left */}
              <div 
                className="relative cursor-pointer overflow-hidden rounded-xl"
                style={{ gridRow: '1 / 3' }}
                onClick={() => navigate(`/${shopSlug}/user/gallery`)}
              >
                <img src={gridImages[0]} alt={shopName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              {/* Top-right image */}
              <div 
                className="relative cursor-pointer overflow-hidden rounded-xl"
                onClick={() => navigate(`/${shopSlug}/user/gallery`)}
              >
                <img src={gridImages[1]} alt={`${shopName} 2`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              {/* Bottom-right image with "See all images" button */}
              <div 
                className="relative cursor-pointer overflow-hidden rounded-xl"
                onClick={() => navigate(`/${shopSlug}/user/gallery`)}
              >
                <img src={gridImages[2]} alt={`${shopName} 3`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/${shopSlug}/user/gallery`); }}
                  className="absolute bottom-4 right-4 bg-white dark:bg-dark-surface px-5 py-1.5 rounded-full text-[13px] font-semibold shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl hover:bg-gray-50 dark:hover:bg-dark-card transition-all z-10"
                >
                  See all images
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Image Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-dark-surface overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border">
            <div className="max-w-[900px] mx-auto px-8 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-[28px] font-bold text-black dark:text-white">Image gallery</h2>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{shopName}</p>
              </div>
              <button 
                onClick={() => setShowGalleryModal(false)}
                className="w-10 h-10 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
              >
                <X size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
          {/* Modal Body - Masonry-style grid */}
          <div className="max-w-[900px] mx-auto px-8 py-8">
            <div className="space-y-4">
              {/* First image full width */}
              {galleryImages.length > 0 && (
                <div className="w-full rounded-xl overflow-hidden">
                  <img src={galleryImages[0]} alt={`${shopName} 1`} className="w-full h-auto max-h-[500px] object-cover" />
                </div>
              )}
              {/* Remaining images in 2-column grid */}
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-2 gap-4">
                  {galleryImages.slice(1).map((img, idx) => (
                    <div key={idx} className={`rounded-xl overflow-hidden ${idx === galleryImages.length - 2 && (galleryImages.length - 1) % 2 !== 0 ? 'col-span-2' : ''}`}>
                      <img src={img} alt={`${shopName} ${idx + 2}`} className="w-full h-[280px] object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Branch Selection Popup */}
      {showDesktopBranchPopup && branches.length > 1 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowDesktopBranchPopup(false)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-[560px] max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-7 py-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-bold text-black dark:text-white">Select a branch</h2>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">Choose a location to explore services</p>
              </div>
              <button onClick={() => setShowDesktopBranchPopup(false)} className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card flex items-center justify-center transition-colors">
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            {/* Branch List */}
            <div className="overflow-y-auto max-h-[60vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(() => {
                let userLoc = null;
                try {
                  const saved = localStorage.getItem("vijayajalakam_user_location");
                  if (saved) { const loc = JSON.parse(saved); if (loc.lat && loc.lng) userLoc = loc; }
                } catch {}

                const branchesWithDist = branches.map(branch => {
                  let distance = null;
                  if (userLoc && branch.latitude && branch.longitude) {
                    const R = 6371;
                    const dLat = ((branch.latitude - userLoc.lat) * Math.PI) / 180;
                    const dLon = ((branch.longitude - userLoc.lng) * Math.PI) / 180;
                    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos((userLoc.lat*Math.PI)/180)*Math.cos((branch.latitude*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
                    distance = Math.round(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R);
                  }
                  return { ...branch, _dist: distance };
                }).sort((a, b) => {
                  if (a._dist === null && b._dist === null) return 0;
                  if (a._dist === null) return 1;
                  if (b._dist === null) return -1;
                  return a._dist - b._dist;
                });

                return branchesWithDist.map((branch, idx) => {
                  const isSelected = selectedBranchId === branch._id;
                  const address = branch.mapAddress || branch.address || "";
                  const shortAddr = address ? address.split(",").slice(0, 3).map(s => s.trim()).join(", ") : "";
                  const directionsUrl = branch.latitude && branch.longitude 
                    ? `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}` 
                    : null;

                  return (
                    <div key={branch._id}>
                      <div 
                        className={`px-7 py-5 flex items-start gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                        onClick={() => { handleBranchSelect(branch); setShowDesktopBranchPopup(false); }}
                      >
                        {/* Branch image or icon */}
                        {branch.image?.url ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-card shrink-0">
                            <img src={branch.image.url} alt={branch.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                            <MapPin size={20} className="text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-bold text-black dark:text-white">{branch.name}</p>
                            {idx === 0 && branch._dist !== null && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Nearest</span>
                            )}
                          </div>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {branch._dist !== null ? `${branch._dist}km · ` : ''}{shortAddr}
                          </p>
                          {directionsUrl && (
                            <a 
                              href={directionsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[12px] text-blue-600 font-medium mt-1 inline-block hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Get directions
                            </a>
                          )}
                        </div>
                        {/* Radio */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${isSelected ? 'bg-indigo-500' : 'border-2 border-gray-300 dark:border-dark-border'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-dark-surface"></div>}
                        </div>
                      </div>
                      {/* Mini map for selected branch */}
                      {isSelected && branch.latitude && branch.longitude && (
                        <div className="px-7 pb-4">
                          <div className="rounded-xl overflow-hidden h-[140px]">
                            <iframe
                              title={`${branch.name} location`}
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              loading="lazy"
                              src={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}&z=15&output=embed`}
                            ></iframe>
                          </div>
                        </div>
                      )}
                      {idx < branchesWithDist.length - 1 && <div className="border-t border-gray-100 dark:border-dark-border mx-7"></div>}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Nav Tabs - appears only after scrolling past gallery, replaces navbar */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border transition-all duration-300 ${showStickyHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex gap-7">
            {tabs.map(tab => (
              <button key={tab} onClick={() => scrollToSection(tab)}
                className={`py-3 text-[14px] font-medium transition-colors relative ${activeTab === tab ? 'text-black dark:text-white' : 'text-gray-500 hover:text-black dark:text-white'}`}>
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black rounded-t-full"></div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Left (services/reviews/about) + Right Sticky Sidebar */}
      <div className="max-w-[1400px] mx-auto px-4 flex gap-10 pt-10">
        {/* Left Content */}
        <div className="flex-1 min-w-0">
          {/* Services Section */}
          <div ref={servicesRef} className="mb-14">
            {/* Department Pills */}
            {departments.length > 0 && (
              <div className="flex w-full bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] relative">
                {departments.map(dept => (
                  <button
                    key={dept._id}
                    onClick={() => { setSelectedDepartment(dept._id); setServiceVisibleCount(10); }}
                    className={`flex-1 min-w-[120px] whitespace-nowrap py-4 text-[13px] font-bold uppercase tracking-widest transition-all relative ${selectedDepartment === dept._id ? 'text-[#6b5bfd] bg-[#6b5bfd]/5' : 'text-gray-400 hover:text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card'}`}
                  >
                    {dept.name}
                    {selectedDepartment === dept._id && (
                      <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#6b5bfd] rounded-t-full"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            <h2 className="text-[24px] font-bold text-black dark:text-white mb-5">Services</h2>

            {/* Category Pills */}
            <div className="flex items-center gap-2.5 mb-7">
              <div className="flex items-center gap-2.5 overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {categories.map((cat) => (
                  <button key={cat._id} onClick={() => { setActiveCategory(cat._id); setServiceVisibleCount(10); setShowCategoryDropdown(false); }}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all border ${activeCategory === cat._id ? "bg-black text-white border-black" : "bg-white dark:bg-dark-surface text-black dark:text-white border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card hover:border-gray-300"}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
              {/* Category list icon */}
              <div className="relative shrink-0">
                <button 
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-10 h-10 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                >
                  <List size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
                {/* Dropdown */}
                {showCategoryDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)}></div>
                    <div className="absolute top-12 right-0 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl z-50 min-w-[240px] max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2">
                      {categories.map((cat, idx) => (
                        <div key={cat._id}>
                          <button 
                            onClick={() => { setActiveCategory(cat._id); setServiceVisibleCount(10); setShowCategoryDropdown(false); }}
                            className={`w-full text-left px-5 py-2.5 text-[14px] transition-colors ${activeCategory === cat._id ? 'font-bold text-black bg-gray-50 dark:bg-dark-card' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card'}`}
                          >
                            {cat.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* Service List */}
            <div className="space-y-3">
              {displayServices.length > 0 ? displayServices.slice(0, serviceVisibleCount).map((service, index) => {
                const goToService = () => {
                  const hasVariants = service.useVariants && service.variants?.length > 0;
                  dispatch(setShopContext({ shopSlug, shopName: salonConfig?.salonName || "", shopImage: salonConfig?.logo || null }));
                  if (!hasVariants) {
                    const priceData = getDepartmentPrice(service);
                    dispatch(addSelectedService({ 
                      _id: service._id, 
                      name: service.name, 
                      price: priceData.total, 
                      duration: service.duration || 0, 
                      variantId: null, 
                      variantName: null,
                      departmentId: selectedDepartment,
                      taxPercentage: priceData.taxPercentage,
                      isTaxInclusive: priceData.isTaxInclusive,
                      taxAmount: priceData.taxAmount,
                      basePrice: priceData.basePrice
                    }));
                    navigate(`/${shopSlug}/user/select-services`, { state: { selectedDepartment } });
                  } else {
                    navigate(`/${shopSlug}/user/select-services`, { state: { openVariantForServiceId: service._id, selectedDepartment } });
                  }
                };
                const serviceImg = service.image?.url || (typeof service.image === 'string' ? service.image : null) || service.coverImage?.url || (typeof service.coverImage === 'string' ? service.coverImage : null) || "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&q=80&w=200";
                
                const hasVariants = service.useVariants && service.variants?.length > 0;
                let displayPrice = 0;
                if (hasVariants) {
                    displayPrice = Math.min(...service.variants.map((v) => getDepartmentPrice(service, true, v).total));
                } else {
                    displayPrice = getDepartmentPrice(service).total;
                }

                return (
                  <div key={service._id} onClick={goToService} className="border border-gray-200 dark:border-dark-border rounded-2xl px-6 py-5 flex justify-between items-center hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-5 flex-1 pr-6">
                      {/* Service Image */}
                      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-card flex-shrink-0">
                        <img src={serviceImg} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-black dark:text-white mb-1">{service.name}</h3>
                        {service.description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1.5 line-clamp-2">{service.description}</p>}
                        <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-1.5">{formatDuration(service.duration)}</p>
                        <p className="text-[14px] text-black dark:text-white">
                          {hasVariants ? <><span className="text-gray-500 dark:text-gray-400">from </span><span className="font-bold">{currencySymbol}{displayPrice}</span></> : <span className="font-bold">{currencySymbol}{displayPrice}</span>}
                        </p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); goToService(); }} className="px-6 py-2.5 border border-gray-200 dark:border-dark-border rounded-full text-[13px] font-semibold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card hover:border-gray-300 shrink-0 transition-all">
                      Book
                    </button>
                  </div>
                );
              }) : <p className="text-gray-500 dark:text-gray-400 text-sm py-6">No services available in this category.</p>}
            </div>
            {displayServices.length > serviceVisibleCount && (
              <button onClick={() => setServiceVisibleCount(prev => prev + 10)} className="mt-4 px-6 py-3 rounded-full text-[14px] font-semibold text-black dark:text-white bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-card border border-gray-200 dark:border-dark-border transition-colors">
                See all
              </button>
            )}
          </div>

          {/* Team Section */}
          <div ref={teamRef} className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-bold text-black dark:text-white">Team</h2>
              {branchStaff.length > 8 && (
                <button className="text-[14px] text-blue-600 font-semibold hover:underline">See all</button>
              )}
            </div>
            {branchStaff.length > 0 ? (
              <div className="grid grid-cols-4 gap-x-2 gap-y-8 justify-items-start">
                {branchStaff.slice(0, 8).map((staff) => (
                  <div key={staff._id} className="flex flex-col items-center text-center cursor-pointer" onClick={() => { setSelectedStaff(staff); setStaffModalTab("profile"); }}>
                    <div className="relative mb-5">
                      <div className="w-[130px] h-[130px] rounded-full overflow-hidden bg-gray-100 dark:bg-dark-card">
                        {staff.photo?.url || staff.photo?.path || (typeof staff.photo === 'string' && staff.photo) || staff.profileImage ? (
                          <img 
                            src={staff.photo?.url || staff.photo?.path || (typeof staff.photo === 'string' ? staff.photo : staff.profileImage)} 
                            alt={staff.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-border">
                            <User size={36} className="text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                      {staff.avgRating > 0 && (
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-surface rounded-full px-3.5 py-1 border border-blue-200 flex items-center gap-1.5 z-10">
                          <Star size={15} fill="#f59e0b" color="#f59e0b" />
                          <span className="text-[14px] font-bold text-black dark:text-white">{Number(staff.avgRating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[15px] font-bold text-black dark:text-white mt-1">{staff.name}</p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{staff.designation || staff.role || staff.specialization || "Stylist"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-gray-400 dark:text-gray-500">No team members to display</p>
            )}
            {branchStaff.length > 8 && (
              <button className="mt-6 px-5 py-2.5 rounded-full text-[13px] font-semibold text-black dark:text-white bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card transition-colors">
                See all
              </button>
            )}
          </div>

          {/* Portfolio Section - Desktop (show only when portfolioImages exist) */}
          {salonConfig?.portfolioImages && salonConfig.portfolioImages.length > 0 && (
            <div ref={portfolioRef} className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-[24px] font-bold text-black dark:text-white">Portfolio</h2>
                <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center text-[13px] font-bold text-gray-600 dark:text-gray-300">
                  {salonConfig.portfolioImages.length}
                </span>
              </div>
              {/* 2-column grid row-wise */}
              <div className="grid grid-cols-2 gap-4">
                {salonConfig.portfolioImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-card cursor-pointer group"
                    onClick={() => window.open(image.url, '_blank')}
                  >
                    <img
                      src={image.url}
                      alt={`Portfolio ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div ref={reviewsRef} className="mb-14">
            <h2 className="text-[24px] font-bold text-black dark:text-white mb-5">Reviews</h2>
            
            {/* Desktop Review Form */}
            <div className="bg-gray-50 dark:bg-dark-card rounded-2xl p-5 mb-8 border border-gray-100 dark:border-dark-border">
              <p className="text-[15px] font-semibold text-black dark:text-white mb-3">Rate this shop</p>
              <form onSubmit={handleShopReviewSubmit} className="space-y-4">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`transition-colors ${reviewRating >= star ? "text-amber-400" : "text-gray-300"}`}
                    >
                      <Star size={26} fill={reviewRating >= star ? "currentColor" : "none"} strokeWidth={reviewRating >= star ? 0 : 1.5} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                  className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-3.5 text-[14px] resize-none focus:outline-none focus:ring-1 focus:ring-black/20 placeholder:text-gray-400 dark:text-gray-500"
                ></textarea>
                <div className="flex justify-between items-center">
                  {reviewSnack ? (
                    <span className="text-[13px] text-black dark:text-white font-medium">{reviewSnack}</span>
                  ) : (
                    <div></div>
                  )}
                  <button
                    type="submit"
                    disabled={reviewSubmitting || !user || !reviewComment.trim()}
                    className="flex items-center justify-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl text-[14px] font-bold hover:bg-black/90 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {reviewSubmitting ? "Submitting..." : user ? "Post Review" : "Login to review"}
                    {!reviewSubmitting && <Send size={14} />}
                  </button>
                </div>
              </form>
            </div>

            {shopAvgRating > 0 && (
              <div className="flex items-center gap-2.5 mb-7">
                <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} size={20} fill={shopAvgRating >= s ? "#f59e0b" : "none"} color="#f59e0b" />)}</div>
                <span className="text-[17px] font-bold">{Number(shopAvgRating).toFixed(1)}</span>
                <span className="text-[14px] text-blue-600 font-medium">({shopReviewTotal})</span>
              </div>
            )}
            {shopReviews.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  {shopReviews.slice(0, reviewVisibleCount).map(review => {
                    const reviewerName = review.user?.name || review.userName || "Anonymous";
                    return (
                    <div key={review._id} className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center shrink-0 text-[14px] font-bold text-gray-600 dark:text-gray-400">
                        {reviewerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[14px] font-semibold">{reviewerName}</span>
                          <span className="text-[12px] text-gray-400 dark:text-gray-500">{moment(review.createdAt).format("ddd, MMM D, YYYY")}</span>
                        </div>
                        <div className="flex gap-0.5 mb-1.5">{[1,2,3,4,5].map(s => <Star key={s} size={13} fill={review.rating >= s ? "#f59e0b" : "none"} color="#f59e0b" />)}</div>
                        {review.comment && <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{review.comment}</p>}
                      </div>
                    </div>
                    );
                  })}
                </div>
                {shopReviews.length > reviewVisibleCount && (
                  <button 
                    onClick={() => setReviewVisibleCount(prev => prev + 4)}
                    className="mt-2 px-6 py-2.5 border border-gray-200 dark:border-dark-border rounded-full text-[14px] font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
                  >
                    See all
                  </button>
                )}
              </div>
            ) : <p className="text-gray-500 dark:text-gray-400 text-sm">No reviews yet.</p>}
          </div>

          {/* About Section */}
          <div ref={aboutRef} className="mb-14">
            <h2 className="text-[24px] font-bold text-black dark:text-white mb-4">About</h2>
            <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-[1.7]">
              {salonConfig?.aboutText || `At ${shopName}, we prioritize delivering an exceptional experience.`}
            </p>
          </div>

          {/* Map / Directions Section */}
          {(() => {
            const selectedBranch = branches.find(b => b._id === selectedBranchId) || branches[0];
            const lat = selectedBranch?.latitude;
            const lng = selectedBranch?.longitude;
            const displayAddress = selectedBranch?.mapAddress || selectedBranch?.address || shopAddress;
            if (!lat || !lng) return null;
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            return (
              <div className="mb-14">
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  <iframe
                    title="Shop Location"
                    width="100%"
                    height="500"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
                  ></iframe>
                </div>
                <div className="mt-4 flex items-start gap-1 text-[14px] text-gray-700 dark:text-gray-300">
                  <span>{displayAddress}</span>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-semibold hover:underline whitespace-nowrap ml-2"
                  >
                    Get directions
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Opening Times + Additional Info */}
          <div ref={otherRef} className="mb-14">
            <div className="grid grid-cols-2 gap-14">
              <div>
                <h2 className="text-[20px] font-bold text-black dark:text-white mb-5">Opening times</h2>
                <div className="space-y-3">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                    const dayData = (salonConfig?.operatingHours || []).find(d => d.day === day);
                    const isOpen = dayData ? dayData.isOpen : true;
                    const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    const formatTime = (t) => { if (!t) return ''; const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
                    return (
                      <div key={day} className={`flex justify-between text-[14px] ${isToday ? 'font-bold text-black' : 'text-gray-700 dark:text-gray-300'}`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span>{day}</span>
                        </div>
                        <span>{isOpen ? `${formatTime(dayData?.startTime||'09:00')} - ${formatTime(dayData?.endTime||'21:00')}` : 'Closed'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-black dark:text-white mb-5">Additional information</h2>
                <div className="space-y-3.5 text-[14px] text-gray-700 dark:text-gray-300">
                  {(salonConfig?.additionalInfo || ["Instant confirmation", "Pay by app", "Parking available"]).map((info, idx) => {
                    let IconComponent = CheckCircle2;
                    if (info.toLowerCase().includes("pay") || info.toLowerCase().includes("card")) IconComponent = CreditCard;
                    if (info.toLowerCase().includes("park")) IconComponent = Car;
                    if (info.toLowerCase().includes("wheelchair")) return <div key={idx} className="flex items-center gap-3"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700 dark:text-gray-300"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg><span>{info}</span></div>;
                    if (info.toLowerCase().includes("transport")) IconComponent = Train;
                    if (info.toLowerCase().includes("kid") || info.toLowerCase().includes("baby")) IconComponent = Baby;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <IconComponent size={18} strokeWidth={1.5} />
                        <span>{info}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Sidebar */}
        <div className="w-[420px] shrink-0 sticky top-[70px] self-start">
          <div className="border border-gray-200 dark:border-dark-border rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Top section with name, rating, book now */}
            <div className="p-8 pb-7">
              <h3 className="text-[26px] font-bold text-black dark:text-white mb-4 leading-tight">{shopName}</h3>
              {shopAvgRating > 0 && (
                <div className="flex items-center gap-2.5 mb-7">
                  <span className="text-[18px] font-bold">{Number(shopAvgRating).toFixed(1)}</span>
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={18} fill={shopAvgRating >= s ? "#f59e0b" : "none"} color="#f59e0b" />)}</div>
                  <span className="text-[15px] text-blue-600 font-medium">({shopReviewTotal})</span>
                </div>
              )}
              <button onClick={() => {
                  dispatch(setShopContext({ shopSlug, shopName: salonConfig?.salonName || "", shopImage: salonConfig?.logo || null }));
                  navigate(`/${shopSlug}/user/select-services`, { state: { selectedDepartment } });
                }}
                className="w-full py-3 bg-black text-white rounded-full text-[15px] font-semibold hover:bg-gray-900 transition-colors">
                Book now
              </button>
            </div>
            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-dark-border mx-8"></div>
            {/* Bottom section with status and address */}
            <div className="p-8 pt-6">
              {/* Status */}
              <div className="flex items-center gap-3 mb-5 text-[15px]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700 dark:text-gray-300 shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {(() => {
                  const operatingHours = salonConfig?.operatingHours || [];
                  const now = new Date();
                  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
                  const todayData = operatingHours.find(d => d.day === todayName);
                  const isOpenToday = todayData ? todayData.isOpen : true;
                  const formatTime12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; const hour12 = h % 12 || 12; return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`; };
                  const daysOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
                  
                  if (isOpenToday) {
                    const startTime = todayData?.startTime || '09:00';
                    const endTime = todayData?.endTime || '21:00';
                    const [sh, sm] = startTime.split(':').map(Number);
                    const [eh, em] = endTime.split(':').map(Number);
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    const startMinutes = sh * 60 + sm;
                    const endMinutes = eh * 60 + em;
                    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                      return <span><span className="text-green-600 font-semibold">Open</span><span className="text-gray-700 dark:text-gray-300"> – closes at {formatTime12(endTime)}</span></span>;
                    } else if (currentMinutes < startMinutes) {
                      return <span><span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span><span className="text-gray-700 dark:text-gray-300"> – opens today at {formatTime12(startTime)}</span></span>;
                    } else {
                      const todayIdx = daysOrder.indexOf(todayName);
                      for (let i = 1; i <= 7; i++) {
                        const nextDay = daysOrder[(todayIdx + i) % 7];
                        const nextData = operatingHours.find(d => d.day === nextDay);
                        if (!nextData || nextData.isOpen) {
                          return <span><span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span><span className="text-gray-700 dark:text-gray-300"> – opens on {nextDay} at {formatTime12(nextData?.startTime || '09:00')}</span></span>;
                        }
                      }
                    }
                  } else {
                    const todayIdx = daysOrder.indexOf(todayName);
                    for (let i = 1; i <= 7; i++) {
                      const nextDay = daysOrder[(todayIdx + i) % 7];
                      const nextData = operatingHours.find(d => d.day === nextDay);
                      if (!nextData || nextData.isOpen) {
                        return <span><span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span><span className="text-gray-700 dark:text-gray-300"> – opens on {nextDay} at {formatTime12(nextData?.startTime || '09:00')}</span></span>;
                      }
                    }
                  }
                  return <span><span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span></span>;
                })()}
              </div>
              {/* Address */}
              <div className="flex items-start gap-3 text-[15px] text-gray-700 dark:text-gray-300">
                <MapPin size={20} className="text-gray-700 dark:text-gray-300 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="leading-relaxed">{shopAddress}</p>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopAddress)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-[14px] font-semibold mt-2 inline-block hover:underline">Get directions</a>
                </div>
              </div>
            </div>

            {/* Branch Selector Card - only show if multiple branches */}
            {branches.length > 1 && (
              <div className="border-t border-gray-200 dark:border-dark-border mx-8"></div>
            )}
            {branches.length > 1 && (() => {
              const selectedBranch = branches.find(b => b._id === selectedBranchId) || branches[0];
              let distText = "";
              try {
                const saved = localStorage.getItem("vijayajalakam_user_location");
                if (saved && selectedBranch?.latitude && selectedBranch?.longitude) {
                  const loc = JSON.parse(saved);
                  if (loc.lat && loc.lng) {
                    const R = 6371;
                    const dLat = ((selectedBranch.latitude - loc.lat) * Math.PI) / 180;
                    const dLon = ((selectedBranch.longitude - loc.lng) * Math.PI) / 180;
                    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos((loc.lat*Math.PI)/180)*Math.cos((selectedBranch.latitude*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
                    distText = `${Math.round(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R)}km> `;
                  }
                }
              } catch {}
              const branchAddr = selectedBranch?.mapAddress || selectedBranch?.address || "";
              const shortAddr = branchAddr ? branchAddr.split(",").slice(0, 2).map(s => s.trim()).join(", ") : "";
              
              return (
                <div className="px-8 py-5">
                  <button
                    onClick={() => setShowDesktopBranchPopup(true)}
                    className="w-full bg-[#f5f5f7] rounded-xl p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MapPin size={20} className="text-black dark:text-white shrink-0" strokeWidth={2} />
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-black dark:text-white truncate">{selectedBranch?.name || shopName}</p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{distText}{shortAddr}</p>
                      </div>
                    </div>
                    <span className="text-[13px] text-indigo-600 font-bold px-3 py-1 bg-indigo-50 rounded-full shrink-0 ml-3">Change</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>


      {/* Desktop Footer */}
      <DesktopFooter />
    </div>

    {/* ===== MOBILE LAYOUT ===== */}
    <div className="md:hidden min-h-screen bg-[#f8f9fa] dark:bg-dark-bg font-sans">
      {/* Hero Image */}
      <div className="relative h-[320px] w-full overflow-hidden bg-black">
        {/* Image - show logo centered */}
        <div 
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {galleryImages.map((img, idx) => (
            <div 
              key={idx}
              className="w-full h-full flex-shrink-0"
              style={{ minWidth: "100%" }}
            >
              <img 
                src={img} 
                alt={`${shopName} ${idx + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        
        {/* Top Actions - Solid white circles */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button 
            onClick={() => navigate("/")} 
            className="w-11 h-11 bg-white dark:bg-dark-surface rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-all active:scale-95"
          >
            <ArrowLeft size={20} className="text-black dark:text-white" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-11 h-11 bg-white dark:bg-dark-surface rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-all active:scale-95"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-gray-700 dark:text-gray-300" />}
            </button>
            <button 
              onClick={handleShare}
              className="w-11 h-11 bg-white dark:bg-dark-surface rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-all active:scale-95"
            >
              <Share2 size={18} className="text-gray-700 dark:text-gray-300" strokeWidth={2} />
            </button>
            <button 
              onClick={toggleFavorite}
              className="w-11 h-11 bg-white dark:bg-dark-surface rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-all active:scale-95"
            >
              <Heart 
                size={18} 
                className={`transition-colors ${isFavorite ? "text-red-500 fill-red-500" : "text-gray-600 dark:text-gray-400"}`} 
                strokeWidth={2} 
              />
            </button>
          </div>
        </div>
        
        {/* Image Counter Badge - positioned higher to not overlap with card */}
        <div className="absolute bottom-10 right-4 bg-gray-800/80 px-3 py-1.5 rounded-full">
          <span className="text-white text-[12px] font-bold">{currentImageIndex + 1}/{galleryImages.length}</span>
        </div>
      </div>

      {/* Main Content Card (Overlapping) */}
      <div className="-mt-6 relative z-20 bg-white dark:bg-dark-surface rounded-t-[24px] px-5 pt-6 pb-4">
{/* Shop Info */}
              <div className="pt-2">
                {isDefaultShop ? (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-[#ff5722] rounded flex items-center justify-center text-white shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                    </div>
                    <h1 className="text-[32px] font-extrabold text-black dark:text-white tracking-tight leading-tight">Vijayajalakam</h1>
                  </div>
                ) : (
                  <h1 className="text-[32px] font-extrabold text-black dark:text-white tracking-tight leading-tight mb-2">
                    {shopName}
                  </h1>
                )}
                <p className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">{salonConfig?.businessType || salonConfig?.category || "Salon"}</p>
              </div>
        
        {/* Rating */}
        {shopAvgRating > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <Star size={16} className="text-amber-400" fill="currentColor" />
            <span className="text-[15px] font-bold text-black dark:text-white">{Number(shopAvgRating).toFixed(1)}</span>
            <span className="text-[15px] text-[#6b5bfd] font-medium">({shopReviewTotal})</span>
          </div>
        )}

        {/* Open/Closed Status */}
        {(() => {
          const operatingHours = salonConfig?.operatingHours || [];
          const now = new Date();
          const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
          const todayData = operatingHours.find(d => d.day === todayName);
          const isOpenToday = todayData ? todayData.isOpen : true;

          // Format time from 24h "HH:mm" to "h:mm am"
          const formatTime12 = (t) => {
            if (!t) return '';
            const [h, m] = t.split(':').map(Number);
            const ampm = h >= 12 ? 'pm' : 'am';
            const hour12 = h % 12 || 12;
            return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
          };

          let isCurrentlyOpen = false;
          let statusText = '';

          if (isOpenToday) {
            const startTime = todayData?.startTime || '09:00';
            const endTime = todayData?.endTime || '21:00';
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const startMinutes = sh * 60 + sm;
            const endMinutes = eh * 60 + em;

            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
              isCurrentlyOpen = true;
              statusText = `closes at ${formatTime12(endTime)}`;
            } else if (currentMinutes < startMinutes) {
              statusText = `opens today at ${formatTime12(startTime)}`;
            } else {
              // Find next open day
              const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              const todayIdx = daysOrder.indexOf(todayName);
              for (let i = 1; i <= 7; i++) {
                const nextDayIdx = (todayIdx + i) % 7;
                const nextDayName = daysOrder[nextDayIdx];
                const nextDayData = operatingHours.find(d => d.day === nextDayName);
                const nextIsOpen = nextDayData ? nextDayData.isOpen : true;
                if (nextIsOpen) {
                  const nextStart = nextDayData?.startTime || '09:00';
                  statusText = `opens on ${nextDayName} at ${formatTime12(nextStart)}`;
                  break;
                }
              }
            }
          } else {
            // Today is closed, find next open day
            const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const todayIdx = daysOrder.indexOf(todayName);
            for (let i = 1; i <= 7; i++) {
              const nextDayIdx = (todayIdx + i) % 7;
              const nextDayName = daysOrder[nextDayIdx];
              const nextDayData = operatingHours.find(d => d.day === nextDayName);
              const nextIsOpen = nextDayData ? nextDayData.isOpen : true;
              if (nextIsOpen) {
                const nextStart = nextDayData?.startTime || '09:00';
                statusText = `opens on ${nextDayName} at ${formatTime12(nextStart)}`;
                break;
              }
            }
          }

          return (
            <div className="flex items-center gap-2 mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {isCurrentlyOpen ? (
                <span className="text-[14px]">
                  <span className="text-green-600 font-semibold">Open</span>
                  <span className="text-gray-500 dark:text-gray-400"> – {statusText}</span>
                </span>
              ) : (
                <span className="text-[14px]">
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">Closed</span>
                  <span className="text-gray-500 dark:text-gray-400"> – {statusText}</span>
                </span>
              )}
            </div>
          );
        })()}
        
        <button
          onClick={() => { if (branches.length > 1) setShowBranchSheet(true); }}
          className="bg-[#f4f4f4] rounded-xl p-3 flex items-center justify-between w-full text-left"
          style={{ cursor: branches.length > 1 ? "pointer" : "default" }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <MapPin size={18} className="text-black dark:text-white flex-shrink-0" strokeWidth={2} />
            <div className="min-w-0">
              {selectedBranchId && branches.length > 0 ? (() => {
                const selectedBranch = branches.find(b => b._id === selectedBranchId);
                if (!selectedBranch) return <span className="text-[13px] text-black dark:text-white font-medium">{shopAddress}</span>;
                
                // Calculate distance for selected branch
                let distText = "";
                try {
                  const saved = localStorage.getItem("vijayajalakam_user_location");
                  if (saved && selectedBranch.latitude && selectedBranch.longitude) {
                    const loc = JSON.parse(saved);
                    if (loc.lat && loc.lng) {
                      const R = 6371;
                      const dLat = ((selectedBranch.latitude - loc.lat) * Math.PI) / 180;
                      const dLon = ((selectedBranch.longitude - loc.lng) * Math.PI) / 180;
                      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos((loc.lat * Math.PI)/180) * Math.cos((selectedBranch.latitude * Math.PI)/180) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                      const dist = Math.round(R * c);
                      distText = `${dist}km> `;
                    }
                  }
                } catch {}
                
                const address = selectedBranch.mapAddress || selectedBranch.address || "";
                const shortAddr = address ? address.split(",").slice(0, 2).map(s => s.trim()).join(", ") : "";
                
                return (
                  <>
                    <span className="text-[13px] font-bold text-black dark:text-white block truncate">
                      {selectedBranch.name}
                    </span>
                    {(distText || shortAddr) && (
                      <span className="text-[12px] text-gray-500 dark:text-gray-400 block truncate">
                        {distText}{shortAddr}
                      </span>
                    )}
                  </>
                );
              })() : (
                <span className="text-[13px] text-black dark:text-white font-medium">{shopAddress}</span>
              )}
            </div>
          </div>
          {branches.length > 1 && (
            <span className="text-[12px] text-indigo-600 font-bold flex-shrink-0 ml-4 px-3 py-1 bg-indigo-50 rounded-full">
              Change
            </span>
          )}
        </button>
      </div>

      {/* Sticky Top Header + Tabs (only visible after scrolling past hero) */}
      {showStickyHeader && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface shadow-sm">
          {/* App Bar */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button 
                onClick={() => navigate("/")} 
                className="flex-shrink-0"
              >
                <ArrowLeft size={22} className="text-black dark:text-white" strokeWidth={2} />
              </button>
              <h2 className="text-[16px] font-bold text-black dark:text-white truncate">{isDefaultShop ? "Vijayajalakam" : shopName}</h2>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <button onClick={handleShare}>
                <Share2 size={20} className="text-gray-700 dark:text-gray-300" strokeWidth={2} />
              </button>
              <button onClick={toggleFavorite}>
                <Heart 
                  size={20} 
                  className={`transition-colors ${isFavorite ? "text-red-500 fill-red-500" : "text-gray-600 dark:text-gray-400"}`} 
                  strokeWidth={2} 
                />
              </button>
            </div>
          </div>
          {/* Navigation Tabs - attached directly below */}
          <div className="px-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-gray-100 dark:border-dark-border">
            <div className="flex">
              {mobileTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => scrollToSection(tab)}
                  className={`whitespace-nowrap px-4 py-3 text-[15px] font-bold transition-colors relative ${
                    activeTab === tab ? "text-black dark:text-white" : "text-gray-500"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-t-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sections Wrapper */}
      <div>
        
        {/* About Section - continues from the white card above */}
        <div ref={mobileAboutRef} className="bg-white dark:bg-dark-surface px-5 pt-3 pb-5">
          <h2 className="text-[19px] font-bold text-black dark:text-white mb-3">About</h2>
          {(() => {
            const aboutText = salonConfig?.aboutText || 
              `At ${shopName}, we prioritize delivering an exceptional grooming experience, and for that, our professional stylists are dedicated to helping you look and feel your best, using premium products and the latest techniques to ensure every visit leaves you refreshed and confident.`;
            const isLong = aboutText.length > 150;
            const displayText = isLong && !showFullAbout ? aboutText.slice(0, 150) + "..." : aboutText;
            
            return (
              <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
                {displayText}
                {isLong && (
                  <button 
                    onClick={() => setShowFullAbout(!showFullAbout)}
                    className="text-[#6b5bfd] font-medium ml-1"
                  >
                    {showFullAbout ? "Show less" : "Read more"}
                  </button>
                )}
              </p>
            );
          })()}
        </div>

        {/* Services Section */}
        <div ref={mobileServicesRef} className="bg-[#f5f5f7] dark:bg-dark-bg pb-6">
          {/* Department Pills */}
          {departments.length > 0 && (
            <div className="flex w-full bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] relative">
              {departments.map(dept => (
                <button
                  key={dept._id}
                  onClick={() => { setSelectedDepartment(dept._id); setServiceVisibleCount(10); }}
                  className={`flex-1 min-w-[100px] whitespace-nowrap py-4 text-[13px] font-bold uppercase tracking-widest transition-all relative ${selectedDepartment === dept._id ? 'text-[#6b5bfd] bg-[#6b5bfd]/5' : 'text-gray-400 hover:text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card'}`}
                >
                  {dept.name}
                  {selectedDepartment === dept._id && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#6b5bfd] rounded-t-full"></span>
                  )}
                </button>
              ))}
            </div>
          )}
          
          <h2 className="text-[19px] font-bold text-black dark:text-white mb-4 px-5">Services</h2>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mb-6 pb-1 px-5">
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => { setActiveCategory(cat._id); setServiceVisibleCount(10); }}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-colors border ${
                  activeCategory === cat._id
                    ? "bg-black text-white border-black"
                    : "bg-white dark:bg-dark-surface text-black dark:text-white border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Service List */}
          <div className="space-y-3 px-4">
            {displayServices.length > 0 ? displayServices.slice(0, serviceVisibleCount).map((service, index) => {
              const goToService = () => {
                const hasVariants = service.useVariants && service.variants?.length > 0;
                dispatch(setShopContext({ shopSlug, shopName: salonConfig?.salonName || "", shopImage: salonConfig?.logo || null }));
                if (!hasVariants) {
                  const priceData = getDepartmentPrice(service);
                  dispatch(addSelectedService({ 
                    _id: service._id, 
                    name: service.name, 
                    price: priceData.total, 
                    duration: service.duration || 0, 
                    variantId: null, 
                    variantName: null,
                    departmentId: selectedDepartment,
                    taxPercentage: priceData.taxPercentage,
                    isTaxInclusive: priceData.isTaxInclusive,
                    taxAmount: priceData.taxAmount,
                    basePrice: priceData.basePrice
                  }));
                  navigate(`/${shopSlug}/user/select-services`, { state: { selectedDepartment } });
                } else {
                  navigate(`/${shopSlug}/user/select-services`, { state: { openVariantForServiceId: service._id, selectedDepartment } });
                }
              };
              
              const hasVariants = service.useVariants && service.variants?.length > 0;
              let displayPrice = 0;
              if (hasVariants) {
                  displayPrice = Math.min(...service.variants.map((v) => getDepartmentPrice(service, true, v).total));
              } else {
                  displayPrice = getDepartmentPrice(service).total;
              }

              return (
              <div key={service._id} onClick={goToService} className="border border-gray-200 dark:border-dark-border rounded-2xl p-4 bg-white dark:bg-dark-surface flex justify-between items-center cursor-pointer">
                <div className="flex items-center gap-4 flex-1">
                  {/* Service Image */}
                  <div className="w-[65px] h-[65px] rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-card flex-shrink-0">
                    <img 
                      src={service.image?.url || (typeof service.image === 'string' ? service.image : null) || service.coverImage?.url || (typeof service.coverImage === 'string' ? service.coverImage : null) || "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&q=80&w=200"} 
                      alt={service.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-black dark:text-white mb-1">{service.name}</h3>
                    <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-1.5">{formatDuration(service.duration)}</p>
                    <p className="text-[14px] text-black dark:text-white">
                      {hasVariants ? <><span className="text-gray-500 dark:text-gray-400">from </span><span className="font-bold">{currencySymbol}{displayPrice}</span></> : <span className="font-bold">{currencySymbol}{displayPrice}</span>}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); goToService(); }}
                  className="px-5 py-2 border border-gray-200 dark:border-dark-border rounded-full text-[13px] font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card flex-shrink-0"
                >
                  Book
                </button>
              </div>
              );
            }) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm py-4 px-5">No services available in this category.</p>
            )}

            {/* See all button */}
            {displayServices.length > serviceVisibleCount && (
              <button
                onClick={() => setServiceVisibleCount((prev) => prev + 10)}
                className="w-full py-3.5 mt-2 rounded-full text-[14px] font-semibold text-black dark:text-white bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
                style={{ border: "1.5px solid #e8e8e8" }}
              >
                See all
              </button>
            )}
          </div>

          {/* Total services count */}
          {displayServices.length > 0 && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-4 px-5">
              {displayServices.length} service{displayServices.length !== 1 ? "s" : ""} available
            </p>
          )}
        </div>

        {/* Team Section - Mobile */}
        <div ref={mobileTeamRef} className="bg-white dark:bg-dark-surface px-5 py-6 mt-2">
          <h2 className="text-[19px] font-bold text-black dark:text-white mb-4">Team</h2>
          {branchStaff.length > 0 ? (
            <div className="flex overflow-x-auto gap-5 pb-2 -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {branchStaff.map((staff) => (
                <div key={staff._id} className="flex flex-col items-center text-center flex-shrink-0 cursor-pointer" style={{ minWidth: '80px' }} onClick={() => { setSelectedStaff(staff); setStaffModalTab("profile"); }}>
                  <div className="relative mb-3">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-gray-100 dark:bg-dark-card">
                      {staff.photo?.url || staff.photo?.path || (typeof staff.photo === 'string' && staff.photo) || staff.profileImage ? (
                        <img src={staff.photo?.url || staff.photo?.path || (typeof staff.photo === 'string' ? staff.photo : staff.profileImage)} alt={staff.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-border"><User size={24} className="text-gray-400 dark:text-gray-500" /></div>
                      )}
                    </div>
                    {staff.avgRating > 0 && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-surface rounded-full px-2 py-0.5 border border-blue-200 flex items-center gap-1 z-10">
                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                        <span className="text-[10px] font-bold">{Number(staff.avgRating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] font-semibold text-black dark:text-white truncate w-full">{staff.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full">{staff.designation || staff.role || "Stylist"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 dark:text-gray-500">No team members</p>
          )}
        </div>

        {/* Portfolio Section - Show only if portfolioImages exist */}
        {salonConfig?.portfolioImages && salonConfig.portfolioImages.length > 0 && (
          <div ref={mobilePortfolioRef} className="bg-white dark:bg-dark-surface px-5 py-6 mt-2">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[19px] font-bold text-black dark:text-white">Portfolio</h2>
              <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center text-[12px] font-bold text-gray-600 dark:text-gray-300">
                {salonConfig.portfolioImages.length}
              </span>
            </div>
            
            {/* Portfolio Grid - 2 columns row-wise */}
            <div className="grid grid-cols-2 gap-3">
              {salonConfig.portfolioImages.map((image, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-card cursor-pointer group"
                  onClick={() => window.open(image.url, '_blank')}
                >
                  <img 
                    src={image.url} 
                    alt={`Portfolio ${index + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div ref={mobileReviewsRef} className="bg-white dark:bg-dark-surface px-5 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[19px] font-bold text-black dark:text-white">Reviews</h2>
            <div className="flex items-center gap-2">
              {shopAvgRating > 0 && (
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark-card px-3 py-1.5 rounded-full">
                  <Star size={14} className="text-amber-400" fill="currentColor" />
                  <span className="text-[14px] font-bold text-black dark:text-white">{Number(shopAvgRating).toFixed(1)}</span>
                  <span className="text-[13px] text-gray-400 dark:text-gray-500">({shopReviewTotal})</span>
                </div>
              )}
            </div>
          </div>

          {/* Review Form */}
          <div className="bg-gray-50 dark:bg-dark-card rounded-2xl p-4 mb-6 border border-gray-100 dark:border-dark-border">
            <p className="text-[14px] font-semibold text-black dark:text-white mb-3">Rate this shop</p>
            <form onSubmit={handleShopReviewSubmit} className="space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`transition-colors ${reviewRating >= star ? "text-amber-400" : "text-gray-300"}`}
                  >
                    <Star size={24} fill={reviewRating >= star ? "currentColor" : "none"} strokeWidth={reviewRating >= star ? 0 : 1.5} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-3 text-[14px] resize-none focus:outline-none focus:ring-1 focus:ring-black/20 placeholder:text-gray-400 dark:text-gray-500"
              ></textarea>
              <button
                type="submit"
                disabled={reviewSubmitting || !user || !reviewComment.trim()}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl text-[14px] font-bold hover:bg-black/90 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {reviewSubmitting ? "Submitting..." : user ? "Post Review" : "Login to review"}
                {!reviewSubmitting && <Send size={14} />}
              </button>
            </form>
          </div>

          {/* Reviews List */}
          {reviewSnack && (
            <div className="mb-4 px-4 py-3 bg-black text-white text-[13px] font-medium rounded-xl flex items-center justify-between">
              <span>{reviewSnack}</span>
              <button onClick={() => setReviewSnack("")} className="text-white/60 hover:text-white text-xs ml-4">✕</button>
            </div>
          )}
          {shopReviewsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : shopReviews.length > 0 ? (
            <div className="space-y-5">
              {shopReviews.map((review) => (
                <div key={review._id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                    {review.user?.profileImage ? (
                      <img src={review.user.profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User size={16} className="text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[14px] font-semibold text-black dark:text-white">{review.user?.name || review.userName || "Anonymous"}</span>
                      <span className="text-[12px] text-gray-400 dark:text-gray-500">{moment(review.createdAt).fromNow()}</span>
                    </div>
                    <div className="flex gap-0.5 text-amber-400 mb-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} fill={review.rating >= s ? "currentColor" : "none"} strokeWidth={review.rating >= s ? 0 : 1.5} />
                      ))}
                    </div>
                    <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">{review.comment}</p>
                    {review.reply && (
                      <div className="mt-2 bg-gray-50 dark:bg-dark-card p-3 rounded-xl border-l-2 border-black">
                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Owner response</p>
                        <p className="text-[13px] text-gray-700 dark:text-gray-300">{review.reply}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-[14px] text-gray-400 dark:text-gray-500">No reviews yet. Be the first to review!</p>
            </div>
          )}
        </div>

        {/* Other Section */}
        <div ref={mobileOtherRef} className="bg-white dark:bg-dark-surface px-5 py-6">
          <h2 className="text-[19px] font-bold text-black dark:text-white mb-5">Opening times</h2>
          
          <div className="space-y-3 mb-8">
            {(() => {
              const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
              const operatingHours = salonConfig?.operatingHours || [];

              return daysOrder.map((day) => {
                const dayData = operatingHours.find(d => d.day === day);
                const isToday = day === todayName;
                const isOpen = dayData ? dayData.isOpen : true;

                // Format time from 24h "HH:mm" to "h:mm am/pm"
                const formatTime = (t) => {
                  if (!t) return '';
                  const [h, m] = t.split(':').map(Number);
                  const ampm = h >= 12 ? 'pm' : 'am';
                  const hour12 = h % 12 || 12;
                  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
                };

                const startTime = dayData?.startTime || '09:00';
                const endTime = dayData?.endTime || '21:00';

                return (
                  <div key={day} className={`flex justify-between items-center text-[15px] ${isToday ? 'font-bold text-black' : 'text-gray-700 dark:text-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-400'}`}></div>
                      <span>{day}</span>
                    </div>
                    <span className={isToday ? 'font-bold' : ''}>
                      {isOpen ? `${formatTime(startTime)} - ${formatTime(endTime)}` : 'Closed'}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          
          <div className="w-full h-px bg-gray-100 dark:bg-dark-card mb-6"></div>
          
          <h2 className="text-[19px] font-bold text-black dark:text-white mb-5">Additional information</h2>
          <div className="space-y-4">
            {(salonConfig?.additionalInfo || ["Instant confirmation", "Pay by app", "Parking available"]).map((info, idx) => {
              let IconComponent = CheckCircle2;
              if (info.toLowerCase().includes("pay") || info.toLowerCase().includes("card")) IconComponent = CreditCard;
              if (info.toLowerCase().includes("park")) IconComponent = Car;
              if (info.toLowerCase().includes("wheelchair")) return <div key={idx} className="flex items-center gap-3 text-[15px] text-black"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700 dark:text-gray-300"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg><span>{info}</span></div>;
              if (info.toLowerCase().includes("transport")) IconComponent = Train;
              if (info.toLowerCase().includes("kid") || info.toLowerCase().includes("baby")) IconComponent = Baby;
              return (
                <div key={idx} className="flex items-center gap-3 text-[15px] text-black dark:text-white">
                  <IconComponent size={20} strokeWidth={1.5} className="text-gray-700 dark:text-gray-300" />
                  <span>{info}</span>
                </div>
              );
            })}
          </div>

          {/* Shop Direction / Map Section */}
          {(() => {
            const selectedBranch = branches.find(b => b._id === selectedBranchId) || branches[0];
            if (!selectedBranch?.latitude || !selectedBranch?.longitude) return null;
            const lat = selectedBranch.latitude;
            const lng = selectedBranch.longitude;
            const displayAddress = selectedBranch.mapAddress || selectedBranch.address || shopAddress;
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

            return (
              <div className="mt-8">
                <div className="w-full h-px bg-gray-100 dark:bg-dark-card mb-6"></div>
                <div className="rounded-2xl overflow-hidden">
                  <div className="w-full h-[220px]">
                    <iframe
                      title="Shop Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                    ></iframe>
                  </div>
                </div>
                <div className="pt-4 px-1">
                  <p className="text-[15px] text-gray-800 dark:text-gray-100 leading-relaxed">
                    {displayAddress}{" "}
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[15px] font-semibold text-[#6b5bfd] hover:text-[#5a4ae0] transition-colors"
                    >
                      Get directions
                    </a>
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

      </div>


      {/* Branch Selection Bottom Sheet */}
      {showBranchSheet && branches.length > 1 && (
        <BranchBottomSheet
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSelect={handleBranchSelect}
          onClose={() => {
            // If no branch selected yet, select the first one
            if (!selectedBranchId) {
              handleBranchSelect(branches[0]);
            }
            setShowBranchSheet(false);
          }}
        />
      )}
    </div>

    {/* ===== STAFF DETAIL MODAL (shared desktop + mobile bottom sheet) ===== */}
    {selectedStaff && (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 staff-modal-overlay" onClick={() => setSelectedStaff(null)}>
        <style>{`
          @keyframes staffOverlayFade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes staffSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes staffSheetScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          .staff-modal-overlay { animation: staffOverlayFade 0.2s ease-out; }
          .staff-modal-sheet { animation: staffSheetUp 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
          @media (min-width: 768px) {
            .staff-modal-sheet { animation: staffSheetScale 0.22s ease-out; }
          }
        `}</style>
        <div className="bg-white dark:bg-dark-surface w-full h-[95vh] md:h-auto md:rounded-2xl md:w-full md:max-w-[620px] md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col rounded-t-[20px] md:rounded-2xl staff-modal-sheet" onClick={(e) => e.stopPropagation()}>
          {/* Drag handle - mobile only */}
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          {/* Modal Header - switches between minimal and compact on scroll */}
          <div className={`flex items-center justify-between px-6 py-4 shrink-0 transition-colors ${staffModalScrolled ? 'bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border' : 'bg-[#f9fafb]'}`}>
            {staffModalScrolled ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-card">
                  {selectedStaff.photo?.url ? (
                    <img src={selectedStaff.photo.url} alt={selectedStaff.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-border text-[13px] font-bold text-gray-500 dark:text-gray-400">{selectedStaff.name?.charAt(0)}</div>
                  )}
                </div>
                <span className="text-[18px] font-bold text-black dark:text-white">{selectedStaff.name}</span>
              </div>
            ) : (
              <button className="w-9 h-9 rounded-full border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card transition-colors">
                <Share2 size={16} className="text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <button onClick={() => setSelectedStaff(null)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${staffModalScrolled ? 'hover:bg-gray-100' : 'border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-card'}`}>
              <X size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Scrollable Content - All sections stacked */}
          <div id="staff-modal-scroll" className="flex-1 overflow-y-auto" onScroll={(e) => setStaffModalScrolled(e.target.scrollTop > 60)}>
            {/* Profile Section - at top with grey background */}
            <div id="staff-section-profile" className="flex flex-col items-center text-center px-6 pt-2 pb-6 bg-[#f9fafb]">
              <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-gray-100 dark:bg-dark-card mb-3">
                {selectedStaff.photo?.url ? (
                  <img src={selectedStaff.photo.url} alt={selectedStaff.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-border"><User size={44} className="text-gray-400 dark:text-gray-500" /></div>
                )}
              </div>
              <h3 className="text-[20px] font-bold text-black dark:text-white">{selectedStaff.name}</h3>
              {selectedStaff.designation && (
                <span className="inline-block mt-1.5 px-3 py-1 bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 text-[12px] font-medium rounded-full">{selectedStaff.designation}</span>
              )}
              {selectedStaff.avgRating > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[14px] font-bold">{Number(selectedStaff.avgRating).toFixed(1)}</span>
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span className="text-[13px] text-blue-600">({selectedStaff.reviewsCount || 0})</span>
                </div>
              )}
            </div>

            {/* Sticky Tabs */}
            <div className="flex gap-2 px-6 py-3 bg-white dark:bg-dark-surface sticky top-0 z-10">
              {[
                { key: "profile", label: "Profile" },
                { key: "services", label: "Services" },
                { key: "reviews", label: "Reviews", badge: staffReviews.length > 0 ? (staffReviews.length > 99 ? "99+" : staffReviews.length) : null },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStaffModalTab(tab.key);
                    const container = document.getElementById('staff-modal-scroll');
                    const el = document.getElementById(`staff-section-${tab.key}-content`);
                    if (container && el) {
                      container.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
                    }
                  }}
                  className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-colors border ${staffModalTab === tab.key ? 'bg-black text-white border-black' : 'bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card'}`}
                >
                  {tab.label}
                  {tab.badge && <span className={`ml-1.5 text-[11px] ${staffModalTab === tab.key ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>{tab.badge}</span>}
                </button>
              ))}
            </div>

            {/* Profile Content */}
            <div id="staff-section-profile-content" className="px-6 py-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-gray-600 dark:text-gray-400">Appointments completed</span>
                  <span className="text-[14px] font-semibold text-black dark:text-white">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-gray-600 dark:text-gray-400">Clients served</span>
                  <span className="text-[14px] font-semibold text-black dark:text-white">—</span>
                </div>
              </div>
            </div>

            {/* Services Section */}
            <div id="staff-section-services-content" className="px-6 py-5 border-t border-gray-100 dark:border-dark-border bg-[#f9fafb]">
              <h3 className="text-[18px] font-bold text-black dark:text-white mb-4">Services</h3>
              <div className="space-y-3">
                {servicesData
                  .filter(s => selectedStaff.services?.some(sid => (sid._id || sid) === s._id))
                  .map((service) => (
                    <div key={service._id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border">
                      <div>
                        <p className="text-[14px] font-semibold text-black dark:text-white">{service.name}</p>
                        <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">{service.duration ? `${service.duration} min` : ''}</p>
                        <p className="text-[13px] font-semibold text-black dark:text-white mt-1">{currencySymbol}{service.price}</p>
                      </div>
                      <button
                        onClick={() => {
                          dispatch(setShopContext({ shopSlug, shopName, shopImage: salonConfig?.logo }));
                          dispatch(addSelectedService({ _id: service._id, name: service.name, price: service.price, duration: service.duration }));
                          setSelectedStaff(null);
                          navigate(`/${shopSlug}/user/select-professional`);
                        }}
                        className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border text-[12px] font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                      >
                        Book
                      </button>
                    </div>
                  ))}
                {servicesData.filter(s => selectedStaff.services?.some(sid => (sid._id || sid) === s._id)).length === 0 && (
                  <p className="text-[14px] text-gray-400 dark:text-gray-500 py-4">No services assigned</p>
                )}
              </div>
            </div>

            {/* Reviews Section */}
            <div id="staff-section-reviews-content" className="px-6 py-5 border-t border-gray-100 dark:border-dark-border">
              <h3 className="text-[18px] font-bold text-black dark:text-white mb-4">Reviews</h3>

              {/* Add Review Form - shown first */}
              {user && (
                <div className="mb-6">
                  <p className="text-[14px] font-semibold text-black dark:text-white mb-3">Rate {selectedStaff.name}</p>
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setStaffReviewRating(s)}>
                        <Star size={24} fill={staffReviewRating >= s ? "#f59e0b" : "none"} color="#f59e0b" className="cursor-pointer hover:scale-110 transition-transform" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Share your experience..."
                    value={staffReviewComment}
                    onChange={(e) => setStaffReviewComment(e.target.value)}
                    className="w-full h-[80px] px-3 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-[13px] resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    onClick={async () => {
                      if (!staffReviewComment.trim()) return;
                      setStaffReviewSubmitting(true);
                      try {
                        const res = await api.post("/reviews", {
                          itemType: "Staff",
                          itemId: selectedStaff._id,
                          shopId: selectedBranchId,
                          rating: staffReviewRating,
                          comment: staffReviewComment,
                        });
                        if (res.data.success) {
                          setStaffReviews(prev => [res.data.data, ...prev]);
                          setStaffReviewComment("");
                          setStaffReviewRating(5);
                          setReviewSnack("Review submitted!");
                        }
                      } catch (err) {
                        setReviewSnack(err?.response?.data?.message || "Failed to submit review");
                      } finally {
                        setStaffReviewSubmitting(false);
                      }
                    }}
                    disabled={staffReviewSubmitting || !staffReviewComment.trim()}
                    className="mt-3 w-full py-2.5 bg-black text-white rounded-xl text-[13px] font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {staffReviewSubmitting ? "Submitting..." : "Post Review ✓"}
                  </button>
                </div>
              )}
              {!user && (
                <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-6">Please login to leave a review</p>
              )}

              {/* Existing Reviews - shown below the form */}
              {staffReviews.length > 0 ? (
                <div className="space-y-4 border-t border-gray-100 dark:border-dark-border pt-5">
                  {staffReviews.map((review, idx) => {
                    const reviewerName = review.user?.name || review.userName || "User";
                    return (
                    <div key={review._id || idx} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center shrink-0 text-[13px] font-bold text-gray-500 dark:text-gray-400">
                        {reviewerName.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-black dark:text-white">{reviewerName}</span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{moment(review.createdAt).format("ddd, MMM D, YYYY")}</span>
                        </div>
                        <div className="flex gap-0.5 mt-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={12} fill={review.rating >= s ? "#f59e0b" : "none"} color="#f59e0b" />)}</div>
                        {review.comment && <p className="text-[13px] text-gray-600 dark:text-gray-400 mt-1">{review.comment}</p>}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-dark-border pt-5">No reviews yet</p>
              )}
            </div>
          </div>

          {/* Bottom Book Button */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border shrink-0">
            <button
              onClick={() => {
                const staff = selectedStaff;
                setSelectedStaff(null);
                dispatch(setShopContext({ shopSlug, shopName, shopImage: salonConfig?.logo }));
                // Pre-select this staff as the professional
                dispatch(setBookingStaff({
                  _id: staff._id,
                  name: staff.name,
                  photo: staff.photo,
                  role: staff.designation || staff.role,
                  type: "specific",
                }));
                // Navigate to select-services with staffId so it can filter services
                navigate(`/${shopSlug}/user/select-services`, { state: { staffId: staff._id } });
              }}
              className="w-full py-3 bg-black text-white rounded-xl text-[14px] font-semibold hover:bg-gray-900 transition-colors"
            >
              Book now
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

// Branch Selection Bottom Sheet Component
const BranchBottomSheet = ({ branches, selectedBranchId, onSelect, onClose }) => {
  const [tempSelected, setTempSelected] = useState(selectedBranchId || null);

  // Get user location and calculate distances
  const branchesWithDistance = useMemo(() => {
    let userLoc = null;
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.lat && loc.lng) userLoc = loc;
      }
    } catch {}

    const mapped = branches.map((branch) => {
      let distance = null;
      if (userLoc && branch.latitude && branch.longitude) {
        const R = 6371;
        const dLat = ((branch.latitude - userLoc.lat) * Math.PI) / 180;
        const dLon = ((branch.longitude - userLoc.lng) * Math.PI) / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos((userLoc.lat * Math.PI)/180) * Math.cos((branch.latitude * Math.PI)/180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = Math.round(R * c);
      }
      return { ...branch, distance };
    });

    // Sort by distance (nearest first)
    return mapped.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [branches]);

  const handleContinue = () => {
    if (tempSelected) {
      const branch = branches.find(b => b._id === tempSelected);
      if (branch) onSelect(branch);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        style={{ animation: "branchFadeIn 0.2s ease-out" }}
      />

      {/* Sheet - bottom sheet with rounded top */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#f5f5f7] dark:bg-dark-bg z-50 flex flex-col rounded-t-3xl"
        style={{
          animation: "branchSlideUp 0.25s ease-out",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with X */}
        <div className="flex items-center justify-end px-4 h-[50px] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card cursor-pointer"
          >
            <X size={20} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Title section */}
        <div className="px-5 pb-5">
          <h1 className="text-[24px] font-bold text-black dark:text-white leading-tight mb-1">Select a branch</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Choose a location to explore services</p>
        </div>

        {/* Section header */}
        <div className="px-5 pb-3">
          <h2 className="text-[16px] font-bold text-black dark:text-white">Available locations</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Required</p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-dark-border" />

        {/* Branch list - white card full width with dividers */}
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-dark-surface">
            {branchesWithDistance.map((branch, idx) => {
              const isSelected = tempSelected === branch._id;
              const isNearest = idx === 0 && branch.distance !== null;
              const distanceText = branch.distance !== null ? `${branch.distance}km>` : "";
              const addressText = branch.mapAddress || branch.address || "";
              // Shorten address to first 2 parts
              const shortAddress = addressText ? addressText.split(",").slice(0, 2).map(s => s.trim()).join(", ") : "";
              const locationDisplay = distanceText && shortAddress
                ? `${distanceText} ${shortAddress}`
                : shortAddress || distanceText;

              return (
                <div key={branch._id}>
                  <button
                    onClick={() => setTempSelected(branch._id)}
                    className="w-full flex items-center justify-between px-5 py-5 text-left hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                      {/* Branch image or icon */}
                      {branch.image?.url ? (
                        <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-card flex-shrink-0">
                          <img
                            src={branch.image.url}
                            alt={branch.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-[52px] h-[52px] rounded-xl bg-gray-100 dark:bg-dark-card flex items-center justify-center flex-shrink-0">
                          <MapPin size={22} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-bold text-black dark:text-white leading-tight">
                            {branch.name}
                          </p>
                          {isNearest && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              Nearest
                            </span>
                          )}
                        </div>
                        {locationDisplay && (
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{locationDisplay}</p>
                        )}
                        {branch.phone && (
                          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">{branch.phone}</p>
                        )}
                      </div>
                    </div>
                    {/* Radio button */}
                    <div
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        border: isSelected ? "none" : "2px solid #d1d5db",
                        backgroundColor: isSelected ? "#6366f1" : "transparent",
                      }}
                    >
                      {isSelected && <div className="w-[10px] h-[10px] rounded-full bg-white dark:bg-dark-surface" />}
                    </div>
                  </button>
                  {idx < branchesWithDistance.length - 1 && (
                    <div className="border-t border-gray-200 dark:border-dark-border mx-5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar with Continue button */}
        <div
          className="flex-shrink-0 px-5 py-4 bg-white dark:bg-dark-surface rounded-t-xl"
          style={{ borderTop: "1px solid #f0f0f0" }}
        >
          <button
            type="button"
            onClick={handleContinue}
            disabled={!tempSelected}
            className="w-full py-3.5 rounded-full text-[14px] font-semibold transition-colors cursor-pointer"
            style={{
              backgroundColor: tempSelected ? "#111" : "#e5e5e5",
              color: tempSelected ? "#fff" : "#999",
            }}
          >
            Continue
          </button>
        </div>
      </div>

      <style>{`
        @keyframes branchFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes branchSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default UserHome;
