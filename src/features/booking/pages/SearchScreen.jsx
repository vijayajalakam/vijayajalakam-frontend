import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Navigation,
  Star,
  Heart,
  MapPin,
  List,
  Home,
  Calendar,
  User,
} from "lucide-react";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import { SearchScreenSkeleton } from "../../../components/user/skeletons";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom shop marker with name badge — black pill style
const createShopIcon = (name) => {
  const displayName = name || "Shop";
  const html = `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;">
        <div style="background:#1a1a1a;color:#fff;font-size:11px;font-weight:600;padding:5px 10px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);line-height:1;max-width:120px;overflow:hidden;text-overflow:ellipsis;">
          ${displayName}
        </div>
        <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #1a1a1a;"></div>
      </div>`;

  return L.divIcon({
    html,
    className: "custom-shop-marker",
    iconSize: [120, 36],
    iconAnchor: [60, 36],
    popupAnchor: [0, -36],
  });
};

// User location marker — blue dot with pulse ring
const userLocationIcon = L.divIcon({
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
    <div style="width:18px;height:18px;background:#6366f1;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(99,102,241,0.25),0 2px 8px rgba(0,0,0,0.2);"></div>
  </div>`,
  className: "user-location-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to fly/pan map to new center
const MapController = ({ center, zoom, invalidateSize }) => {
  const map = useMap();
  const initialSet = useRef(false);

  useEffect(() => {
    if (center && center[0] && center[1]) {
      if (!initialSet.current) {
        map.setView(center, zoom || 11);
        initialSet.current = true;
      } else {
        map.flyTo(center, zoom || map.getZoom(), { duration: 1 });
      }
    }
  }, [center, zoom, map]);

  // When the container resizes (e.g. fullscreen toggle), tell Leaflet to recalculate
  useEffect(() => {
    // Small delay to let CSS transition finish before invalidating
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 350);
    return () => clearTimeout(timeout);
  }, [invalidateSize, map]);

  // Also observe the container for any resize (handles initial render + dynamic layout)
  useEffect(() => {
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
};

const SearchScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  
  // Initialize location from localStorage synchronously
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
  const [userAddress, setUserAddress] = useState(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.name) return `${loc.name}${loc.region ? `, ${loc.region.split(",")[0]}` : ""}`;
      }
    } catch {}
    return "Map area";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.lat && loc.lng) return [loc.lat, loc.lng];
      }
    } catch {}
    return [10.8505, 76.2711];
  });
  const [mapZoom, setMapZoom] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.lat && loc.lng) return isMobile ? 10 : 11;
      }
    } catch {}
    return 7;
  });
  const [sheetPosition, setSheetPosition] = useState("mid"); // "min" | "mid" | "max"
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Sheet heights for each position
  const sheetHeights = { min: 120, mid: 420, max: window.innerHeight * 0.85 };

  // Drag state
  const dragRef = useRef({ startY: 0, startHeight: 0, isDragging: false });
  const [currentSheetHeight, setCurrentSheetHeight] = useState(sheetHeights.mid);

  // Fallback to GPS if no saved location
  useEffect(() => {
    if (userLocation) return; // Already have location from localStorage

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
          setMapZoom(window.innerWidth < 768 ? 10 : 11);
          reverseGeocode(latitude, longitude);
        },
        () => {
          setUserAddress("Map area");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Keyboard detection - hide bottom nav when keyboard is visible
  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (
          !activeElement ||
          (activeElement.tagName !== 'INPUT' &&
           activeElement.tagName !== 'TEXTAREA' &&
           !activeElement.isContentEditable)
        ) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    // Visual viewport resize detection (more reliable for mobile keyboards)
    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        setIsKeyboardVisible(windowHeight - viewportHeight > 150);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Reverse geocode using Nominatim (free, no API key)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
      );
      const data = await response.json();
      if (data && data.address) {
        const { suburb, city, town, village, state_district, state } = data.address;
        const locality = suburb || town || village || city || state_district || "";
        setUserAddress(locality ? `${locality}, ${state || ""}` : "Current location");
      }
    } catch {
      setUserAddress("Current location");
    }
  };

  // Fetch shops with distance
  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      try {
        const params = {};
        if (userLocation) {
          params.lat = userLocation.lat;
          params.lng = userLocation.lng;
        }
        const [shopsRes, catsRes] = await Promise.all([
          api.get("/public/shops/nearby", { params }),
          api.get("/public/shop-categories"),
        ]);
        if (shopsRes.data.success) {
          setShops(shopsRes.data.data);
        }
        if (catsRes.data.success) {
          setCategories(catsRes.data.data || []);
        }
      } catch {
        try {
          const res = await api.get("/public/shops");
          if (res.data.success) setShops(res.data.data);
        } catch {
          setShops([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, [userLocation]);

  // Filter shops by search and category
  const filteredShops = useMemo(() => {
    let result = shops;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (shop) =>
          shop.name?.toLowerCase().includes(q) ||
          shop.category?.name?.toLowerCase().includes(q) ||
          shop.branchMapAddress?.toLowerCase().includes(q) ||
          shop.area?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter(
        (shop) => shop.category && (shop.category._id === selectedCategory || shop.category === selectedCategory)
      );
    }
    return result;
  }, [shops, searchQuery, selectedCategory]);

  // Get shops that have coordinates for map markers
  const shopsWithCoords = useMemo(() => {
    return filteredShops.filter((shop) => {
      const branches = shop.branches || shop.branchAddresses || [];
      return branches.some((b) => b.latitude && b.longitude);
    });
  }, [filteredShops]);

  // Geocode search query — move map to searched location
  const geocodeSearchRef = useRef(null);
  const handleSearchGeocode = useCallback((query) => {
    if (geocodeSearchRef.current) clearTimeout(geocodeSearchRef.current);
    if (!query || query.length < 3) return;
    
    geocodeSearchRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        const data = await res.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setMapCenter([parseFloat(lat), parseFloat(lon)]);
          setMapZoom(12);
        }
      } catch {}
    }, 800);
  }, []);

  // Trigger map navigation when search query changes
  useEffect(() => {
    // If search is empty, return to user's saved location
    if (!searchQuery || searchQuery.length === 0) {
      if (userLocation) {
        setMapCenter([userLocation.lat, userLocation.lng]);
        setMapZoom(window.innerWidth < 768 ? 10 : 11);
      }
      return;
    }
    
    if (searchQuery.length < 3) return;
    
    const q = searchQuery.toLowerCase();
    
    // Check if any shops match by name
    const matchedShop = shops.find(s => s.name?.toLowerCase().includes(q));
    
    if (matchedShop) {
      // Shop name matched — fly map to that shop's branch location
      const branches = matchedShop.branches || matchedShop.branchAddresses || [];
      const branchWithCoords = branches.find(b => b.latitude && b.longitude);
      if (branchWithCoords) {
        setMapCenter([branchWithCoords.latitude, branchWithCoords.longitude]);
        setMapZoom(14);
      }
    } else {
      // No shop match — geocode as a location
      handleSearchGeocode(searchQuery);
    }
    
    return () => { if (geocodeSearchRef.current) clearTimeout(geocodeSearchRef.current); };
  }, [searchQuery, shops, userLocation, handleSearchGeocode]);

  // Handle Enter key on search — force geocode or fly to shop
  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchQuery && searchQuery.length >= 2) {
        if (geocodeSearchRef.current) clearTimeout(geocodeSearchRef.current);
        
        // Check if a shop matches
        const q = searchQuery.toLowerCase();
        const matchedShop = shops.find(s => s.name?.toLowerCase().includes(q));
        
        if (matchedShop) {
          const branches = matchedShop.branches || matchedShop.branchAddresses || [];
          const branchWithCoords = branches.find(b => b.latitude && b.longitude);
          if (branchWithCoords) {
            setMapCenter([branchWithCoords.latitude, branchWithCoords.longitude]);
            setMapZoom(14);
            return;
          }
        }
        
        // No shop match — geocode
        (async () => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
            );
            const data = await res.json();
            if (data && data.length > 0) {
              const { lat, lon } = data[0];
              setMapCenter([parseFloat(lat), parseFloat(lon)]);
              setMapZoom(12);
            }
          } catch {}
        })();
      }
    }
  }, [searchQuery, shops]);

  const handleShopClick = (shop) => {
    if (shop && shop.slug) {
      if (user) {
        navigate(`/${shop.slug}/user/home`);
      } else {
        navigate(`/${shop.slug}/login`);
      }
    }
  };

  const handleRecenter = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(window.innerWidth < 768 ? 10 : 11);
    }
  };

  // Format distance text
  const getDistanceText = (distance) => {
    if (distance === null || distance === undefined) return "";
    if (distance < 1) return "<1km>";
    return `${distance}km>`;
  };

  // Haversine distance calculation
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Get location display for shop card — uses per-shop selected branch or nearest
  const getShopLocationDisplay = (shop) => {
    const branches = shop.branchAddresses || shop.branches || [];

    // Check if user has a selected branch for this shop
    let selectedBranch = null;
    try {
      const perShop = JSON.parse(localStorage.getItem("selectedBranches") || "{}");
      if (shop.slug && perShop[shop.slug]) {
        const sel = perShop[shop.slug];
        selectedBranch = branches.find(b => b._id === sel.id);
      }
    } catch {}

    // If selected branch found, use it
    if (selectedBranch) {
      let dist = "";
      if (userLocation && selectedBranch.latitude && selectedBranch.longitude) {
        dist = `${calcDistance(userLocation.lat, userLocation.lng, selectedBranch.latitude, selectedBranch.longitude)}km>`;
      }
      const addr = selectedBranch.mapAddress || "";
      const shortAddr = addr ? addr.split(",").slice(0, 2).map(s => s.trim()).join(", ") : "";
      if (dist && shortAddr) return `${dist} ${shortAddr}`;
      return shortAddr || dist || "";
    }

    // Fallback: find nearest branch
    if (userLocation && branches.length > 0) {
      let nearest = null;
      let minDist = Infinity;
      for (const b of branches) {
        if (b.latitude && b.longitude) {
          const d = calcDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
          if (d < minDist) { minDist = d; nearest = b; }
        }
      }
      if (nearest) {
        const addr = nearest.mapAddress || "";
        const shortAddr = addr ? addr.split(",").slice(0, 2).map(s => s.trim()).join(", ") : "";
        if (shortAddr) return `${minDist}km> ${shortAddr}`;
        return `${minDist}km>`;
      }
    }

    // Final fallback
    const distance = getDistanceText(shop.distance);
    const address = shop.branchMapAddress || shop.area || shop.address || "";
    const parts = address.split(",").map((s) => s.trim());
    const shortAddress = parts.slice(0, 2).join(", ");
    if (distance && shortAddress) return `${distance} ${shortAddress}`;
    return shortAddress || distance || "";
  };

  // Bottom sheet drag handlers (for the handle bar)
  const handleTouchStart = useCallback((e) => {
    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.startHeight = currentSheetHeight;
    dragRef.current.isDragging = true;
  }, [currentSheetHeight]);

  const handleTouchMove = useCallback((e) => {
    if (!dragRef.current.isDragging) return;
    const diff = dragRef.current.startY - e.touches[0].clientY;
    const newHeight = Math.max(80, Math.min(window.innerHeight * 0.85, dragRef.current.startHeight + diff));
    setCurrentSheetHeight(newHeight);
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragRef.current.isDragging = false;
    const h = currentSheetHeight;
    const { min, mid, max } = sheetHeights;
    const distMin = Math.abs(h - min);
    const distMid = Math.abs(h - mid);
    const distMax = Math.abs(h - max);
    const closest = Math.min(distMin, distMid, distMax);
    if (closest === distMin) {
      setSheetPosition("min");
      setCurrentSheetHeight(min);
    } else if (closest === distMax) {
      setSheetPosition("max");
      setCurrentSheetHeight(max);
    } else {
      setSheetPosition("mid");
      setCurrentSheetHeight(mid);
    }
  }, [currentSheetHeight]);

  // Shop list — expand on scroll up, minimize on scroll down at top
  const listRef = useRef(null);
  const listDragRef = useRef({ startY: 0, isAtTop: true, direction: null });

  // When user touches the shop list
  const handleListTouchStart = useCallback((e) => {
    listDragRef.current.startY = e.touches[0].clientY;
    listDragRef.current.isAtTop = listRef.current ? listRef.current.scrollTop <= 0 : true;
    listDragRef.current.direction = null;
    
    // If sheet is not at max, expand it immediately
    const maxH = window.innerHeight * 0.85;
    if (currentSheetHeight < maxH - 10 && listDragRef.current.isAtTop) {
      setSheetPosition("max");
      setCurrentSheetHeight(maxH);
    }
  }, [currentSheetHeight]);

  // Track scroll direction to minimize sheet when pulling down at top
  const handleListTouchMove = useCallback((e) => {
    if (!listRef.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - listDragRef.current.startY; // positive = pulling down
    const isAtTop = listRef.current.scrollTop <= 0;

    // If at top of list and pulling down → minimize sheet
    if (isAtTop && diff > 30 && listDragRef.current.isAtTop) {
      setSheetPosition("mid");
      setCurrentSheetHeight(sheetHeights.mid);
      listDragRef.current.direction = "down";
    }
  }, []);

  const handleListScroll = useCallback(() => {
    // Update isAtTop state for touch move detection
    if (listRef.current) {
      listDragRef.current.isAtTop = listRef.current.scrollTop <= 0;
    }
  }, []);

  // Set initial sheet height
  useEffect(() => {
    setCurrentSheetHeight(sheetHeights.mid);
  }, []);

  // Track if desktop for conditional map rendering (avoid duplicate Leaflet instances)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [desktopMapVisible, setDesktopMapVisible] = useState(true);
  const [desktopMapFullscreen, setDesktopMapFullscreen] = useState(false);
  
  // Desktop location search
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDebounceRef = useRef(null);

  const handleLocationInputChange = (val) => {
    setLocationInput(val);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (!val || val.length < 2) { setLocationSuggestions([]); setShowLocationDropdown(false); return; }
    setShowLocationDropdown(true);
    locationDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        if (data && data.length > 0) {
          setLocationSuggestions(data.map(d => ({
            name: d.display_name.split(",")[0],
            region: d.display_name.split(",").slice(1, 3).join(",").trim(),
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
            full: d.display_name,
          })));
        } else {
          setLocationSuggestions([]);
        }
      } catch { setLocationSuggestions([]); }
    }, 400);
  };

  const selectLocationSuggestion = (suggestion) => {
    setLocationInput(suggestion.name);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    setUserLocation({ lat: suggestion.lat, lng: suggestion.lng });
    setUserAddress(`${suggestion.name}${suggestion.region ? `, ${suggestion.region}` : ""}`);
    setMapCenter([suggestion.lat, suggestion.lng]);
    setMapZoom(12);
    // Save to localStorage
    const locationData = { name: suggestion.name, region: suggestion.region, lat: suggestion.lat, lng: suggestion.lng, displayName: suggestion.full, savedAt: Date.now() };
    localStorage.setItem("vijayajalakam_user_location", JSON.stringify(locationData));
    window.dispatchEvent(new Event("location-changed"));
  };
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading && isDesktop) {
    return (
      <div className="hidden md:flex flex-col h-screen bg-white dark:bg-dark-surface">
        <header className="sticky top-0 z-50 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center h-[60px] px-5">
            <a href="/" className="shrink-0 mr-8 no-underline">
              <span className="text-[22px] font-extrabold tracking-tight text-black dark:text-white lowercase">vijayajalakam</span>
            </a>
            <div className="flex-1" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-200 dark:border-dark-border border-t-black rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
    {/* ===== DESKTOP LAYOUT ===== */}
    {isDesktop && (
    <div className="hidden md:flex flex-col h-screen bg-white dark:bg-dark-surface">
      {/* Top Navbar */}
      <header className="z-50 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center h-[70px] px-6">
          <a href="/" className="shrink-0 mr-10 no-underline">
            <span className="text-[22px] font-extrabold tracking-tight text-black dark:text-white lowercase">vijayajalakam</span>
          </a>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center border border-gray-200 dark:border-dark-border rounded-full h-[48px] w-full max-w-[520px] relative">
              {/* Search shops input */}
              <div className="flex items-center gap-2.5 px-5 flex-1 border-r border-gray-200 dark:border-dark-border h-full">
                <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown}
                  placeholder="Search shops" className="w-full text-[14px] text-black dark:text-white font-medium bg-transparent border-none outline-none placeholder:text-gray-400" />
              </div>
              {/* Location input with dropdown */}
              <div className="flex items-center gap-2.5 px-5 flex-1 h-full relative">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  onFocus={() => { if (locationSuggestions.length > 0) setShowLocationDropdown(true); }}
                  placeholder={userAddress || "Current location"}
                  className="w-full text-[14px] text-black dark:text-white font-medium bg-transparent border-none outline-none placeholder:text-gray-400"
                />
                {locationInput && (
                  <button onClick={() => { setLocationInput(""); setLocationSuggestions([]); setShowLocationDropdown(false); }} className="shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-dark-border flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer border-none">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
                {/* Location suggestions dropdown */}
                {showLocationDropdown && locationSuggestions.length > 0 && (
                  <div className="absolute top-[52px] left-0 w-[320px] bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-lg z-[200] overflow-hidden">
                    {locationSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectLocationSuggestion(s)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-black dark:text-white truncate">{s.name}</p>
                          {s.region && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{s.region}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Search button */}
              <button onClick={() => { if (searchQuery) handleSearchKeyDown({ key: 'Enter', preventDefault: () => {} }); }}
                className="w-[40px] h-[40px] bg-black rounded-full flex items-center justify-center shrink-0 mr-[4px] cursor-pointer hover:bg-gray-800 transition-colors">
                <Search className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          <div className="shrink-0 ml-10">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-dark-border cursor-pointer" onClick={() => navigate(user ? "/user/profile" : "/login")}>
              {user?.profileImage ? (
                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-dark-card flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar — venue count + Filters + Hide map */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-100 dark:border-dark-border">
        <span className="text-[13px] text-gray-500 dark:text-gray-400">{filteredShops.length} venues within map area</span>
        <div className="ml-auto flex items-center gap-2">
          {categories.length > 0 && (
            <button onClick={() => setShowCategorySheet(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 dark:border-dark-border rounded-full text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></svg>
              <span>Filters</span>
            </button>
          )}
          <button
            onClick={() => setDesktopMapVisible(prev => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 dark:border-dark-border rounded-full text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            <span>{desktopMapVisible ? "Hide map" : "Show map"}</span>
          </button>
        </div>
      </div>

      {/* Main: Shop Grid + Map side by side */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left: Shop cards grid */}
        <div className={`${desktopMapFullscreen ? 'hidden' : (desktopMapVisible ? 'w-[55%]' : 'w-full')} overflow-y-auto p-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-all duration-300`}>
          {loading ? (
            <div className={`grid ${desktopMapVisible ? 'grid-cols-2' : 'grid-cols-3'} gap-5`}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i}>
                  <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-dark-card rounded-xl animate-pulse" />
                  <div className="mt-2 h-4 w-3/4 bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                  <div className="mt-1 h-3 w-1/2 bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-20">
              <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-[14px]">No venues found nearby</p>
            </div>
          ) : (
            <div className={`grid ${desktopMapVisible ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'} gap-5`}>
              {filteredShops.map((shop) => (
                <SearchShopCard key={shop._id} shop={shop} onClick={() => handleShopClick(shop)} locationText={getShopLocationDisplay(shop)} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Map — with border-radius, gap, fullscreen button, zoom bottom-right */}
        {desktopMapVisible && (
          <div className={`${desktopMapFullscreen ? 'absolute inset-0 z-[50] p-3' : 'w-[45%] p-2'} transition-all duration-300`}>
            <style>{`
              .custom-shop-marker { background: transparent !important; border: none !important; }
              .user-location-marker { background: transparent !important; border: none !important; }
              .desktop-map-container .leaflet-container { width: 100%; height: 100%; z-index: 1; font-family: inherit; border-radius: 16px; }
              .desktop-map-container .leaflet-control-zoom { position: absolute !important; bottom: 24px !important; right: 24px !important; top: auto !important; left: auto !important; border: none !important; box-shadow: 0 2px 10px rgba(0,0,0,0.12) !important; border-radius: 14px !important; overflow: hidden !important; }
              .desktop-map-container .leaflet-control-zoom a { width: 40px !important; height: 40px !important; line-height: 40px !important; font-size: 20px !important; color: #000 !important; background: #fff !important; border: none !important; border-bottom: 1px solid #f0f0f0 !important; }
              .desktop-map-container .leaflet-control-zoom a:last-child { border-bottom: none !important; }
              .desktop-map-container .leaflet-control-zoom a:hover { background: #f5f5f5 !important; }
              .desktop-map-container .leaflet-control-attribution { display: none !important; }
              .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
              .leaflet-popup-content { margin: 8px 12px; }
            `}</style>
            <div className="desktop-map-container w-full h-full rounded-2xl overflow-hidden relative">
              <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" zoomControl={true} attributionControl={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapController center={mapCenter} zoom={mapZoom} invalidateSize={desktopMapFullscreen} />
                {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}><Popup><span className="text-sm font-medium">You are here</span></Popup></Marker>}
                {shopsWithCoords.map((shop) => {
                  const branches = shop.branches || shop.branchAddresses || [];
                  return branches.filter(b => b.latitude && b.longitude).map((branch, idx) => (
                    <Marker key={`${shop._id}-${idx}`} position={[branch.latitude, branch.longitude]} icon={createShopIcon(shop.name)} eventHandlers={{ click: () => handleShopClick(shop) }}>
                      <Popup><div className="text-center"><p className="font-semibold text-[13px]">{shop.name}</p></div></Popup>
                    </Marker>
                  ));
                })}
              </MapContainer>

              {/* Fullscreen toggle button — top right */}
              <button
                onClick={() => setDesktopMapFullscreen(prev => !prev)}
                className="absolute top-4 right-4 z-[1000] w-11 h-11 bg-white dark:bg-dark-surface rounded-full border border-gray-200 dark:border-dark-border shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card transition-colors cursor-pointer"
              >
                {desktopMapFullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    )}

    {/* ===== MOBILE LAYOUT ===== */}
    {!isDesktop && (
    <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-white dark:bg-dark-surface">
      {/* Styles */}
      <style>{`
        .custom-shop-marker { background: transparent !important; border: none !important; }
        .user-location-marker { background: transparent !important; border: none !important; }
        .leaflet-container { width: 100%; height: 100%; z-index: 1; font-family: inherit; }
        .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .leaflet-popup-content { margin: 8px 12px; }
        .search-map-wrapper { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>

      {/* ===== SEARCH HEADER ===== */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <div className="bg-white dark:bg-dark-surface rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-dark-border/80 px-4 py-2.5 flex items-center gap-3">
          {/* Search icon */}
          <Search size={22} className="text-gray-800 dark:text-gray-100 shrink-0" strokeWidth={2.2} />

          {/* Text area */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                // Dispatch custom event to hide bottom nav
                document.dispatchEvent(new CustomEvent('searchFocus'));
              }}
              onBlur={() => {
                // Dispatch custom event to show bottom nav with delay to prevent flicker
                setTimeout(() => {
                  document.dispatchEvent(new CustomEvent('searchBlur'));
                }, 150);
              }}
              placeholder="Search Location and Shops...."
              className="w-full text-[15px] font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-500 leading-tight"
            />
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 truncate">
              {userAddress}
            </p>
          </div>

          {/* Category filter icon — only show if categories exist */}
          {categories.length > 0 && (
            <button
              onClick={() => setShowCategorySheet(true)}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors shrink-0"
            >
              <List size={18} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* ===== MAP ===== */}
      <div className="flex-1 relative">
        <div className="search-map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* User location marker */}
            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={userLocationIcon}
              >
                <Popup>
                  <span className="text-sm font-medium">You are here</span>
                </Popup>
              </Marker>
            )}

            {/* Shop markers */}
            {shopsWithCoords.map((shop) => {
              const branches = shop.branches || shop.branchAddresses || [];
              return branches
                .filter((b) => b.latitude && b.longitude)
                .map((branch, idx) => (
                  <Marker
                    key={`${shop._id}-${idx}`}
                    position={[branch.latitude, branch.longitude]}
                    icon={createShopIcon(shop.name)}
                    eventHandlers={{ click: () => handleShopClick(shop) }}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold text-[13px] text-gray-900 dark:text-white">{shop.name}</p>
                        {shop.rating > 0 && (
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                            ⭐ {shop.rating.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ));
            })}
          </MapContainer>
        </div>

        {/* Recenter / Navigate button */}
        <button
          onClick={handleRecenter}
          className="absolute z-10 right-4 w-12 h-12 bg-white dark:bg-dark-surface rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 transition-all"
          style={{ bottom: `${currentSheetHeight + 16}px` }}
        >
          <Navigation size={22} className="text-gray-700 dark:text-gray-300" fill="none" />
        </button>
      </div>

      {/* ===== BOTTOM SHEET ===== */}
      <div
        className="absolute left-0 right-0 bg-white dark:bg-dark-surface rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.1)] z-20 flex flex-col overflow-hidden"
        style={{
          bottom: "56px",
          height: `${currentSheetHeight}px`,
          transition: dragRef.current.isDragging ? "none" : "height 0.45s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-9 h-[5px] bg-gray-300 rounded-full" />
        </div>

        {/* Category Filter Chips — only show if categories exist */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center justify-center px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                !selectedCategory
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(selectedCategory === cat._id ? null : cat._id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  selectedCategory === cat._id
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Venue Count */}
        {sheetPosition !== "min" && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center">
              {loading ? "Loading..." : `${filteredShops.length} venues nearby`}
            </p>
          </div>
        )}

        {/* Shop List — scrollable, expands sheet on scroll up */}
        {sheetPosition !== "min" && (
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            onTouchStart={handleListTouchStart}
            onTouchMove={handleListTouchMove}
            onScroll={handleListScroll}
          >
            <div className="px-4 pb-6 flex flex-col gap-5">
              {loading ? (
                // Shimmer skeleton loaders
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="relative overflow-hidden">
                    <div className="w-full aspect-[16/9] bg-gray-200 dark:bg-dark-border/70 rounded-2xl mb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.6s_linear_infinite]" style={{ transform: "translateX(-100%)", animation: "shimmer 1.6s linear infinite" }} />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 dark:bg-dark-border/70 rounded w-2/3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.6s_linear_infinite]" style={{ animationDelay: "0.2s" }} />
                      </div>
                      <div className="h-4 bg-gray-200 dark:bg-dark-border/70 rounded w-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.6s_linear_infinite]" style={{ animationDelay: "0.3s" }} />
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-dark-border/70 rounded w-1/2 mt-2 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.6s_linear_infinite]" style={{ animationDelay: "0.4s" }} />
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-dark-border/70 rounded w-2/3 mt-1.5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.6s_linear_infinite]" style={{ animationDelay: "0.5s" }} />
                    </div>
                  </div>
                ))
              ) : filteredShops.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin size={44} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-[14px]">No venues found nearby</p>
                  <p className="text-gray-400 dark:text-gray-500 text-[12px] mt-1">Try zooming out or changing your search</p>
                </div>
              ) : (
                filteredShops.map((shop) => (
                  <SearchShopCard
                    key={shop._id}
                    shop={shop}
                    onClick={() => handleShopClick(shop)}
                    locationText={getShopLocationDisplay(shop)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== CATEGORY FILTER BOTTOM SHEET ===== */}
      {showCategorySheet && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setShowCategorySheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface rounded-t-3xl z-[70] max-h-[70vh] flex flex-col animate-[slideUp_0.25s_ease-out]">
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-9 h-[5px] bg-gray-300 rounded-full" />
            </div>
            <div className="px-5 pb-4 shrink-0">
              <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">Filter by Category</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Select a category to filter venues</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <button
                onClick={() => { setSelectedCategory(null); setShowCategorySheet(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-2 text-left transition-colors ${
                  !selectedCategory ? "bg-gray-900 text-white" : "bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-card"
                }`}
              >
                <span className="text-[14px] font-semibold">All Categories</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => { setSelectedCategory(cat._id); setShowCategorySheet(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-2 text-left transition-colors ${
                    selectedCategory === cat._id ? "bg-gray-900 text-white" : "bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-card"
                  }`}
                >
                  {cat.image?.url && (
                    <img src={cat.image.url} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
                  )}
                  <span className="text-[14px] font-semibold">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </>
      )}

      {/* Bottom Navigation — hide when keyboard is visible */}
      {!isKeyboardVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex justify-around items-center h-14 px-2">
            <div
              onClick={() => navigate("/")}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500 cursor-pointer"
            >
              <Home size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Home</span>
            </div>
            <div className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-black dark:text-white">
              <Search size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-semibold">Search</span>
            </div>
            <div
              onClick={() => navigate(user ? "/user/bookings" : "/login")}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500 cursor-pointer"
            >
              <Calendar size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Bookings</span>
            </div>
            <div
              onClick={() => navigate(user ? "/user/profile" : "/login")}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500 cursor-pointer"
            >
              <User size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Profile</span>
            </div>
          </div>
        </div>
      )}
    </div>
    )}
    </>
  );
};

// ===== SHOP CARD COMPONENT =====
// Full-width card with scrollable image carousel and working favorites
const SearchShopCard = ({ shop, onClick, locationText }) => {
  const rating = shop.rating || 0;
  const reviewCount = shop.reviewsCount || 0;
  const categoryName = shop.category?.name || "Beauty Salon";
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef(null);

  // Build images array from gallery or fallback
  const fallbackImages = [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
  ];
  const allImages = (() => {
    if (shop.galleryImages && shop.galleryImages.length > 0) return shop.galleryImages;
    if (shop.galleryImage) return [shop.galleryImage];
    if (shop.image?.url) return [shop.image.url];
    return fallbackImages;
  })();

  // Favorites
  const [isFav, setIsFav] = useState(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("vijayajalakam_favorites") || "[]");
      return favs.includes((shop._id || "").toString());
    } catch { return false; }
  });

  const toggleFavorite = (e) => {
    e.stopPropagation();
    const id = (shop._id || "").toString();
    try {
      const favs = JSON.parse(localStorage.getItem("vijayajalakam_favorites") || "[]");
      let updated;
      if (favs.includes(id)) {
        updated = favs.filter(f => f !== id);
        setIsFav(false);
      } else {
        updated = [...favs, id];
        setIsFav(true);
      }
      localStorage.setItem("vijayajalakam_favorites", JSON.stringify(updated));
      // Sync with backend
      const token = localStorage.getItem("accessToken");
      if (token) {
        if (isFav) {
          api.delete(`/user/favorites/${id}`).catch(() => {});
        } else {
          api.post(`/user/favorites/${id}`).catch(() => {});
        }
      }
    } catch {}
  };

  // Handle image scroll to update dots
  const handleImageScroll = () => {
    if (!imageScrollRef.current) return;
    const scrollLeft = imageScrollRef.current.scrollLeft;
    const width = imageScrollRef.current.clientWidth;
    const index = Math.round(scrollLeft / width);
    setCurrentImageIndex(index);
  };

  return (
    <div onClick={onClick} className="cursor-pointer group">
      {/* Image carousel — horizontally scrollable */}
      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-card">
        <div
          ref={imageScrollRef}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          onScroll={handleImageScroll}
          onClick={(e) => e.stopPropagation()}
        >
          {allImages.map((img, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center" onClick={onClick}>
              <img
                src={img}
                alt={`${shop.name} ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.target.src = fallbackImages[0]; }}
              />
            </div>
          ))}
        </div>

        {/* Rating badge */}
        {rating > 0 && (
          <div className="absolute top-3 left-3 bg-white dark:bg-dark-surface/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm">
            <Star size={12} fill="#FFB800" color="#FFB800" />
            <span className="text-[12px] font-bold text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Heart/Favorite button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-dark-surface/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white dark:bg-dark-surface transition-colors"
        >
          <Heart size={16} fill={isFav ? "#e53935" : "none"} color={isFav ? "#e53935" : "#6b7280"} />
        </button>

        {/* Image dots indicator */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentImageIndex ? "bg-white dark:bg-dark-surface" : "bg-white dark:bg-dark-surface/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info below image */}
      <div className="mt-2.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 flex-1">
            {shop.name}
          </h3>
          {rating > 0 && (
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <Star size={14} fill="#FFB800" color="#FFB800" />
              <span className="text-[14px] font-bold text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {locationText && (
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{locationText}</p>
        )}
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
          {categoryName}
          {reviewCount > 0 && <span> · {reviewCount} reviews</span>}
        </p>
      </div>
    </div>
  );
};

export default SearchScreen;
