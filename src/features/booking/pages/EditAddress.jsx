import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/axiosInstance";
import {
  ArrowLeft,
  MapPin,
  Home,
  Briefcase,
  Loader,
  Navigation,
} from "lucide-react";
import { selectCurrentUser, updateUser as updateAuthUser } from "../../../store/slices/authSlice";
import Snackbar from "../../../components/shared/Snackbar";

/**
 * Edit/Add Address Page
 * Separate page for editing a single address with map preview.
 * Matches the reference screenshot: back arrow, label title, address input, map, save button.
 */
const EditAddress = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  // Get address data from navigation state
  const { addressIndex, addressData, isNew } = location.state || {};

  const [label, setLabel] = useState(addressData?.label || "Home");
  const [address, setAddress] = useState(addressData?.address || "");
  const [city, setCity] = useState(addressData?.city || "");
  const [state, setState] = useState(addressData?.state || "");
  const [postalCode, setPostalCode] = useState(addressData?.postalCode || "");
  const [loading, setLoading] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(isNew || !addressData?.address);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  const addressInputRef = useRef(null);

  const showSnack = (message, type = "success") => {
    setSnack({ message, type });
  };

  // Focus input when in edit mode
  useEffect(() => {
    if (isEditingAddress && addressInputRef.current) {
      addressInputRef.current.focus();
    }
  }, [isEditingAddress]);

  const getFullAddress = () => {
    const parts = [address, city, state, postalCode].filter(Boolean);
    return parts.join(", ");
  };

  const handleSave = async () => {
    if (!address.trim()) {
      showSnack("Please enter an address", "error");
      return;
    }

    setLoading(true);
    try {
      // Build updated addresses array
      let addresses = [...(currentUser.addresses || [])];

      const newAddr = {
        label,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        isDefault: addressIndex === 0,
      };

      if (isNew) {
        addresses.push(newAddr);
      } else if (addressIndex !== undefined && addressIndex !== null) {
        addresses[addressIndex] = newAddr;
      } else {
        addresses.push(newAddr);
      }

      const res = await api.put("/user/profile", {
        name: currentUser.name,
        phone: currentUser.phone,
        addresses: addresses.slice(0, 3),
      });

      if (res.data.success) {
        dispatch(updateAuthUser(res.data.data));
        showSnack("Address saved successfully");
        setTimeout(() => navigate(-1), 400);
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to save address", "error");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (label.toLowerCase()) {
      case "home":
        return <Home size={18} className="text-white" />;
      case "work":
        return <Briefcase size={18} className="text-white" />;
      default:
        return <MapPin size={18} className="text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface flex flex-col">
      {/* App Bar */}
      <div className="sticky top-0 z-20 bg-white dark:bg-dark-surface" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-4 px-4 h-[56px]">
          <button
            onClick={() => navigate(-1)}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={22} strokeWidth={2} className="text-black dark:text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-2 pb-32">
        {/* Label Title */}
        <h1 className="text-[22px] font-bold text-black dark:text-white mb-5">{label}</h1>

        {/* Label Selector */}
        <div className="flex gap-2 mb-6">
          {["Home", "Work", "Other"].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className="px-4 py-2 rounded-full text-[13px] font-medium transition-all"
              style={{
                backgroundColor: label === l ? "#111" : "#f5f5f5",
                color: label === l ? "#fff" : "#666",
                border: label === l ? "none" : "1px solid #e5e5e5",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Address Input */}
        <div className="mb-4">
          <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">
            Address <span className="text-red-500">*</span>
          </label>
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
            style={{ border: "1px solid #e0e0e0" }}
          >
            <MapPin size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <input
              ref={addressInputRef}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your address"
              className="flex-1 text-[15px] text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* City & State Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full px-4 py-3 rounded-xl text-[15px] text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none placeholder-gray-400"
              style={{ border: "1px solid #e0e0e0" }}
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">Pin code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Pin code"
              className="w-full px-4 py-3 rounded-xl text-[15px] text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none placeholder-gray-400"
              style={{ border: "1px solid #e0e0e0" }}
            />
          </div>
        </div>

        {/* State */}
        <div className="mb-6">
          <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            className="w-full px-4 py-3 rounded-xl text-[15px] text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none placeholder-gray-400"
            style={{ border: "1px solid #e0e0e0" }}
          />
        </div>

        {/* Map Preview Area */}
        {address && (
          <div className="mb-6">
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{ border: "1px solid #e8e8e8", height: "180px" }}
            >
              {/* Static map placeholder with address icon */}
              <div className="w-full h-full bg-gray-100 dark:bg-dark-card flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-30">
                  <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    <rect fill="#e8f4e8" width="400" height="200" />
                    <path d="M0 100 Q100 80 200 100 T400 100" stroke="#c8dcc8" fill="none" strokeWidth="2" />
                    <path d="M50 50 L50 150" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M100 30 L100 170" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M150 40 L150 160" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M200 20 L200 180" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M250 35 L250 165" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M300 45 L300 155" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M350 25 L350 175" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M0 60 L400 60" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M0 100 L400 100" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M0 140 L400 140" stroke="#d4d4d4" fill="none" strokeWidth="0.5" />
                    <path d="M180 80 Q200 60 220 80 L200 110 Z" fill="#4a90d9" opacity="0.3" />
                  </svg>
                </div>
                {/* Center pin icon */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-[44px] h-[44px] rounded-full bg-black flex items-center justify-center shadow-lg">
                    {getIcon()}
                  </div>
                  <div className="w-3 h-3 bg-black/20 rounded-full mt-1 blur-[2px]" />
                </div>
                {/* Drag hint */}
                <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                  Drag the map to adjust the pin
                </p>
              </div>
            </div>

            {/* Full address display */}
            <div className="flex items-start justify-between mt-4 px-1">
              <div className="flex-1">
                <p className="text-[14px] text-gray-800 dark:text-gray-100 leading-relaxed">
                  {getFullAddress() || address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingAddress(true);
                  setTimeout(() => addressInputRef.current?.focus(), 100);
                }}
                className="text-[14px] font-medium ml-4 flex-shrink-0"
                style={{ color: "#6366f1" }}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface px-4 py-4 z-30" style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !address.trim()}
          className="w-full py-4 rounded-full text-[15px] font-semibold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
          style={{ backgroundColor: "#111" }}
        >
          {loading ? (
            <Loader size={18} className="animate-spin mx-auto" />
          ) : (
            "Save"
          )}
        </button>
      </div>

      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
    </div>
  );
};

export default EditAddress;
