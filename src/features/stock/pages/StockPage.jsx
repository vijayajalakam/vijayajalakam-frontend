import React from "react";
import { useNavigate, useLocation, Outlet, useParams, Navigate } from "react-router-dom";
import {
  FileText,
  RotateCcw,
  AlertTriangle,
  Package,
  ClipboardList,
  Truck,
  MinusCircle,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const StockPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopSlug, portalRole: urlPortalRole } = useParams();
  const { hasPermission, isAdmin, portalRole: authPortalRole, stockButtonsView = "row" } = useAuth();
  // Use the portalRole from the URL as ground truth (handles SHOP_ADMIN using /admin/ URLs)
  const portalRole = urlPortalRole || authPortalRole;

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);
  const getDynamicPortalPath = (path) => {
    const cleanPath = path.replace(/^\/(admin|staff|shop-admin)/, "");
    return getPath(`/${portalRole}${cleanPath}`);
  };

  const tabs = [
    {
      id: "products",
      label: "Products",
      icon: Package,
      path: getDynamicPortalPath("/admin/stock/products"),
      reportPath: getDynamicPortalPath("/admin/reports/stock-report"),
      permission: "stock:products:view",
    },
    {
      id: "purchase-order",
      label: "Purchase Order",
      icon: ClipboardList,
      path: getDynamicPortalPath("/admin/stock/purchase-order"),
      reportPath: getDynamicPortalPath("/admin/reports/purchase-report"),
      permission: "stock:purchase_orders:view",
    },
    {
      id: "purchase-invoice",
      label: "Purchase Entry",
      icon: FileText,
      path: getDynamicPortalPath("/admin/stock/purchase-invoice"),
      reportPath: getDynamicPortalPath("/admin/reports/purchase-report"),
      permission: "stock:purchase_invoices:view",
    },
    {
      id: "purchase-return",
      label: "Purchase Return",
      icon: RotateCcw,
      path: getDynamicPortalPath("/admin/stock/purchase-return"),
      reportPath: getDynamicPortalPath("/admin/reports/return-report"),
      permission: "stock:purchase_returns:view",
    },
    {
      id: "stock-adjustment",
      label: "Stock Adjustment",
      icon: ClipboardCheck,
      path: getDynamicPortalPath("/admin/stock/stock-adjustment"),
      reportPath: getDynamicPortalPath("/admin/reports/stock-report"),
      permission: "stock:stock_adjustment:view",
    },
    {
      id: "damage-entry",
      label: "Damage Entry",
      icon: AlertTriangle,
      path: getDynamicPortalPath("/admin/stock/damage-entry"),
      reportPath: getDynamicPortalPath("/admin/reports/damage-report"),
      permission: "stock:damage_entry:view",
    },
    {
      id: "consumption-entry",
      label: "Consumption Entry",
      icon: MinusCircle,
      path: getDynamicPortalPath("/admin/stock/consumption-entry"),
      reportPath: getDynamicPortalPath("/admin/reports/consumption-report"),
      permission: "stock:consumption_entry:view",
    },
  ];

  const allowedTabs = tabs.filter((tab) => isAdmin || hasPermission(tab.permission));
  const currentPath = location.pathname;

  // If at root stock path, redirect to first allowed tab
  const isAtRoot = 
    currentPath === getDynamicPortalPath("/admin/stock") || 
    currentPath === getDynamicPortalPath("/admin/stock/") ||
    currentPath === getPath(`/${portalRole}/stock`) ||
    currentPath === getPath(`/${portalRole}/stock/`);

  if (isAtRoot && allowedTabs.length > 0) {
    return <Navigate to={allowedTabs[0].path} replace />;
  }

  const isFullScreenForm =
    currentPath.includes("/new") || currentPath.includes("/edit");

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

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation Tabs — hidden on form pages, always visible on list pages */}
      {!isFullScreenForm && (
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
      )}

      <div
        className={
          isFullScreenForm ? "flex-1 overflow-hidden" : "p-4 md:p-6 pb-20"
        }
      >
        <Outlet />
      </div>
    </div>
  );
};

export default StockPage;
