import React from "react";
import {
  useNavigate,
  useLocation,
  Outlet,
  useParams,
  Navigate,
} from "react-router-dom";
import { ConciergeBell, Clock } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";

const ServicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopSlug } = useParams();
  const { hasPermission, isAdmin, portalRole } = useAuth();

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);
  const getDynamicPortalPath = (path) => {
    const cleanPath = path.replace(/^\/(admin|staff)/, "");
    return getPath(`/${portalRole}${cleanPath}`);
  };

  const tabs = [
    {
      id: "services",
      label: "Services",
      icon: ConciergeBell,
      path: getDynamicPortalPath("/admin/services/list"),
      permission: "services:general:view",
    },
    {
      id: "slots",
      label: "Slots",
      icon: Clock,
      path: getDynamicPortalPath("/admin/services/slots"),
      permission: "services:slots:general:view",
    },
  ];

  const allowedTabs = tabs.filter(
    (tab) => isAdmin || hasPermission(tab.permission),
  );
  const currentPath = location.pathname;

  // If at root services path, redirect to first allowed tab
  const isAtRoot =
    currentPath === getDynamicPortalPath("/admin/services") ||
    currentPath === getDynamicPortalPath("/admin/services/") ||
    currentPath === getPath(`/${portalRole}/services`) ||
    currentPath === getPath(`/${portalRole}/services/`);

  if (isAtRoot && allowedTabs.length > 0) {
    return <Navigate to={allowedTabs[0].path} replace />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top Navigation Tabs */}
      <div className="bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border p-3 md:p-4 lg:p-3 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0 transition-colors duration-300">
        {allowedTabs.map((tab) => {
          const isActive =
            currentPath.includes(tab.path) ||
            (tab.id === "services" && currentPath.endsWith("/services/list"));
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`
                flex shrink-0 items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                ${
                  isActive
                    ? "bg-brand-primary text-white scale-[1.02]"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white"
                }
              `}
            >
              <tab.icon size={16} strokeWidth={2.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-20">
        <Outlet />
      </div>
    </div>
  );
};

export default ServicePage;
