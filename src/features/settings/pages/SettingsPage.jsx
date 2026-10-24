import React from "react";
import {
  useNavigate,
  useLocation,
  Outlet,
  useParams,
  Navigate,
} from "react-router-dom";
import {
  Store,
  Clock,
  Building,
  Printer,
  LayoutGrid,
  CalendarDays
} from "lucide-react";

import { useAuth } from "../../auth/hooks/useAuth";

const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopSlug } = useParams();
  const { hasPermission, isAdmin, portalRole, user } = useAuth();
  const isShopOwner = isAdmin || user?.role === "SHOP_ADMIN";

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);
  const getDynamicPortalPath = (path) => {
    const cleanPath = path.replace(/^\/(admin|staff)/, "");
    return getPath(`/${portalRole}${cleanPath}`);
  };

  const tabs = [
    {
      id: "profile",
      label: "Profile",
      icon: Building,
      path: getDynamicPortalPath("/admin/settings/profile"),
      permission: "settings:profile:general:view",
    },

    {
      id: "printer",
      label: "Printer",
      icon: Printer,
      path: getDynamicPortalPath("/admin/settings/printer"),
      permission: "settings:printer:general:view",
    },
    {
      id: "day-closing",
      label: "Day Closing",
      icon: CalendarDays,
      path: getDynamicPortalPath("/admin/settings/day-closing"),
      permission: "settings:day_closing:general:view",
    },
    {
      id: "more",
      label: "More",
      icon: LayoutGrid,
      path: getDynamicPortalPath("/admin/settings/more"),
      permission: "settings:more",
    },
  ];

  const allowedTabs = tabs.filter(
    (tab) => isShopOwner || hasPermission(tab.permission),
  );
  const currentPath = location.pathname;

  // If at root settings path, redirect to first allowed tab
  const isAtRoot =
    currentPath === getDynamicPortalPath("/admin/settings") ||
    currentPath === getDynamicPortalPath("/admin/settings/");

  if (isAtRoot && allowedTabs.length > 0) {
    return <Navigate to={allowedTabs[0].path} replace />;
  }

  const isImmersive =
    currentPath.includes("booking-display") ||
    currentPath.includes("privileges/new") ||
    currentPath.includes("privileges/edit");

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation Tabs */}
      {!isImmersive && (
        <div className="bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border p-2 flex items-center gap-2 overflow-x-auto scrollbar-hide sticky top-0 z-10 shrink-0 transition-colors duration-300">
          {allowedTabs.map((tab) => {
            const isActive = currentPath.includes(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`
                  flex shrink-0 items-center justify-center gap-2 px-6 h-11 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                  ${
                    isActive
                      ? "bg-brand-primary text-white"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white"
                  }
                `}
              >
                <tab.icon size={18} strokeWidth={2.5} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <div
        className={
          isImmersive
            ? "h-screen bg-white dark:bg-dark-surface flex flex-col"
            : "p-4 md:p-6 pb-20"
        }
      >
        <Outlet />
      </div>
    </div>
  );
};

export default SettingsPage;
