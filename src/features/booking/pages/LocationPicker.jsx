import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, MapPin, Navigation } from "lucide-react";

const LocationPicker = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Debounced search using Nominatim
  const searchLocations = useCallback((searchText) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchText || searchText.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=8&addressdetails=1`
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          const formatted = data.map((item) => {
            const { address } = item;
            const name =
              address?.city ||
              address?.town ||
              address?.village ||
              address?.suburb ||
              address?.county ||
              address?.state_district ||
              item.display_name.split(",")[0];
            const region = [address?.state, address?.country]
              .filter(Boolean)
              .join(", ");
            return {
              id: item.place_id,
              name,
              region,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              displayName: item.display_name,
            };
          });
          setResults(formatted);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    searchLocations(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchLocations]);

  // Select a location from search results
  const handleSelectLocation = (location) => {
    const locationData = {
      name: location.name,
      region: location.region,
      lat: location.lat,
      lng: location.lng,
      displayName: location.displayName,
      savedAt: Date.now(),
    };
    localStorage.setItem("vijayajalakam_user_location", JSON.stringify(locationData));
    // Dispatch custom event so ShopSelector can react
    window.dispatchEvent(new Event("location-changed"));
    navigate(-1);
  };

  // Use current GPS location with IP fallback
  const handleUseCurrentLocation = () => {
    setDetectingLocation(true);

    const fallbackToIP = async (reason) => {
      try {
        const response = await fetch("https://get.geojs.io/v1/ip/geo.json");
        const data = await response.json();
        if (data && data.latitude && data.longitude) {
          const name = data.city || data.region || "Current location";
          const region = [data.region, data.country].filter(Boolean).join(", ");
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
          window.dispatchEvent(new Event("location-changed"));
          navigate(-1);
          if (reason === "permission") {
            setTimeout(() => alert("GPS permission was denied. We estimated your location based on your network (IP), which might be inaccurate. Please search manually for an exact location."), 500);
          }
        } else {
          setDetectingLocation(false);
          alert("Could not detect location automatically. Please search manually.");
        }
      } catch (err) {
        setDetectingLocation(false);
        alert("Could not detect location. Please check your connection or search manually.");
      }
    };

    if (!navigator.geolocation) {
      fallbackToIP("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use BigDataCloud free reverse geocoding API (more reliable than Nominatim for client-side JS)
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          
          if (data && (data.city || data.locality || data.principalSubdivision)) {
            const name = data.locality || data.city || data.principalSubdivision || "Current location";
            const region = [data.principalSubdivision, data.countryName].filter(Boolean).join(", ");
            const locationData = {
              name,
              region,
              lat: latitude,
              lng: longitude,
              displayName: `${name}, ${region}`,
              isCurrentLocation: true,
              savedAt: Date.now(),
            };
            localStorage.setItem(
              "vijayajalakam_user_location",
              JSON.stringify(locationData)
            );
            window.dispatchEvent(new Event("location-changed"));
            navigate(-1);
          } else {
            fallbackToIP("api_failed");
          }
        } catch {
          fallbackToIP("api_failed");
        }
      },
      (error) => {
        // If GPS is denied or times out, fallback to IP location
        if (error.code === 1) { // PERMISSION_DENIED
          fallbackToIP("permission");
        } else {
          fallbackToIP("timeout");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-dark-surface flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
        >
          <ArrowLeft size={22} className="text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-[18px] font-bold text-gray-900 dark:text-white">Location</h1>
      </div>

      {/* Search Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 border-2 border-indigo-500 rounded-xl px-4 py-3 bg-white dark:bg-dark-surface">
          <Search size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a city or area"
            className="flex-1 text-[15px] text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"
            >
              <X size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Use Current Location Button */}
      <div className="px-4 pb-3">
        <button
          onClick={handleUseCurrentLocation}
          disabled={detectingLocation}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
            <Navigation size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-indigo-600">
              {detectingLocation ? "Detecting location..." : "Use current location"}
            </p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">Using GPS</p>
          </div>
        </button>
        <div className="h-px bg-gray-100 dark:bg-dark-card mx-4" />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4">
        {loading && query.length >= 2 ? (
          <div className="flex flex-col gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-card" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 dark:bg-dark-card rounded w-1/3 mb-1.5" />
                  <div className="h-3 bg-gray-50 dark:bg-dark-card rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col">
            {results.map((location) => (
              <button
                key={location.id}
                onClick={() => handleSelectLocation(location)}
                className="flex items-center gap-3 px-2 py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors text-left w-full"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                    {location.name}
                  </p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                    {location.region}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="text-center py-12">
            <MapPin size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] text-gray-500 dark:text-gray-400">No locations found</p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LocationPicker;
