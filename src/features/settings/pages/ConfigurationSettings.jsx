import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  FileText, 
  Hash, 
  Type,
  Loader2,
  CheckCircle2,
  Settings,
  Scissors,
  Package,
  Users,
  Percent,
  CreditCard,
  RefreshCw,
  UserRound,
  ImagePlus,
  Trash2,
  Star,
  Search,
  X,
  Plus,
  Info,
  Tag,
  MousePointerClick,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useGetAdminProfileQuery,
  useUpdateBusinessProfileMutation,
} from "../../../store/api/tenantCrudEndpoints";
import CustomTextField from "../../../components/shared/CustomTextField";
import Snackbar from "../../../components/shared/Snackbar";
import { SettingsPageSkeleton } from "../../../components/shared/Skeleton";
import { useAuth } from "../../auth/hooks/useAuth";
import OffersManager from "../components/OffersManager";

const Section = ({ title, icon: Icon, subtitle, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-dark-card rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 mb-6 shadow-none"
  >
    <div className="flex items-center justify-between gap-3 mb-6 border-b border-gray-100 dark:border-dark-border pb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </motion.div>
);

const ALL_SECTIONS = [
  { id: "sales",     label: "Sales",      icon: Settings,   permission: "settings:more:configuration:sales" },
  { id: "cart",      label: "Cart",       icon: Users,      permission: "settings:more:configuration:cart" },
  { id: "userSide",  label: "User Side",  icon: UserRound,  permission: "settings:more:configuration:userside" },
  { id: "offers",    label: "Offers",     icon: Tag,        permission: "settings:more:configuration:sales" },
];



const ConfigurationSettings = () => {
  const { hasPermission, isAdmin, user, refreshConfig } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profileData, isLoading: fetching } = useGetAdminProfileQuery();
  const [updateBusinessProfile] = useUpdateBusinessProfileMutation();

  const [formData, setFormData] = useState({
    showServices: true,
    showProducts: true,
    duplicateItemAction: 'unselect',
    showItemStaff: false,
    showItemDiscount: false,
    showStaffCommission: false,
    showGlobalStaffSelection: true,
    showServicesToUser: true,
    showProductsToUser: true,
    additionalInfo: ["Instant confirmation", "Pay by app", "Parking available"],
  });
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const isUserChange = useRef(false);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = location.hash.replace("#", "");
    if (hash && ALL_SECTIONS.find((s) => s.id === hash)) {
      return hash;
    }
    return "sales";
  });

  const isShopAdmin = isAdmin || user?.role === "SHOP_ADMIN";

  const sections = useMemo(
    () =>
      isShopAdmin
        ? ALL_SECTIONS
        : ALL_SECTIONS.filter((section) => hasPermission(`${section.permission}:view`)),
    [isShopAdmin, hasPermission],
  );

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && sections.find((s) => s.id === hash)) {
      setActiveTab((prev) => (prev !== hash ? hash : prev));
    } else if (sections.length > 0) {
      setActiveTab((prev) => {
        if (!sections.find((s) => s.id === prev)) return sections[0].id;
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, location.hash]);

  useEffect(() => {
    if (activeTab && location.hash.replace("#", "") !== activeTab) {
      navigate(`#${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate]);

  const showSnack = useCallback((message, type = "success") => setSnack({ message, type }), []);

  useEffect(() => {
    if (profileData?.salon) {
      const { salon } = profileData;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        showServices: salon.showServices !== undefined ? salon.showServices : true,
        showProducts: salon.showProducts !== undefined ? salon.showProducts : true,
        duplicateItemAction: salon.duplicateItemAction || 'unselect',
        showItemStaff: salon.showItemStaff !== undefined ? salon.showItemStaff : false,
        showItemDiscount: salon.showItemDiscount !== undefined ? salon.showItemDiscount : false,
        showStaffCommission: salon.showStaffCommission !== undefined ? salon.showStaffCommission : false,
        showGlobalStaffSelection: salon.showGlobalStaffSelection !== undefined ? salon.showGlobalStaffSelection : true,
        showServicesToUser: salon.showServicesToUser !== undefined ? salon.showServicesToUser : true,
        showProductsToUser: salon.showProductsToUser !== undefined ? salon.showProductsToUser : true,
        additionalInfo: salon.additionalInfo || ["Instant confirmation", "Pay by app", "Parking available"],
      });
    }
  }, [profileData]);

  const saveSettings = useCallback(async () => {
    try {
      const res = await updateBusinessProfile(formData).unwrap();
      if (res) {
        showSnack("Settings saved automatically", "success");
        if (refreshConfig) {
          await refreshConfig();
        }
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      showSnack("Failed to auto-save settings", "error");
    } finally {
      isUserChange.current = false;
    }
  }, [formData, showSnack, refreshConfig, updateBusinessProfile]);

  // Auto-save logic
  useEffect(() => {
    if (!isUserChange.current) return;
    
    const timer = setTimeout(() => {
      saveSettings();
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, saveSettings]);

  const hasEditPermission = (sectionId) => {
    if (isShopAdmin) return true;
    const section = ALL_SECTIONS.find((s) => s.id === sectionId);
    return section && hasPermission(`${section.permission}:edit`);
  };

  const hasSection = (sectionId) => sections.some((s) => s.id === sectionId);

  if (fetching) {
    return <SettingsPageSkeleton />;
  }

  const renderSalesSection = () => (
    <Section 
      title="Sales Configuration" 
      icon={Settings}
      subtitle="Manage your shop type and modules"
    >
      <div className="md:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              if (!hasEditPermission("sales")) return;
              if (formData.showServices && !formData.showProducts) {
                showSnack("At least one module must be enabled", "warning");
                return;
              }
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showServices: !prev.showServices }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showServices 
                ? "bg-brand-primary/5 border-brand-primary shadow-sm ring-1 ring-brand-primary/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showServices ? "bg-brand-primary text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <Scissors size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showServices ? "text-brand-primary" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-400"}`}>SERVICE</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Enable service billing</div>
            </div>
            {formData.showServices && <CheckCircle2 size={16} className="ml-auto text-brand-primary dark:text-blue-400" />}
          </button>

          <button
            onClick={() => {
              if (!hasEditPermission("sales")) return;
              if (formData.showProducts && !formData.showServices) {
                showSnack("At least one module must be enabled", "warning");
                return;
              }
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showProducts: !prev.showProducts }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showProducts 
                ? "bg-brand-primary/5 border-brand-primary shadow-sm ring-1 ring-brand-primary/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showProducts ? "bg-brand-primary text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <Package size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showProducts ? "text-brand-primary" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-400"}`}>PRODUCT</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Enable product sales</div>
            </div>
            {formData.showProducts && <CheckCircle2 size={16} className="ml-auto text-brand-primary dark:text-blue-400" />}
          </button>
        </div>

        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 transition-all mt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                Service Click Behavior
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose what happens when you click a service that is already in the cart.
              </p>
            </div>
            <div className="p-2 bg-brand-primary/10 dark:bg-brand-primary/5 rounded-xl text-brand-primary dark:text-blue-400">
              <MousePointerClick size={20} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => {
                if (!hasEditPermission("sales")) return;
                isUserChange.current = true;
                setFormData(prev => ({ ...prev, duplicateItemAction: "unselect" }));
              }}
              className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                formData.duplicateItemAction === "unselect" || !formData.duplicateItemAction
                  ? "bg-brand-primary border-brand-primary text-white"
                  : "bg-transparent border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface"
              }`}
            >
              Sale Unselection
            </button>
            <button
              onClick={() => {
                if (!hasEditPermission("sales")) return;
                isUserChange.current = true;
                setFormData(prev => ({ ...prev, duplicateItemAction: "duplicate" }));
              }}
              className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                formData.duplicateItemAction === "duplicate"
                  ? "bg-brand-primary border-brand-primary text-white"
                  : "bg-transparent border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface"
              }`}
            >
              Add Same Service
            </button>
          </div>
        </div>
      </div>
    </Section>
  );

  const renderCartSection = () => (
    <Section 
      title="Cart Management" 
      icon={Users}
      subtitle="Configure invoice cart fields and staff settings"
    >
      <div className="md:col-span-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              if (!hasEditPermission("cart")) return;
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showItemStaff: !prev.showItemStaff }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showItemStaff 
                ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 shadow-sm ring-1 ring-emerald-500/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showItemStaff ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <Users size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showItemStaff ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 group-hover:text-gray-600"}`}>Staff Selection</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Per-item staff assignment</div>
            </div>
            {formData.showItemStaff && <CheckCircle2 size={16} className="ml-auto text-emerald-500" />}
          </button>

          <button
            onClick={() => {
              if (!hasEditPermission("cart")) return;
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showGlobalStaffSelection: !prev.showGlobalStaffSelection }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showGlobalStaffSelection 
                ? "bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20 shadow-sm ring-1 ring-blue-500/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showGlobalStaffSelection ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <Users size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showGlobalStaffSelection ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600"}`}>Global Staff Selection</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Top-level staff assignment</div>
            </div>
            {formData.showGlobalStaffSelection && <CheckCircle2 size={16} className="ml-auto text-blue-500" />}
          </button>

          <button
            onClick={() => {
              if (!hasEditPermission("cart")) return;
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showItemDiscount: !prev.showItemDiscount }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showItemDiscount 
                ? "bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 shadow-sm ring-1 ring-amber-500/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showItemDiscount ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <Percent size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showItemDiscount ? "text-amber-600 dark:text-amber-400" : "text-gray-400 group-hover:text-gray-600"}`}>Discount Field</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Per-item discount input</div>
            </div>
            {formData.showItemDiscount && <CheckCircle2 size={16} className="ml-auto text-amber-500" />}
          </button>

          <button
            onClick={() => {
              if (!hasEditPermission("cart")) return;
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showStaffCommission: !prev.showStaffCommission }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showStaffCommission 
                ? "bg-purple-50/50 dark:bg-purple-500/5 border-purple-200 dark:border-purple-500/20 shadow-sm ring-1 ring-purple-500/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showStaffCommission ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <CreditCard size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showStaffCommission ? "text-purple-600 dark:text-purple-400" : "text-gray-400 group-hover:text-gray-600"}`}>Miscellaneous</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Custom commission & shipping details</div>
            </div>
            {formData.showStaffCommission && <CheckCircle2 size={16} className="ml-auto text-purple-500" />}
          </button>
        </div>
      </div>
    </Section>
  );

  const renderUserSideSection = () => (
    <Section 
      title="User Side Configuration" 
      icon={UserRound}
      subtitle="Control what sections are visible to customers"
    >
      <div className="md:col-span-2 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              if (!hasEditPermission("userSide")) return;
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showServicesToUser: !prev.showServicesToUser }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showServicesToUser 
                ? "bg-teal-50/50 dark:bg-teal-500/5 border-teal-200 dark:border-teal-500/20 shadow-sm ring-1 ring-teal-500/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showServicesToUser ? "bg-teal-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <Scissors size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showServicesToUser ? "text-teal-600 dark:text-teal-400" : "text-gray-400 group-hover:text-gray-600"}`}>SERVICE</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Show services section to customers</div>
            </div>
            {formData.showServicesToUser && <CheckCircle2 size={16} className="ml-auto text-teal-500" />}
          </button>

          <button
            onClick={() => {
              if (!hasEditPermission("userSide")) return;
              isUserChange.current = true;
              setFormData(prev => ({ ...prev, showProductsToUser: !prev.showProductsToUser }));
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              formData.showProductsToUser 
                ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20 shadow-sm ring-1 ring-indigo-500/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              formData.showProductsToUser ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <Package size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${formData.showProductsToUser ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-600"}`}>PRODUCT</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Show products section to customers</div>
            </div>
            {formData.showProductsToUser && <CheckCircle2 size={16} className="ml-auto text-indigo-500" />}
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Additional Information</label>
          {formData.additionalInfo.map((info, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1">
                <CustomTextField
                  value={info}
                  onChange={(e) => {
                    if (!hasEditPermission("userSide")) return;
                    isUserChange.current = true;
                    const newInfo = [...formData.additionalInfo];
                    newInfo[idx] = e.target.value;
                    setFormData(prev => ({ ...prev, additionalInfo: newInfo }));
                  }}
                  placeholder="e.g. Free Wi-Fi, Wheelchair accessible"
                />
              </div>
              <button
                onClick={() => {
                  if (!hasEditPermission("userSide")) return;
                  isUserChange.current = true;
                  setFormData(prev => ({
                    ...prev,
                    additionalInfo: prev.additionalInfo.filter((_, i) => i !== idx)
                  }));
                }}
                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all flex-shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          {hasEditPermission("userSide") && (
            <div className="flex items-center gap-2 mt-4">
              <input
                type="text"
                id="newAdditionalInfo"
                placeholder="Add new info (e.g. Free Wi-Fi)"
                className="flex-1 px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    isUserChange.current = true;
                    setFormData(prev => ({ ...prev, additionalInfo: [...prev.additionalInfo, e.target.value.trim()] }));
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById("newAdditionalInfo");
                  if (input.value.trim()) {
                    isUserChange.current = true;
                    setFormData(prev => ({ ...prev, additionalInfo: [...prev.additionalInfo, input.value.trim()] }));
                    input.value = '';
                  }
                }}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );

  return (
    <div className={`${activeTab === "offers" ? "w-full" : "max-w-4xl"} animate-in fade-in duration-500 space-y-6`}>
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* Main Tab Navigation */}
      {sections.length > 0 && (
        <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
          {sections.map((tab) => {
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
      )}

      <div className="w-full">
        <AnimatePresence mode="wait">
          {activeTab === "sales" && hasSection("sales") && renderSalesSection()}
          {activeTab === "cart" && hasSection("cart") && renderCartSection()}
          {activeTab === "userSide" && hasSection("userSide") && renderUserSideSection()}
          {activeTab === "offers" && hasSection("offers") && (
            <motion.div
              key="offers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <OffersManager />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Footer Note */}
      <div className="mt-10 mb-20 flex items-center justify-center gap-2 text-gray-400/60 dark:text-gray-500/40">
        <Settings className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global System Configuration | v1.3</span>
      </div>
    </div>
  );
};

export default ConfigurationSettings;
