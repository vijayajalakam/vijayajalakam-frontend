import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useGetPaymentMethodsQuery } from "../../store/api/tenantEndpoints";
import { useUpdateSalonProfileMutation } from "../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../store/api/rtkUtils";
import Snackbar from "../shared/Snackbar";
import { Calculator, ChevronDown } from "lucide-react";
import Skeleton from "../shared/Skeleton";
import CustomDropdown from "../shared/CustomDropdown";

const RoundOffManager = () => {
  const { salonConfig, refreshConfig } = useAuth();
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [loading, setLoading] = useState(false);
  const [enableRoundOff, setEnableRoundOff] = useState(false);
  const [roundOffValue, setRoundOffValue] = useState(1);
  const [roundOffBenefit, setRoundOffBenefit] = useState("customer");
  const [roundOffPaymentMethod, setRoundOffPaymentMethod] =
    useState("CASH");
  const { data: pmRaw = [] } = useGetPaymentMethodsQuery();
  const [updateSalonProfile] = useUpdateSalonProfileMutation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const paymentMethods = useMemo(
    () => (pmRaw || []).filter((pm) => pm.isActive !== false),
    [pmRaw],
  );

  useEffect(() => {
    if (salonConfig) {
      setEnableRoundOff(salonConfig.enableRoundOff || false);
      setRoundOffValue(salonConfig.roundOffValue || 1);
      setRoundOffBenefit(salonConfig.roundOffBenefit || "customer");
      setRoundOffPaymentMethod(
        salonConfig.roundOffPaymentMethod || "CASH",
      );
    }
  }, [salonConfig]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateSalonProfile({
        enableRoundOff,
        roundOffValue,
        roundOffBenefit,
        roundOffPaymentMethod,
      }).unwrap();

      if (res?.success !== false) {
        showSnack("Round-off settings updated successfully", "success");
        await refreshConfig();
      }
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to update settings"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const benefitOptions = [
    {
      value: "customer",
      label: "Benefit for Customer",
      description: "Amount rounds down (e.g., 10.50 → 10.00 when rounding to 1)",
    },
    {
      value: "seller",
      label: "Benefit for Seller",
      description: "Amount rounds up (e.g., 10.50 → 11.00 when rounding to 1)",
    },
  ];

  const selectedBenefit = benefitOptions.find(
    (opt) => opt.value === roundOffBenefit,
  );

  if (!salonConfig) {
    return (
      <div className="space-y-4">
        <Skeleton height="60px" />
        <Skeleton height="120px" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Calculator
              size={20}
              className="text-purple-600 dark:text-purple-400"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Round-Off Settings
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage how invoice totals are rounded. Round-off differences are adjusted against the selected payment method's ledger and tracked in the system's Round-Off account.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="h-11 px-4 sm:px-6 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          <Calculator size={18} className="sm:hidden" />
          <span className="hidden sm:inline">{loading ? "Saving..." : "Save Settings"}</span>
          <span className="inline sm:hidden">{loading ? "..." : "Save"}</span>
        </button>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-xl space-y-2">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
          Round-off Adjustment Method
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Select the payment method (e.g. CASH, BANK) whose linked ledger account will receive the round-off difference adjustment during invoice generation.
        </p>
        <div className="w-full max-w-md">
          <CustomDropdown
            value={roundOffPaymentMethod}
            onChange={(e) => setRoundOffPaymentMethod(e.target.value)}
            options={
              paymentMethods.length === 0
                ? [{ value: "CASH", label: "CASH" }]
                : paymentMethods.map((pm) => ({ value: pm.name, label: pm.name }))
            }
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-dark-border rounded-xl gap-4">
        <div className="flex-1">
          <p className="font-bold text-sm text-gray-900 dark:text-white">
            Enable Round-Off
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            When off, totals show exact amounts. When on, the final total is rounded
            using the rules below; the difference is posted to RoundOff Account (6009)
            in accounting.
          </p>
        </div>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setEnableRoundOff(!enableRoundOff)}
            className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors flex-shrink-0 ${
              enableRoundOff ? "bg-brand-primary" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 sm:top-1 left-1 w-5 h-5 bg-white dark:bg-dark-surface rounded-full transition-transform shadow-sm ${
                enableRoundOff ? "translate-x-6 sm:translate-x-7" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {enableRoundOff && (
        <>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Round-Off Value
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Nearest unit to round to (1 = whole currency, 5 = nearest 5, etc.)
              </p>
              <input
                type="number"
                min="1"
                max="100"
                value={roundOffValue}
                onChange={(e) =>
                  setRoundOffValue(parseInt(e.target.value, 10) || 1)
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </label>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Round-Off Benefit
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Choose who benefits from the rounding
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {selectedBenefit?.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedBenefit?.description}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 dark:text-gray-500 transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-lg overflow-hidden">
                    {benefitOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setRoundOffBenefit(option.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-border transition-colors ${
                          roundOffBenefit === option.value
                            ? "bg-brand-primary/5"
                            : ""
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {option.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <p className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-2">
              Preview (sample 10.50)
            </p>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <p>
                Rounded total:{" "}
                <span className="font-bold">
                  {roundOffBenefit === "customer"
                    ? Math.floor(10.5 / roundOffValue) * roundOffValue
                    : Math.ceil(10.5 / roundOffValue) * roundOffValue}
                </span>
              </p>
            </div>
          </div>
        </>
      )}

      <Snackbar message={snack.message} type={snack.type} />
    </div>
  );
};

export default RoundOffManager;
