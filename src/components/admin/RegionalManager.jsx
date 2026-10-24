import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import {
  Globe,
  Languages,
  CircleDollarSign,
  Save,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  useGetAdminProfileQuery,
  useUpdateBusinessProfileMutation,
} from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import PageHeader from "../shared/PageHeader";
import CustomDropdown from "../shared/CustomDropdown";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
} from "../../utils/languageUtils";
import Snackbar from "../../components/shared/Snackbar";
import { RegionalSkeleton } from "../../components/shared/Skeleton";

const RegionalManager = () => {
  const { refreshConfig, hasPermission } = useAuth();
  const isAdmin = hasPermission("settings:manage:regional:edit");

  const [formData, setFormData] = useState({
    country: "India",
    language: "English",
    currencySymbol: "₹",
    decimalPrecision: 2,
  });

  const { data: profile, isLoading: initialLoading } = useGetAdminProfileQuery();
  const [updateBusinessProfile] = useUpdateBusinessProfileMutation();
  const [loading, setLoading] = useState(false);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const countries = [
    { value: "India", label: "India" },
    { value: "UAE", label: "United Arab Emirates" },
    { value: "USA", label: "United States" },
    { value: "UK", label: "United Kingdom" },
    { value: "Saudi Arabia", label: "Saudi Arabia" },
    { value: "Qatar", label: "Qatar" },
    { value: "Kuwait", label: "Kuwait" },
    { value: "Bahrain", label: "Bahrain" },
    { value: "Oman", label: "Oman" },
  ];

  const languages = SUPPORTED_LANGUAGES.map((lang) => ({
    value: lang.value,
    label:
      lang.value === "English" ? (
        <span className="notranslate">English</span>
      ) : (
        lang.label
      ),
    searchLabel: lang.value,
  }));

  const currencies = [
    // ... (rest of currencies stays same)
    { value: "₹", label: "Rupee (₹)" },
    { value: "$", label: "Dollar ($)" },
    { value: "€", label: "Euro (€)" },
    { value: "£", label: "Pound (£)" },
    { value: "AED", label: "Dirham (AED)" },
    { value: "SAR", label: "Riyal (SAR)" },
    { value: "QR", label: "Riyal (QR)" },
    { value: "KD", label: "Dinar (KD)" },
    { value: "BD", label: "Dinar (BD)" },
    { value: "OMR", label: "Rial (OMR)" },
  ];

  useEffect(() => {
    const business = profile?.businessProfile || profile?.business;
    if (!business) return;
    setFormData({
      country: business.country || "India",
      language: business.language || "English",
      currencySymbol: business.currencySymbol || "₹",
      decimalPrecision:
        business.decimalPrecision !== undefined ? business.decimalPrecision : 2,
    });
  }, [profile]);

  const handlePresetChange = (countryId) => {
    let updates = {
      country: countryId,
      language: "English",
      currencySymbol: "₹",
    };

    switch (countryId) {
      case "UAE":
        updates.language = "Arabic";
        updates.currencySymbol = "AED";
        break;
      case "USA":
        updates.currencySymbol = "$";
        break;
      case "UK":
        updates.currencySymbol = "£";
        break;
      case "Saudi Arabia":
        updates.language = "Arabic";
        updates.currencySymbol = "SAR";
        break;
      case "Qatar":
        updates.language = "Arabic";
        updates.currencySymbol = "QR";
        break;
      case "Kuwait":
        updates.language = "Arabic";
        updates.currencySymbol = "KD";
        break;
      case "Bahrain":
        updates.language = "Arabic";
        updates.currencySymbol = "BD";
        break;
      case "Oman":
        updates.language = "Arabic";
        updates.currencySymbol = "OMR";
        break;
      default:
        // No automatic language/currency change for other countries
        break;
    }

    setFormData(updates);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setLoading(true);
    try {
      const res = await updateBusinessProfile(formData).unwrap();
      if (res?.success !== false) {
        await refreshConfig();
        showSnack("Regional Settings Updated Successfully!", "success");
      }
    } catch (err) {
      console.error("Failed to update regional settings:", err);
      showSnack(rtkErrorMessage(err, "Failed to update settings"), "error");
    } finally {
      setLoading(false);
    }
  };

  const currentLangConfig = getLanguageConfig(formData.language);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 sm:p-6 space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Globe size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Regional Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure your shop's country, language, and currency
            </p>
          </div>
        </div>
        {/* Save Button in Header */}
        {isAdmin && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            <Save size={18} />
            <span className="hidden sm:inline">{loading ? "Saving..." : "Save Changes"}</span>
            {loading && <span className="inline sm:hidden">...</span>}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3">
          <Info className="text-amber-500 dark:text-amber-400 mt-0.5" size={18} />
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            Only Shop Administrators can modify regional settings.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {initialLoading ? (
          <RegionalSkeleton />
        ) : (
          <>
            {/* Locale Configuration */}
            <div className="bg-white dark:bg-dark-surface rounded-xl p-6 border border-gray-200 dark:border-dark-border space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-dark-border">
                <div className="p-2 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-xl text-brand-primary dark:text-blue-400">
                  <Globe size={18} />
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Regional Identity
                </h4>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">
                    Select Country
                  </label>
                  <CustomDropdown
                    options={countries}
                    value={formData.country}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    placeholder="Choose Country"
                    icon={Globe}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">
                    System Language
                  </label>
                  <CustomDropdown
                    options={languages}
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    placeholder="Choose Language"
                    icon={Languages}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">
                    Currency Symbol
                  </label>
                  <CustomDropdown
                    options={currencies}
                    value={formData.currencySymbol}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currencySymbol: e.target.value,
                      })
                    }
                    placeholder="Choose Currency"
                    icon={CircleDollarSign}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">
                    Decimal Precision
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 0, label: "No Decimals (100)" },
                      { value: 1, label: "1 Decimal (100.0)" },
                      { value: 2, label: "2 Decimals (100.00)" },
                      { value: 3, label: "3 Decimals (100.000)" },
                      { value: 4, label: "4 Decimals (100.0000)" },
                    ]}
                    value={formData.decimalPrecision}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        decimalPrecision: parseInt(e.target.value),
                      })
                    }
                    placeholder="Choose Decimal Precision"
                    icon={CircleDollarSign}
                  />
                </div>
              </div>
            </div>

            {/* Preview / Info */}
            <div className="bg-gradient-to-br from-brand-primary/5 to-purple-50 dark:from-brand-primary/10 dark:to-purple-900/20 rounded-xl p-6 border border-brand-primary/20 dark:border-brand-primary/30 flex flex-col justify-center items-center text-center space-y-5">
              <div className="w-16 h-16 bg-white dark:bg-dark-card rounded-2xl flex items-center justify-center text-brand-primary dark:text-blue-400 shadow-lg">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white">
                Configuration Preview
              </h4>
              <div className="space-y-3 w-full max-w-[250px]">
                <div className="flex justify-between items-center py-2.5 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Currency
                  </span>
                  <span className="text-base font-bold text-brand-primary dark:text-brand-primary">
                    {formData.currencySymbol} {(1250).toLocaleString(undefined, {
                      minimumFractionDigits: formData.decimalPrecision,
                      maximumFractionDigits: formData.decimalPrecision,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Language
                  </span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {formData.language === "English" ? (
                      <span className="notranslate">English</span>
                    ) : (
                      currentLangConfig.label
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Direction
                  </span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {currentLangConfig.dir === "rtl"
                      ? "RTL"
                      : "LTR"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-[280px] leading-relaxed mt-3">
                These settings will be applied to all Shop Admins and Staff members across the entire platform.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegionalManager;
