import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  useGetIntegrationStatusQuery,
  useToggleIntegrationStatusMutation,
  useUpdateRazorpaySettingsMutation,
} from "../../../store/api/integrationEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";

const INTEGRATION_CARDS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Send notifications and messages via WhatsApp. ⚠️⚠️⚠️ Please check connection status on configuration page ⚠️⚠️⚠️",
    icon: MessageCircle,
    bg: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-400",
    status: "inactive",
  },
  {
    id: "smtp",
    label: "SMTP Email",
    description: "Configure SMTP server for sending emails",
    icon: Mail,
    bg: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    status: "inactive",
  },
  {
    id: "razorpay",
    label: "Razorpay",
    description: "Accept payments securely via Razorpay.",
    icon: CreditCard,
    bg: "bg-purple-50 dark:bg-purple-900/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    status: "inactive",
  },
];

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const { portalRole } = useAuth();
  const [integrations, setIntegrations] = useState(INTEGRATION_CARDS);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    integrationId: "",
    nextEnabled: true,
  });
  const { data: integrationStatusRes, isLoading: loading } =
    useGetIntegrationStatusQuery();
    
  const [toggleIntegrationStatus, { isLoading: isToggling }] = useToggleIntegrationStatusMutation();
  const [updateRazorpaySettings, { isLoading: isUpdatingRazorpay }] = useUpdateRazorpaySettingsMutation();

  const [razorpayModal, setRazorpayModal] = useState(false);
  const [razorpaySettings, setRazorpaySettings] = useState({ apiKey: "", keySecret: "" });

  useEffect(() => {
    const payload =
      integrationStatusRes?.data ||
      integrationStatusRes?.settings ||
      integrationStatusRes ||
      {};
    const whatsappEnabled = Boolean(payload?.isWhatsappEnabled);
    const smtpEnabled = Boolean(payload?.isSmtpEnabled);
    const razorpayEnabled = Boolean(payload?.isRazorpayEnabled);
    const whatsappPhone = "";
    
    const razorpayConfig = payload?.razorpayConfiguration || {};
    setRazorpaySettings({ apiKey: razorpayConfig.apiKey || "", keySecret: razorpayConfig.keySecret || "" });

    setIntegrations((prev) =>
      prev.map((integration) => {
        if (integration.id === "whatsapp") {
          return {
            ...integration,
            status: whatsappEnabled ? "active" : "inactive",
            phoneNumber: whatsappPhone,
          };
        }
        if (integration.id === "smtp") {
          return {
            ...integration,
            status: smtpEnabled ? "active" : "inactive",
          };
        }
        if (integration.id === "razorpay") {
          return {
            ...integration,
            status: razorpayEnabled ? "active" : "inactive",
          };
        }
        return integration;
      }),
    );
  }, [integrationStatusRes]);



  const handleConfigure = (id) => {
    if (id === 'razorpay') {
      setRazorpayModal(true);
      return;
    }
    const base = shopSlug ? `/${shopSlug}` : "";
    const path = `${base}/${portalRole}/settings/more/integrations/${id}`;
    navigate(path);
  };

  const handleSaveRazorpay = async () => {
    setError("");
    try {
      await updateRazorpaySettings(razorpaySettings).unwrap();
      setRazorpayModal(false);
    } catch (err) {
      setError(rtkErrorMessage(err, "Failed to save Razorpay settings"));
    }
  };

  const formatPhoneNumber = (number) => {
    if (!number) return "";
    return `+${number.slice(0, 2)} ${number.slice(2, 7)} ${number.slice(7)}`;
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, integrationId: "", nextEnabled: true });
  };

  const askToggle = (integrationId, nextEnabled) => {
    setError("");
    if (!nextEnabled) {
      setConfirmModal({ open: true, integrationId, nextEnabled });
      return;
    }
    setPendingToggle({ integrationId, nextEnabled });
  };

  const confirmToggle = async (integrationId, nextEnabled) => {
    setError("");
    try {
      await toggleIntegrationStatus({
        field: integrationId,
        enabled: nextEnabled,
      }).unwrap();
      setIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === integrationId
            ? {
                ...integration,
                status: nextEnabled ? "active" : "inactive",
              }
            : integration,
        ),
      );
      closeConfirmModal();
      setPendingToggle(null);
    } catch (toggleError) {
      setError(rtkErrorMessage(toggleError, "Failed to update integration status."));
      closeConfirmModal();
      setPendingToggle(null);
    }
  };




  useEffect(() => {
    if (!pendingToggle || isToggling) return;
    confirmToggle(pendingToggle.integrationId, pendingToggle.nextEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToggle, isToggling]);

  const getDeactivateMessage = (integrationId) => {
    if (integrationId === "whatsapp") {
      return "WhatsApp service will be deactivated and invoices will not be sent to customers on WhatsApp.";
    }
    if (integrationId === "smtp") {
      return "SMTP email service will be deactivated and invoices will not be sent to customers by email.";
    }
    return "This integration will be deactivated.";
  };

  return (
    <div className="max-w-4xl animate-in fade-in duration-500 space-y-6">


      {!!error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration, index) => {
          const Icon = integration.icon;
          const isActive = integration.status === "active";

          return (
            <div
              key={integration.id}
              className={`bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-5 hover:border-brand-primary/30 hover:shadow-md transition-all flex flex-col h-full ${
                integrations.length % 2 !== 0 && index === integrations.length - 1 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl ${integration.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={22} className={integration.iconColor} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      {integration.label}
                    </h3>
                    <div className="mt-1 flex items-center">
                      {loading && integration.id === 'whatsapp' ? (
                        <Loader2 size={14} className="animate-spin text-gray-400 dark:text-gray-500" />
                      ) : (
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isActive
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 size={10} />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle size={10} />
                              Inactive
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* THE TOGGLE BUTTON START */}
                <button
                  type="button"
                  onClick={() => askToggle(integration.id, !isActive)}
                  disabled={isToggling}
                  className={`h-7 w-12 rounded-full p-1 transition-colors disabled:opacity-50 cursor-pointer shrink-0 ${
                    isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  title={isActive ? "Turn off integration" : "Turn on integration"}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white dark:bg-dark-surface transition-transform ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                {/* THE TOGGLE BUTTON END */}
              </div>

              {/* Description */}
              <div className="flex-1 mb-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {integration.description}
                </p>
                {isActive && integration.phoneNumber && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                    📱 {formatPhoneNumber(integration.phoneNumber)}
                  </p>
                )}
              </div>

              {/* Actions */}
              {
                isActive && (
              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => handleConfigure(integration.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <Settings size={16} />
                  Configure
                </button>
              </div>
                )
              }
            </div>
          );
        })}
      </div>

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Confirm Deactivation
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {getDeactivateMessage(confirmModal.integrationId)}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmToggle(confirmModal.integrationId, confirmModal.nextEnabled)
                }
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {razorpayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border p-5 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Razorpay Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <input
                  type="text"
                  value={razorpaySettings.apiKey}
                  onChange={(e) => setRazorpaySettings({ ...razorpaySettings, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Enter Razorpay API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Secret</label>
                <input
                  type="password"
                  value={razorpaySettings.keySecret}
                  onChange={(e) => setRazorpaySettings({ ...razorpaySettings, keySecret: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Enter Razorpay Key Secret"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRazorpayModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRazorpay}
                disabled={isUpdatingRazorpay}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-primary text-white hover:bg-brand-primary/90 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdatingRazorpay && <Loader2 size={16} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsPage;
