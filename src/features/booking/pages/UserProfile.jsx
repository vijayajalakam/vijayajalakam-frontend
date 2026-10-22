import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { selectCurrentUser } from "../../../store/slices/authSlice";
import { ProfileScreenSkeleton } from "../../../components/user/skeletons";
import api from "../../../api/axiosInstance";
import { useTheme } from "../../../components/shared/ThemeContext";
import UserDesktopShell from "../../../components/user/UserDesktopShell";
import {
  User,
  Heart,
  Calendar,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Store,
  Wallet,
  Pencil,
  Home,
  Briefcase,
  Plus,
  MapPin,
  Sun,
  Moon,
} from "lucide-react";

const UserProfile = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, salonConfig } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currencySymbol } = useCurrency();
  const currentUser = useSelector(selectCurrentUser);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [walletData, setWalletData] = useState([]);
  const [walletTotals, setWalletTotals] = useState({ totalWallet: 0, totalDue: 0 });

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await api.get("/appointments/my/wallet");
        if (res.data.success) {
          setWalletData(res.data.data || []);
          setWalletTotals({ totalWallet: res.data.totalWallet || 0, totalDue: res.data.totalDue || 0 });
        }
      } catch (e) {
        // ignore
      }
    };
    if (currentUser) fetchWallet();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = shopSlug ? `/${shopSlug}/login` : "/login";
    } catch {
      window.location.href = shopSlug ? `/${shopSlug}/login` : "/login";
    }
  };

  if (!currentUser) return <ProfileScreenSkeleton />;

  const nameParts = (currentUser.name || "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const profileImage = currentUser.photo?.url || currentUser.photo?.path || (typeof currentUser.photo === 'string' ? currentUser.photo : null) || currentUser.profileImage;

  const menuItems = [
    { icon: User, label: "Profile", to: shopSlug ? `/${shopSlug}/user/profile/edit` : "/user/profile/edit" },
    { icon: MapPin, label: "My addresses", to: shopSlug ? `/${shopSlug}/user/profile/address` : "/user/profile/address" },
    { icon: Heart, label: "Favourites", to: shopSlug ? `/${shopSlug}/user/favourites` : "/user/favourites" },
    { icon: Calendar, label: "My appointments", to: shopSlug ? `/${shopSlug}/user/bookings` : "/user/bookings" },
    { icon: Settings, label: "Settings" },
  ];

  const openSupport = () => {
    const whatsappNumber = "917306556036";
    const message = encodeURIComponent("Hi Vijayajalakam, I need help.");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const secondaryItems = [
    { 
      icon: theme === "dark" ? Sun : Moon, 
      label: theme === "dark" ? "Light Mode" : "Dark Mode", 
      onClick: () => setTheme(theme === "dark" ? "light" : "dark") 
    },
    { icon: HelpCircle, label: "Support", onClick: openSupport },
  ];

  return (
    <UserDesktopShell activeItem={location.hash === "#wallet" ? "wallet" : "profile"}>
      {/* ===== DESKTOP CONTENT ===== */}
      <div className="hidden md:block">
        {location.hash === "#wallet" ? (
          /* Wallet View — Fresha style */
          <>
            <h1 className="text-[26px] font-bold text-black dark:text-white mb-6">Wallet</h1>

            {/* Wallet Balance Card */}
            <div className="w-full max-w-[500px] rounded-2xl p-6 mb-6" style={{ background: "linear-gradient(135deg, #5b2bff 0%, #a855f7 40%, #f0abfc 75%, #f472b6 100%)" }}>
              <p className="text-[32px] font-bold text-white leading-none">
                {currencySymbol}{walletTotals.totalWallet.toLocaleString()}<span className="text-[18px] opacity-80">.00</span>
              </p>
              <p className="text-[14px] text-white/80 mt-1">Wallet balance</p>
            </div>

            {/* Wallet Items */}
            {walletData.length > 0 ? (
              <div className="border border-gray-200 dark:border-dark-border rounded-2xl p-5 max-w-[500px]">
                <h3 className="text-[16px] font-bold text-black dark:text-white mb-4">Transactions</h3>
                <div className="space-y-3">
                  {walletData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-card flex items-center justify-center overflow-hidden shrink-0">
                          {item.shopImage ? <img src={item.shopImage} alt={item.shopName} className="w-full h-full object-cover" /> : <Store size={16} className="text-gray-400 dark:text-gray-500" />}
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-black dark:text-white">{item.shopName}</p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400">{item.walletBalance > 0 ? "Credit" : "Due"}</p>
                        </div>
                      </div>
                      <span className={`text-[14px] font-bold ${item.walletBalance > 0 ? "text-green-600" : "text-red-500"}`}>
                        {item.walletBalance > 0 ? "+" : "-"}{currencySymbol}{Math.abs(item.walletBalance).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-dark-border rounded-2xl p-5 max-w-[500px]">
                <h3 className="text-[16px] font-bold text-black dark:text-white mb-3">Cards</h3>
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="w-9 h-9 rounded-lg border border-dashed border-gray-300 dark:border-dark-border flex items-center justify-center">
                    <Plus size={16} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <span className="text-[14px]">Add debit/credit card</span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Profile View — Fresha style: 2 columns */
          <>
            <h1 className="text-[26px] font-bold text-black dark:text-white mb-6">Profile</h1>

            <div className="flex gap-8 items-start">
              {/* Left: Profile Card */}
              <div className="border border-gray-200 dark:border-dark-border rounded-2xl p-6 relative w-[420px] shrink-0">
                <Link
                  to={shopSlug ? `/${shopSlug}/user/profile/edit` : "/user/profile/edit"}
                  className="absolute top-5 right-5 text-[14px] font-medium text-blue-600 hover:text-blue-700 no-underline"
                >
                  Edit
                </Link>

                <div className="flex flex-col items-center mb-6 pt-2">
                  <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-2 border-gray-100 dark:border-dark-border mb-3 relative">
                    {profileImage ? (
                      <img src={profileImage} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-dark-card flex items-center justify-center">
                        <User size={36} className="text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-[18px] font-bold text-black dark:text-white">{currentUser.name}</p>
                </div>

                <div className="border-t border-gray-100 dark:border-dark-border">
                  <div className="py-4 border-b border-gray-100 dark:border-dark-border">
                    <p className="text-[13px] font-semibold text-black dark:text-white">First name</p>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{firstName || "—"}</p>
                  </div>
                  <div className="py-4 border-b border-gray-100 dark:border-dark-border">
                    <p className="text-[13px] font-semibold text-black dark:text-white">Last name</p>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{lastName || "—"}</p>
                  </div>
                  <div className="py-4 border-b border-gray-100 dark:border-dark-border">
                    <p className="text-[13px] font-semibold text-black dark:text-white">Mobile number</p>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{currentUser.phone ? `+${currentUser.phone}` : "—"}</p>
                  </div>
                  <div className="py-4 border-b border-gray-100 dark:border-dark-border">
                    <p className="text-[13px] font-semibold text-black dark:text-white">Email</p>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{currentUser.email || "—"}</p>
                  </div>
                  <div className="py-4 border-b border-gray-100 dark:border-dark-border">
                    <p className="text-[13px] font-semibold text-black dark:text-white">Date of birth</p>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{currentUser.dateOfBirth || "—"}</p>
                  </div>
                  <div className="py-4">
                    <p className="text-[13px] font-semibold text-black dark:text-white">Gender</p>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{currentUser.gender || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Right: Addresses */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[18px] font-bold text-black dark:text-white mb-4">My addresses</h3>
                <div className="space-y-3">
                  {/* Show actual addresses from user data */}
                  {currentUser.addresses && currentUser.addresses.length > 0 ? (
                    currentUser.addresses.map((addr, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-dark-border rounded-xl">
                        <div className={`w-10 h-10 rounded-full ${addr.type === 'work' ? 'bg-purple-100' : 'bg-green-100'} flex items-center justify-center shrink-0 mt-0.5`}>
                          {addr.type === 'work' ? (
                            <Briefcase size={18} className="text-purple-600" />
                          ) : (
                            <Home size={18} className="text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-black dark:text-white capitalize">{addr.type || addr.label || "Home"}</p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {addr.address || addr.fullAddress || addr.street || [addr.area, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(", ") || "No address added"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-dark-border rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Home size={18} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-black dark:text-white">Home</p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400">Add a home address</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-dark-border rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                          <Briefcase size={18} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-black dark:text-white">Work</p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400">Add a work address</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => navigate(shopSlug ? `/${shopSlug}/user/profile/address` : "/user/profile/address")}
                  className={`flex items-center gap-2 mt-4 text-[14px] text-gray-600 dark:text-gray-400 hover:text-black transition-colors bg-transparent border-none cursor-pointer p-0 ${(currentUser.addresses?.length || 0) >= 5 ? 'hidden' : ''}`}
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== MOBILE LAYOUT (unchanged) ===== */}
      <div className="md:hidden" style={{ minHeight: "100vh", backgroundColor: theme === "dark" ? "#1f2937" : "#fff", paddingBottom: "90px" }}>
        <div style={{ padding: "36px 12px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 700, color: theme === "dark" ? "#fff" : "#000", lineHeight: 1.2, margin: 0 }}>
                {currentUser.name || "User"}
              </h1>
              <p style={{ fontSize: "14px", color: "#9ca3af", marginTop: "4px", margin: 0 }}>Personal account</p>
            </div>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #e5e5e5", flexShrink: 0 }}>
              {profileImage ? (
                <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={22} color="#9ca3af" />
                </div>
              )}
            </div>
          </div>

          {/* Wallet */}
          <div style={{ background: "linear-gradient(135deg, #5b2bff 0%, #a855f7 40%, #f0abfc 75%, #f472b6 100%)", borderRadius: "18px", padding: "22px 20px", color: "#fff", marginBottom: "22px" }}>
            <p style={{ fontSize: "13px", fontWeight: 500, opacity: 0.9, marginBottom: "4px" }}>Wallet balance</p>
            <h2 style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1, marginBottom: "16px" }}>
              {currencySymbol}{walletTotals.totalWallet.toLocaleString()}
              {walletTotals.totalDue > 0 && (
                <span style={{ fontSize: "14px", fontWeight: 500, opacity: 0.8, marginLeft: "10px" }}>
                  Due: {currencySymbol}{walletTotals.totalDue.toLocaleString()}
                </span>
              )}
            </h2>
            <button onClick={() => setShowWalletSheet(true)} style={{ padding: "7px 16px", borderRadius: "20px", border: "1.5px solid rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: 500, color: "#fff", background: "transparent", cursor: "pointer" }}>
              View wallet
            </button>
          </div>

          {/* Main Menu */}
          <div style={{ border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #f0f0f0", borderRadius: "16px", overflow: "hidden", marginBottom: "14px" }}>
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              const row = (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <Icon size={22} strokeWidth={1.5} color={theme === "dark" ? "#fff" : "#111"} />
                    <span style={{ fontSize: "15px", fontWeight: 500, color: theme === "dark" ? "#fff" : "#111" }}>{item.label}</span>
                  </div>
                  <ChevronRight size={18} color="#d1d5db" />
                </div>
              );
              if (item.to) return <Link key={idx} to={item.to} style={{ display: "block", textDecoration: "none" }}>{row}</Link>;
              return <button key={idx} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{row}</button>;
            })}
          </div>

          {/* Secondary Menu — Support only (theme toggle moved to dedicated row below) */}
          <div style={{ border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #f0f0f0", borderRadius: "16px", overflow: "hidden", marginBottom: "14px" }}>
            {/* Dark Mode toggle row — beautiful switch UI */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {/* Icon with gradient bg */}
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "10px",
                    background: theme === "dark" ? "linear-gradient(135deg,#f59e0b,#f97316)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    {theme === "dark"
                      ? <Sun size={18} color="#fff" />
                      : <Moon size={18} color="#fff" />
                    }
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: 500, color: theme === "dark" ? "#fff" : "#111" }}>
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                </div>
                {/* Toggle Switch */}
                <div style={{
                  width: "50px", height: "28px", borderRadius: "14px",
                  background: theme === "dark" ? "#6366f1" : "#e5e7eb",
                  position: "relative", transition: "background 0.25s", flexShrink: 0
                }}>
                  <div style={{
                    position: "absolute", top: "3px",
                    left: theme === "dark" ? "25px" : "3px",
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    transition: "left 0.25s cubic-bezier(.4,0,.2,1)"
                  }} />
                </div>
              </div>
            </button>
            {/* Support */}
            <button
              onClick={openSupport}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, borderTop: theme === "dark" ? "1px solid #374151" : "1px solid #f0f0f0" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "10px",
                    background: "linear-gradient(135deg,#10b981,#059669)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <HelpCircle size={18} color="#fff" />
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: 500, color: theme === "dark" ? "#fff" : "#111" }}>Support</span>
                </div>
                <ChevronRight size={18} color="#d1d5db" />
              </div>
            </button>
          </div>

          {/* Logout */}
          <div style={{ border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #f0f0f0", borderRadius: "16px", overflow: "hidden" }}>
            <button onClick={() => setShowLogoutSheet(true)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <LogOut size={22} strokeWidth={1.5} color={theme === "dark" ? "#fff" : "#111"} />
                  <span style={{ fontSize: "15px", fontWeight: 500, color: theme === "dark" ? "#fff" : "#111" }}>Log out</span>
                </div>
                <ChevronRight size={18} color="#d1d5db" />
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* ===== SHARED: Wallet Bottom Sheet ===== */}
      {showWalletSheet && (
        <>
          <div onClick={() => setShowWalletSheet(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: theme === "dark" ? "#1f2937" : "#fff", zIndex: 51, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", maxHeight: "70vh", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "8px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#d1d5db" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: theme === "dark" ? "#fff" : "#000" }}>My Wallet</h2>
              <button onClick={() => setShowWalletSheet(false)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={20} color="#000" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 24px" }}>
              {walletData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Wallet size={32} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontSize: "14px", color: "#9ca3af" }}>No wallet activity yet</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {walletData.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: "14px", border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #f0f0f0", backgroundColor: theme === "dark" ? "#374151" : "#fafafa" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {item.shopImage ? <img src={item.shopImage} alt={item.shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Store size={18} color="#9ca3af" />}
                        </div>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: theme === "dark" ? "#fff" : "#111" }}>{item.shopName}</p>
                          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{item.walletBalance > 0 ? "Credit balance" : "Amount due"}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: item.walletBalance > 0 ? "#10b981" : "#ef4444" }}>
                        {item.walletBalance > 0 ? "+" : "-"}{currencySymbol}{Math.abs(item.walletBalance).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== SHARED: Logout Confirmation ===== */}
      {showLogoutSheet && (
        <>
          <div onClick={() => setShowLogoutSheet(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#f5f5f7", zIndex: 51, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "8px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#d1d5db" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "16px" }}>
              <button onClick={() => setShowLogoutSheet(false)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={20} color="#000" />
              </button>
            </div>
            <div style={{ padding: "0 24px 32px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: 700, color: theme === "dark" ? "#fff" : "#000", marginBottom: "8px" }}>Log out</h2>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>Are you sure you want to log out of your account?</p>
              <button onClick={handleLogout} style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "none", backgroundColor: "#111", color: "#fff", fontSize: "15px", fontWeight: 600, cursor: "pointer", marginBottom: "12px" }}>
                Yes, log out
              </button>
              <button onClick={() => setShowLogoutSheet(false)} style={{ width: "100%", padding: "16px", borderRadius: "14px", border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #e5e5e5", backgroundColor: theme === "dark" ? "#1f2937" : "#fff", color: theme === "dark" ? "#fff" : "#111", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          `}</style>
        </>
      )}
    </UserDesktopShell>
  );
};

export default UserProfile;
