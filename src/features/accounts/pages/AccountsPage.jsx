import React from "react";
import {
  useNavigate,
  useLocation,
  Outlet,
  useParams,
  Navigate,
} from "react-router-dom";
import {
  BookOpen,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
} from "lucide-react";

import { useAuth } from "../../auth/hooks/useAuth";

const AccountsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopSlug } = useParams();
  const { hasPermission, portalRole, stockButtonsView = "row" } = useAuth();

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);
  const getDynamicPortalPath = (path) => {
    const cleanPath = path.replace(/^\/(admin|staff)/, "");
    return getPath(`/${portalRole}${cleanPath}`);
  };

  const tabs = [
    {
      id: "chart-of-accounts",
      label: "Chart of Accounts",
      icon: BookOpen,
      path: getDynamicPortalPath("/admin/accounts/chart-of-accounts"),
      reportPath: getDynamicPortalPath("/admin/reports/account-statement"),
      permission: "accounts:coa:view",
    },
    {
      id: "receipt",
      label: "Receipts",
      icon: ArrowDownCircle,
      path: getDynamicPortalPath("/admin/accounts/receipt"),
      reportPath: getDynamicPortalPath("/admin/reports/receipt-report"),
      permission: "accounts:receipts:view",
    },
    {
      id: "payment",
      label: "Payments",
      icon: ArrowUpCircle,
      path: getDynamicPortalPath("/admin/accounts/payment"),
      reportPath: getDynamicPortalPath("/admin/reports/ac-payment-report"),
      permission: "accounts:payments:view",
    },
  ];

  // Filter tabs by permission
  const allowedTabs = tabs.filter((tab) => hasPermission(tab.permission));
  const currentPath = location.pathname;

  // If at root accounts path, redirect to first allowed tab
  const isAtRoot =
    currentPath === getDynamicPortalPath("/admin/accounts") ||
    currentPath === getDynamicPortalPath("/admin/accounts/");

  // Determine which tab is active — match by startsWith to cover sub-routes and report views
  const getActiveTab = () => {
    return allowedTabs.find(
      (tab) =>
        currentPath === tab.path ||
        currentPath.startsWith(tab.path + "/") ||
        (tab.reportPath && (currentPath === tab.reportPath || currentPath.startsWith(tab.reportPath + "/")))
    );
  };
  const activeTab = getActiveTab();

  if (isAtRoot && allowedTabs.length > 0) {
    return <Navigate to={allowedTabs[0].path} replace />;
  }

  return (
    <div className="flex flex-col">
      <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border flex items-center gap-3 p-4 overflow-x-auto scrollbar-hide sticky top-0 z-10 shrink-0 transition-colors duration-300">
        {allowedTabs.map((tab) => {
          const isActive = activeTab?.id === tab.id;
          const isReportActive = isActive && (currentPath === tab.reportPath || currentPath.startsWith(tab.reportPath + "/"));
          const isMainActive = isActive && !isReportActive;

          return (
            <div
              key={tab.id}
              className={`
                flex ${stockButtonsView === "column" ? "flex-col items-stretch" : "items-stretch"} rounded-xl border transition-all duration-200 shrink-0 overflow-hidden
                ${isActive
                  ? "bg-brand-primary text-white border-transparent"
                  : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface hover:border-gray-300"
                }
              `}
            >
              {/* Main Action Button */}
              <button
                onClick={() => navigate(tab.path)}
                className={`
                  flex ${stockButtonsView === "column" ? "flex-row items-center justify-center gap-1.5 py-1 px-3.5 min-w-[100px] w-full" : "flex-col items-center justify-center gap-1 py-1.5 px-3 min-w-[80px]"} transition-all duration-200
                  ${isMainActive
                    ? "text-white font-extrabold"
                    : isActive
                      ? "text-white/50 hover:text-white"
                      : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                  }
                `}
              >
                <tab.icon size={16} strokeWidth={isMainActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              </button>

              {/* Divider Line */}
              <div
                className={`
                  ${stockButtonsView === "column" ? "h-[1px] w-full" : "w-[1px] self-stretch my-2"}
                  ${isActive ? "bg-white/20" : "bg-gray-200 dark:bg-dark-border"}
                `}
              />

              {/* Reports Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(tab.reportPath);
                }}
                className={`
                  flex ${stockButtonsView === "column" ? "flex-row items-center justify-center gap-1.5 py-1 px-3.5 min-w-[100px] w-full" : "flex-col items-center justify-center gap-1 py-1.5 px-3 min-w-[80px]"} transition-all duration-200
                  ${isReportActive
                    ? "text-white font-extrabold"
                    : isActive
                      ? "text-white/50 hover:text-white"
                      : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                  }
                `}
              >
                <BarChart3 size={16} strokeWidth={isReportActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-tight">Reports</span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="p-4 md:p-6 pb-20">
        <Outlet />
      </div>
    </div>
  );
};

export default AccountsPage;
