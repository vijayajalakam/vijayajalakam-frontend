import React, { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle2, CalendarDays, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import {
  useGetAdminProfileQuery,
  useUpdateBusinessProfileMutation,
} from "../../../store/api/tenantCrudEndpoints";
import Snackbar from "../../../components/shared/Snackbar";
import { SettingsPageSkeleton } from "../../../components/shared/Skeleton";
import { useAuth } from "../../auth/hooks/useAuth";

const DayClosingSettings = () => {
  const { hasPermission, isAdmin, user, refreshConfig } = useAuth();
  const { data: profileData, isLoading: fetching } = useGetAdminProfileQuery();
  const [isDayClosingEnabled, setIsDayClosingEnabled] = useState(false);
  const [dayClosingIncludeTax, setDayClosingIncludeTax] = useState(true);
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const isUserChange = useRef(false);

  const isShopAdmin = isAdmin || user?.role === "SHOP_ADMIN";
  const canEdit = isShopAdmin || hasPermission("settings:day_closing:general:edit");

  const showSnack = useCallback((message, type = "success") => setSnack({ message, type }), []);

  useEffect(() => {
    const business = profileData?.businessProfile || profileData?.business;
    if (business) {
      setIsDayClosingEnabled(business.isDayClosingEnabled || false);
      setDayClosingIncludeTax(business.dayClosingIncludeTax !== false);
    }
  }, [profileData]);

  const [updateBusinessProfile] = useUpdateBusinessProfileMutation();

  const saveSettings = useCallback(async () => {
    try {
      const res = await updateBusinessProfile({ 
        isDayClosingEnabled,
        dayClosingIncludeTax
      }).unwrap();
      if (res.success) {
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
  }, [isDayClosingEnabled, dayClosingIncludeTax, showSnack, refreshConfig, updateBusinessProfile]);

  // Auto-save logic
  useEffect(() => {
    if (!isUserChange.current) return;
    
    const timer = setTimeout(() => {
      saveSettings();
    }, 800);

    return () => clearTimeout(timer);
  }, [isDayClosingEnabled, dayClosingIncludeTax, saveSettings]);

  if (fetching) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="max-w-4xl animate-in fade-in duration-500 space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-card rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 mb-6 shadow-none"
      >
        <div className="flex items-center justify-between gap-3 mb-6 border-b border-gray-100 dark:border-dark-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Day Closing Configuration</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Enable daily counter tracking and reports</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => {
              if (!canEdit) return;
              isUserChange.current = true;
              setIsDayClosingEnabled(prev => !prev);
            }}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
              isDayClosingEnabled 
                ? "bg-brand-primary/5 border-brand-primary shadow-sm ring-1 ring-brand-primary/10" 
                : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border opacity-60 hover:opacity-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDayClosingEnabled ? "bg-brand-primary text-white" : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
            }`}>
              <CalendarDays size={20} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-bold ${isDayClosingEnabled ? "text-brand-primary" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-400"}`}>Enable Day Closing</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Require counter opening & closing</div>
            </div>
            {isDayClosingEnabled && <CheckCircle2 size={16} className="ml-auto text-brand-primary dark:text-blue-400" />}
          </button>


        </div>
      </motion.div>
    </div>
  );
};

export default DayClosingSettings;
