import React, { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Server,
  ShieldCheck,
  Loader2,
  Send,
  Save,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  useGetSmtpSettingsQuery,
  useSendSmtpTestEmailMutation,
  useUpdateSmtpSettingsMutation,
} from "../../../store/api/integrationEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";

const INITIAL_FORM = {
  host: "",
  port: "587",
  secure: false,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
  replyTo: "",
  enabled: true,
};

const SmtpSettingsPage = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  //eslint-disable-next-line
  const [testEmail, setTestEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { data: smtpSettings, isLoading: loading } = useGetSmtpSettingsQuery();
  const [updateSmtpSettings, { isLoading: saving }] = useUpdateSmtpSettingsMutation();
    //eslint-disable-next-line
  const [sendSmtpTestEmail, { isLoading: testing }] =
    useSendSmtpTestEmailMutation();


  //eslint-disable-next-line
  const hasRequiredValues = useMemo(() => {
    return (
      form.host.trim() &&
      form.port.trim() &&
      form.username.trim() &&
      form.password.trim() &&
      form.fromEmail.trim()
    );
  }, [form]);

  useEffect(() => {
    if (!smtpSettings) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({
      ...prev,
      host: smtpSettings.host || "",
      port: String(smtpSettings.port || "587"),
      secure: Boolean(smtpSettings.secure),
      username: smtpSettings.username || "",
      password: smtpSettings.password || "",
      fromEmail: smtpSettings.fromEmail || "",
      fromName: smtpSettings.fromName || "",
      replyTo: smtpSettings.replyTo || "",
      enabled:
        smtpSettings.enabled !== undefined ? Boolean(smtpSettings.enabled) : true,
    }));
  }, [smtpSettings]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    try {
      const payload = {
        host: form.host.trim(),
        port: Number(form.port),
        secure: Boolean(form.secure),
        username: form.username.trim(),
        password: form.password,
        fromEmail: form.fromEmail.trim(),
        fromName: form.fromName.trim(),
        replyTo: form.replyTo.trim(),
        enabled: Boolean(form.enabled),
      };

      const response = await updateSmtpSettings(payload).unwrap();
      if (response?.success) {
        setSuccess("SMTP settings saved successfully.");
      } else {
        setError(response?.message || "Unable to save SMTP settings.");
      }
    } catch (saveError) {
      setError(rtkErrorMessage(saveError, "Failed to save SMTP settings."));
    }
  };

  //eslint-disable-next-line
  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      setError("Please enter a test email address.");
      return;
    }

    setError("");
    setSuccess("");
    try {
      const payload = {
        to: testEmail.trim(),
        host: form.host.trim(),
        port: Number(form.port),
        secure: Boolean(form.secure),
        username: form.username.trim(),
        password: form.password,
        fromEmail: form.fromEmail.trim(),
        fromName: form.fromName.trim(),
        replyTo: form.replyTo.trim(),
      };

      const response = await sendSmtpTestEmail(payload).unwrap();
      if (response?.success) {
        setSuccess(`Test email sent to ${testEmail.trim()}.`);
      } else {
        setError(response?.message || "Failed to send test email.");
      }
    } catch (testError) {
      setError(rtkErrorMessage(testError, "Failed to send test email."));
    }
  };


  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 flex items-center justify-center gap-2">
        <Loader2 size={18} className="animate-spin text-gray-500 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Loading SMTP settings...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Mail size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                SMTP Email Integration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure your email server to send invoices and alerts.
              </p>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              form.enabled
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {form.enabled ? "SMTP Enabled" : "SMTP Disabled"}
          </div>
        </div>

        {!!error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!!success && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              SMTP Host
            </span>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              <input
                type="text"
                value={form.host}
                onChange={(e) => updateField("host", e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Port
            </span>
            <input
              type="number"
              value={form.port}
              onChange={(e) => updateField("port", e.target.value)}
              placeholder="587"
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Username
            </span>
            <input
              type="text"
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              placeholder="your-account@domain.com"
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Password / App Password
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="••••••••••"
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              From Email
            </span>
            <input
              type="email"
              value={form.fromEmail}
              onChange={(e) => updateField("fromEmail", e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              From Name
            </span>
            <input
              type="text"
              value={form.fromName}
              onChange={(e) => updateField("fromName", e.target.value)}
              placeholder="Vijayajalakam"
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Reply-To Email (Optional)
            </span>
            <input
              type="email"
              value={form.replyTo}
              onChange={(e) => updateField("replyTo", e.target.value)}
              placeholder="support@yourdomain.com"
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </label>
        </div>


        {/* ⚠️⚠️ DONT DELETE PHASE TWO WORKS  "USE SSL/TLS SECURE CONNECTION"   ⚠️⚠️*/}

        {/* <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Use SSL/TLS secure connection</span>
          </div>
          <button
            type="button"
            onClick={() => updateField("secure", !form.secure)}
            className={`h-7 w-12 rounded-full p-1 transition-colors ${
              form.secure ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white dark:bg-dark-surface transition-transform ${
                form.secure ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div> */}



        {/* <div className="mt-3 flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Mail size={16} className="text-blue-500" />
            <span>Enable outgoing email from SMTP</span>
          </div>
          <button
            type="button"
            onClick={() => updateField("enabled", !form.enabled)}
            className={`h-7 w-12 rounded-full p-1 transition-colors ${
              form.enabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white dark:bg-dark-surface transition-transform ${
                form.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div> */}
        

        {/* ⚠️⚠️ DONT DELETE PHASE TWO WORKS  "USE SSL/TLS SECURE CONNECTION"   ⚠️⚠️*/}



    

        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <button
            type="button"
            onClick={handleSave}
            // disabled={saving || !hasRequiredValues} //⚠️⚠️  TEMPORARLY DISABLING IT 
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save SMTP Settings
          </button>

          {/* <div className="flex-1 flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test receiver email"
              className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testing || !hasRequiredValues}
              className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send Test
            </button>
          </div> */}


        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Info size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-1">
              How it works
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Fill SMTP provider details (host, port, username, password).</li>
              <li>• Save settings to store configuration on the server.</li>
              <li>• Use “Send Test” to verify delivery with live credentials.</li>
              <li>• Once enabled, invoices and notifications can be sent by email.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmtpSettingsPage;




// import nodemailer from "nodemailer";

// const {
//   SMTP_HOST,
//   SMTP_PASS,
//   SMTP_USER,
//   SMTP_PORT,
//   SENDER_EMAIL,
  
// } = process.env;



// export const mailTransporter = nodemailer.createTransport({
//   host: SMTP_HOST,
//   port: Number(SMTP_PORT),
// //   secure: false, // true only for 465
//   auth: {
//     user: SMTP_USER,
//     pass: SMTP_PASS,
//   },
// });








