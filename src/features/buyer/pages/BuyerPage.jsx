import React from "react";
import {
  useNavigate,
  useLocation,
  Outlet,
  useParams,
  Navigate,
} from "react-router-dom";
import { Users, UsersRound, BarChart3, Gift } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";

const BuyerPage = () => {
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
      id: "customers",
      label: "Buyer",
      icon: Users,
      path: getDynamicPortalPath("/admin/crm/customers"),
      permission: "crm:customers:view",
    },
    {
      id: "groups",
      label: "Buyer Group",
      icon: UsersRound,
      path: getDynamicPortalPath("/admin/crm/groups"),
      permission: "crm:customer_group:view",
    },
    {
      id: "loyalty-points",
      label: "Loyalty Points",
      icon: Gift,
      path: getDynamicPortalPath("/admin/crm/loyalty-points"),
      permission: "crm:loyalty_points:view",
    },
  ];

  const allowedTabs = tabs.filter(
    (tab) => isAdmin || hasPermission(tab.permission),
  );
  const currentPath = location.pathname;

  // If at root CRM path, redirect to first allowed tab
  const isAtRoot =
    currentPath === getDynamicPortalPath("/admin/crm") ||
    currentPath === getDynamicPortalPath("/admin/crm/");

  if (isAtRoot && allowedTabs.length > 0) {
    return <Navigate to={allowedTabs[0].path} replace />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top Navigation Tabs */}
      <div className="bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border p-3 md:p-4 lg:p-3 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0 transition-colors duration-300">
        {allowedTabs.map((tab) => {
          const isActive = currentPath.startsWith(tab.path);
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

        {/* Reports Navigation Button */}
        {hasPermission("reports:customer:customer_report") && (
          <button
            onClick={() => navigate(getDynamicPortalPath("/admin/reports"), { state: { targetSection: 'Buyer Reports' } })}
            className="ml-auto flex shrink-0 items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap text-brand-primary dark:text-blue-400 bg-brand-primary/10 hover:bg-brand-primary/20"
          >
            <BarChart3 size={16} strokeWidth={2.5} />
            Reports
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-20">
        <Outlet />
      </div>
    </div>
  );
};

export { BuyerPage as CRMPage };
export default BuyerPage;
