import { useState, useEffect } from "react";
import {
  useGetLoyaltySettingsQuery,
  useUpdateLoyaltySettingsMutation,
} from "../../../store/api/tenantCrudEndpoints";
import { useGetInvoicesQuery } from "../../../store/api/tenantEndpoints";
import { useSelector, useDispatch } from "react-redux";
import { selectLoyaltyForm, setLoyaltyForm } from "../../../store/slices/loyaltySlice";
import { useAuth } from "../../auth/hooks/useAuth";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";
import Snackbar from "../../../components/shared/Snackbar";
import DateRangePicker from "../../../components/shared/DateRangePicker";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  Award,
  Save,
  Gift,
  Coins,
  TrendingUp,
  Receipt,
  User,
  Calendar,
} from "lucide-react";
import moment from "moment";
import { getUnifiedInvoicePayableTotal } from "../../../utils/unifiedInvoiceTotals";

const LoyaltyPointsManager = () => {
  const { hasPermission, user } = useAuth();
  const canEdit = user?.role === "SUPER_ADMIN" || user?.role === "SHOP_ADMIN" || hasPermission("crm:settings:edit");

  const { data: settingsData, isLoading: loadingSettings } =
    useGetLoyaltySettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] =
    useUpdateLoyaltySettingsMutation();

  const [startDate, setStartDate] = useState(
    moment().startOf("month").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    moment().endOf("month").format("YYYY-MM-DD"),
  );

  // Fetch recent invoices to show history of points earned
  const { data: invoicesData, isLoading: loadingInvoices } =
    useGetInvoicesQuery(`startDate=${startDate}&endDate=${endDate}&excludeLocalCustomer=true&limit=100`);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") =>
    setSnack({ message, type });

  const dispatch = useDispatch();
  const formData = useSelector(selectLoyaltyForm);

  useEffect(() => {
    if (settingsData) {
      dispatch(setLoyaltyForm({
        isActive: settingsData.isActive || false,
        minimumSalesAmount: settingsData.minimumSalesAmount || 100,
        amountPerPoint: settingsData.amountPerPoint || 1,
        minimumRedeemPoints: settingsData.minimumRedeemPoints || 10,
        pointValue: settingsData.pointValueInCurrency || settingsData.pointValue || 5,
        isRoundOff: settingsData.isRoundOff || false,
      }));
    }
  }, [settingsData, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSettings(formData).unwrap();
      showSnack("Loyalty settings updated successfully", "success");
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to update loyalty settings"),
        "error",
      );
    }
  };

  const { currencySymbol } = useCurrency();

  const CurrencyIcon = ({ size, ...props }) => (
    <span className="text-gray-400 font-bold text-[14px]" {...props}>{currencySymbol}</span>
  );

  // Filter invoices that have earned loyalty points
  const historyInvoices = invoicesData?.data?.filter(
    (inv) => inv.loyaltyPointsEarned && inv.loyaltyPointsEarned > 0,
  ) || [];

  return (
    <div className="space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Settings Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border overflow-hidden p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-brand-primary dark:text-blue-400 rounded-xl">
                  <Gift size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Reward Settings
                  </h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Customers earn points on their purchases
                  </p>
                </div>
              </div>

              {!loadingSettings && (
                <button
                  type="button"
                  onClick={() =>
                    canEdit &&
                    dispatch(setLoyaltyForm({ isActive: !formData.isActive }))
                  }
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                    formData.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  disabled={!canEdit}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                      formData.isActive ? "translate-x-6 shadow-sm" : "translate-x-1 shadow-sm"
                    }`}
                  />
                </button>
              )}
            </div>

            {loadingSettings ? (
              <div className="animate-pulse space-y-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-dark-border rounded w-1/3"></div>
                    <div className="h-12 bg-gray-100 dark:bg-dark-surface/50 border border-gray-100 dark:border-dark-border rounded-xl"></div>
                  </div>
                ))}
                <div className="h-12 bg-brand-primary/20 dark:bg-brand-primary/10 rounded-xl w-full mt-4"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div
                  className={`space-y-6 transition-all duration-300 ${!formData.isActive ? "opacity-50 pointer-events-none" : ""
                    }`}
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Minimum Sale
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-bold">
                          {currencySymbol}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={formData.minimumSalesAmount}
                        onChange={(e) =>
                          dispatch(setLoyaltyForm({
                            minimumSalesAmount: Number(e.target.value),
                          }))
                        }
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      1 Point For Every Sale
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <TrendingUp size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.amountPerPoint}
                        onChange={(e) =>
                          dispatch(setLoyaltyForm({
                            amountPerPoint: Number(e.target.value),
                          }))
                        }
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        placeholder="1"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium ml-1 mt-1 leading-relaxed">
                      If Minimum Sale is {currencySymbol}{formData.minimumSalesAmount || 0}, a {currencySymbol}{formData.minimumSalesAmount || 0} sale earns {formData.amountPerPoint || 1} point(s). 
                      A {currencySymbol}{(formData.minimumSalesAmount || 100) * 10} sale earns {(formData.amountPerPoint || 1) * 10} points.
                      (Sales below {currencySymbol}{formData.minimumSalesAmount || 0} do not earn points).
                    </p>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-dark-border to-transparent my-6"></div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Minimum Redeem Points
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Coins size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={formData.minimumRedeemPoints}
                        onChange={(e) =>
                          dispatch(setLoyaltyForm({
                            minimumRedeemPoints: Number(e.target.value),
                          }))
                        }
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      1 Point Equals To
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-bold">
                          {currencySymbol}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.pointValue}
                        onChange={(e) =>
                          dispatch(setLoyaltyForm({
                            pointValue: Number(e.target.value),
                          }))
                        }
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        placeholder="5"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Example: 10 points can be redeemed for {currencySymbol}
                      {(formData.minimumRedeemPoints || 10) *
                        (formData.pointValue || 5)}
                      .
                    </p>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-dark-border to-transparent my-6"></div>

                  <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-dark-surface p-4 rounded-xl border border-gray-100 dark:border-dark-border">
                    <div className="space-y-0.5">
                      <label className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer select-none">
                        Round Off Points
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Enable to round decimal points to the nearest whole number.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(
                          setLoyaltyForm({ isRoundOff: !formData.isRoundOff }),
                        )
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        formData.isRoundOff ? "bg-brand-primary" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                          formData.isRoundOff ? "translate-x-6 shadow-sm" : "translate-x-1 shadow-sm"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {canEdit && (
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-secondary active:scale-95 disabled:opacity-50 mt-4"
                  >
                    {isUpdating ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={18} />
                        Save Settings
                      </>
                    )}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: History Table */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-dark-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt size={20} className="text-gray-400" />
                Recent Rewards History
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-[200px]">
                  <DateRangePicker 
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                  />
                </div>
                <div className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-dark-surface px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                  Total Rewarded: {historyInvoices.length}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loadingInvoices ? (
                <div className="min-w-full">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 dark:bg-dark-surface/50">
                      <tr>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <th key={i} className="px-6 py-4">
                            <div className="h-3 bg-gray-200 dark:bg-dark-border rounded w-16 animate-pulse"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-dark-surface rounded w-24"></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-surface flex-shrink-0"></div>
                              <div className="h-4 bg-gray-100 dark:bg-dark-surface rounded w-32"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-6 bg-gray-100 dark:bg-dark-surface rounded-lg w-20"></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-dark-surface rounded w-16 ml-auto"></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-6 bg-gray-100 dark:bg-dark-surface rounded-full w-16 ml-auto"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : historyInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center opacity-50">
                  <Award size={64} className="text-gray-300 mb-4" />
                  <p className="text-sm font-bold text-gray-500">
                    No loyalty points history found yet.
                  </p>
                  <p className="text-xs font-medium text-gray-400 mt-1 max-w-[250px]">
                    When customers make purchases that qualify, they will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="min-w-full">
                  <div className="w-full">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 dark:bg-dark-surface/50 sticky top-0 backdrop-blur-md z-10">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Date
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Customer
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Invoice
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                              Amount
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                              Points Earned
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                          {historyInvoices.map((inv) => (
                            <tr
                              key={inv._id}
                              className="hover:bg-gray-50/50 dark:hover:bg-dark-surface/50 transition-colors group"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    {moment(inv.createdAt).format("DD MMM YYYY")}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                                    {inv.customer?.name?.charAt(0) || <User size={14} />}
                                  </div>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {inv.customer?.name || "Unknown"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-300 rounded-lg">
                                  #{inv.invoiceNumber}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 notranslate">
                                  {currencySymbol}{Number(getUnifiedInvoicePayableTotal(inv)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full font-bold text-xs border border-green-100 dark:border-green-500/20">
                                  <Award size={12} />
                                  +{Number(inv.loyaltyPointsEarned).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col divide-y divide-gray-100 dark:divide-dark-border">
                      {historyInvoices.map((inv) => (
                        <div key={inv._id} className="p-4 flex flex-col gap-3 hover:bg-gray-50/50 dark:hover:bg-dark-surface/50 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm shrink-0">
                                {inv.customer?.name?.charAt(0) || <User size={16} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                  {inv.customer?.name || "Unknown"}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                                  #{inv.invoiceNumber}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg font-bold text-[10px] border border-green-100 dark:border-green-500/20">
                                <Award size={10} />
                                +{Number(inv.loyaltyPointsEarned).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </div>
                              <span className="text-xs font-bold text-gray-400 mt-1 notranslate">
                                {currencySymbol}{Number(getUnifiedInvoicePayableTotal(inv)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-dark-surface px-2.5 py-1.5 rounded-lg w-fit">
                            <Calendar size={12} />
                            {moment(inv.createdAt).format("DD MMM YYYY, hh:mm A")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPointsManager;
