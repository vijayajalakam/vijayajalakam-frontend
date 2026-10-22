import React, { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { selectCurrentUser } from "../../store/slices/authSlice";
import { useTheme } from "../shared/ThemeContext";
import {
  User,
  Calendar,
  Wallet,
  Heart,
  Settings,
  Search,
  MapPin,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

const UserDesktopShell = ({ children, activeItem }) => {
  const { shopSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const currentUser = useSelector(selectCurrentUser);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = currentUser?.name || user?.name || "User";
  const profileImage = currentUser?.photo?.url || currentUser?.photo?.path ||
    (typeof currentUser?.photo === 'string' ? currentUser?.photo : null) ||
    currentUser?.profileImage || user?.profileImage;

  const getActiveItem = () => {
    if (activeItem) return activeItem;
    const path = location.pathname;
    const hash = location.hash;
    if (hash === "#wallet") return "wallet";
    if (path.includes("/user/profile")) return "profile";
    if (path.includes("/user/bookings")) return "activity";
    if (path.includes("/user/favourites")) return "favorites";
    return "profile";
  };

  const active = getActiveItem();

  const sidebarItems = [
    { id: "profile", icon: User, label: "Profile", to: shopSlug ? `/${shopSlug}/user/profile` : "/user/profile" },
    { id: "activity", icon: Calendar, label: "Bookings", to: shopSlug ? `/${shopSlug}/user/bookings` : "/user/bookings" },
    { id: "wallet", icon: Wallet, label: "Wallet", to: shopSlug ? `/${shopSlug}/user/profile` : "/user/profile", hash: "#wallet" },
    { id: "favorites", icon: Heart, label: "Favorites", to: shopSlug ? `/${shopSlug}/user/favourites` : "/user/favourites" },
  ];

  return (
    <>
      {/* DESKTOP (md+) */}
      <div className="hidden md:flex flex-col min-h-screen bg-white dark:bg-dark-surface">
        {/* Top Navbar — matching search screen style */}
        <header className="sticky top-0 z-50 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center h-[70px] px-6">
            <Link to="/" className="shrink-0 mr-10 no-underline">
              <span className="text-[22px] font-extrabold tracking-tight text-black dark:text-white lowercase">vijayajalakam</span>
            </Link>

            <div className="flex-1 flex justify-center">
              <div className="flex items-center border border-gray-200 dark:border-dark-border rounded-full h-[48px] w-full max-w-[520px] cursor-pointer" onClick={() => navigate("/user/search")}>
                <div className="flex items-center gap-2.5 px-5 flex-1 border-r border-gray-200 dark:border-dark-border h-full">
                  <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="text-[14px] text-gray-900 dark:text-white font-medium">Search shops</span>
                </div>
                <div className="flex items-center gap-2.5 px-5 flex-1 h-full">
                  <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="text-[14px] text-gray-900 dark:text-white font-medium truncate">Current location</span>
                </div>
                <button className="w-[40px] h-[40px] bg-black rounded-full flex items-center justify-center shrink-0 mr-[4px]">
                  <Search className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="relative shrink-0 ml-10 flex items-center gap-4">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                title="Toggle Dark Mode"
              >
                {theme === 'dark' ? <Sun size={18} className="text-gray-300" /> : <Moon size={18} className="text-gray-600" />}
              </button>

              <div className="relative">
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-1.5 cursor-pointer">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-dark-border">
                    {profileImage ? (
                      <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-dark-card flex items-center justify-center">
                        <span className="text-[13px] font-bold text-gray-600 dark:text-gray-400">{displayName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-[220px] rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border shadow-lg z-20 overflow-hidden">
                      <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-dark-border">
                        <p className="text-[14px] font-bold text-black dark:text-white">{displayName}</p>
                      </div>
                      <div className="py-1">
                      {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const linkTo = item.hash ? `${item.to}${item.hash}` : item.to;
                        if (item.to) {
                          return (
                            <Link key={item.id} to={linkTo} onClick={() => setShowDropdown(false)}
                              className="flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card no-underline">
                              <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
                              <span>{item.label}</span>
                            </Link>
                          );
                        }
                        return (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-2 text-[13px] text-gray-400 dark:text-gray-500">
                            <Icon className="w-4 h-4" strokeWidth={1.5} />
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-gray-100 dark:border-dark-border py-1">
                      <button onClick={() => { setShowDropdown(false); setShowLogoutConfirm(true); }}
                        className="flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card w-full text-left bg-transparent border-none cursor-pointer">
                        <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        </header>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1">
          <aside className="w-[200px] shrink-0 border-r border-gray-100 dark:border-dark-border sticky top-[70px] h-[calc(100vh-70px)] overflow-y-auto pt-7 pb-6 pl-5 pr-3">
            <p className="text-[14px] font-bold text-black dark:text-white mb-5 pl-2">{displayName}</p>
            <nav className="flex flex-col gap-0.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                const cls = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                  isActive ? 'bg-gray-100 dark:bg-dark-card font-semibold text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-black dark:hover:text-white'
                }`;
                if (item.to) {
                  const linkTo = item.hash ? `${item.to}${item.hash}` : item.to;
                  return (
                    <Link key={item.id} to={linkTo} className={`no-underline ${cls}`}>
                      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </Link>
                  );
                }
                return (
                  <div key={item.id} className={`${cls} opacity-50 cursor-default`}>
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0 py-8 px-10">
            {children}
          </main>
        </div>
      </div>

      {/* MOBILE (below md) */}
      <div className="md:hidden">
        {children}
      </div>

      {/* Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white dark:bg-dark-surface rounded-2xl w-full max-w-[360px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[20px] font-bold text-black dark:text-white mb-2">Log out</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                className="w-full py-3.5 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-gray-900 transition-colors cursor-pointer border-none"
              >
                Yes, log out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3.5 bg-white dark:bg-dark-surface text-black dark:text-white rounded-xl text-[15px] font-semibold border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDesktopShell;
