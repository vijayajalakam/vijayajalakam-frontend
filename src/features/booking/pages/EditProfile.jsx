import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import {
  User,
  Loader,
  ArrowLeft,
  Pencil,
  Home,
  Briefcase,
  Plus,
  MapPin,
  X,
  Check,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { validateFileSize } from "../../../utils/fileUploadUtils";
import { selectCurrentUser, updateUser as updateAuthUser } from "../../../store/slices/authSlice";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../auth/hooks/useAuth";
import UserDesktopShell from "../../../components/user/UserDesktopShell";

const EditProfile = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logout } = useAuth();

  const currentUser = useSelector(selectCurrentUser);

  const [isEditing, setIsEditing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const showSnack = (message, type = "success") => {
    setSnack({ message, type });
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuIndex(null);
      }
    };
    if (openMenuIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuIndex]);

  useEffect(() => {
    if (currentUser) {
      const nameParts = (currentUser.name || "").trim().split(" ");
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        phone: currentUser.phone || "",
        email: currentUser.email || "",
      });
    }
  }, [currentUser]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const res = await api.put("/user/profile", {
        name: fullName,
        phone: formData.phone,
        addresses: currentUser.addresses || [],
      });
      if (res.data.success) {
        dispatch(updateAuthUser(res.data.data));
        showSnack("Profile updated successfully");
        setIsEditing(false);
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validation = validateFileSize(file);
    if (!validation.isValid) {
      showSnack(validation.message, "error");
      e.target.value = "";
      return;
    }
    const formDataUpload = new FormData();
    formDataUpload.append("photo", file);
    setUploading(true);
    try {
      const response = await api.post("/user/photo", formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        dispatch(updateAuthUser({ photo: response.data.data }));
        showSnack("Profile photo updated!");
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAddress = async (index) => {
    setOpenMenuIndex(null);
    const addresses = [...(currentUser.addresses || [])];
    addresses.splice(index, 1);
    try {
      const res = await api.put("/user/profile", {
        name: currentUser.name,
        phone: currentUser.phone,
        addresses,
      });
      if (res.data.success) {
        dispatch(updateAuthUser(res.data.data));
        showSnack("Address removed");
      }
    } catch (err) {
      showSnack("Failed to remove address", "error");
    }
  };

  const handleEditAddress = (index) => {
    setOpenMenuIndex(null);
    const addr = (currentUser.addresses || [])[index];
    const basePath = shopSlug ? `/${shopSlug}/user/profile/address` : "/user/profile/address";
    navigate(basePath, { state: { addressIndex: index, addressData: addr, isNew: false } });
  };

  const handleAddAddress = () => {
    const basePath = shopSlug ? `/${shopSlug}/user/profile/address` : "/user/profile/address";
    navigate(basePath, { state: { addressIndex: null, addressData: null, isNew: true } });
  };

  const getAddressIcon = (label) => {
    switch (label?.toLowerCase()) {
      case "home":
        return <Home size={16} className="text-white" />;
      case "work":
        return <Briefcase size={16} className="text-white" />;
      default:
        return <MapPin size={16} className="text-white" />;
    }
  };

  const getAddressIconBg = (label) => {
    switch (label?.toLowerCase()) {
      case "home":
        return "#4f46e5";
      case "work":
        return "#6366f1";
      default:
        return "#8b5cf6";
    }
  };

  const getFullAddress = (addr) => {
    const parts = [addr.address, addr.city, addr.postalCode, addr.state].filter(Boolean);
    return parts.join(", ");
  };

  if (!currentUser) return null;

  const nameParts = (currentUser.name || "").trim().split(" ");
  const displayFirstName = nameParts[0] || "";
  const displayLastName = nameParts.slice(1).join(" ") || "";
  const addresses = currentUser.addresses || [];

  return (
    <UserDesktopShell activeItem="profile">
    <div className="min-h-screen bg-white dark:bg-dark-surface">
      {/* App Bar — mobile only */}
      <div
        className="sticky top-0 z-20 bg-white dark:bg-dark-surface transition-shadow duration-200 md:hidden"
        style={{ boxShadow: isScrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
      >
        <div className="flex items-center gap-3 px-4 h-[56px]">
          <button
            onClick={() => navigate(-1)}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={2.2} className="text-black dark:text-white" />
          </button>
          <span
            className="text-[15px] font-semibold text-black dark:text-white transition-opacity duration-200"
            style={{ opacity: isScrolled ? 1 : 0 }}
          >
            My profile
          </span>
        </div>
      </div>

      {/* Page Title */}
      <div className="px-4 pt-1 pb-5">
        <h1 className="text-[22px] font-bold text-black dark:text-white leading-tight">My profile</h1>
      </div>

      {/* Profile Card */}
      <div className="px-4">
        <div
          className="rounded-xl"
          style={{
            border: "1.5px solid #f0f0f0",
            padding: "20px 16px 28px",
          }}
        >
          {/* Edit / Save */}
          {!isEditing ? (
            <button
              onClick={() => {
                const basePath = shopSlug ? `/${shopSlug}/user/profile/details` : "/user/profile/details";
                navigate(basePath);
              }}
              className="float-right text-[14px] font-medium"
              style={{ color: "#6366f1" }}
            >
              Edit
            </button>
          ) : (
            <div className="float-right flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (currentUser) {
                    const parts = (currentUser.name || "").trim().split(" ");
                    setFormData({
                      firstName: parts[0] || "",
                      lastName: parts.slice(1).join(" ") || "",
                      phone: currentUser.phone || "",
                      email: currentUser.email || "",
                    });
                  }
                }}
                className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
              >
                <X size={16} className="text-gray-400 dark:text-gray-500" />
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="w-[32px] h-[32px] flex items-center justify-center rounded-full transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#6366f1" }}
              >
                {loading ? <Loader size={14} className="animate-spin text-white" /> : <Check size={14} className="text-white" />}
              </button>
            </div>
          )}

          {/* Avatar centered */}
          <div className="flex flex-col items-center pt-6 pb-3 clear-both">
            <div className="relative mb-4">
              <div
                className="w-[120px] h-[120px] rounded-full overflow-hidden flex items-center justify-center"
                style={{ border: "2.5px solid #f0f0f0", backgroundColor: "#f8f8f8" }}
              >
                {currentUser.photo?.url || currentUser.photo?.path ? (
                  <img
                    src={currentUser.photo.url || currentUser.photo.path}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={44} className="text-gray-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-[28px] h-[28px] bg-white dark:bg-dark-surface rounded-full flex items-center justify-center"
                style={{ border: "1.5px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
              >
                {uploading ? <Loader size={12} className="animate-spin text-gray-400" /> : <Pencil size={12} className="text-gray-500 dark:text-gray-400" />}
              </button>
              <input ref={fileInputRef} type="file" hidden onChange={handlePhotoUpload} accept="image/*" />
            </div>
            <h2 className="text-[19px] font-bold text-black dark:text-white text-center">{currentUser.name || "User"}</h2>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #f0f0f0", margin: "16px 0 20px" }} />

          {/* Fields */}
          {isEditing ? (
            <div className="space-y-5">
              <div>
                <label className="text-[13px] font-semibold text-black dark:text-white block mb-1">First name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-[15px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors bg-white dark:bg-dark-surface"
                  style={{ border: "1.5px solid #e8e8e8" }}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-black dark:text-white block mb-1">Last name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-[15px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors bg-white dark:bg-dark-surface"
                  style={{ border: "1.5px solid #e8e8e8" }}
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-black dark:text-white block mb-1">Mobile number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-[15px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors bg-white dark:bg-dark-surface"
                  style={{ border: "1.5px solid #e8e8e8" }}
                  placeholder="Mobile number"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-black dark:text-white block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2.5 rounded-lg text-[15px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-card cursor-not-allowed"
                  style={{ border: "1.5px solid #f0f0f0" }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[13px] font-semibold text-black dark:text-white">First name</p>
                <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1">{displayFirstName || "—"}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-black dark:text-white">Last name</p>
                <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1">{displayLastName || "—"}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-black dark:text-white">Mobile number</p>
                <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1">{currentUser.phone || "—"}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-black dark:text-white">Email</p>
                <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1">{currentUser.email || "—"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Addresses */}
      <div className="px-4 mt-10 pb-10">
        <h3 className="text-[18px] font-bold text-black dark:text-white mb-5">My addresses</h3>

        <div className="space-y-3">
          {addresses.length > 0 ? (
            addresses.map((addr, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 rounded-xl cursor-pointer"
                style={{ border: "1.5px solid #f0f0f0", padding: "16px" }}
                onClick={() => handleEditAddress(idx)}
              >
                {/* Icon */}
                <div
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getAddressIconBg(addr.label) }}
                >
                  {getAddressIcon(addr.label)}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-black dark:text-white leading-tight">{addr.label || "Home"}</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                    {getFullAddress(addr) || "Add address"}
                  </p>
                </div>

                {/* 3-dot menu */}
                <div className="relative flex-shrink-0" ref={openMenuIndex === idx ? menuRef : null}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuIndex(openMenuIndex === idx ? null : idx);
                    }}
                    className="w-[30px] h-[30px] flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
                  >
                    <MoreVertical size={16} className="text-gray-400 dark:text-gray-500" />
                  </button>

                  {openMenuIndex === idx && (
                    <div
                      className="absolute top-8 right-0 bg-white dark:bg-dark-surface rounded-lg py-1 z-30 min-w-[130px]"
                      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.1)", border: "1px solid #f0f0f0" }}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEditAddress(idx); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors flex items-center gap-2"
                      >
                        <Pencil size={13} className="text-gray-400 dark:text-gray-500" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAddress(idx); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={13} className="text-red-400" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <>
              <div
                className="flex items-center gap-4 rounded-xl cursor-pointer"
                style={{ border: "1.5px solid #f0f0f0", padding: "16px" }}
                onClick={() => {
                  const basePath = shopSlug ? `/${shopSlug}/user/profile/address` : "/user/profile/address";
                  navigate(basePath, { state: { addressIndex: null, addressData: { label: "Home" }, isNew: true } });
                }}
              >
                <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#4f46e5" }}>
                  <Home size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-black dark:text-white">Home</p>
                  <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">Add address</p>
                </div>
              </div>
              <div
                className="flex items-center gap-4 rounded-xl cursor-pointer"
                style={{ border: "1.5px solid #f0f0f0", padding: "16px" }}
                onClick={() => {
                  const basePath = shopSlug ? `/${shopSlug}/user/profile/address` : "/user/profile/address";
                  navigate(basePath, { state: { addressIndex: null, addressData: { label: "Work" }, isNew: true } });
                }}
              >
                <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#6366f1" }}>
                  <Briefcase size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-black dark:text-white">Work</p>
                  <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">Add address</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={handleAddAddress}
          className="flex items-center gap-2 mt-5 px-3 py-2 rounded-full hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
          style={{ border: "1.5px solid #e8e8e8" }}
        >
          <Plus size={15} className="text-gray-600 dark:text-gray-400" />
          <span className="text-[13px] font-medium text-black dark:text-white">Add</span>
        </button>
      </div>

      <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ ...snack, message: "" })} />
    </div>
    </UserDesktopShell>
  );
};

export default EditProfile;
