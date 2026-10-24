import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  FileText,
  RotateCcw,
  AlertTriangle,
  Package,
  ClipboardList,
  Truck,
  MinusCircle,
  Scissors,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

import { useAuth } from "../../../features/auth/hooks/useAuth";

const StockTopNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopSlug } = useParams();
  const { portalRole, stockButtonsView = "row" } = useAuth();

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);

  const getDynamicPortalPath = (path) => {
    const cleanPath = path.replace(/^\/(admin|staff)/, "");
    return getPath(`/${portalRole}${cleanPath}`);
  };

  const tabs = [
    {
      id: "products",
      label: "Products",
      icon: Package,
      path: getDynamicPortalPath("/admin/stock/products"),
      reportPath: getDynamicPortalPath("/admin/reports/stock-report"),
    },
    {
      id: "purchase-order",
      label: "Purchase Order",
      icon: ClipboardList,
      path: getDynamicPortalPath("/admin/stock/purchase-order"),
      reportPath: getDynamicPortalPath("/admin/reports/purchase-order-report"),
    },
    {
      id: "purchase-invoice",
      label: "Purchase Entry",
      icon: FileText,
      path: getDynamicPortalPath("/admin/stock/purchase-invoice"),
      reportPath: getDynamicPortalPath("/admin/reports/purchase-report"),
    },
    {
      id: "purchase-return",
      label: "Purchase Return",
      icon: RotateCcw,
      path: getDynamicPortalPath("/admin/stock/purchase-return"),
      reportPath: getDynamicPortalPath("/admin/reports/purchase-return-report"),
    },
    {
      id: "stock-adjustment",
      label: "Stock Adjustment",
      icon: ClipboardCheck,
      path: getDynamicPortalPath("/admin/stock/stock-adjustment"),
      reportPath: getDynamicPortalPath("/admin/reports/stock-adjustment-report"),
    },
    {
      id: "stock-transfer",
      label: "Stock Transfer",
      icon: Truck,
      path: getDynamicPortalPath("/admin/stock/stock-transfer"),
      reportPath: getDynamicPortalPath("/admin/reports/stock-transfer-report"),
    },
    {
      id: "damage-entry",
      label: "Damage Entry",
      icon: AlertTriangle,
      path: getDynamicPortalPath("/admin/stock/damage-entry"),
      reportPath: getDynamicPortalPath("/admin/reports/damage-report"),
    },
    {
      id: "consumption-entry",
      label: "Consumption Entry",
      icon: MinusCircle,
      path: getDynamicPortalPath("/admin/stock/consumption-entry"),
      reportPath: getDynamicPortalPath("/admin/reports/consumption-report"),
    },
  ];

  const currentPath = location.pathname;

  // Determine which tab is active — match by startsWith to cover sub-routes and report views
  const getActiveTab = () => {
    return tabs.find(
      (tab) =>
        currentPath === tab.path ||
        currentPath.startsWith(tab.path + "/") ||
        (tab.reportPath && (currentPath === tab.reportPath || currentPath.startsWith(tab.reportPath + "/")))
    );
  };
  const activeTab = getActiveTab();

  return (
    <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border flex items-center gap-3 p-4 overflow-x-auto scrollbar-hide sticky top-0 z-10 shrink-0 transition-colors duration-300">
      {tabs.map((tab) => {
        const isActive = activeTab?.id === tab.id;
        const isReportActive = isActive && (currentPath === tab.reportPath || currentPath.startsWith(tab.reportPath + "/"));
        const isMainActive = isActive && !isReportActive;

        return (
          <div
            key={tab.id}
            className={`
              flex ${stockButtonsView === "column" ? "flex-col items-stretch" : "items-stretch"} rounded-xl border transition-all duration-200 shrink-0 overflow-hidden
              ${isActive
                ? "bg-brand-primary text-white border-transparent shadow-md"
                : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface hover:border-gray-300"
              }
            `}
          >
            {/* Main Action Button */}
            <button
              onClick={() => navigate(tab.path)}
              className={`
                flex ${stockButtonsView === "column" ? "flex-row items-center justify-center gap-2 py-2 px-4 min-w-[140px] w-full" : "flex-col items-center justify-center gap-1.5 py-2.5 px-4 min-w-[100px]"} transition-all duration-200
                ${isMainActive
                  ? "text-white font-bold"
                  : isActive
                    ? "text-white/60 hover:text-white"
                    : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                }
              `}
            >
              <tab.icon size={18} strokeWidth={isMainActive ? 2.5 : 2} />
              <span className={`${stockButtonsView === "column" ? "text-xs" : "text-[11px]"} font-bold tracking-tight`}>{tab.label}</span>
            </button>

            {/* Divider Line */}
            <div
              className={`
                ${stockButtonsView === "column" ? "h-[1px] w-full" : "w-[1px] self-stretch my-2"}
                ${isActive ? "bg-white/30" : "bg-gray-200 dark:bg-dark-border"}
              `}
            />

            {/* Reports Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(tab.reportPath);
              }}
              className={`
                flex ${stockButtonsView === "column" ? "flex-row items-center justify-center gap-2 py-2 px-4 min-w-[140px] w-full" : "flex-col items-center justify-center gap-1.5 py-2.5 px-4 min-w-[100px]"} transition-all duration-200
                ${isReportActive
                  ? "text-white font-bold"
                  : isActive
                    ? "text-white/60 hover:text-white"
                    : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                }
              `}
            >
              <BarChart3 size={18} strokeWidth={isReportActive ? 2.5 : 2} />
              <span className={`${stockButtonsView === "column" ? "text-xs" : "text-[11px]"} font-bold tracking-tight`}>Reports</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export { StockTopNav as InventoryTopNav };
export default StockTopNav;
