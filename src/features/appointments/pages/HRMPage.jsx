import React from "react";
import {
  useNavigate,
  useLocation,
  Outlet,
  useParams,
  Navigate,
} from "react-router-dom";
import { Users, Clock, FileBarChart, Wallet, Shield } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";

const HRMPage = () => {
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
      id: "staff",
      label: "HRM",
      icon: Users,
      path: getDynamicPortalPath("/admin/hrm/staff"),
      permission: "hrm:staff:view", 
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: Clock,
      path: getDynamicPortalPath("/admin/hrm/attendance"),
      reportPath: getDynamicPortalPath("/admin/reports/staff-attendance"),
      permission: "hrm:attendance:view",
    },
    {
      id: "payroll",
      label: "Payroll",
      icon: Wallet,
      path: getDynamicPortalPath("/admin/hrm/payroll"),
      reportPath: getDynamicPortalPath("/admin/reports/payroll-report"),
      permission: "hrm:payroll:view",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      path: getDynamicPortalPath("/admin/hrm/security"),
      permission: "settings:more:privileges:view",
    },
  ];

  const allowedTabs = tabs.filter(
    (tab) => isAdmin || hasPermission(tab.permission)
  );
  
  const currentPath = location.pathname;

  const getActiveTab = () => {
    return allowedTabs.find(
      (tab) =>
        currentPath === tab.path ||
        currentPath.startsWith(tab.path + "/") ||
        (tab.reportPath && (currentPath === tab.reportPath || currentPath.startsWith(tab.reportPath + "/")))
    );
  };
  const activeTab = getActiveTab();

  // If at root HRM path, redirect to first allowed tab
  const isAtRoot =
    currentPath === getDynamicPortalPath("/admin/hrm") ||
    currentPath === getDynamicPortalPath("/admin/hrm/");

  if (isAtRoot && allowedTabs.length > 0) {
    return <Navigate to={allowedTabs[0].path} replace />;
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      {/* Top Navigation Tabs */}
      <div className="bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border p-3 md:p-4 lg:p-3 flex items-center gap-3 overflow-x-auto scrollbar-hide shrink-0 transition-colors duration-300 z-10 sticky top-0">
        {allowedTabs.map((tab) => {
          const isActive = activeTab?.id === tab.id;
          const isReportActive = isActive && tab.reportPath && (currentPath === tab.reportPath || currentPath.startsWith(tab.reportPath + "/"));
          const isMainActive = isActive && !isReportActive;

          return (
            <div
              key={tab.id}
              className={`
                flex items-stretch rounded-xl border transition-all duration-200 shrink-0 overflow-hidden
                ${isActive
                  ? "bg-brand-primary text-white border-transparent shadow-sm"
                  : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface hover:border-gray-300"
                }
              `}
            >
              {/* Main Action Button */}
              <button
                onClick={() => navigate(tab.path)}
                className={`
                  flex flex-col items-center justify-center gap-1 py-1.5 px-4 min-w-[80px] transition-all duration-200
                  ${isMainActive
                    ? "text-white font-extrabold"
                    : isActive
                      ? "text-white/60 hover:text-white"
                      : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                  }
                `}
              >
                <tab.icon size={16} strokeWidth={isMainActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              </button>

              {/* Conditionally render Reports attached button */}
              {tab.reportPath && hasPermission("reports:staff:staff_report") && (
                <>
                  <div
                    className={`
                      w-[1px] self-stretch my-2
                      ${isActive ? "bg-white/20" : "bg-gray-200 dark:bg-dark-border"}
                    `}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(tab.reportPath);
                    }}
                    className={`
                      flex flex-col items-center justify-center gap-1 py-1.5 px-4 min-w-[80px] transition-all duration-200
                      ${isReportActive
                        ? "text-white font-extrabold"
                        : isActive
                          ? "text-white/60 hover:text-white"
                          : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                      }
                    `}
                  >
                    <FileBarChart size={16} strokeWidth={isReportActive ? 2.5 : 2} />
                    <span className="text-[10px] font-bold tracking-tight">Reports</span>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-4 md:p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default HRMPage;
