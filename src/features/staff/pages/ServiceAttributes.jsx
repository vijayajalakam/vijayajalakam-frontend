import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DepartmentsManager from "../../../components/admin/DepartmentsManager";
import CategoriesManager from "../../../components/admin/CategoriesManager";
import UnitsManager from "../../../components/admin/UnitsManager";
import PaymentMethodsManager from "../../../components/admin/PaymentMethodsManager";
import RegionalManager from "../../../components/admin/RegionalManager";
import TaxManager from "../../../components/admin/TaxManager";
import ThemeManager from "../../../components/admin/ThemeManager";
import VariantManager from "../../../components/admin/VariantManager";
import RoundOffManager from "../../../components/admin/RoundOffManager";
import {
  Layers,
  Tags,
  Wallet,
  Globe,
  Percent,
  Palette,
  ListTree,
  Calculator,
} from "lucide-react";

import { useAuth } from "../../auth/hooks/useAuth";

const ALL_TABS = [
  { id: "categories",  label: "Categories",       icon: Tags,       permission: "settings:manage:categories" },
  { id: "departments", label: "Department",        icon: Layers,     permission: "settings:manage:departments" },
  { id: "variants",    label: "Variants",          icon: ListTree,   permission: "settings:manage:variants" },
  { id: "units",       label: "Units",             icon: Layers,     permission: "settings:manage:units" },
  { id: "taxes",       label: "Tax Rates",         icon: Percent,    permission: "settings:manage:taxes" },
  { id: "payments",    label: "Payment Methods",   icon: Wallet,     permission: "settings:manage:payments" },
  { id: "roundoff",    label: "Round-Off",         icon: Calculator, permission: "settings:manage:roundoff" },
  { id: "regional",    label: "Regional Settings", icon: Globe,      permission: "settings:manage:regional" },
  { id: "theme",       label: "Theme",             icon: Palette,    permission: "settings:manage:theme" },
];

const ServiceAttributes = () => {
  const { hasPermission, isAdmin, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // SHOP_ADMIN should see all tabs; staff filtered by privilege
  const isShopAdmin = user?.role === "SHOP_ADMIN";

  const tabs = useMemo(
    () =>
      isAdmin || isShopAdmin
        ? ALL_TABS
        : ALL_TABS.filter((tab) => hasPermission(tab.permission)),
    [isAdmin, isShopAdmin, hasPermission],
  );

  const [activeTab, setActiveTab] = useState(() => {
    const hash = location.hash.replace("#", "");
    if (hash && tabs.find((t) => t.id === hash)) {
      return hash;
    }
    return tabs[0]?.id || "";
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
                  ? "bg-brand-primary text-white border-brand-primary"
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
        {activeTab === "categories"  && <CategoriesManager />}
        {activeTab === "units"       && <UnitsManager />}
        {activeTab === "departments" && <DepartmentsManager />}
        {activeTab === "variants"    && <VariantManager />}
        {activeTab === "taxes"       && <TaxManager />}
        {activeTab === "payments"    && <PaymentMethodsManager />}
        {activeTab === "roundoff"    && <RoundOffManager />}
        {activeTab === "theme"       && <ThemeManager />}
        {activeTab === "regional"    && <RegionalManager />}
      </div>
    </div>
  );
};

export default ServiceAttributes;
