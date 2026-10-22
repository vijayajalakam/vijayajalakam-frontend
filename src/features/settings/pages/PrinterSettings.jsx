import React, { useState, useEffect } from "react";
import { Printer, Search, RotateCcw, Play, Layout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetAdminProfileQuery,
  useUpdateReceiptSettingsMutation,
} from "../../../store/api/tenantCrudEndpoints";
import ScanPrinterPopup from "../../../components/shared/ScanPrinterPopup";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import { PrinterSkeleton } from "../../../components/shared/Skeleton";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import InvoicePrintLayout from "../../sales/components/InvoicePrintLayout";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  isFlutterWebView,
  isPdfPrinter,
  printReceipt,
  scanPrinters,
} from "../../../utils/flutterPrinter";
import toast from "react-hot-toast";

const ModernSwitch = ({ label, checked, onChange, children }) => (
  <div className="flex flex-col gap-3 p-4 bg-gray-50/50 dark:bg-dark-card/30 rounded-3xl border border-transparent hover:border-gray-100 dark:border-dark-border dark:hover:border-dark-border transition-all duration-300">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`text-[14px] font-black ${checked ? "text-gray-900 dark:text-gray-100" : "text-gray-400"} transition-colors`}
        >
          {label}
        </span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${checked ? "bg-brand-primary shadow-lg shadow-brand-primary/20" : "bg-gray-200 dark:bg-dark-border"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
    <AnimatePresence>
      {checked && children && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const InputField = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full mt-2 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl px-4 py-2 text-[12px] font-bold text-gray-700 dark:text-gray-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
  />
);

const PrinterSettings = () => {
  const { user, hasPermission } = useAuth();
  const userId = user?._id || user?.id || "default";
  const printersKey = `availablePrinters_${userId}`;
  const settingsKey = `printerSettings_${userId}`;

  const { data: profileData, isLoading } = useGetAdminProfileQuery();
  const profile = profileData?.salon ? profileData : null;
  const [updateReceiptSettings] = useUpdateReceiptSettingsMutation();
  const [printers, setPrinters] = useState(() => {
    const savedPrinters = localStorage.getItem(printersKey);
    return savedPrinters
      ? JSON.parse(savedPrinters)
      : [
          { id: "save-as-pdf", name: "Save as PDF", type: "PDF" },
          { id: "system-1", name: "System Default Printer", type: "System" },
        ];
  });

  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem(settingsKey);
    const defaultGreeting = "Thank you for your visit!";
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        selectedPrinter: parsed.selectedPrinter || "",
        paperSize: parsed.paperSize || "80mm",
        fontSize: parsed.fontSize || "small",
        copies: parsed.copies || 1,
        // Default Toggles
        showLogo: parsed.showLogo ?? true,
        showShopName: parsed.showShopName ?? true,
        showLocation: parsed.showLocation ?? true,
        showGSTNumber: parsed.showGSTNumber ?? true,
        showPhoneNumber: parsed.showPhoneNumber ?? true,
        showBillerName: parsed.showBillerName ?? true,
        showItemCode: parsed.showItemCode ?? true,
        showItemName: parsed.showItemName ?? true,
        showQuantity: parsed.showQuantity ?? true,
        showPrice: parsed.showPrice ?? true,
        showTaxColumn: parsed.showTaxColumn ?? true,
        showItemDiscount: parsed.showItemDiscount ?? true,
        showSubTotal: parsed.showSubTotal ?? true,
        showDiscount: parsed.showDiscount ?? true,
        showTaxSummary: parsed.showTaxSummary ?? true,
        showCGST: parsed.showCGST ?? false,
        showSGST: parsed.showSGST ?? false,
        showUPIID: parsed.showUPIID ?? false,
        showGreetingMessage: parsed.showGreetingMessage ?? true,
        showCustomer: parsed.showCustomer ?? true,
        showPaymentBreakdown: parsed.showPaymentBreakdown ?? true,
        showHSNCode: parsed.showHSNCode ?? true,
        customGST: parsed.customGST || "",
        customLocation: parsed.customLocation || "",
        upiId: parsed.upiId || "",
        greetingMessage: parsed.greetingMessage || defaultGreeting,
      };
    }
    return {
      selectedPrinter: "",
      paperSize: "80mm",
      fontSize: "small",
      copies: 1,
      // Toggles
      showLogo: true,
      showShopName: true,
      showLocation: true,
      showGSTNumber: true,
      showPhoneNumber: true,
      showBillerName: true,
      showItemCode: true,
      showItemName: true,
      showQuantity: true,
      showPrice: true,
      showTaxColumn: true,
      showSubTotal: true,
      showDiscount: true,
      showTaxSummary: true,
      showCGST: false,
      showSGST: false,
      showUPIID: false,
      showGreetingMessage: true,
      showCustomer: true,
      showPaymentBreakdown: true,
      showHSNCode: true,
      customGST: "",
      customLocation: "",
      upiId: "",
      greetingMessage: defaultGreeting,
    };
  });

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Mock data for preview
  const previewData = {
    shopInfo: {
      name: profile?.salon?.salonName || "TONEY",
      address: profile?.salon?.area
        ? `${profile.salon.area}, ${profile.salon.state || ""}`
        : "Kozhikode, Kerala",
      phone: profile?.user?.phone || "1234567890",
      gstin: profile?.salon?.gstin || "32AAAAA0000A1Z5",
    },
    staffName: profile?.salon?.ownerName || "Fazil Admin",
    invoiceNumber: "INV-1772898412676",
    cart: [
      { name: "Hair Cut", quantity: 1, price: "200.00", tax: 20.0, taxRate: 5, taxName: "GST", discount: 10, total: "210.00", hsnCode: "99011" },
      { name: "Facial", quantity: 1, price: "150.00", tax: 7.5, taxRate: 15, taxName: "VAT", discount: 0, total: "157.50", hsnCode: "99012" },
    ],
    customerName: "LOCAL CUSTOMER",
    subTotal: "350.00",
    discount: "20.00",
    taxAmount: "27.50",
    finalTotal: 357.50,
    // Sample payment breakdown for preview
    payments: [
      { method: "CASH", amount: 200 },
      { method: "UPI", amount: 100 },
      { method: "WALLET", amount: 30 },
    ],
    dueAmount: 27.50,
    overpaidAmount: 0,
    paymentStatus: "PARTIAL",
    logoUrl: profile?.logo || "",
    invoiceDate: new Date().toISOString(),
  };

  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(settings));

    // Sync receipt toggles to the backend so WhatsApp receipt respects them
    const syncToBackend = async () => {
      try {
        await updateReceiptSettings({
          showLogo:             settings.showLogo,
          showShopName:         settings.showShopName,
          showLocation:         settings.showLocation,
          showGSTNumber:        settings.showGSTNumber,
          showPhoneNumber:      settings.showPhoneNumber,
          showBillerName:       settings.showBillerName,
          showCustomer:         settings.showCustomer,
          showItemCode:         settings.showItemCode,
          showItemName:         settings.showItemName,
          showQuantity:         settings.showQuantity,
          showPrice:            settings.showPrice,
          showTaxColumn:        settings.showTaxColumn,
          showItemDiscount:     settings.showItemDiscount,
          showSubTotal:         settings.showSubTotal,
          showDiscount:         settings.showDiscount,
          showTaxSummary:       settings.showTaxSummary,
          showCGST:             settings.showCGST,
          showSGST:             settings.showSGST,
          showPaymentBreakdown: settings.showPaymentBreakdown,
          showHSNCode:          settings.showHSNCode,
          showGreetingMessage:  settings.showGreetingMessage,
          greetingMessage:      settings.greetingMessage,
          customLocation:       settings.customLocation,
          customGST:            settings.customGST,
        }).unwrap();
      } catch (err) {
        // Non-critical: localStorage is the primary store; backend sync is best-effort
        console.warn('[PrinterSettings] Failed to sync receipt settings to backend:', err?.message);
      }
    };

    const debounce = setTimeout(syncToBackend, 500);
    return () => clearTimeout(debounce);
  }, [settings, settingsKey, updateReceiptSettings]);

  const performReset = () => {
    setSettings({
      selectedPrinter: "",
      paperSize: "80mm",
      fontSize: "small",
      copies: 1,
      showLogo: true,
      showShopName: true,
      showLocation: true,
      showGSTNumber: true,
      showPhoneNumber: true,
      showBillerName: true,
      showItemCode: true,
      showItemName: true,
      showQuantity: true,
      showPrice: true,
      showTaxColumn: true,
      showItemDiscount: true,
      showSubTotal: true,
      showDiscount: true,
      showTaxSummary: true,
      showCGST: false,
      showSGST: false,
      showUPIID: false,
      showGreetingMessage: true,
      showCustomer: true,
      showPaymentBreakdown: true,
      showHSNCode: true,
      customLocation: "",
    });
  };

  const handleReset = () => {
    setIsResetConfirmOpen(true);
  };

  const handlePrinterDetected = (newPrinters) => {
    setPrinters((prev) => {
      const merged = [...prev];
      newPrinters.forEach((p) => {
        if (!merged.find((m) => m.id === p.id)) {
          merged.push(p);
        }
      });
      localStorage.setItem(printersKey, JSON.stringify(merged));
      return merged;
    });
  };

  // Load native printers when running inside Flutter (Windows / Android).
  useEffect(() => {
    if (!isFlutterWebView()) return;

    const loadNativePrinters = async () => {
      const nativePrinters = await scanPrinters({
        usb: true,
        network: true,
        bluetooth: true,
      });
      if (nativePrinters?.length) {
        handlePrinterDetected(nativePrinters);
      }
    };

    loadNativePrinters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTestPrint = async () => {
    if (!settings.selectedPrinter) return;

    const printContent = document.getElementById(
      "invoice-print-layout-container",
    );
    if (!printContent) return;

    const selectedPrinterName =
      printers.find((p) => p.id === settings.selectedPrinter)?.name || "";

    const loadingToast = toast.loading(
      isPdfPrinter(settings.selectedPrinter, selectedPrinterName)
        ? "Saving PDF..."
        : "Sending to printer...",
    );

    const success = await printReceipt({
      containerElement: printContent,
      printerId: settings.selectedPrinter,
      printerName: selectedPrinterName,
      paperSize: settings.paperSize,
      copies: settings.copies,
      fileName: "Test_Receipt.pdf",
    });

    toast.dismiss(loadingToast);

    if (success) {
      toast.success(
        isPdfPrinter(settings.selectedPrinter, selectedPrinterName)
          ? "PDF saved successfully!"
          : "Print sent successfully!",
      );
    } else {
      toast.error("Print failed. Please try again.");
    }
  };

  const toggleSetting = (key, val) => {
    if (!hasPermission("settings:printer:general:edit")) {
      return;
    }
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 min-h-screen pb-20">
      {isLoading ? (
        <div className="w-full">
          <PrinterSkeleton />
        </div>
      ) : (
        <>
          {/* Left Column: Configuration */}
          <div className="flex-1 space-y-6">
            <div className="bg-white dark:bg-dark-surface rounded-[2rem] border border-gray-100 dark:border-dark-border p-8 shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                      Printer Settings
                    </h1>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-1.5 opacity-60">
                      Configure your thermal printer and receipt layout
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {hasPermission("settings:printer:general:scan") && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsScanOpen(true)}
                      className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-[12px] font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all"
                    >
                      Scan
                    </motion.button>
                  )}
                  {hasPermission("settings:printer:general:edit") && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleReset}
                      className="px-6 py-2.5 bg-gray-100 dark:bg-dark-card rounded-xl text-gray-500 dark:text-gray-400 text-[12px] font-bold hover:bg-gray-200 dark:hover:bg-dark-border transition-all"
                    >
                      Reset
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Quick Primary Config */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end pb-8 border-b border-dotted border-gray-100 dark:border-dark-border mb-10">
                <div className="md:col-span-6 space-y-2">
                  <div className="flex items-center gap-2 pl-1 mb-1 opacity-60">
                    <Printer size={13} className="text-brand-primary dark:text-blue-400" />
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                      Invoice Printer
                    </label>
                  </div>
                  <CustomDropdown
                    value={settings.selectedPrinter}
                    onChange={(e) =>
                      toggleSetting("selectedPrinter", e.target.value)
                    }
                    options={printers.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    placeholder="Select Device"
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center gap-2 pl-1 mb-1 opacity-60">
                    <Layout size={13} className="text-brand-primary dark:text-blue-400" />
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                      Paper Size
                    </label>
                  </div>
                  <CustomDropdown
                    value={settings.paperSize}
                    onChange={(e) => toggleSetting("paperSize", e.target.value)}
                    options={[
                      { value: "80mm", label: "80mm" },
                      { value: "72mm", label: "72mm" },
                      { value: "58mm", label: "58mm" },
                    ]}
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center gap-2 pl-1 mb-1 opacity-60">
                    <Layout size={13} className="text-brand-primary dark:text-blue-400" />
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                      Font Size
                    </label>
                  </div>
                  <CustomDropdown
                    value={settings.fontSize}
                    onChange={(e) => toggleSetting("fontSize", e.target.value)}
                    options={[
                      { value: "small", label: "Small" },
                      { value: "medium", label: "Medium" },
                      { value: "large", label: "Large" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                {/* Header Settings */}
                {/* Receipt Header */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full opacity-40" />
                    <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                      Receipt Header
                    </h3>
                  </div>
                  <div className="space-y-3.5">
                    <ModernSwitch
                      label="Show Logo"
                      checked={settings.showLogo}
                      onChange={(v) => toggleSetting("showLogo", v)}
                    />
                    <ModernSwitch
                      label="Shop Name"
                      checked={settings.showShopName}
                      onChange={(v) => toggleSetting("showShopName", v)}
                    />
                    <ModernSwitch
                      label="Location Override"
                      checked={settings.showLocation}
                      onChange={(v) => toggleSetting("showLocation", v)}
                    >
                      <InputField
                        placeholder="Enter custom location/address"
                        value={settings.customLocation}
                        onChange={(v) => toggleSetting("customLocation", v)}
                      />
                    </ModernSwitch>
                    <ModernSwitch
                      label="GST Number"
                      checked={settings.showGSTNumber}
                      onChange={(v) => toggleSetting("showGSTNumber", v)}
                    >
                      <InputField
                        placeholder="Enter custom GSTIN"
                        value={settings.customGST}
                        onChange={(v) => toggleSetting("customGST", v)}
                      />
                    </ModernSwitch>
                    <ModernSwitch
                      label="Phone Number"
                      checked={settings.showPhoneNumber}
                      onChange={(v) => toggleSetting("showPhoneNumber", v)}
                    />
                    <ModernSwitch
                      label="Staff Name"
                      checked={settings.showBillerName}
                      onChange={(v) => toggleSetting("showBillerName", v)}
                    />
                  </div>
                </div>

                {/* Receipt Body */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full opacity-40" />
                    <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                      Receipt Body
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3.5">
                    <ModernSwitch
                      label="Show Customer Name"
                      checked={settings.showCustomer}
                      onChange={(v) => toggleSetting("showCustomer", v)}
                    />
                    <ModernSwitch
                      label="Item Code Column"
                      checked={settings.showItemCode}
                      onChange={(v) => toggleSetting("showItemCode", v)}
                    />
                    <ModernSwitch
                      label="HSN Code"
                      checked={settings.showHSNCode}
                      onChange={(v) => toggleSetting("showHSNCode", v)}
                    />
                    <ModernSwitch
                      label="Item Name Column"
                      checked={settings.showItemName}
                      onChange={(v) => toggleSetting("showItemName", v)}
                    />
                    <ModernSwitch
                      label="Quantity Column"
                      checked={settings.showQuantity}
                      onChange={(v) => toggleSetting("showQuantity", v)}
                    />
                    <ModernSwitch
                      label="Price Column"
                      checked={settings.showPrice}
                      onChange={(v) => toggleSetting("showPrice", v)}
                    />
                    <ModernSwitch
                      label="Tax Column"
                      checked={settings.showTaxColumn}
                      onChange={(v) => toggleSetting("showTaxColumn", v)}
                    />
                    <ModernSwitch
                      label="Discount Column (per item)"
                      checked={settings.showItemDiscount}
                      onChange={(v) => toggleSetting("showItemDiscount", v)}
                    />
                  </div>
                </div>

                {/* Receipt Footer */}
                <div className="md:col-span-2 space-y-6 pt-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full opacity-40" />
                    <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                      Receipt Footer
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ModernSwitch
                      label="Sub Total Row"
                      checked={settings.showSubTotal}
                      onChange={(v) => toggleSetting("showSubTotal", v)}
                    />
                    <ModernSwitch
                      label="Tax Summary Row"
                      checked={settings.showTaxSummary}
                      onChange={(v) => toggleSetting("showTaxSummary", v)}
                    />
                    <ModernSwitch
                      label="CGST Row"
                      checked={settings.showCGST}
                      onChange={(v) => toggleSetting("showCGST", v)}
                    />
                    <ModernSwitch
                      label="SGST Row"
                      checked={settings.showSGST}
                      onChange={(v) => toggleSetting("showSGST", v)}
                    />
                    <ModernSwitch
                      label="Total Discount Row"
                      checked={settings.showDiscount}
                      onChange={(v) => toggleSetting("showDiscount", v)}
                    />
                    <ModernSwitch
                      label="UPI QR Code"
                      checked={settings.showUPIID}
                      onChange={(v) => toggleSetting("showUPIID", v)}
                    >
                      <InputField
                        placeholder="e.g. merchant@upi"
                        value={settings.upiId}
                        onChange={(v) => toggleSetting("upiId", v)}
                      />
                    </ModernSwitch>
                    <ModernSwitch
                      label="Payment Breakdown"
                      checked={settings.showPaymentBreakdown}
                      onChange={(v) => toggleSetting("showPaymentBreakdown", v)}
                    />
                    <ModernSwitch
                      label="Greeting Message"
                      checked={settings.showGreetingMessage}
                      onChange={(v) => toggleSetting("showGreetingMessage", v)}
                    >
                      <textarea
                        placeholder="e.g. Visit again soon!"
                        value={settings.greetingMessage}
                        onChange={(e) => toggleSetting("greetingMessage", e.target.value)}
                        className="w-full mt-2 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl px-4 py-2 text-[12px] font-bold text-gray-700 dark:text-gray-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all resize-y min-h-[60px]"
                        rows={3}
                      />
                    </ModernSwitch>
                    <div className="p-4 bg-gray-50/50 dark:bg-dark-card/30 rounded-2xl border border-gray-100 dark:border-dark-border/50">
                      <div className="flex items-center gap-3 mb-2 opacity-50">
                        <Layout size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          Print Copies
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={settings.copies}
                        onChange={(e) =>
                          toggleSetting("copies", parseInt(e.target.value) || 1)
                        }
                        className="w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl px-4 py-2 font-bold text-gray-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Row */}
              <div className="mt-12 pt-8 border-t border-dotted border-gray-100 dark:border-dark-border">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={!settings.selectedPrinter || !hasPermission("settings:printer:general:test_print")}
                  onClick={handleTestPrint}
                  className={`w-full py-4 rounded-2xl font-bold text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    settings.selectedPrinter && hasPermission("settings:printer:general:test_print")
                      ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/10"
                      : "bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Play size={18} fill="currentColor" strokeWidth={0} />
                  Test Printer Connection
                </motion.button>
              </div>
            </div>
          </div>

          <div className="xl:w-[380px] space-y-6">
            <div className="sticky top-10">
              <div className="flex items-center justify-between mb-4 px-2 opacity-60">
                <div className="flex items-center gap-2.5">
                  <Layout size={16} className="text-brand-primary dark:text-blue-400" />
                  <h3 className="text-[12px] font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                    Print Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest">
                  {settings.paperSize}
                </span>
              </div>

              <div
                className="bg-transparent overflow-hidden min-h-[400px]"
                id="invoice-print-layout-container"
              >
                <InvoicePrintLayout {...previewData} {...settings} />
              </div>

              <div className="mt-6 p-5 bg-gray-50 dark:bg-dark-card/30 rounded-2xl border border-dotted border-gray-100 dark:border-dark-border/50">
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 leading-relaxed text-center">
                  All settings above are reflected instantly in this functional
                  thermal preview.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <ScanPrinterPopup
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onPrintersDetected={handlePrinterDetected}
      />

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={performReset}
        title="Reset Printer Settings"
        message="Are you sure you want to reset all printer settings to default? This action cannot be undone."
        confirmLabel="Reset Options"
        type="danger"
      />
    </div>
  );
};

export default PrinterSettings;
