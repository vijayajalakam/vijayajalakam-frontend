import React, { useMemo } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { adminMenu } from "../adminMenu.config";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { getDynamicPortalPath } from "../../../utils/portalUtils";
import { selectBookingBadgeCount } from "../../../store/slices/bookingBadgeSlice";

const DesktopSidebar = ({ isOpen, setOpen, menuItems = adminMenu }) => {
  const { user, salonConfig, hasPermission, portalRole: authPortalRole, sidebarStyle, sidebarItemOrientation } = useAuth();
  const badgeCount = useSelector(selectBookingBadgeCount);
  
  const location = useLocation();
  const { shopSlug, portalRole: urlPortalRole } = useParams();
  const portalRole = urlPortalRole || authPortalRole;

  const filteredMenu = useMemo(() => {
    if (!user) return [];
    if (user.role === "SUPER_ADMIN") return menuItems;
    return menuItems.filter(item => !item.permission || hasPermission(item.permission));
  }, [menuItems, user, hasPermission]);

  const getSidebarClasses = () => {
    switch (sidebarStyle) {
      case "dark":
        return "bg-[#0f172a] border-gray-800 text-gray-400 dark:text-gray-500";
      case "glass":
        return "bg-white/70 dark:bg-dark-card/70 backdrop-blur-md border-white/20 dark:border-dark-border/20";
      case "gradient":
        return "bg-gradient-to-b from-brand-primary to-brand-secondary border-white/10 text-white";
      case "navy":
        return "bg-[#0f172a] border-white/5 text-white/70";
      default:
        return "bg-white dark:bg-dark-surface border-gray-200/50 dark:border-dark-border";
    }
  };

  const getActiveItemClasses = (active) => {
    if (!active) return "";
    switch (sidebarStyle) {
      case "dark":
        return "bg-white dark:bg-dark-surface/10 text-white shadow-lg";
      case "glass":
        return "bg-brand-primary/10 text-brand-primary shadow-none border border-brand-primary/10";
      case "gradient":
        return "bg-white dark:bg-dark-surface/20 text-white shadow-none";
      case "solid":
        return "bg-brand-primary text-white shadow-md";
      case "navy":
        return "bg-brand-primary text-white shadow-lg";
      default:
        // Background is secondary, text/icon/left bar is primary
        return "bg-brand-secondary/10 text-brand-primary shadow-none";
    }
  };

  const getInActiveItemClasses = () => {
    switch (sidebarStyle) {
      case "dark":
        return "text-gray-400 dark:text-gray-500 hover:bg-white dark:bg-dark-surface/5 hover:text-white";
      case "glass":
        return "text-gray-600 dark:text-gray-400 hover:bg-brand-primary/5 hover:text-brand-primary";
      case "gradient":
        return "text-white/70 hover:bg-white dark:bg-dark-surface/10 hover:text-white";
      case "navy":
        return "text-white/60 hover:bg-white dark:bg-dark-surface/5 hover:text-white";
      default:
        return "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white";
    }
  };

  const getIconClasses = (active) => {
    if (active) {
      if (sidebarStyle === "dark" || sidebarStyle === "gradient" || sidebarStyle === "solid" || sidebarStyle === "navy") return "text-white";
      return "text-brand-primary";
    }
    switch (sidebarStyle) {
      case "gradient":
        return "text-white/50 group-hover:text-white transition-colors";
      case "dark":
        return "text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors";
      default:
        return "text-gray-400 dark:text-gray-500 group-hover:text-primary-dynamic transition-colors";
    }
  };

  const getHeaderClasses = () => {
    switch (sidebarStyle) {
      case "dark": return "border-gray-800";
      case "glass": return "border-white/10 dark:border-dark-border/10";
      case "gradient": return "border-white/10";
      case "navy": return "border-white/5";
      default: return "border-gray-100 dark:border-dark-border";
    }
  }

  const getTitleClasses = () => {
    switch (sidebarStyle) {
      case "dark": return "text-white";
      case "gradient": return "text-white";
      case "navy": return "text-white";
      default: return "text-gray-900 dark:text-white";
    }
  }

  return (
    <Motion.aside
      initial={false}
      animate={{ 
        width: isOpen 
          ? (sidebarItemOrientation === "column" ? 100 : 240) 
          : 80 
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`flex flex-col border-r overflow-hidden h-full z-20 transition-all duration-300 ${getSidebarClasses()}`}
    >
      {/* Sidebar Header */}
      <div className={`h-16 flex items-center px-4 border-b flex-shrink-0 transition-all duration-300 ${getHeaderClasses()} ${(!isOpen || sidebarItemOrientation === 'column') ? "justify-center" : "justify-between"}`}>
        
        {/* Logo - Only shown when collapsed OR in column mode (since width is narrow) */}
        {!isOpen || sidebarItemOrientation === 'column' ? (
          <button 
            onClick={() => setOpen(!isOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-brand-primary/20 transition-all"
          >
            {salonConfig?.logo ? (
              <img src={salonConfig.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${sidebarStyle === 'gradient' ? 'bg-white dark:bg-dark-surface/20' : 'bg-primary-dynamic'}`}>
                <span className="text-white font-black text-xl">
                  {salonConfig?.salonName ? salonConfig.salonName.charAt(0).toUpperCase() : "S"}
                </span>
              </div>
            )}
          </button>
        ) : (
          /* Expanded View: Hide Logo, Show Name & Toggle */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {salonConfig?.logo ? (
                  <img src={salonConfig.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${sidebarStyle === 'gradient' ? 'bg-white dark:bg-dark-surface/20' : 'bg-primary-dynamic'}`}>
                    <span className="text-white font-black text-xl">
                      {salonConfig?.salonName ? salonConfig.salonName.charAt(0).toUpperCase() : "S"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
              <span
                className={`text-sm font-black leading-none tracking-tight truncate ${getTitleClasses()}`}
                title={salonConfig?.salonName || "SALON SYSTEM"}
              >
                {salonConfig?.salonName || "SALON SYSTEM"}
              </span>
              <span
                className={`text-[10px] font-bold leading-none mt-0.5 truncate ${sidebarStyle === 'gradient' ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'}`}
                title={user?.role ? user.role.replace(/_/g, " ") : "ERP Solution"}
              >
                {user?.role ? user.role.replace(/_/g, " ") : "ERP Solution"}
              </span>
            </div>
          </div>

            <button
              onClick={() => setOpen(false)}
              className={`p-1.5 rounded-lg border transition-all ${
                sidebarStyle === 'dark' ? 'border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-white dark:bg-dark-surface/5 hover:text-white' :
                sidebarStyle === 'gradient' ? 'border-white/10 text-white/50 hover:bg-white dark:bg-dark-surface/10 hover:text-white' :
                sidebarStyle === 'navy' ? 'border-white/5 text-white/40 hover:bg-white dark:bg-dark-surface/5 hover:text-white' :
                'border-gray-100 dark:border-dark-border text-gray-400 dark:text-gray-500 dark:border-gray-500 hover:text-primary-dynamic hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card'
              }`}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 pt-3 pb-6 px-3 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <div className="space-y-3">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const toPath = getDynamicPortalPath(shopSlug, portalRole, item.path);
            const isSubRouteActive = location.pathname.startsWith(toPath + "/") || location.pathname === toPath;
            const isCustomActive =
              isSubRouteActive ||
              item.activePaths?.some(
                (path) => {
                  const resolvedPath = getDynamicPortalPath(shopSlug, portalRole, path);
                  return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath + "/");
                },
              );

            return (
              <NavLink
                key={item.path}
                to={toPath}
                end={false}
                className={({ isActive }) => {
                  const active = isCustomActive || isActive;
                  const isColumn = isOpen && sidebarItemOrientation === "column";
                  return `flex transition-all duration-200 group relative rounded-xl ${
                    isColumn 
                      ? "flex-col items-center justify-center py-3 px-1 gap-1.5 text-center" 
                      : `flex-row items-center ${isOpen ? "gap-4 px-5" : "justify-center px-0"} py-2.5`
                  } ${
                    active ? getActiveItemClasses(active) : getInActiveItemClasses()
                  }`;
                }}
                title={!isOpen ? item.label : ""}
              >
                {({ isActive }) => {
                  const active = isCustomActive || isActive;
                  const isColumn = isOpen && sidebarItemOrientation === "column";
                  return (
                    <>
                      <div className="relative flex-shrink-0">
                        <Icon
                          className={`transition-all duration-200 ${
                            isColumn ? "w-6 h-6" : "w-5 h-5"
                          } ${getIconClasses(active)}`}
                        />
                        {item.label === "Bookings" && badgeCount > 0 && (!isOpen || isColumn) && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center shadow-md border border-white dark:border-dark-surface">
                            {badgeCount}
                          </span>
                        )}
                      </div>
                      <AnimatePresence>
                        {isOpen && (
                          <Motion.span
                            initial={{ opacity: 0, y: sidebarItemOrientation === "column" ? 5 : 0, x: sidebarItemOrientation === "column" ? 0 : -10 }}
                            animate={{ opacity: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, y: sidebarItemOrientation === "column" ? 5 : 0, x: sidebarItemOrientation === "column" ? 0 : -10 }}
                            className={`font-bold whitespace-nowrap overflow-hidden transition-all duration-200 ${
                              sidebarItemOrientation === "column" ? "text-[9px] uppercase tracking-[0.1em]" : "text-sm"
                            }`}
                          >
                            {item.label}
                          </Motion.span>
                        )}
                      </AnimatePresence>
                      {isOpen && !isColumn && item.label === "Bookings" && badgeCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                          {badgeCount}
                        </span>
                      )}
                      {active && (sidebarStyle === 'classic' || sidebarStyle === 'dark') && (
                        <Motion.div
                          layoutId="active-pill"
                          className="absolute left-0 w-1.5 h-6 bg-brand-primary rounded-r-full"
                        />
                      )}
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </div>
      </div>
    </Motion.aside>
  );
};

export default DesktopSidebar;
