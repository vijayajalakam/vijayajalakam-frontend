import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Search, User, ShoppingBag, X, ChevronLeft, Menu, Sun, Moon } from "lucide-react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { selectUserSearchQuery, setSearchQuery, selectUserCartCount, setCartOpen } from "../../store/slices/userAppSlice";
import { selectCurrentUser } from "../../store/slices/authSlice";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useTheme } from "../shared/ThemeContext";

const UserNavbar = () => {
  const { shopSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { salonConfig } = useAuth();
  const { theme, setTheme } = useTheme();
  const user = useSelector(selectCurrentUser);
  const searchQuery = useSelector(selectUserSearchQuery);
  const cartCount = useSelector(selectUserCartCount);

  const shopName = salonConfig?.salonName || "Vijayajalakam";
  const isHome = location.pathname.endsWith("/user/home");
  
  // Check if we're on bookings or profile page
  const isBookings = location.pathname.includes("/user/bookings") || location.pathname.includes("/user/my-bookings");
  const isProfile = location.pathname.includes("/user/profile");
  const isCheckout = location.pathname.includes("/user/checkout") || location.pathname.includes("/user/product/");
  
  // Hide navbar on mobile for bookings, profile, checkout, and home pages (home has its own mobile header)
  const hideMobileNavbar = isHome || isBookings || isProfile || isCheckout;
  
  // Show search bar only on home page
  const showSearchBar = isHome;

  return (
    <nav className={`sticky top-0 z-50 px-3 py-2 sm:px-4 sm:py-3 md:hidden ${hideMobileNavbar ? 'hidden' : ''}`}>
      <div className="max-w-7xl mx-auto glass-effect rounded-2xl md:rounded-[2rem] px-3 py-2 md:px-6 md:py-3 flex items-center justify-between shadow-xl md:shadow-2xl shadow-black/5 border border-white/50">
        
        {/* Left Side: Logo or Back Button */}
        <div className="flex items-center min-w-[40px]">
          {isHome ? (
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-user-accent rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                {salonConfig?.logo ? (
                  <img 
                    src={salonConfig.logo} 
                    alt={shopName} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="serif-display text-white text-lg md:text-xl font-bold">
                    {shopName.charAt(0)}
                  </span>
                )}
              </div>
              <span className="serif-display text-base md:text-xl lg:text-2xl font-black tracking-tight hidden sm:block">
                {shopName}
              </span>
            </div>
          ) : (
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 md:gap-2 group text-gray-800 dark:text-gray-100 hover:text-user-accent transition-all duration-300"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gray-50 dark:bg-dark-card flex items-center justify-center group-hover:bg-user-accent group-hover:text-white transition-all shadow-sm">
                <ChevronLeft size={18} className="md:w-5 md:h-5" />
              </div>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest hidden md:block">Back</span>
            </button>
          )}
        </div>

        {/* Mobile: Search Bar - Only on Home */}
        {showSearchBar && (
          <div className="flex-1 mx-3 md:hidden">
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-user-accent transition-colors pointer-events-none">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Search services..."
                className="w-full py-2 pl-9 pr-8 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-user-accent transition-all"
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              />
              {searchQuery && (
                <button 
                  onClick={() => dispatch(setSearchQuery(""))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-user-accent transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desktop: Full Searchbar - Only on Home */}
        {showSearchBar && (
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-user-accent transition-colors pointer-events-none">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search services, products..."
              className="w-full py-2.5 pl-11 pr-10 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-user-accent transition-all"
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            />
            {searchQuery && (
              <button 
                onClick={() => dispatch(setSearchQuery(""))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-user-accent transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 items-center justify-center rounded-xl md:rounded-2xl bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface hover:text-user-accent transition-all duration-300 group overflow-hidden border border-black/5 shadow-sm"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="group-hover:scale-110 transition-transform text-amber-500" />
            ) : (
              <Moon size={18} className="group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Profile - Desktop Only */}
          <Link 
            to={`/${shopSlug}/user/profile`} 
            className="hidden md:flex w-10 h-10 lg:w-11 lg:h-11 items-center justify-center rounded-2xl hover:bg-user-accent-soft transition-all duration-300 group overflow-hidden border border-black/5 shadow-sm"
          >
            {user?.photo?.url || user?.photo?.path || (typeof user?.photo === 'string' && user.photo) || user?.profileImage ? (
              <img 
                src={user.photo?.url || user.photo?.path || (typeof user?.photo === 'string' ? user.photo : user.profileImage)} 
                alt="Profile" 
                className="w-full h-full object-cover transition-transform group-hover:scale-110" 
              />
            ) : (
              <div className="w-full h-full bg-gray-50 dark:bg-dark-card flex items-center justify-center">
                <User size={20} className="text-user-text-muted group-hover:text-user-accent transition-colors" />
              </div>
            )}
          </Link>

          {/* Cart - Desktop Only */}
          <button 
            onClick={() => dispatch(setCartOpen(true))}
            className="hidden md:flex relative w-10 h-10 lg:w-11 lg:h-11 items-center justify-center rounded-2xl bg-user-accent text-white hover:opacity-90 transition-all shadow-lg shadow-black/10 active:scale-95 group"
          >
            <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-user-gold text-white text-[9px] font-black w-5 h-5 rounded-full border-2 border-white dark:border-dark-surface flex items-center justify-center shadow-lg animate-pulse">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </nav>
  );
};

export default UserNavbar;
