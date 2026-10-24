import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  BookOpen,
  CreditCard,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

import { useAuth } from "../../../features/auth/hooks/useAuth";
import { getDynamicPortalPath } from "../../../utils/portalUtils";

const AccountsTopNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopSlug } = useParams();
  const { portalRole } = useAuth();

  const tabs = [
    {
      id: "chart-of-accounts",
      label: "Chart of Accounts",
      icon: BookOpen,
      path: getDynamicPortalPath(shopSlug, portalRole, "/admin/accounts/chart-of-accounts"),
    },
    {
      id: "receipt",
      label: "Receipts",
      icon: ArrowDownCircle,
      path: getDynamicPortalPath(shopSlug, portalRole, "/admin/accounts/receipt"),
    },
    {
      id: "payment",
      label: "Payments",
      icon: ArrowUpCircle,
      path: getDynamicPortalPath(shopSlug, portalRole, "/admin/accounts/payment"),
    },
    {
      id: "contra",
      label: "Contra",
      icon: CreditCard,
      path: getDynamicPortalPath(shopSlug, portalRole, "/admin/accounts/contra"),
    },
    {
      id: "journal",
      label: "Journal Entry",
      icon: FileText,
      path: getDynamicPortalPath(shopSlug, portalRole, "/admin/accounts/journal"),
    },
  ];

  const currentPath = location.pathname;
  const { hasPermission } = useAuth();

  const allowedTabs = tabs.filter((tab) => {
    // receipts and payments are already plural in system
    if (tab.id === "chart-of-accounts") return hasPermission("accounts:coa:view");
    return hasPermission(`accounts:${tab.id}s:view`) || hasPermission(`accounts:${tab.id}:view`);
  });

  return (
    <div className="bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border p-2 flex items-center gap-2 overflow-x-auto scrollbar-hide sticky top-0 z-10">
      {allowedTabs.map((tab) => {
        const isActive = currentPath.includes(tab.path);
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
              ${isActive
                ? "bg-brand-primary text-white"
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-gray-900 dark:text-white"
              }
            `}
          >
            <tab.icon size={16} strokeWidth={2.5} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export { AccountsTopNav as AccountingTopNav };
export default AccountsTopNav;
