import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentMethodsManager from "../../../components/admin/PaymentMethodsManager";
import ThemeManager from "../../../components/admin/ThemeManager";
import { Wallet, Palette } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";

const ALL_TABS = [
  {
    id: "payments",
    label: "Payment Methods",
    icon: Wallet,
    permission: "settings:manage:payments",
  },
  {
    id: "theme",
    label: "Theme",
    icon: Palette,
    permission: "settings:manage:theme",
  },
];

const ManageSettingsPage = () => {
  const { hasPermission, isAdmin, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // SHOP_ADMIN should see all tabs; staff filtered by privilege
  const isShopAdmin = isAdmin || user?.role === "SHOP_ADMIN";

  const tabs = useMemo(
    () =>
      isShopAdmin
        ? ALL_TABS
        : ALL_TABS.filter(
            (tab) =>
              hasPermission(tab.permission) ||
              hasPermission(`${tab.permission}:view`) ||
              hasPermission("settings:manage")
          ),
    [isAdmin, isShopAdmin, hasPermission],
  );

  const [activeTab, setActiveTab] = useState(() => {
    const hash = location.hash.replace("#", "");
    if (hash && tabs.find((t) => t.id === hash)) {
      return hash;
    }
    return tabs[0]?.id || "payments";
  });

  // Sync activeTab when tabs list changes or hash changes
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && tabs.find((t) => t.id === hash)) {
      setActiveTab((prev) => (prev !== hash ? hash : prev));
    } else if (tabs.length > 0) {
      setActiveTab((prev) => {
        if (!tabs.find((t) => t.id === prev)) return tabs[0].id;
        return prev;
      });
    }
  }, [tabs, location.hash]);

  // Update hash when tab changes
  useEffect(() => {
    if (activeTab && location.hash.replace("#", "") !== activeTab) {
      navigate(`#${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate]);

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-sm">
        You don't have permission to access any settings here.
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-semibold border ${
                isActive
                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                  : "bg-white text-gray-500 hover:bg-gray-50 border-gray-100 dark:bg-dark-card dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-border"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="w-full">
        {activeTab === "payments" && <PaymentMethodsManager />}
        {activeTab === "theme" && <ThemeManager />}
      </div>
    </div>
  );
};

export default ManageSettingsPage;
