import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useTheme } from "./ThemeContext";
import api from "../../api/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { fetchActiveBanners } from "../../store/slices/bannerSlice";
import { getPortalRole } from "../../utils/portalUtils";
import "../../styles/user-premium.css";
import {
  Store,
  Search,
  MapPin,
  Phone,
  ArrowRight,
  User,
  X,
  Mail,
  ShieldCheck,
  Clock,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
  Activity,
  Dumbbell,
  ShoppingBag,
  ArrowUpRight,
  Lock,
  MessageCircle,
  Calendar,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  Menu,
  ChevronDown,
  LayoutGrid,
  RefreshCw,
  Navigation,
  LogOut,
  Settings,
  Wallet,
} from "lucide-react";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import { VIJAYAJALAKAM_CONTACT } from "../../utils/vijayajalakamHelper";
import MobileShopBookAgainCard from "./MobileShopBookAgainCard";
import MobileShopListCard from "./MobileShopListCard";
import MobileCategoryGrid from "../user/MobileCategoryGrid";
import DesktopFooter from "../user/DesktopFooter";
import { addSelectedService, setShopContext, clearBookingFlow } from "../../store/slices/bookingFlowSlice";
import { selectSelectedBranchId } from "../../store/slices/userAppSlice";
import {
  useGetPublicShopsQuery,
  useGetPublicShopCategoriesQuery,
  useGetUserHomeBookingsQuery,
  useGetUserFavoritesQuery,
  useGetPublicBannersQuery,
  useTrackShopViewMutation,
  useGetRecentlyViewedShopsQuery,
  useGetNewToVijayajalakamShopsQuery,
} from "../../store/api/homeEndpoints";

// Mock Reviews matching the screenshot exactly
const MOCK_REVIEWS = [
  {
    id: 1,
    rating: 5,
    title: "The best booking system",
    text: "Great experience, easy to book. Paying for treatments is so convenient — no cash or cards needed!",
    name: "Lucy",
    location: "London, UK",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 2,
    rating: 5,
    title: "Easy to use & explore",
    text: "Vijayajalakam's reminders make life so much easier. I also found a few good barbershops that I didn't know existed.",
    name: "Dan",
    location: "New York, USA",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 3,
    rating: 5,
    title: "Great for finding barbers",
    text: "I've been using Vijayajalakam for two years and it's by far the best booking platform I've used. Highly recommend it!",
    name: "Dale",
    location: "Sydney, Australia",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 4,
    rating: 5,
    title: "My go-to for self-care",
    text: "Vijayajalakam is my go-to app for massages and facials. I can easily find and book places near me — I love it!",
    name: "Cameron",
    location: "Edinburgh, UK",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80"
  }
];

/**
 * Animated rotating placeholder for the search bar.
 * "Search" stays fixed, only the word after it animates/cycles.
 */
const AnimatedSearchPlaceholder = () => {
  const words = ["Location", "Shops", "Toney", "Grace", "Salons", "Spa"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center pointer-events-none">
      <span className="text-gray-400 dark:text-gray-500 text-[14px]">Search</span>
      <span
        className="text-gray-400 dark:text-gray-500 text-[14px] transition-all duration-300 ml-1.5"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0px)" : "translateY(-10px)",
        }}
      >
        {words[currentIndex]}
      </span>
    </div>
  );
};

const BannersSection = ({ banners }) => {
  if (!banners || banners.length === 0) return null;

  return (
    <section 
      className="mb-6 md:mb-12 py-6 md:py-8 scroll-mt-24 bg-gray-50 dark:bg-[#131926]"
      style={{
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)',
      }}
    >
      <div className="w-full max-w-[1600px] mx-auto md:px-12 lg:px-20 xl:px-24">
        <div className="flex gap-5 md:gap-6 overflow-x-auto pl-5 pr-3 md:pl-0 md:pr-0 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {banners.map((banner) => (
          <div 
            key={banner._id} 
            className="flex-shrink-0 w-[260px] md:w-[calc(25%-15px)] md:min-w-[220px] rounded-xl md:rounded-[14px] overflow-hidden relative group cursor-pointer snap-start shadow-sm border border-gray-100 dark:border-gray-800"
            onClick={() => { if(banner.buttonUrl) window.open(banner.buttonUrl, "_blank") }}
          >
            {/* Background Image */}
            <div className="relative aspect-[3/2] w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {banner.image?.url && (
                <img 
                  src={banner.image.url} 
                  alt={banner.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              )}
              {/* Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            </div>
            
            {/* Content overlay */}
            <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-center">
              <h3 className="text-white text-[16px] md:text-[18px] font-bold tracking-tight mb-1 md:mb-1.5 max-w-[85%] leading-tight drop-shadow-md">
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p className="text-white/90 text-[12px] md:text-[13px] font-medium mb-3 md:mb-4 max-w-[85%] line-clamp-2 drop-shadow-sm">
                  {banner.subtitle}
                </p>
              )}
              {banner.buttonName && (
                <div className="mt-auto flex justify-start">
                  <button 
                    className="px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[12px] md:text-[13px] font-semibold transition-transform active:scale-95 shadow-lg border border-white/20 hover:bg-white dark:bg-dark-surface/90 hover:text-black cursor-pointer"
                    style={{ backgroundColor: banner.buttonColor || '#000000', color: '#ffffff' }}
                  >
                    {banner.buttonName}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
};

const ShopSelector = () => {
  const { theme, setTheme } = useTheme();
  const userSelectedBranchId = useSelector(selectSelectedBranchId);
  
  // Helper to get the correct branch address for a shop
  const getShopLocationText = (shop) => {
    // Calculate distance if user location is available
    let distPrefix = "";
    if (userLocation) {
      const branches = shop.branchAddresses || shop.branches || [];
      let minDist = Infinity;
      for (const b of branches) {
        if (b.latitude && b.longitude) {
          const R = 6371;
          const dLat = ((b.latitude - userLocation.lat) * Math.PI) / 180;
          const dLon = ((b.longitude - userLocation.lng) * Math.PI) / 180;
          const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos((userLocation.lat*Math.PI)/180)*Math.cos((b.latitude*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
          const d = Math.round(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R);
          if (d < minDist) minDist = d;
        }
      }
      if (minDist < Infinity) distPrefix = `${minDist}km> `;
    }

    // Get address
    let address = "";
    if (shop.branchAddresses && shop.branchAddresses.length > 0 && userSelectedBranchId) {
      const selected = shop.branchAddresses.find(b => b._id === userSelectedBranchId);
      if (selected?.mapAddress) address = selected.mapAddress;
    }
    if (!address) address = shop.branchMapAddress || (shop.area ? `${shop.area}, ${shop.state || shop.country || ''}` : (shop.state || shop.country || ''));
    
    // Shorten address
    if (address) {
      const parts = address.split(",").map(s => s.trim());
      address = parts.slice(0, 2).join(", ");
    }

    return distPrefix + address;
  };
  
  // User geolocation state · initialize from localStorage synchronously
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.lat && loc.lng) return { lat: loc.lat, lng: loc.lng };
      }
    } catch {}
    return null;
  });
  const [userLocationText, setUserLocationText] = useState(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.name) return `${loc.name}${loc.region ? `, ${loc.region.split(",")[0]}` : ""}`;
      }
    } catch {}
    return "";
  });

  // Load saved location from localStorage (for event-driven updates)
  const loadSavedLocation = useCallback(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        setUserLocation({ lat: loc.lat, lng: loc.lng });
        setUserLocationText(loc.name ? `${loc.name}${loc.region ? `, ${loc.region.split(",")[0]}` : ""}` : "Current location");
        return true;
      }
    } catch {}
    return false;
  }, []);

  // Listen for location changes from LocationPicker
  useEffect(() => {
    const handleLocationChange = () => loadSavedLocation();
    window.addEventListener("location-changed", handleLocationChange);
    return () => window.removeEventListener("location-changed", handleLocationChange);
  }, [loadSavedLocation]);
  
  // Recent bookings for "Book Again" section
  const [recentBookings, setRecentBookings] = useState([]);
  
  // Upcoming bookings section
  const [upcomingBookings, setUpcomingBookings] = useState([]);

  // Loading state for bookings (prevents layout shift)
  const [bookingsLoading, setBookingsLoading] = useState(() => !!localStorage.getItem("accessToken"));

  // --- RTK Query hooks (cached, instant on revisit) -----------------------
  const isLoggedIn = !!localStorage.getItem("accessToken");
  const { data: shopsData = [], isLoading: shopsLoading, error: shopsError } = useGetPublicShopsQuery(userLocation, {
    refetchOnMountOrArgChange: false, // use cache on revisit
  });
  const { data: categoriesData = [], isLoading: catsLoading } = useGetPublicShopCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const { data: bookingsRawData = [], isLoading: bookingsQueryLoading } = useGetUserHomeBookingsQuery(undefined, {
    skip: !isLoggedIn,
    refetchOnMountOrArgChange: false,
  });
  const { data: backendFavorites = [] } = useGetUserFavoritesQuery(undefined, {
    skip: !isLoggedIn,
    refetchOnMountOrArgChange: false,
  });
  const { data: activeBanners = [] } = useGetPublicBannersQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });

  // Derived loading state · combines shops + categories
  const loading = shopsLoading || catsLoading;
  const shops = shopsData;
  const error = shopsError ? "Unable to load shops. Please check your internet connection and try again." : null;
  
  // Header scroll state
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Search parameters matching UI
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [timeQuery, setTimeQuery] = useState("Any time");
  
  // Location search suggestions for desktop home
  const [homeSuggestions, setHomeSuggestions] = useState([]);
  const [showHomeSuggestions, setShowHomeSuggestions] = useState(false);
  const homeLocDebounceRef = useRef(null);

  const handleHomeLocationChange = (val) => {
    setLocationQuery(val);
    if (homeLocDebounceRef.current) clearTimeout(homeLocDebounceRef.current);
    if (!val || val.length < 2) { setHomeSuggestions([]); setShowHomeSuggestions(false); return; }
    setShowHomeSuggestions(true);
    homeLocDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        if (data && data.length > 0) {
          setHomeSuggestions(data.map(d => ({
            name: d.display_name.split(",")[0],
            region: d.display_name.split(",").slice(1, 3).join(",").trim(),
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
            full: d.display_name,
          })));
        } else {
          setHomeSuggestions([]);
        }
      } catch { setHomeSuggestions([]); }
    }, 400);
  };

  const selectHomeSuggestion = (suggestion) => {
    setLocationQuery("");
    setShowHomeSuggestions(false);
    setHomeSuggestions([]);
    setUserLocation({ lat: suggestion.lat, lng: suggestion.lng });
    setUserLocationText(`${suggestion.name}${suggestion.region ? `, ${suggestion.region}` : ""}`);
    // Save to localStorage
    const locationData = { name: suggestion.name, region: suggestion.region, lat: suggestion.lat, lng: suggestion.lng, displayName: suggestion.full, savedAt: Date.now() };
    localStorage.setItem("vijayajalakam_user_location", JSON.stringify(locationData));
    window.dispatchEvent(new Event("location-changed"));
  };
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'contact' or 'demo'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Dynamic Favorites — synced with backend for logged-in users
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });


  const toggleFavorite = (shopId, e) => {
    if (e) e.stopPropagation();
    if (!shopId) return;
    const id = shopId.toString();
    setFavorites(prev => {
      const isFav = prev.includes(id);
      const updated = isFav ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem("vijayajalakam_favorites", JSON.stringify(updated));
      // Sync with backend (non-blocking)
      const token = localStorage.getItem("accessToken");
      if (token) {
        if (isFav) {
          api.delete(`/user/favorites/${id}`).catch(() => {});
        } else {
          api.post(`/user/favorites/${id}`).catch(() => {});
        }
      }
      return updated;
    });
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const recommendedSectionRef = useRef(null);
  const downloadSectionRef = useRef(null);

  // Monitor Scroll Event for Navbar transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTransmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.firstName || !formData.email || !formData.message) {
      setSubmitStatus({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await api.post("/public/contact", formData);
      if (response.data.success) {
        setSubmitStatus({
          type: "success",
          message: "Your message has been sent successfully.",
        });
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          message: "",
        });
        setTimeout(() => setActiveModal(null), 2000);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setSubmitStatus({
        type: "error",
        message:
          err.response?.data?.message ||
          "Failed to send message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const { user, portalRole, logout } = useAuth();

  // Device ID for tracking anonymous users (after user is defined)
  const [deviceId, setDeviceId] = useState(() => {
    let id = localStorage.getItem("vijayajalakam_device_id");
    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("vijayajalakam_device_id", id);
    }
    return id;
  });

  // Track shop view mutation
  const [trackShopView] = useTrackShopViewMutation();

  // Get recently viewed shops
  const { data: recentlyViewedShopsData = [] } = useGetRecentlyViewedShopsQuery(
    {
      userId: user?._id,
      deviceId: deviceId,
      limit: 10,
    },
    {
      skip: false, // Always fetch, even for anonymous users
      refetchOnMountOrArgChange: true, // Refresh when coming back to home
    }
  );

  // Get new to Vijayajalakam shops
  const { data: newToVijayajalakamShopsData = [] } = useGetNewToVijayajalakamShopsQuery(10, {
    refetchOnMountOrArgChange: false,
  });

  useEffect(() => {
    if (user && (user.role === "SHOP_ADMIN" || user.role === "staff")) {
      const userShopSlug = user.shopSlug || localStorage.getItem("lastShopSlug");
      if (userShopSlug) {
        const rolePrefix = getPortalRole(user.role);
        if (rolePrefix === "staff") {
          navigate(`/${userShopSlug}/staff/bookings`, { replace: true });
        } else {
          navigate(`/${userShopSlug}/${rolePrefix}/dashboard`, { replace: true });
        }
      }
    }
  }, [user, navigate]);

  // Get user location on mount · only use GPS if no saved location
  useEffect(() => {
    // If we already have location from localStorage init, skip GPS
    if (userLocation) return;

    const fallbackToIP = async () => {
      try {
        const response = await fetch("https://get.geojs.io/v1/ip/geo.json");
        const data = await response.json();
        if (data && data.latitude && data.longitude) {
          const name = data.city || data.region || "Current location";
          const region = [data.region, data.country].filter(Boolean).join(", ");
          setUserLocation({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
          setUserLocationText(`${name}, ${data.region || ""}`);
          const locationData = {
            name,
            region,
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude),
            displayName: `${name}, ${region}`,
            isCurrentLocation: true,
            savedAt: Date.now(),
          };
          localStorage.setItem("vijayajalakam_user_location", JSON.stringify(locationData));
        } else {
          setUserLocationText("");
        }
      } catch {
        setUserLocationText("");
      }
    };

    // No saved location · try GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            setUserLocation({ lat: latitude, lng: longitude });
            // Use BigDataCloud free reverse geocoding API
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            
            if (data && (data.city || data.locality || data.principalSubdivision)) {
              const name = data.locality || data.city || data.principalSubdivision || "Current location";
              const region = [data.principalSubdivision, data.countryName].filter(Boolean).join(", ");
              setUserLocationText(`${name}, ${data.principalSubdivision || ""}`);
              
              // Auto-save as current location
              const locationData = {
                name,
                region,
                lat: latitude,
                lng: longitude,
                displayName: `${name}, ${region}`,
                isCurrentLocation: true,
                savedAt: Date.now(),
              };
              localStorage.setItem("vijayajalakam_user_location", JSON.stringify(locationData));
            } else {
              fallbackToIP();
            }
          } catch {
            fallbackToIP();
          }
        },
        () => {
          // If GPS is denied or times out, fallback to IP location seamlessly
          fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      fallbackToIP();
    }
  }, []); // Run once on mount

  // --- Process categories from RTK Query data ---------------------------
  const categories = useMemo(() => {
    const filteredCategories = categoriesData.filter(c => c.name && c.name.toLowerCase() !== 'all');
    return [{ _id: null, name: "All" }, ...filteredCategories];
  }, [categoriesData]);

  // --- Process bookings from RTK Query (Upcoming + Book Again) ----------
  useEffect(() => {
    if (bookingsQueryLoading) return;
    if (!bookingsRawData || bookingsRawData.length === 0) {
      setBookingsLoading(false);
      return;
    }

    const now = moment();
    const allBookings = bookingsRawData;

    // --- Upcoming bookings ---
    const upcomingList = [];
    for (const booking of allBookings) {
      const status = booking.status?.toLowerCase();
      const isFinal = ["completed", "cancelled", "no_show", "delivered"].includes(status);
      if (isFinal) continue;

      const dateOnly = moment(booking.date).format("YYYY-MM-DD");
      const time = booking.slotTimes?.[0] || "12:00 AM";
      const bookingMoment = moment(`${dateOnly} ${time}`, [
        "YYYY-MM-DD h:mm A",
        "YYYY-MM-DD H:mm",
        "YYYY-MM-DD HH:mm",
      ]);
      if (!bookingMoment.isValid() || bookingMoment.isBefore(now)) continue;

      upcomingList.push({
        ...booking,
        _bookingMoment: bookingMoment,
        shopName: booking.shopId?.name || booking.shop?.name || "Shop",
        shopSlug: booking.tenantSlug || booking.shopId?.slug || booking.shop?.slug,
        shopImage: booking.shopId?.galleryImage || booking.shopId?.image?.url || booking.shop?.image?.url || null,
      });
    }
    upcomingList.sort((a, b) => a._bookingMoment.valueOf() - b._bookingMoment.valueOf());
    setUpcomingBookings(upcomingList);

    // --- Book Again (past bookings) ---
    const upcomingIds = new Set(upcomingList.map(b => b._id));
    const seen = new Set();
    const uniqueServices = [];
    for (const booking of allBookings) {
      if (uniqueServices.length >= 5) break;
      if (upcomingIds.has(booking._id)) continue;
      const services = booking.services || [];
      for (const s of services) {
        const serviceId = s.serviceId?._id || s.serviceId;
        if (!serviceId || seen.has(serviceId)) continue;
        seen.add(serviceId);
        uniqueServices.push({
          _id: serviceId,
          bookingId: booking._id,
          serviceName: s.serviceId?.name || s.name || "Service",
          serviceImage: s.serviceId?.image?.url || s.serviceId?.image || null,
          price: s.price || s.serviceId?.price || 0,
          shopName: booking.shopId?.name || booking.shop?.name || "Shop",
          shopSlug: booking.tenantSlug || booking.shopId?.slug || booking.shop?.slug,
          shopImage: booking.shopId?.galleryImage || booking.shopId?.image?.url || booking.shop?.image?.url || null,
          duration: s.serviceId?.duration || 0,
          currencySymbol: booking.shopId?.currencySymbol || "?",
        });
        if (uniqueServices.length >= 5) break;
      }
    }
    setRecentBookings(uniqueServices);
    setBookingsLoading(false);
  }, [bookingsRawData, bookingsQueryLoading]);

  // --- Sync backend favorites into local state --------------------------
  useEffect(() => {
    if (backendFavorites && backendFavorites.length > 0) {
      setFavorites(backendFavorites);
      localStorage.setItem("vijayajalakam_favorites", JSON.stringify(backendFavorites));
    }
  }, [backendFavorites]);


  // Filter Real Shops based on search parameter queries
  const filteredRealShops = useMemo(() => {
    return shops.filter((shop) => {
      const matchesSearch =
        !searchQuery ||
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (shop.category?.name && shop.category.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLocation =
        !locationQuery ||
        (shop.area && shop.area.toLowerCase().includes(locationQuery.toLowerCase())) ||
        (shop.city && shop.city.toLowerCase().includes(locationQuery.toLowerCase())) ||
        (shop.address && shop.address.toLowerCase().includes(locationQuery.toLowerCase()));

      const matchesCategory = !selectedCategory || (shop.category && shop.category._id === selectedCategory);
      
      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [shops, searchQuery, locationQuery, selectedCategory]);

  // Dynamically build shop rows for a beautiful full homepage using only our added shops
  const recommendedShops = useMemo(() => {
    return filteredRealShops;
  }, [filteredRealShops]);

  const newShops = useMemo(() => {
    // Use "New to Vijayajalakam" API data if available
    return newToVijayajalakamShopsData.length > 0 ? newToVijayajalakamShopsData : [];
  }, [newToVijayajalakamShopsData]);

  const trendingShops = useMemo(() => {
    // Trending: Show highest rated shops (sorted by rating and review count)
    if (filteredRealShops.length === 0) return [];
    
    return [...filteredRealShops]
      .filter(shop => (shop.rating || 0) > 0) // Only shops with ratings
      .sort((a, b) => {
        // First sort by rating (descending)
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        
        // If ratings are equal, sort by review count (descending)
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      })
      .slice(0, 20); // Top 20 highest rated shops
  }, [filteredRealShops]);

  const recentlyViewedShops = useMemo(() => {
    // Recently Viewed: Use API data for user's personal viewing history
    return recentlyViewedShopsData.length > 0 ? recentlyViewedShopsData : [];
  }, [recentlyViewedShopsData]);

  const handleShopClick = async (shop) => {
    if (shop && shop.slug) {
      // Track shop view
      try {
        await trackShopView({
          shopId: shop._id,
          userId: user?._id || null,
          deviceId: deviceId,
        }).unwrap();
      } catch (error) {
        console.log("Failed to track shop view:", error);
        // Don't block navigation if tracking fails
      }

      // Navigate to shop
      if (user && portalRole === "user") {
        navigate(`/${shop.slug}/user/home`);
      } else {
        navigate(`/${shop.slug}/login`);
      }
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (recommendedSectionRef.current) {
      recommendedSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll Container component helper
  const ScrollContainer = ({ children }) => {
    const containerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    
    const checkScroll = () => {
      if (containerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
        setCanScrollLeft(scrollLeft > 10);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    useEffect(() => {
      checkScroll();
      const el = containerRef.current;
      if (el) el.addEventListener('scroll', checkScroll);
      return () => { if (el) el.removeEventListener('scroll', checkScroll); };
    }, []);

    const scroll = (direction) => {
      if (containerRef.current) {
        const scrollAmount = containerRef.current.clientWidth * 0.75;
        containerRef.current.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth"
        });
      }
    };

    return (
      <div className="relative group/scroll w-full overflow-hidden">
        {/* Scroll Left Button — only on hover when scrolled */}
        {canScrollLeft && (
          <button 
            onClick={() => scroll("left")}
            className="absolute left-0 top-[37%] -translate-y-1/2 w-11 h-11 rounded-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border/60 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-md z-20 hidden md:flex cursor-pointer opacity-0 group-hover/scroll:opacity-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Scrollable Container */}
        <div 
          ref={containerRef}
          className="flex overflow-x-auto gap-5 pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full"
        >
          {children}
        </div>
        
        {/* Scroll Right Button — only on hover when more content */}
        {canScrollRight && (
          <button 
            onClick={() => scroll("right")}
            className="absolute right-0 top-[37%] -translate-y-1/2 w-11 h-11 rounded-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border/60 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-md z-20 hidden md:flex cursor-pointer opacity-0 group-hover/scroll:opacity-100"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}
      </div>
    );
  };

  // Standard Modal component
  const Modal = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white dark:bg-dark-surface/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0b0f19] text-[#1a1a1a] dark:text-gray-100 font-poppins antialiased selection:bg-[#c5a059] selection:text-white overflow-x-hidden relative transition-colors duration-500">
      
      {/* Dynamic Drifting Background Glow animations style */}
      <style>{`
        @keyframes float-blob-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(100px, -80px) scale(1.15); }
          66% { transform: translate(-70px, 50px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-blob-2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-90px, 90px) scale(0.85); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-blob-3 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-60px, -90px) scale(1.1); }
          66% { transform: translate(90px, 40px) scale(0.85); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob-1 {
          animation: float-blob-1 25s infinite ease-in-out;
        }
        .animate-blob-2 {
          animation: float-blob-2 30s infinite ease-in-out;
        }
        .animate-blob-3 {
          animation: float-blob-3 28s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @property --border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .animate-border-glow {
          --border-angle: 0deg;
          animation: border-rotate 4s linear infinite;
        }
        @keyframes border-rotate {
          to { --border-angle: 360deg; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Header Bar */}
      <header className={`hidden md:block fixed top-0 inset-x-0 z-50 px-5 md:px-8 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/98 dark:bg-[#0b0f19]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] py-3" 
          : "bg-transparent border-b border-transparent py-4"
      }`}>
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          
          {/* Logo · Fresha-style lowercase bold */}
          <Link to="/" className="flex items-center shrink-0">
            <span className="text-[26px] font-extrabold tracking-tight text-black dark:text-white font-poppins lowercase leading-none">
              vijayajalakam
            </span>
          </Link>

          {/* Right items */}
          <div className="flex items-center gap-4 shrink-0">

            {user ? (
              /* Logged-in: Avatar + Dropdown */
              <>
              <button 
                onClick={() => setActiveModal('demo')}
                className="hidden md:block border border-gray-200 dark:border-white/20 px-5 py-2.5 rounded-full font-medium text-[15px] text-gray-900 dark:text-white bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all cursor-pointer"
              >
                List your business
              </button>

              {/* Theme Toggle for Desktop Navbar */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-gray-50 dark:bg-dark-surface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface transition-all duration-300 group overflow-hidden border border-gray-200 dark:border-white/20 shadow-sm cursor-pointer"
                title="Toggle Dark Mode"
              >
                {theme === 'dark' ? (
                  <Sun size={18} className="group-hover:scale-110 transition-transform text-amber-500" />
                ) : (
                  <Moon size={18} className="group-hover:scale-110 transition-transform" />
                )}
              </button>

              <div className="relative">
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 dark:border-dark-border group-hover:border-gray-300 transition-colors">
                    {user.profileImage || user.photo?.url || user.photo?.path || (typeof user.photo === 'string' && user.photo) ? (
                      <img 
                        src={user.profileImage || user.photo?.url || user.photo?.path || user.photo} 
                        alt={user.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-dark-card flex items-center justify-center">
                        <span className="text-[14px] font-bold text-gray-600 dark:text-gray-400">{user.name?.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  {/* Chevron */}
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {mobileMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-3 w-[260px] rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-20 overflow-hidden"
                      >
                        {/* User Name */}
                        <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-white/10">
                          <p className="text-[16px] font-bold text-gray-900 dark:text-white">{user.name}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <Link
                            to="/user/profile"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-colors"
                          >
                            <User className="w-[18px] h-[18px] text-gray-500" />
                            <span>Profile</span>
                          </Link>
                          <Link
                            to="/user/bookings"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-colors"
                          >
                            <Calendar className="w-[18px] h-[18px] text-gray-500" />
                            <span>Bookings</span>
                          </Link>
                          <Link
                            to="/user/profile#wallet"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-colors"
                          >
                            <Wallet className="w-[18px] h-[18px] text-gray-500" />
                            <span>Wallet</span>
                          </Link>
                          <Link
                            to="/user/favourites"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-colors"
                          >
                            <Heart className="w-[18px] h-[18px] text-gray-500" />
                            <span>Favourites</span>
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100 dark:border-white/10 py-2">
                          <button
                            onClick={() => { setMobileMenuOpen(false); setShowLogoutConfirm(true); }}
                            className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-colors w-full text-left"
                          >
                            <LogOut className="w-[18px] h-[18px] text-gray-500" />
                            <span>Log out</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              </>
            ) : (
              /* Not logged in — order: Log in, List your business, Menu */
              <>
                <Link
                  to="/login"
                  className="text-[15px] font-medium text-gray-900 dark:text-white hover:text-black/70 transition-colors"
                >
                  Log in
                </Link>
                <button 
                  onClick={() => setActiveModal('demo')}
                  className="hidden md:block border border-gray-200 dark:border-white/20 px-5 py-2.5 rounded-full font-medium text-[15px] text-gray-900 dark:text-white bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all cursor-pointer"
                >
                  List your business
                </button>

                {/* Theme Toggle for Desktop Navbar */}
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-gray-50 dark:bg-dark-surface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface transition-all duration-300 group overflow-hidden border border-gray-200 dark:border-white/20 shadow-sm cursor-pointer"
                  title="Toggle Dark Mode"
                >
                  {theme === 'dark' ? (
                    <Sun size={18} className="group-hover:scale-110 transition-transform text-amber-500" />
                  ) : (
                    <Moon size={18} className="group-hover:scale-110 transition-transform" />
                  )}
                </button>

                {/* Menu Dropdown Button */}
                <div className="relative">
                  <button 
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="flex items-center gap-2 border border-gray-200 dark:border-white/20 px-5 py-2.5 rounded-full font-medium text-[15px] text-gray-900 dark:text-white bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all cursor-pointer"
                  >
                    <span>Menu</span>
                    <Menu className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>

              <AnimatePresence>
                {mobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 p-3 shadow-xl z-20"
                    >
                      <button
                        onClick={() => { setMobileMenuOpen(false); setActiveModal('contact'); }}
                        className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all"
                      >
                        Contact Us
                      </button>
                      <button
                        onClick={() => { setMobileMenuOpen(false); setActiveModal('demo'); }}
                        className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all"
                      >
                        Request Demo
                      </button>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (downloadSectionRef.current) {
                            downloadSectionRef.current.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all"
                      >
                        Download App
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                      <Link
                        to="/privacy-policy"
                        className="block px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Privacy Policy
                      </Link>
                      <Link
                        to="/terms-and-conditions"
                        className="block px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Terms of Service
                      </Link>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
                </div>
              </>
            )}
          </div>

        </div>
      </header>


      {/* ============================================================
          MOBILE LAYOUT
          ============================================================ */}
      <div className="mobile-home-container bg-white dark:bg-[#0b0f19]" style={{ fontFamily: "'Poppins', sans-serif" }}>

        {/* ---- Greeting Header ---- */}
        {user && (
          <div className="px-5 pt-5 pb-0 flex items-center justify-between">
            <div>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return `Good morning ${String.fromCodePoint(0x2600, 0xFE0F)}`;
                  if (hour < 17) return `Good afternoon ${String.fromCodePoint(0x1F324, 0xFE0F)}`;
                  return `Good evening ${String.fromCodePoint(0x1F319)}`;
                })()}
              </p>
              <h2 className="text-[24px] font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                {user.name?.split(' ')[0]}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-full bg-purple-500 flex items-center justify-center cursor-pointer shadow-sm"
                onClick={() => navigate('/user/profile')}
              >
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-[16px] font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Location Display (clickable ? opens location picker) ---- */}
        <div
          className="px-5 pt-3 pb-3 flex items-center gap-1.5 cursor-pointer"
          onClick={() => navigate("/user/location")}
        >
          <MapPin size={15} className="text-purple-600 shrink-0" fill="#7c3aed" />
          <span className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
            {userLocationText || "Current location"}
          </span>
          <ChevronDown size={16} className="text-gray-500 shrink-0" />
        </div>

        {/* ---- Search Bar with Animated Placeholder ---- */}
        <div className="mobile-search-section">
          <div
            className="mobile-search-bar bg-gray-50 dark:bg-[#131926] cursor-pointer"
            onClick={() => navigate("/user/search")}
          >
            <Search size={18} className="text-gray-400" />
            <div className="relative flex-1 overflow-hidden h-[20px]">
              {!searchQuery && <AnimatedSearchPlaceholder />}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/user/search"); }}
              className="mobile-search-btn bg-black dark:bg-[#c5a059]"
            >
              Search
            </button>
          </div>
        </div>

        {/* ---- Category Icons ---- */}
        {loading ? (
          <div className="px-5 py-4 pb-6">
            <div className="grid grid-cols-4 gap-y-5 gap-x-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-[20px] bg-gray-100 dark:bg-[#1a2133] animate-pulse"></div>
                  <div className="w-12 h-3 bg-gray-100 dark:bg-[#1a2133] rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : categories.length > 1 ? (
          <MobileCategoryGrid
            categories={categories}
            activeCategory={selectedCategory}
            onCategorySelect={(id) => setSelectedCategory(id)}
          />
        ) : null}

        {/* ---- Skeleton for Shops ---- */}
        {loading ? (
          <div className="mt-2 pb-8">
            <div className="px-5 mb-4">
              <div className="w-40 h-7 bg-gray-100 dark:bg-[#1a2133] rounded-lg animate-pulse"></div>
            </div>
            <div className="px-5 flex gap-4 overflow-hidden">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="min-w-[280px] flex flex-col gap-2">
                  <div className="w-full aspect-[4/3] rounded-xl bg-gray-100 dark:bg-[#1a2133] animate-pulse"></div>
                  <div className="w-3/4 h-5 bg-gray-100 dark:bg-[#1a2133] rounded animate-pulse mt-1"></div>
                  <div className="w-1/2 h-4 bg-gray-100 dark:bg-[#1a2133] rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ---- Upcoming Bookings Shimmer ---- */}
            {bookingsLoading && (
              <section className="pt-5 pb-4 bg-gray-50 dark:bg-[#0f1419]">
                <div className="px-5 mb-3">
                  <div className="w-32 h-7 bg-gray-200 dark:bg-dark-border/70 rounded-lg animate-pulse"></div>
                </div>
                <div className="flex gap-5 overflow-hidden pl-5 pr-3 pb-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex-shrink-0 w-[260px] rounded-2xl overflow-hidden bg-white dark:bg-[#1a2235] border border-gray-100 dark:border-white/5">
                      <div className="h-[140px] w-full bg-gray-200 dark:bg-dark-border/70 animate-pulse"></div>
                      <div className="p-3.5 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-dark-border/70 rounded animate-pulse"></div>
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-dark-border/70 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---- Book Again Shimmer ---- */}
            {bookingsLoading && (
              <section className="px-5 pt-5 pb-4">
                <div className="mb-3">
                  <div className="w-28 h-7 bg-gray-200/70 rounded-lg animate-pulse"></div>
                </div>
                <div className="flex gap-5 overflow-hidden pb-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex-shrink-0 w-[260px] rounded-3xl overflow-hidden bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border">
                      <div className="h-[130px] w-full bg-gray-200/70 animate-pulse"></div>
                      <div className="px-3.5 pt-2.5 pb-1.5 space-y-2">
                        <div className="h-4 w-2/3 bg-gray-200/70 rounded animate-pulse"></div>
                        <div className="h-3 w-1/2 bg-gray-200/70 rounded animate-pulse"></div>
                      </div>
                      <div className="px-3.5 pb-3 pt-1.5">
                        <div className="h-10 w-full bg-gray-100 dark:bg-dark-card rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---- Upcoming Bookings ---- */}
            {!bookingsLoading && upcomingBookings.length > 0 && (
              <section className="pt-5 pb-4 bg-gray-50 dark:bg-[#0f1419]">
                <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white mb-3 px-5" style={{ fontFamily: "'Poppins', sans-serif" }}>Upcoming</h2>
                <div className="flex gap-5 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {upcomingBookings.slice(0, 5).map((booking) => {
                    const displayDate = booking._bookingMoment.format("ddd, D MMM, YYYY");
                    const displayTime = booking._bookingMoment.format("h:mm a");
                    const shopImage = booking.shopImage || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80";

                    return (
                      <div
                        key={booking._id}
                        className="flex-shrink-0 w-[260px] rounded-2xl overflow-hidden cursor-pointer bg-white dark:bg-[#1a2235] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md dark:shadow-none transition-shadow"
                        onClick={() => {
                          // Open Google Maps with shop location
                          const branch = booking.branchId && typeof booking.branchId === 'object' ? booking.branchId : null;
                          const shop = booking.shopId && typeof booking.shopId === 'object' ? booking.shopId : null;
                          const lat = branch?.latitude || shop?.latitude;
                          const lng = branch?.longitude || shop?.longitude;
                          if (lat && lng) {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener,noreferrer");
                          } else {
                            const address = branch?.mapAddress || branch?.address || shop?.mapAddress || shop?.address || booking.shopName;
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        {/* Shop Image */}
                        <div className="relative h-[140px] w-full">
                          <img
                            src={shopImage}
                            alt={booking.shopName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {/* Location Pin */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-9 h-9 rounded-full bg-[#4a3aad] flex items-center justify-center shadow-lg">
                              <Navigation size={16} fill="white" color="white" />
                            </div>
                          </div>
                        </div>

                        {/* Booking Info */}
                        <div className="p-3.5 bg-white dark:bg-[#1a2235]">
                          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight mb-1.5 truncate">{booking.shopName}</h3>
                          <div className="flex items-center gap-3 text-[12px] text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar size={13} className="text-gray-400 dark:text-gray-500" />
                              <span>{displayDate}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={13} className="text-gray-400 dark:text-gray-500" />
                              <span>{displayTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ---- Book Again ---- */}
        {!bookingsLoading && recentBookings.length > 0 && (
          <section className={`mobile-section mobile-book-again-section ${upcomingBookings.length > 0 ? 'bg-white dark:bg-dark-surface' : ''}`}>
            <h2 className="mobile-section-title dark:text-white">Book again</h2>
            <div className="flex gap-5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-5">
              {recentBookings.map((item, idx) => (
                <div
                  key={`book-again-${item._id}-${idx}`}
                  className="flex-shrink-0 w-[260px] bg-white dark:bg-gray-800 rounded-3xl overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-700"
                  onClick={() => {
                    if (item.shopSlug && item.bookingId) {
                      navigate(`/${item.shopSlug}/user/booking/${item.bookingId}`);
                    } else if (item.shopSlug) {
                      navigate(`/${item.shopSlug}/user/home`);
                    }
                  }}
                >
                  {/* Image */}
                  <div className="h-[130px] w-full bg-gray-100 dark:bg-dark-card relative overflow-hidden">
                    <img
                      src={item.shopImage || item.serviceImage || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"}
                      alt={item.serviceName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Info */}
                  <div className="px-3.5 pt-2.5 pb-1.5">
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">{item.shopName}</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5 truncate">
                      {item.currencySymbol}{item.price.toLocaleString()} · {item.serviceName}
                    </p>
                  </div>
                  {/* Rebook Button */}
                  <div className="px-3.5 pb-3 pt-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.shopSlug) {
                          dispatch(clearBookingFlow());
                          dispatch(setShopContext({ shopSlug: item.shopSlug, shopName: item.shopName, shopImage: item.shopImage }));
                          dispatch(addSelectedService({ _id: item._id, name: item.serviceName, price: item.price, duration: item.duration || 0 }));
                          navigate(`/${item.shopSlug}/user/select-services`);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f5f5f5] dark:bg-gray-700 rounded-full text-[13px] font-semibold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <RefreshCw size={14} />
                      Rebook
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Favourites ---- */}
        {favorites.length > 0 && shops.filter(s => favorites.includes((s._id || s.slug || "").toString())).length > 0 && (
          <section className="mb-6 pt-4">
            <div className="flex items-center justify-between px-5 mb-3">
              <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>Favourites</h2>
              <span 
                className="text-[13px] font-medium text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-300"
                onClick={() => navigate('/user/favourites')}
              >
                See all
              </span>
            </div>
            <div className="flex gap-5 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {shops.filter(s => favorites.includes((s._id || s.slug || "").toString())).map((shop) => (
                <MobileShopListCard
                  key={`fav-${shop._id || shop.slug}`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- Nearby ---- */}
        {userLocation && recommendedShops.length > 0 && (
          <section className="mb-6 pt-4">
            <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white px-5 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Nearby</h2>
            <div className="flex gap-5 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {recommendedShops.map((shop) => (
                <MobileShopListCard
                  key={`nearby-${shop._id || shop.slug}`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes((shop._id || shop.slug || "").toString())}
                />
              ))}
            </div>
          </section>
        )}

        <BannersSection banners={activeBanners} />

        {/* ---- Recommended ---- */}
        {recommendedShops.length > 0 && (
          <section className="mb-6 pt-4">
            <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white px-5 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Recommended</h2>
            <div className="flex gap-5 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {recommendedShops.map((shop) => (
                <MobileShopListCard
                  key={`rec-${shop._id || shop.slug}`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes((shop._id || shop.slug || "").toString())}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- Recently Viewed ---- */}
        {recentlyViewedShops.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white px-5 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Recently viewed</h2>
            <div className="flex gap-5 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {recentlyViewedShops.map((shop) => (
                <MobileShopListCard
                  key={`viewed-${shop._id || shop.slug}`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes((shop._id || shop.slug || "").toString())}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- New to Vijayajalakam ---- */}
        {newShops.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white px-5 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>New to Vijayajalakam</h2>
            <div className="flex gap-5 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {newShops.map((shop) => (
                <MobileShopListCard
                  key={`new-${shop._id || shop.slug}`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes((shop._id || shop.slug || "").toString())}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- Trending (Highest Rated) ---- */}
        {trendingShops.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white px-5 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Trending</h2>
            <div className="flex gap-5 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {trendingShops.map((shop) => (
                <MobileShopListCard
                  key={`trending-${shop._id || shop.slug}`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes((shop._id || shop.slug || "").toString())}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- Professionals ---- */}
        {(() => {
          const professionalShops = shops.filter(s =>
            (s.category?.name || s.category || '').toString().toUpperCase() === 'PROFESSIONALS'
          ).slice(0, 2);
          if (professionalShops.length === 0) return null;
          return (
            <section className="mb-6 px-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Nearby professionals
                </h2>
                <button
                  onClick={() => navigate('/user/search?category=PROFESSIONALS')}
                  className="text-[14px] font-semibold text-gray-500 dark:text-gray-400"
                >
                  See all
                </button>
              </div>
              <div className="space-y-3">
                {professionalShops.map((shop) => {
                  const imgSrc = shop.image?.url || shop.image || shop.galleryImage || null;
                  // Distance calculation
                  let distText = null;
                  if (userLocation) {
                    const brs = shop.branchAddresses || shop.branches || [];
                    let minDist = Infinity;
                    for (const b of brs) {
                      if (b.latitude && b.longitude) {
                        const R = 6371;
                        const dLat = ((b.latitude - userLocation.lat) * Math.PI) / 180;
                        const dLon = ((b.longitude - userLocation.lng) * Math.PI) / 180;
                        const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos((userLocation.lat*Math.PI)/180)*Math.cos((b.latitude*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
                        const d = Math.round(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*R);
                        if (d < minDist) minDist = d;
                      }
                    }
                    if (minDist < Infinity) distText = minDist > 50 ? '>50 km' : `${minDist} km`;
                  }
                  const locationParts = [shop.area, shop.state].filter(Boolean);
                  const locationText = locationParts.slice(0, 2).join(', ');
                  const serviceType = shop.category?.description || shop.businessType || null;
                  // Gallery cover image — prefer galleryImage (primary), fallback to logo
                  const coverImg = shop.galleryImage || shop.image?.url || shop.image || null;
                  // Logo for circular avatar fallback when no cover
                  const logoImg = shop.image?.url || shop.image || null;

                  return (
                    <div
                      key={`prof-home-${shop._id}`}
                      onClick={() => handleShopClick(shop)}
                      className="flex items-center gap-4 p-3 bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-white/5 rounded-2xl cursor-pointer active:scale-[0.98] transition-all overflow-hidden"
                    >
                      {/* Gallery cover image — rectangular rounded */}
                      <div className="w-[90px] h-[80px] rounded-xl overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                        {coverImg ? (
                          <img
                            src={coverImg}
                            alt={shop.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/10">
                            <Store size={26} className="text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight truncate">
                          {shop.name}
                        </h3>
                        {(distText || locationText) && (
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {[distText, locationText].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {serviceType && (
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                            {serviceType}
                          </p>
                        )}
                        {(shop.rating || 0) > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[14px]">⭐</span>
                            <span className="text-[13px] font-bold text-gray-900 dark:text-white">
                              {Number(shop.rating).toFixed(1)}
                            </span>
                            {(shop.reviewsCount || 0) > 0 && (
                              <span className="text-[12px] text-gray-400 dark:text-gray-500">
                                {shop.reviewsCount} review{shop.reviewsCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}
          </>
        )}

        {/* Mobile Bottom Navigation Component - Simplified version for global page */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#121824] border-t border-gray-100 dark:border-white/5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex justify-around items-center h-14 px-2">
                <div className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-black dark:text-white">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
                    <span className="text-[10px] font-semibold transition-colors duration-200">Home</span>
                </div>
                <div onClick={() => {
                  navigate("/user/search");
                }} className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500 cursor-pointer">
                    <Search size={22} strokeWidth={1.8} />
                    <span className="text-[10px] font-medium transition-colors duration-200">Search</span>
                </div>
                <Link to={user ? "/user/bookings" : "/login"} className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500">
                    <Calendar size={22} strokeWidth={1.8} />
                    <span className="text-[10px] font-medium transition-colors duration-200">Bookings</span>
                </Link>
                <Link to={user ? "/user/profile" : "/login"} className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500">
                    <User size={22} strokeWidth={1.8} />
                    <span className="text-[10px] font-medium transition-colors duration-200">Profile</span>
                </Link>
            </div>
        </div>
      </div>
      
      <div className="desktop-home-container">
      {/* Main Continuous Wrapper */}
      <div className="relative overflow-hidden w-full flex flex-col bg-white dark:bg-[#0b0f19]">
        {/* Animated gradient background — lavender/violet/pink moving around screen */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-5%] left-[10%] w-[900px] h-[900px] rounded-full opacity-55 blur-[90px] animate-blob-1" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.8) 0%, rgba(232,170,210,0.5) 40%, transparent 65%)' }} />
          <div className="absolute top-[10%] right-[-10%] w-[800px] h-[800px] rounded-full opacity-55 blur-[90px] animate-blob-2" style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.8) 0%, rgba(167,139,250,0.5) 40%, transparent 65%)' }} />
          <div className="absolute bottom-[-5%] left-[25%] w-[700px] h-[700px] rounded-full opacity-45 blur-[80px] animate-blob-3" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.7) 0%, rgba(249,168,212,0.4) 40%, transparent 65%)' }} />
        </div>

        {/* Hero Area */}
        <div className="relative w-full mx-auto text-center px-4 pt-36 pb-8 sm:pt-44 sm:pb-10" style={{ zIndex: 20 }}>
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-black dark:text-white leading-[1.08] font-poppins">
            Book local services and products
          </h1>
          <p className="text-[17px] text-gray-600 dark:text-gray-300 max-w-[900px] mx-auto mt-4 leading-relaxed font-normal">
            Discover top-rated salons, stores and service providers trusted by thousands — book appointments and shop instantly
          </p>

          {/* Search Pill Bar with gradient border */}
          <form 
            onSubmit={handleSearchSubmit}
            className="relative md:rounded-full max-w-[900px] mx-auto mt-10 h-auto md:h-[64px]"
            style={{ zIndex: 999 }}
          >
            {/* Gradient border using outline-style approach */}
            <div className="flex flex-col md:flex-row bg-white dark:bg-[#131926] md:rounded-full items-center h-auto md:h-[58px] rounded-[28px] border-[4px] border-transparent animate-border-glow" style={{ borderRadius: '9999px', background: 'linear-gradient(white, white) padding-box, linear-gradient(var(--border-angle), rgba(167,139,250,0.5), rgba(244,114,182,0.5), rgba(139,92,246,0.5), rgba(249,168,212,0.5), rgba(167,139,250,0.5)) border-box' }}>
              {/* Input 1: Search shops */}
              <div className="flex items-center gap-3 px-6 py-3 md:py-0 w-full md:flex-1 md:border-r md:border-gray-200 dark:border-dark-border dark:md:border-white/10 h-full hover:bg-gray-50 dark:bg-dark-card/50 transition-colors md:rounded-l-full">
                <Search className="w-[18px] h-[18px] text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search shops"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-[15px] outline-none placeholder:text-gray-500 text-gray-900 dark:text-white font-poppins font-medium"
                />
              </div>

              {/* Input 2: Location */}
              <div className="flex items-center gap-3 px-6 py-3 md:py-0 w-full md:flex-1 h-full hover:bg-gray-50 dark:bg-dark-card/50 transition-colors">
                <MapPin className="w-[18px] h-[18px] text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder={userLocationText || "Current location"}
                  value={locationQuery}
                  onChange={(e) => handleHomeLocationChange(e.target.value)}
                  onFocus={() => { if (homeSuggestions.length > 0) setShowHomeSuggestions(true); }}
                  className="w-full bg-transparent border-none text-[15px] outline-none placeholder:text-gray-900 dark:placeholder:text-gray-300 text-gray-900 dark:text-white font-poppins font-medium"
                />
                {locationQuery && (
                  <button type="button" onClick={() => { setLocationQuery(""); setHomeSuggestions([]); setShowHomeSuggestions(false); }} className="shrink-0 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer border-none">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
                
              {/* Search button */}
              <button 
                type="button"
                onClick={() => navigate("/user/search")}
                className="bg-black dark:bg-[#c5a059] text-white hover:bg-gray-900 dark:hover:bg-[#d6b46e] px-8 py-3 rounded-full font-semibold text-[15px] transition-all shrink-0 select-none cursor-pointer mr-[4px]"
              >
                Search
              </button>
            </div>

            {/* Location suggestions dropdown */}
            {showHomeSuggestions && homeSuggestions.length > 0 && (
              <>
                <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowHomeSuggestions(false)} />
                <div className="absolute left-1/2 -translate-x-1/2 w-[380px] bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden py-2" style={{ zIndex: 99999, top: 'calc(100% + 8px)', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                  {homeSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectHomeSuggestion(s)}
                      className="flex items-center gap-4 w-full px-5 py-3.5 text-left hover:bg-gray-50 dark:bg-dark-card transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-black truncate">{s.name}</p>
                        {s.region && <p className="text-[12px] text-gray-500 truncate">{s.region}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </form>
          {/* Booked stats */}
          <div className="pt-12 space-y-5">
            <p className="text-[16px] text-gray-700 dark:text-gray-200">
              <strong className="text-black dark:text-white font-bold">{(525325 + (filteredRealShops.length * 10)).toLocaleString()}</strong> appointments booked today
            </p>
            
            <button
              onClick={() => {
                if (downloadSectionRef.current) {
                  downloadSectionRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-2.5 border border-gray-300 dark:border-white/10 px-7 py-3 rounded-full bg-white dark:bg-white/5 font-medium text-[15px] text-black dark:text-white hover:border-gray-400 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <span>Get the app</span>
              <svg className="w-4 h-4 fill-current text-black dark:text-gray-300" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-6-2h2v2h-2v-2zm2 0h2v2h-2v-2zm4 0h2v2h-2v-2zM10 5h2v2h-2V5zm0 8h2v2h-2v-2zm2-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-4h2v2H8v-2zm4-4h2v2h-2V9zm-2-2h2v2h-2V7zm-4 4h2v2H4v-2zm2-2h2v2H6V9z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content Layout · Fresha-style sections */}
        <main className="w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 xl:px-24 pb-16 relative z-[5] flex-grow pt-8">

          {/* Desktop Shimmer — shown while bookings load */}
          {user && bookingsLoading && (
            <section className="mb-12">
              <div className="h-6 w-[120px] bg-gray-100 dark:bg-dark-card rounded-lg animate-pulse mb-5" />
              <div className="flex gap-6 overflow-hidden">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f0f0' }}>
                    <div className="h-[150px] bg-gray-100 dark:bg-dark-card relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" style={{ animation: 'shimmer 1.5s infinite' }} />
                    </div>
                    <div className="p-3.5 space-y-2">
                      <div className="h-4 w-[60%] bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                      <div className="h-3 w-[80%] bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Upcoming Bookings (shown when logged in) */}
          {user && !bookingsLoading && upcomingBookings.length > 0 && (
            <section className="mb-12 scroll-mt-24">
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
                Upcoming
              </h2>
              <ScrollContainer>
                {upcomingBookings.slice(0, 5).map((booking) => {
                  const displayDate = booking._bookingMoment.format("ddd, D MMM, YYYY");
                  const displayTime = booking._bookingMoment.format("h:mm a");
                  const shopImage = booking.shopImage || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80";

                  return (
                    <div
                      key={booking._id}
                      className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] rounded-2xl overflow-hidden cursor-pointer bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-white/5 snap-start hover:shadow-md dark:shadow-none transition-shadow"
                      onClick={() => {
                        // Open Google Maps with shop location
                        const branch = booking.branchId && typeof booking.branchId === 'object' ? booking.branchId : null;
                        const shop = booking.shopId && typeof booking.shopId === 'object' ? booking.shopId : null;
                        const lat = branch?.latitude || shop?.latitude;
                        const lng = branch?.longitude || shop?.longitude;
                        if (lat && lng) {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener,noreferrer");
                        } else {
                          const address = branch?.mapAddress || branch?.address || shop?.mapAddress || shop?.address || booking.shopName;
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <div className="relative h-[150px] w-full">
                        <img src={shopImage} alt={booking.shopName} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="w-10 h-10 rounded-full bg-[#4a3aad] flex items-center justify-center shadow-lg">
                            <Navigation size={16} fill="white" color="white" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3.5">
                        <h3 className="text-[15px] font-bold text-black dark:text-white truncate mb-1.5">{booking.shopName}</h3>
                        <div className="flex items-center gap-3 text-[12px] text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar size={13} className="text-gray-400 dark:text-gray-500" />
                            <span>{displayDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-gray-400 dark:text-gray-500" />
                            <span>{displayTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ScrollContainer>
            </section>
          )}

          {/* Section: Book Again (shown when logged in with past bookings) */}
          {user && !bookingsLoading && recentBookings.length > 0 && (
            <section className="mb-12 scroll-mt-24">
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
                Book again
              </h2>
              <ScrollContainer>
                {recentBookings.map((item, idx) => (
                  <div
                    key={`desktop-book-again-${item._id}-${idx}`}
                    className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] bg-white dark:bg-[#1a2235] rounded-2xl overflow-hidden cursor-pointer snap-start border border-gray-200 dark:border-white/5 hover:shadow-md dark:shadow-none transition-shadow"
                    onClick={() => navigate("/user/bookings", { state: { selectedBookingId: item.bookingId } })}
                  >
                    <div className="h-[150px] w-full bg-gray-100 dark:bg-dark-card overflow-hidden">
                      <img
                        src={item.shopImage || item.serviceImage || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"}
                        alt={item.shopName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-3.5 pt-3 pb-2">
                      <h3 className="text-[15px] font-bold text-black dark:text-white truncate">{item.shopName}</h3>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{item.currencySymbol}{item.price} · {item.serviceName}</p>
                    </div>
                    <div className="px-3.5 pb-3.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.shopSlug) {
                            dispatch(clearBookingFlow());
                            dispatch(setShopContext({ shopSlug: item.shopSlug, shopName: item.shopName, shopImage: item.shopImage }));
                            dispatch(addSelectedService({ _id: item._id, name: item.serviceName, price: item.price, duration: item.duration || 0 }));
                            navigate(`/${item.shopSlug}/user/select-services`);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f5f5f5] rounded-full text-[13px] font-semibold text-black hover:bg-gray-200 transition-colors border-none cursor-pointer"
                      >
                        <RefreshCw size={14} />
                        Rebook
                      </button>
                    </div>
                  </div>
                ))}
              </ScrollContainer>
            </section>
          )}

          {/* Section: Favourites (shown when logged in with favorites) */}
          {user && favorites.length > 0 && shops.filter(s => favorites.includes((s._id || s.slug || "").toString())).length > 0 && (
            <section className="mb-12 scroll-mt-24">
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
                Favorites
              </h2>
              <ScrollContainer>
                {shops.filter(s => favorites.includes((s._id || s.slug || "").toString())).map((shop) => (
                  <div
                    key={`desktop-fav-${shop._id}`}
                    onClick={() => handleShopClick(shop)}
                    className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] cursor-pointer snap-start flex flex-col select-none group"
                  >
                    <div className="relative aspect-[3/2] w-full rounded-[14px] overflow-hidden bg-gray-100 dark:bg-dark-card">
                      <img
                        src={shop.galleryImage || shop.image?.url || shop.image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"}
                        alt={shop.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => toggleFavorite(shop._id, e)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white dark:bg-dark-surface/90 flex items-center justify-center hover:bg-white dark:bg-dark-surface transition-all active:scale-90 shadow-sm"
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-[15px] text-black tracking-tight line-clamp-1">{shop.name}</h3>
                        {(shop.rating || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[14px] font-bold text-black shrink-0">
                            <span className="text-[16px]">⭐</span>
                            {shop.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-1">{getShopLocationText(shop)}</p>
                      <p className="text-[13px] text-gray-500 mt-0.5">{shop.category?.name || 'Salon'} · {shop.reviewsCount || 0} reviews</p>
                    </div>
                  </div>
                ))}
              </ScrollContainer>
            </section>
          )}

          {/* Section: Nearby (shown when user has location) */}
          {userLocation && recommendedShops.length > 0 && (
            <section className="mb-12 scroll-mt-24">
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
                Nearby
              </h2>
              <ScrollContainer>
                {recommendedShops.slice(0, 10).map((shop) => (
                  <div
                    key={`nearby-${shop._id}`}
                    onClick={() => handleShopClick(shop)}
                    className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] cursor-pointer snap-start flex flex-col select-none group"
                  >
                    <div className="relative aspect-[3/2] w-full rounded-[14px] overflow-hidden bg-gray-100 dark:bg-white/5">
                      <img
                        src={shop.galleryImage || shop.image?.url || shop.image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"}
                        alt={shop.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => toggleFavorite(shop._id, e)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-black/40 flex items-center justify-center hover:bg-white transition-all active:scale-90 shadow-sm"
                      >
                        <Heart className={`w-4 h-4 transition-colors ${favorites.includes(shop._id) ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-white"}`} />
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-[15px] text-black dark:text-white tracking-tight line-clamp-1 font-poppins">{shop.name}</h3>
                        {(shop.rating || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[14px] font-bold text-black dark:text-white shrink-0">
                            <span className="text-[16px]">⭐</span>
                            {shop.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{getShopLocationText(shop)}</p>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{shop.category?.name || shop.category || 'Salon'} · {shop.reviewsCount || 0} reviews</p>
                    </div>
                  </div>
                ))}
              </ScrollContainer>
            </section>
          )}

          <BannersSection banners={activeBanners} />

          {/* Section: Recently Viewed (shown when logged in) */}
          {user && recentlyViewedShops.length > 0 && (
            <section className="mb-12 scroll-mt-24">
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
                Recently viewed
              </h2>

              <ScrollContainer>
                {recentlyViewedShops.map((shop) => (
                  <div 
                    key={`viewed-desktop-${shop._id}`}
                    onClick={() => handleShopClick(shop)}
                    className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] cursor-pointer snap-start flex flex-col select-none group"
                  >
                    <div className="relative aspect-[3/2] w-full rounded-[14px] overflow-hidden bg-gray-100 dark:bg-white/5">
                      <img 
                        src={shop.galleryImage || shop.image?.url || shop.image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"} 
                        alt={shop.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <button 
                        onClick={(e) => toggleFavorite(shop._id, e)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-black/40 flex items-center justify-center hover:bg-white transition-all active:scale-90 shadow-sm"
                      >
                        <Heart className={`w-4 h-4 transition-colors ${favorites.includes(shop._id) ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-white"}`} />
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-[15px] text-black dark:text-white tracking-tight line-clamp-1 font-poppins">{shop.name}</h3>
                        {(shop.rating || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[14px] font-bold text-black dark:text-white shrink-0">
                            <span className="text-[16px]">⭐</span>
                            {shop.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{getShopLocationText(shop)}</p>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{shop.category?.name || shop.category || 'Salon'} · {shop.reviewsCount || 0} reviews</p>
                    </div>
                  </div>
                ))}
              </ScrollContainer>
            </section>
          )}

          {/* Section: Recommended */}
          <section ref={recommendedSectionRef} className="mb-12 scroll-mt-24">
            <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
              Recommended
            </h2>

            {loading ? (
              <div className="flex gap-6 overflow-hidden">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px]">
                    <div className="w-full aspect-[3/2] rounded-[14px] bg-gray-100 dark:bg-dark-card animate-pulse relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animation: 'shimmer 1.5s infinite', transform: 'translateX(-100%)' }} />
                    </div>
                    <div className="mt-3 flex justify-between">
                      <div className="h-4 w-[60%] bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                      <div className="h-4 w-[30px] bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                    </div>
                    <div className="mt-2 h-3 w-[80%] bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                    <div className="mt-1.5 h-3 w-[50%] bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center bg-red-50 dark:bg-red-950/20 rounded-2xl max-w-md mx-auto border border-red-100 dark:border-red-900/10">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              </div>
            ) : recommendedShops.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-gray-250/20 dark:border-white/10 rounded-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-450 dark:text-gray-400">No active salons found</p>
              </div>
            ) : (
              <ScrollContainer>
                {recommendedShops.map((shop) => (
                  <div 
                    key={shop._id}
                    onClick={() => handleShopClick(shop)}
                    className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] cursor-pointer snap-start flex flex-col select-none group"
                  >
                    {/* Card Image · Fresha style */}
                    <div className="relative aspect-[3/2] w-full rounded-[14px] overflow-hidden bg-gray-100 dark:bg-white/5">
                      <img 
                        src={shop.galleryImage || shop.image?.url || shop.image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"} 
                        alt={shop.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Featured Badge · Fresha black */}
                      

                      {/* Heart button · Fresha style white circle */}
                      <button 
                        onClick={(e) => toggleFavorite(shop._id, e)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-black/40 flex items-center justify-center hover:bg-white transition-all active:scale-90 shadow-sm"
                      >
                        <Heart 
                          className={`w-4 h-4 transition-colors ${
                            favorites.includes(shop._id) 
                              ? "fill-red-500 text-red-500" 
                              : "text-gray-600 dark:text-white"
                          }`} 
                        />
                      </button>
                    </div>

                    {/* Card Details · Fresha style */}
                    <div className="mt-2.5 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-[15px] text-black dark:text-white tracking-tight line-clamp-1 font-poppins">
                          {shop.name}
                        </h3>
                        {(shop.rating || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[14px] font-bold text-black dark:text-white shrink-0">
                            <span className="text-[16px]">⭐</span>
                            {shop.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {getShopLocationText(shop)}
                      </p>

                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {shop.category?.name || shop.category || 'Salon'} · {shop.reviewsCount || 0} reviews
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollContainer>
            )}
          </section>

          {/* Section 2: New to Vijayajalakam */}
          {newShops.length > 0 && (
            <section className="mb-12">
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
                New to Vijayajalakam
              </h2>

              <ScrollContainer>
                {newShops.map((shop) => (
                  <div 
                    key={`new-${shop._id}`}
                    onClick={() => handleShopClick(shop)}
                    className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] cursor-pointer snap-start flex flex-col select-none group"
                  >
                    <div className="relative aspect-[3/2] w-full rounded-[14px] overflow-hidden bg-gray-100 dark:bg-white/5">
                      <img 
                        src={shop.galleryImage || shop.image?.url || shop.image || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"} 
                        alt={shop.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      <button 
                        onClick={(e) => toggleFavorite(shop._id, e)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-black/40 flex items-center justify-center hover:bg-white transition-all active:scale-90 shadow-sm"
                      >
                        <Heart 
                          className={`w-4 h-4 transition-colors ${
                            favorites.includes(shop._id) 
                              ? "fill-red-500 text-red-500" 
                              : "text-gray-600 dark:text-white"
                          }`} 
                        />
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-[15px] text-black dark:text-white tracking-tight line-clamp-1 font-poppins">
                          {shop.name}
                        </h3>
                        {(shop.rating || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[14px] font-bold text-black dark:text-white shrink-0">
                            <span className="text-[16px]">⭐</span>
                            {shop.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {getShopLocationText(shop)}
                      </p>

                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {shop.category?.name || shop.category || 'Salon'} · {shop.reviewsCount || 0} reviews
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollContainer>
            </section>
          )}

          {/* Section 3: Trending */}
          {trendingShops.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins mb-5">
                Trending
              </h2>

              <ScrollContainer>
                {trendingShops.map((shop) => (
                  <div 
                    key={`trending-${shop._id}`}
                    onClick={() => handleShopClick(shop)}
                    className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] cursor-pointer snap-start flex flex-col select-none group"
                  >
                    <div className="relative aspect-[3/2] w-full rounded-[14px] overflow-hidden bg-gray-100 dark:bg-white/5">
                      <img 
                        src={shop.galleryImage || shop.image?.url || shop.image || "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=80"} 
                        alt={shop.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      <button 
                        onClick={(e) => toggleFavorite(shop._id, e)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-black/40 flex items-center justify-center hover:bg-white transition-all active:scale-90 shadow-sm"
                      >
                        <Heart 
                          className={`w-4 h-4 transition-colors ${
                            favorites.includes(shop._id) 
                              ? "fill-red-500 text-red-500" 
                              : "text-gray-600 dark:text-white"
                          }`} 
                        />
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-[15px] text-black dark:text-white tracking-tight line-clamp-1 font-poppins">
                          {shop.name}
                        </h3>
                        {(shop.rating || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[14px] font-bold text-black dark:text-white shrink-0">
                            <span className="text-[16px]">⭐</span>
                            {shop.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {getShopLocationText(shop)}
                      </p>

                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {shop.category?.name || shop.category || 'Salon'} · {shop.reviewsCount || 0} reviews
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollContainer>
            </section>
          )}

          {/* Section: Nearby Professionals - Desktop */}
          {(() => {
            const professionalShops = shops.filter(s =>
              (s.category?.name || s.category || '').toString().toUpperCase() === 'PROFESSIONALS'
            ).slice(0, 2);
            if (professionalShops.length === 0) return null;
            return (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight font-poppins">
                    Nearby professionals
                  </h2>
                  <button
                    onClick={() => navigate('/user/search?category=PROFESSIONALS')}
                    className="text-[14px] font-semibold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    See all
                  </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {professionalShops.map((shop) => {
                    const imgSrc = shop.image?.url || shop.image || shop.galleryImage || null;
                    let distText = null;
                    if (userLocation) {
                      const brs = shop.branchAddresses || shop.branches || [];
                      let minDist = Infinity;
                      for (const b of brs) {
                        if (b.latitude && b.longitude) {
                          const R = 6371;
                          const dLat = ((b.latitude - userLocation.lat) * Math.PI) / 180;
                          const dLon = ((b.longitude - userLocation.lng) * Math.PI) / 180;
                          const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos((userLocation.lat*Math.PI)/180)*Math.cos((b.latitude*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
                          const d = Math.round(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*R);
                          if (d < minDist) minDist = d;
                        }
                      }
                      if (minDist < Infinity) distText = minDist > 50 ? '>50 km' : `${minDist} km`;
                    }
                    const locationParts = [shop.area, shop.state].filter(Boolean);
                    const locationText = locationParts.slice(0, 2).join(', ');
                    const serviceType = shop.category?.description || shop.businessType || null;
                    const coverImg = shop.galleryImage || shop.image?.url || shop.image || null;

                    return (
                      <div
                        key={`desk-prof-home-${shop._id}`}
                        onClick={() => handleShopClick(shop)}
                        className="inline-flex items-center gap-4 px-5 py-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl cursor-pointer hover:border-gray-300 dark:hover:border-white/10 transition-colors"
                        style={{ width: 'fit-content', minWidth: '260px', maxWidth: '360px' }}
                      >
                        {/* Gallery cover image — rectangular rounded */}
                        <div className="w-[72px] h-[64px] rounded-xl overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                          {coverImg ? (
                            <img
                              src={coverImg}
                              alt={shop.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/10">
                              <Store size={24} className="text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-bold text-black dark:text-white leading-tight whitespace-nowrap">
                            {shop.name}
                          </h3>
                          {(distText || locationText) && (
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                              {[distText, locationText].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {serviceType && (
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {serviceType}
                            </p>
                          )}
                          {(shop.rating || 0) > 0 && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[14px]">⭐</span>
                              <span className="text-[13px] font-bold text-black dark:text-white">
                                {Number(shop.rating).toFixed(1)}
                              </span>
                              {(shop.reviewsCount || 0) > 0 && (
                                <span className="text-[12px] text-gray-400 dark:text-gray-500">
                                  {shop.reviewsCount} review{shop.reviewsCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

        </main>
      </div>

      </div>

      <div className="hidden md:block">
      {/* Download the Vijayajalakam App Section */}
      <section 
        ref={downloadSectionRef} 
        className="w-full bg-white dark:bg-[#111622] py-20 px-6 sm:px-12 overflow-hidden"
      >
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Text details */}
          <div className="space-y-8 max-w-xl">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-[0.25em]">Available on Google</span>
              <h2 className="text-4xl sm:text-[46px] font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight font-poppins">
                Download the Vijayajalakam app
              </h2>
            </div>
            
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-light leading-relaxed">
              Book unforgettable beauty and wellness experiences with the Vijayajalakam mobile app. Manage bookings, discover new styles, and checkout in a single tap.
            </p>

            {/* App Badges + QR code representation */}
            <div className="flex flex-wrap items-center gap-6 pt-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Google Play Badge */}
                <a href="https://play.google.com/store/apps/details?id=com.vijayajalakam.app&hl=en_IN" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl hover:bg-black/90 transition-all select-none border border-white/5 active:scale-95">
                  <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M3 5.27V18.73c0 .89 1.01 1.4 1.72.88l10.33-7.61c.53-.39.53-1.19 0-1.58L4.72 4.39C4.01 3.87 3 4.38 3 5.27z M17.06 10.96l2.84-1.63c.75-.43.75-1.51 0-1.94L3.89 3.04l11.45 8.44c.54-.4 1.17-.4 1.72-.52z" />
                  </svg>
                  <div className="text-left leading-none">
                    <span className="text-[8px] font-medium text-gray-300 block uppercase">GET IT ON</span>
                    <span className="text-xs font-bold block mt-0.5">Google Play</span>
                  </div>
                </a>
              </div>

              {/* QR Code box */}
              <div className="hidden sm:flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center p-1.5 border border-black/5 dark:border-white/5 shrink-0">
                  {/* SVG structured QR code */}
                  <svg className="w-full h-full text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm14-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm12 0h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-6-2h2v2h-2v-2zm2 0h2v2h-2v-2zm4 0h2v2h-2v-2zM10 5h2v2h-2V5zm0 8h2v2h-2v-2zm2-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-4h2v2H8v-2zm4-4h2v2h-2V9zm-2-2h2v2h-2V7zm-4 4h2v2H4v-2zm2-2h2v2H6V9z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">Scan to download</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Android compatible</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Mobile App Mockups (Double Phone HTML Representation) */}
          <div className="relative flex justify-center items-center h-[520px] w-full select-none">
            {/* Phone 1 (Detail Screen) - Left/Front */}
            <div className="absolute left-[5%] sm:left-[15%] lg:left-[5%] z-20 border-[8px] border-slate-900 dark:border-slate-800 rounded-[38px] w-[240px] h-[480px] bg-white dark:bg-[#121824] overflow-hidden shadow-xl flex flex-col">
              {/* Speaker & punch-hole */}
              <div className="h-6 w-full bg-slate-900 dark:bg-slate-800 relative flex items-center justify-center shrink-0">
                <div className="w-12 h-1 bg-white dark:bg-dark-surface/20 rounded-full" />
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white dark:bg-dark-surface/20" />
              </div>
              
              {/* Internal Screen Content */}
              <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide text-left">
                {/* Salon Image */}
                <div className="relative h-32 w-full shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=300&q=80" 
                    className="w-full h-full object-cover" 
                    alt="Phone view 1"
                  />
                  <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-center text-white bg-gradient-to-b from-black/50 to-transparent">
                    <span className="text-xs font-bold">←</span>
                    <div className="flex gap-2">
                      <span className="text-[10px]">♡</span>
                      <span className="text-[10px]">⏍</span>
                    </div>
                  </div>
                </div>

                {/* Salon Specs */}
                <div className="p-3.5 space-y-2 flex-grow">
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight font-poppins">Trendy Studio</div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="text-[#c5a059]">★★★★★</span>
                      <span className="font-bold text-gray-900 dark:text-white">5.0</span>
                      <span>(1,743 reviews)</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 leading-tight">
                    2.0km · Notting Hill, London
                  </p>

                  <div className="flex items-center gap-1.5 text-[9px] text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded-md w-max">
                    <span className="w-1 h-1 rounded-full bg-green-600" />
                    Open now 10am - 6pm
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-white/5 my-2" />

                  {/* Badges list */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-300">
                      <span className="text-xs">⚡</span> Instant booking
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-300">
                      <span className="text-xs">💳</span> Pay by app
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-300">
                      <span className="text-xs">♿</span> Wheelchair accessible
                    </div>
                  </div>

                  {/* Tabs bar */}
                  <div className="flex border-b border-gray-100 dark:border-white/5 gap-3.5 pt-3 overflow-x-auto scrollbar-hide shrink-0 text-[10px] font-bold text-gray-400">
                    <span className="text-black dark:text-white border-b-2 border-black dark:border-[#c5a059] pb-1.5 shrink-0">Services</span>
                    <span className="pb-1.5 shrink-0">Team</span>
                    <span className="pb-1.5 shrink-0">Reviews</span>
                  </div>

                  <div className="pt-2 text-[10px] font-bold text-gray-400">Services available</div>
                </div>

                {/* Sticky Book Now Button */}
                <div className="p-3 bg-white dark:bg-[#121824] border-t border-gray-100 dark:border-white/5 sticky bottom-0 flex justify-between items-center shrink-0">
                  <div className="text-[10px] leading-tight">
                    <span className="text-gray-400 block">From</span>
                    <span className="font-extrabold text-sm text-gray-900 dark:text-white">£25.00</span>
                  </div>
                  <button className="bg-black dark:bg-[#c5a059] text-white px-5 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-wider">
                    Book now
                  </button>
                </div>

              </div>
            </div>

            {/* Phone 2 (Map Search list view) - Right/Behind */}
            <div className="absolute right-[5%] sm:right-[15%] lg:right-[5%] z-10 border-[8px] border-slate-900 dark:border-slate-800 rounded-[38px] w-[240px] h-[480px] bg-gray-50 dark:bg-[#192233] overflow-hidden shadow-lg flex flex-col scale-95 translate-x-2">
              <div className="h-6 w-full bg-slate-900 dark:bg-slate-800 relative flex items-center justify-center shrink-0">
                <div className="w-12 h-1 bg-white dark:bg-dark-surface/20 rounded-full" />
              </div>

              {/* Map View Search mockup */}
              <div className="flex-1 flex flex-col relative overflow-hidden text-left">
                {/* Search Header inside phone */}
                <div className="p-3 bg-white dark:bg-[#121824] border-b border-gray-100 dark:border-white/5 space-y-2 shrink-0">
                  <div className="bg-gray-100 dark:bg-white/5 p-2 rounded-lg flex items-center gap-2 text-[10px]">
                    <Search className="w-3 h-3 text-gray-400" />
                    <span className="font-bold text-gray-900 dark:text-white font-poppins">Hair</span>
                    <span className="text-gray-300 dark:text-white/20">|</span>
                    <span className="text-gray-400">Current location</span>
                  </div>
                </div>

                {/* Mock Map graphics (represented as street lines) */}
                <div className="relative flex-grow bg-slate-100 dark:bg-[#1a2336] p-4 flex items-center justify-center overflow-hidden">
                  {/* Grid lines simulating a map */}
                  <div className="absolute inset-0 grid grid-cols-4 grid-rows-6 gap-0 opacity-10">
                    <div className="border border-black dark:border-white" />
                    <div className="border border-black dark:border-white" />
                    <div className="border border-black dark:border-white" />
                    <div className="border border-black dark:border-white" />
                  </div>
                  
                  {/* Pin mark */}
                  <div className="w-4 h-4 rounded-full bg-black dark:bg-[#c5a059] border-2 border-white flex items-center justify-center shadow-md animate-bounce relative z-10">
                    <span className="w-1 h-1 rounded-full bg-white dark:bg-dark-surface" />
                  </div>

                  <span className="absolute bottom-2 left-2 bg-white/80 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[8px] font-bold text-gray-600 dark:text-gray-300">
                    Map data
                  </span>
                </div>

                {/* In-Map Listing Card floating at bottom */}
                <div className="absolute bottom-12 inset-x-3 bg-white dark:bg-[#121824] rounded-2xl border border-black/5 p-3 shadow-md">
                  <div className="flex gap-2">
                    <img 
                      src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=150&h=150&q=80" 
                      className="w-12 h-12 rounded-lg object-cover" 
                      alt="Mini salon preview"
                    />
                    <div className="leading-tight space-y-0.5">
                      <div className="text-xs font-bold text-gray-900 dark:text-white font-poppins">The Salon</div>
                      <div className="text-[8px] text-[#c5a059]">★★★★★ 4.8 (734)</div>
                      <div className="text-[8px] text-gray-400">2km away · London</div>
                    </div>
                  </div>
                  
                  <div className="h-px bg-gray-100 dark:bg-white/5 my-2" />

                  <div className="space-y-1 text-[9px] text-gray-700 dark:text-gray-300 font-medium">
                    <div className="flex justify-between">
                      <span>Haircut</span>
                      <span className="font-bold">£50</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Short Haircut</span>
                      <span className="font-bold">£60</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Tab Icons */}
                <div className="h-10 bg-white dark:bg-[#121824] border-t border-gray-100 dark:border-white/5 flex items-center justify-around text-gray-400 shrink-0 text-[10px]">
                  <span>⌂</span>
                  <span className="text-black dark:text-[#c5a059] font-bold">🔍</span>
                  <span>📅</span>
                  <span>👤</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 px-6 sm:px-12 max-w-[1280px] mx-auto overflow-hidden">
        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-8 font-poppins">
          Reviews
        </h2>

        <ScrollContainer>
          {MOCK_REVIEWS.map((review) => (
            <div 
              key={review.id}
              className="flex-shrink-0 w-[calc(25%-15px)] min-w-[220px] sm:w-[310px] bg-gray-50 dark:bg-white/5 rounded-[24px] p-6 snap-start flex flex-col justify-between border border-transparent dark:border-white/5 select-none"
            >
              <div className="space-y-3">
                {/* 5 Stars */}
                <div className="flex text-[#c5a059] text-sm">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                
                {/* Title */}
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight font-poppins">
                  {review.title}
                </h3>
                
                {/* Text */}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-light line-clamp-4">
                  "{review.text}"
                </p>
              </div>

              {/* Reviewer Details */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-black/[0.03] dark:border-white/5">
                <img 
                  src={review.avatar} 
                  alt={review.name} 
                  className="w-9 h-9 rounded-full object-cover border border-black/5"
                  loading="lazy"
                />
                <div className="leading-tight">
                  <div className="text-xs font-bold text-gray-900 dark:text-white font-poppins">{review.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{review.location}</div>
                </div>
              </div>
            </div>
          ))}
        </ScrollContainer>
      </section>

      {/* Brand Statement Section */}
      <section className="py-16 text-center max-w-[1280px] mx-auto px-6 space-y-4">
        <h2 className="text-3xl sm:text-[40px] font-black text-gray-900 dark:text-white leading-tight tracking-tight font-poppins">
          The top-rated destination for selfcare
        </h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
          One solution, one software. Trusted by the best in the selfcare industry.
        </p>
      </section>

      {/* Footer */}
      <DesktopFooter />
      </div>

      {/* Contact Modal */}
      <Modal isOpen={activeModal === 'contact'} onClose={() => setActiveModal(null)} title="Get in Touch">
        <form className="space-y-4" onSubmit={handleTransmit}>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} className="w-full p-3 bg-gray-50 dark:bg-[#131926] border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-[#c5a059] text-sm text-gray-900 dark:text-white" required />
            <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} className="w-full p-3 bg-gray-50 dark:bg-[#131926] border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-[#c5a059] text-sm text-gray-900 dark:text-white" />
          </div>
          <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="w-full p-3 bg-gray-50 dark:bg-[#131926] border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-[#c5a059] text-sm text-gray-900 dark:text-white" required />
          <textarea name="message" rows={4} placeholder="Your Message" value={formData.message} onChange={handleInputChange} className="w-full p-3 bg-gray-50 dark:bg-[#131926] border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-[#c5a059] text-sm text-gray-900 dark:text-white resize-none" required />
          {submitStatus && <p className={`text-xs ${submitStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{submitStatus.message}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-black dark:bg-[#c5a059] text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:opacity-90 transition-all">
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      </Modal>

      {/* Demo Modal */}
      <Modal isOpen={activeModal === 'demo'} onClose={() => setActiveModal(null)} title="Request a Demo">
        <div className="text-center space-y-6">
          <p className="text-sm font-light text-gray-500 dark:text-gray-400">Experience the full power of Vijayajalakam Ecosystem. Choose your preferred way to connect for a personalized demonstration.</p>
          <div className="grid gap-3">
            <button
              onClick={() => window.open(VIJAYAJALAKAM_CONTACT.WHATSAPP.link, "_blank")}
              className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-[#1ebd5b] transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              Connect via WhatsApp
            </button>
            <button
              onClick={() => {
                setActiveModal('contact');
                setFormData(prev => ({ ...prev, message: "I would like to request a personalized demo of the Vijayajalakam platform." }));
              }}
              className="w-full py-4 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-white dark:bg-dark-surface/5 transition-all"
            >
              <Mail className="w-5 h-5 text-[#c5a059]" />
              Inquiry Form
            </button>
          </div>
        </div>
      </Modal>

      {/* Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white dark:bg-dark-surface rounded-2xl w-full max-w-[360px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[20px] font-bold text-black mb-2">Log out</h3>
            <p className="text-[14px] text-gray-500 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                className="w-full py-3.5 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-gray-900 transition-colors cursor-pointer border-none"
              >
                Yes, log out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3.5 bg-white dark:bg-dark-surface text-black rounded-xl text-[15px] font-semibold border border-gray-200 dark:border-dark-border hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ShopSelector;
