import React, { useMemo } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { adminMenu } from "../adminMenu.config";
import { X } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { getDynamicPortalPath } from "../../../utils/portalUtils";
const MobileSidebar = ({ isOpen, onClose, menuItems = adminMenu }) => {
  const { user, shopConfig, hasPermission, portalRole: authPortalRole, sidebarStyle } = useAuth();
  const { shopSlug, portalRole: urlPortalRole } = useParams();
  const portalRole = urlPortalRole || authPortalRole;
  const location = useLocation();

  const displayTitle = shopConfig?.shopName || "VIJAYAJALAKAM ADMIN";

  const getSidebarClasses = () => {
    switch (sidebarStyle) {
      case "dark":
        return "bg-[#0f172a] border-r border-gray-800 text-gray-400 dark:text-gray-500";
      case "glass":
        return "bg-white/70 dark:bg-dark-card/70 backdrop-blur-md border-r border-white/20 dark:border-dark-border/20";
      case "gradient":
        return "bg-gradient-to-b from-brand-primary to-brand-secondary border-r border-white/10 text-white";
      case "navy":
        return "bg-[#0f172a] border-r border-white/5 text-white/70";
      default:
        return "bg-white dark:bg-dark-surface border-r border-gray-100 dark:border-dark-border";
    }
  };

  const getActiveItemClasses = (active) => {
    if (!active) return "";
    switch (sidebarStyle) {
      case "dark":
        return "bg-white text-brand-primary shadow-lg font-bold";
      case "glass":
        return "bg-brand-primary/10 text-brand-primary shadow-none border border-brand-primary/10";
      case "gradient":
        return "bg-white/20 text-white shadow-none";
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
      if (sidebarStyle === "gradient" || sidebarStyle === "solid" || sidebarStyle === "navy") return "text-white";
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

  const filteredMenu = useMemo(() => {
    if (!user) return [];
    if (user.role === "SUPER_ADMIN") return menuItems;
    return menuItems.filter(item => !item.permission || hasPermission(item.permission));
  }, [menuItems, user, hasPermission]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[55] lg:hidden"
          />

          {/* Sidebar Drawer */}
          <Motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
            className={`fixed inset-y-0 left-0 w-[80%] shadow-2xl z-[60] lg:hidden flex flex-col ${getSidebarClasses()}`}
          >
            {/* Header */}
            <div className={`h-16 flex items-center justify-between px-6 border-b flex-shrink-0 ${getHeaderClasses()}`}>
              <div className="flex items-center gap-3">
                {shopConfig?.logo ? (
                  <img
                    src={shopConfig.logo}
                    alt={displayTitle}
                    className="h-10 w-auto object-contain max-w-[140px]"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xl ${sidebarStyle === 'gradient' ? 'bg-white dark:bg-dark-surface/20' : 'bg-brand-primary'}`}>
                    {displayTitle.charAt(0).toUpperCase()}
                  </div>
                )}
                {!shopConfig?.logo && (
                  <span className={`font-bold tracking-tight text-base truncate max-w-[120px] ${getTitleClasses()}`}>
                    {displayTitle}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className={`p-2 -mr-2 transition-colors ${
                  sidebarStyle === 'gradient' ? 'text-white/50 hover:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 pt-4 pb-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
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
                    onClick={onClose}
                    className={({ isActive }) => {
                      const active = isCustomActive || isActive;
                      return `flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-200 ${
                        active ? getActiveItemClasses(active) : getInActiveItemClasses()
                      }`;
                    }}
                  >
                    {({ isActive }) => {
                      const active = isCustomActive || isActive;
                      return (
                        <>
                          <Icon
                            className={`w-5 h-5 flex-shrink-0 ${getIconClasses(active)}`}
                          />
                          <span className={`text-sm font-bold tracking-tight ${active && (sidebarStyle === 'gradient' || sidebarStyle === 'solid' || sidebarStyle === 'navy') ? 'text-white' : ''}`}>
                            {item.label}
                          </span>
                          {active && (sidebarStyle === 'classic' || sidebarStyle === 'dark') && (
                            <Motion.div
                              layoutId="mobile-active-pill"
                              className="absolute left-0 w-1.5 h-6 bg-brand-primary rounded-r-full"
                            />
                          )}
                        </>
                      );
                    }}
                  </NavLink>
                );
              })}
            </nav>
          </Motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar;
