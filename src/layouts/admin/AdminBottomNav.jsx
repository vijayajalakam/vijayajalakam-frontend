import React, { useMemo } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { adminMenu } from "./adminMenu.config";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { getDynamicPortalPath } from "../../utils/portalUtils";
import { selectBookingBadgeCount } from "../../store/slices/bookingBadgeSlice";

const AdminBottomNav = () => {
  const location = useLocation();
  const badgeCount = useSelector(selectBookingBadgeCount);
  const { shopSlug, portalRole: urlPortalRole } = useParams();
  const { portalRole: authPortalRole, user, hasPermission } = useAuth();
  // Use the portalRole from the URL as ground truth (handles SHOP_ADMIN using /admin/ URLs)
  const portalRole = urlPortalRole || authPortalRole;

  // The requested menu labels
  const allowedLabels = ["Dashboard", "Invoice", "Stock", "Reports"];

  // Filter the original adminMenu config by both labels and permissions
  const filteredMenu = useMemo(() => {
    if (!user) return [];

    let menu = adminMenu.filter((item) => allowedLabels.includes(item.label));

    console.log("[AdminBottomNav] Filtering menu for user:", user);
    console.log("[AdminBottomNav] User role:", user.role);
    console.log("[AdminBottomNav] User privileges:", user.privileges);

    // Only SUPER_ADMIN sees all allowed labels without filtering
    if (user.role === "SUPER_ADMIN") {
      console.log("[AdminBottomNav] User is SUPER_ADMIN, showing all allowed items");
      return menu;
    }

    // For SHOP_ADMIN and staff, filter by privileges
    const filtered = menu.filter(item => {
      if (!item.permission) {
        console.log(`[AdminBottomNav] Item "${item.label}" has no permission requirement, showing`);
        return true;
      }
      const hasAccess = hasPermission(item.permission);
      console.log(`[AdminBottomNav] Item "${item.label}" requires "${item.permission}", hasAccess:`, hasAccess);
      return hasAccess;
    });
    
    console.log("[AdminBottomNav] Filtered menu items:", filtered.map(i => i.label));
    return filtered;
  }, [user, hasPermission]);

  if (filteredMenu.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border shadow-lg">
      <div className="flex justify-around items-center h-16">
        {filteredMenu.map((item) => {
          const Icon = item.icon;

          const toPath = getDynamicPortalPath(shopSlug, portalRole, item.path);

          // Check if current path starts with the item's path (covers sub-routes)
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
                return `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${active
                  ? "text-brand-primary"
                  : "text-gray-500 hover:text-gray-900 dark:text-white"
                  }`;
              }}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.label === "Bookings" && badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-md border border-white dark:border-dark-surface">
                    {badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default AdminBottomNav;
