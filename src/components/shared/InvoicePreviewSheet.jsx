import React, { useState, useRef, useEffect } from "react";
import { X, Download, Sun, Moon, Eye, Share2, Loader2, Printer } from "lucide-react";
import { useGetInvoiceByIdQuery } from "../../store/api/tenantEndpoints";
import { useAuth } from "../../features/auth/hooks/useAuth";

import InvoicePrintLayout from "../../features/sales/components/InvoicePrintLayout";
import { printReceipt } from "../../utils/flutterPrinter";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const InvoicePreviewSheet = ({
  invoiceId,
  isOpen,
  onClose,
  onDownload,
  onShare,
}) => {
  const { salonConfig, user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const printRef = useRef(null);

  const userId = user?._id || user?.id || "default";
  const settingsKey = `printerSettings_${userId}`;
  const [printSettings, setPrintSettings] = useState({});

  useEffect(() => {
    const fetchSettings = () => {
      if (isOpen) {
        const savedSettings = localStorage.getItem(settingsKey);
        if (savedSettings) {
          setPrintSettings(JSON.parse(savedSettings));
        } else {
          setPrintSettings({});
        }
      }
    };
    Promise.resolve().then(fetchSettings);
  }, [isOpen, settingsKey]);

  const { data: invoice, isLoading: loading } = useGetInvoiceByIdQuery(
    invoiceId,
    { skip: !isOpen || !invoiceId },
  );

  const handlePrint = async () => {
    const container = document.getElementById("invoice-preview-print-container");
    if (!container) return;

    const savedPrinters = localStorage.getItem(`availablePrinters_${userId}`);
    const availablePrinters = savedPrinters ? JSON.parse(savedPrinters) : [];
    const selectedPrinter = printSettings?.selectedPrinter || "";
    const selectedPrinterName =
      availablePrinters.find((p) => p.id === selectedPrinter)?.name || "";

    await printReceipt({
      containerElement: container,
      printerId: selectedPrinter,
      printerName: selectedPrinterName,
      paperSize: printSettings?.paperSize || "80mm",
      copies: printSettings?.copies || 1,
      fileName: `Invoice_${invoice?.invoiceNumber || "download"}.pdf`,
    });
  };

  const handleDownloadPDF = async () => {
    const container = document.getElementById("invoice-print-layout");
    if (!container) return;

    try {
      const loadingToast = toast.loading("Generating PDF...");
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [container.offsetWidth, container.offsetHeight],
        hotfixes: ["px_scaling"]
      });

      pdf.addImage(imgData, "PNG", 0, 0, container.offsetWidth, container.offsetHeight);
      pdf.save(`Invoice_${invoice?.invoiceNumber || "download"}.pdf`);
      
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleShareImage = async () => {
    const container = document.getElementById("invoice-print-layout");
    if (!container) return;

    let loadingToast;
    try {
      loadingToast = toast.loading("Preparing shareable invoice...");
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      canvas.toBlob(async (blob) => {
        toast.dismiss(loadingToast);
        try {
          const file = new File([blob], `Invoice_${invoice?.invoiceNumber || "share"}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Invoice #${invoice?.invoiceNumber || "share"}`,
              text: `Invoice #${invoice?.invoiceNumber || "share"}`,
            });
          } else if (onShare) {
            // fallback to A4 PDF
            onShare(invoiceId, invoice?.invoiceNumber, invoice?.createdAt);
          } else {
            toast.error("Sharing not supported on this device.");
          }
        } catch (err) {
          console.error("Error sharing:", err);
        }
      }, 'image/png');
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error preparing image:", error);
      toast.error("Failed to prepare image for sharing");
    }
  };

  if (!isOpen) return null;

  const shopName = invoice?.shop?.name || invoice?.branchId?.name || "Shop";
  const shopAddress =
    invoice?.branchId?.mapAddress || invoice?.shop?.mapAddress || invoice?.shop?.address || invoice?.branchId?.address || "";

  // Build items list from appointment services + products
  const buildItems = () => {
    if (!invoice) return [];
    const items = [];

    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item) => {
        let name =
          item.productName ||
          item.product?.name ||
          item.serviceId?.name ||
          "Item";
        if (item.variantName && !name.includes(item.variantName)) {
          name = `${name} ${item.variantName}`;
        }
        const qty = item.quantity || item.qty || 1;
        const price = item.price || 0;
        let taxPct = item.taxPercent || item.taxPercentage || item.taxRate || item.taxId?.percentage || 0;
        if (!taxPct && item.taxName && item.taxName.includes("%")) {
          const match = item.taxName.match(/(\d+(?:\.\d+)?)%/);
          if (match) taxPct = parseFloat(match[1]);
        }
        if (!taxPct && item.tax > 0 && price > 0) {
          taxPct = Math.round((item.tax / (price * qty)) * 100);
        }
        const isIncl = item.isTaxInclusive || false;
        const itemDisc = Number(item.discount) || 0;
        const taxName = item.taxName
          ? item.taxName.includes("%")
            ? item.taxName
            : `${item.taxName} ${taxPct}%`
          : taxPct
            ? `Tax ${taxPct}%`
            : "";

        let sName = item.staffName;
        if (!sName && item.staffId && item.staffId.name) sName = item.staffId.name;
        if (!sName && typeof item.staffId === 'string') sName = item.staffId;
        if (!sName && item.staff && item.staff.name) sName = item.staff.name;
        if (!sName && typeof item.staff === 'string') sName = item.staff;

        const taxAmount = isIncl
          ? price * qty - (price * qty) / (1 + taxPct / 100)
          : (price * qty - itemDisc) * (taxPct / 100);

        items.push({
          name,
          quantity: qty,
          price,
          discount: itemDisc,
          taxPercent: taxPct,
          isTaxInclusive: isIncl,
          taxName,
          tax: item.tax || 0,
          staffName: sName,
          taxAmount,
          total: price * qty - itemDisc,
          hsnCode: item.hsnCode || item.product?.hsnCode || item.serviceId?.hsnCode || "",
        });
      });

      return items;
    }

    // Fallback to Services from appointment (for older invoices or specific cases)
    if (invoice.appointment?.services) {
      const deptId =
        invoice.appointment.departmentId?._id ||
        invoice.appointment.departmentId;
      invoice.appointment.services.forEach((s) => {
        const fullService = s.serviceId || s;
        const variantId = s.variantId?._id || s.variantId;
        let sName = s.staffName;
        if (!sName && s.staffId && s.staffId.name) sName = s.staffId.name;
        if (!sName && typeof s.staffId === 'string') sName = s.staffId;
        if (!sName && typeof s.staff === 'string') sName = s.staff;

        let price = s.price || 0;
        if (!price && variantId && fullService.variants?.length > 0) {
          const variantData = fullService.variants.find(
            (v) =>
              (v.variantId?._id || v.variantId || v._id).toString() ===
              variantId.toString(),
          );
          if (variantData) {
            const dp = variantData.pricing?.find(
              (p) =>
                (p.department?._id || p.department || p).toString() ===
                deptId?.toString(),
            );
            price = dp ? dp.price : variantData.pricing?.[0]?.price || 0;
          }
        }

        if (!price && !variantId && deptId && fullService.pricing?.length > 0) {
          const dp = fullService.pricing.find(
            (p) =>
              (p.department?._id || p.department || p).toString() ===
              deptId?.toString(),
          );
          price = dp ? dp.price : fullService.pricing[0].price || 0;
        }

        if (!price) {
          price = fullService.price || 0;
        }

        let variantName = "";
        if (variantId && fullService.variants?.length > 0) {
          const vData = fullService.variants.find(
            (v) =>
              (v.variantId?._id || v.variantId || v._id).toString() ===
              variantId.toString(),
          );
          variantName = vData?.variantId?.name || vData?.variantName || "";
        }

        const taxPct =
          fullService.taxId?.percentage || fullService.taxPercentage || 0;
        const isIncl = fullService.isTaxInclusive || false;

        const taxAmount = isIncl
          ? price - price / (1 + taxPct / 100)
          : price * (taxPct / 100);

        items.push({
          name: variantName
            ? `${fullService.name} ${variantName}`
            : fullService.name,
          quantity: 1,
          price: price,
          taxPercent: taxPct,
          isTaxInclusive: isIncl,
          taxName: fullService.taxId?.name
            ? fullService.taxId.name.includes("%")
              ? fullService.taxId.name
              : `${fullService.taxId.name} ${taxPct}%`
            : taxPct
              ? `Tax ${taxPct}%`
              : "",
          staffName: sName,
          taxAmount: taxAmount,
          total: isIncl ? price : price + taxAmount,
          hsnCode: fullService.hsnCode || s.hsnCode || "",
        });
      });

      return items;
    }

    return items;
  };

  const items = buildItems();
  // Subtotal = sum of (price * qty) for all items BEFORE any discounts
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = invoice?.taxAmount || 0;
  const totalDiscount = invoice?.discount || 0;
  // Per-item discounts summed from items array
  const itemDiscountTotal = (invoice?.items || []).reduce((sum, i) => sum + (Number(i.discount) || 0), 0);
  // Extra (invoice-level) discount = total discount minus per-item discounts
  const extraDiscount = Math.max(0, totalDiscount - itemDiscountTotal);
  // Subtotal after item discounts (this is what invoice.amount represents)
  const subtotal = invoice?.amount || Math.max(0, subtotalBeforeDiscount - itemDiscountTotal);
  // Grand Total = subtotal (after item discounts) + tax
  const grandTotal = Number(subtotal) + Number(tax);
  // Final payable = grand total - extra discount
  const finalPayable = Math.max(0, grandTotal - extraDiscount);
  const storedRoundOff = Number(invoice?.roundOffAmount) || 0;
  const roundedPayableTotal = finalPayable + storedRoundOff;
  const showRoundOffInPreview =
    Boolean(salonConfig?.enableRoundOff) &&
    Math.abs(storedRoundOff) > 0.0001;

  const bg = darkMode ? "bg-gray-900" : "bg-white dark:bg-dark-surface";
  const textPrimary = darkMode ? "text-gray-100" : "text-gray-900 dark:text-white";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-500 dark:text-gray-400";
  const borderColor = darkMode ? "border-gray-700" : "border-gray-200 dark:border-dark-border";

  // Payment methods
  if (invoice?.payments?.length > 0) {
    //
  } else if (invoice?.paymentMethod) {
    //
  }

  // Calculate dynamic status — compare paid amount to payable (after round-off when applicable)
  const statusCompareTotal = Number((showRoundOffInPreview ? roundedPayableTotal : finalPayable).toFixed(2));
  let dynamicStatus = invoice?.paymentStatus || "PENDING";
  if (invoice) {
    const paid = Number((invoice.paidAmount || 0).toFixed(2));
    const isFullyWallet = invoice.payments && invoice.payments.length > 0 && invoice.payments.every(p => p.method === 'WALLET');
    if (paid > statusCompareTotal) {
      dynamicStatus = "OVER PAID";
    } else if (isFullyWallet && paid >= statusCompareTotal) {
      dynamicStatus = "WALLET";
    } else if (paid >= statusCompareTotal) {
      dynamicStatus = "PAID";
    } else if (paid > 0) {
      dynamicStatus = "PARTIAL";
    } else {
      dynamicStatus = "PENDING";
    }
  }


    let previewStaffName = "";
    const names = new Set();
    const adminName = invoice?.createdBy?.name || invoice?.staffId?.name || invoice?.billerId?.name || "STAFF";
  
    const addName = (name) => {
      if (!name) return;
      if (typeof name === 'string' && name.toLowerCase() === 'admin') {
        names.add(adminName);
      } else {
        names.add(name);
      }
    };
    
    // 1. Extract from items
    if (items && items.length > 0) {
      items.forEach(item => {
        if (item.staffName) {
          addName(item.staffName);
        } else if (typeof item.staff === 'string') {
          addName(item.staff);
        } else if (!item.staffId && !item.staffName && !item.staff) {
          addName(adminName);
        }
      });
    }

    // 2. Extract from appointment services
    if (invoice?.appointment?.services && invoice.appointment.services.length > 0) {
      invoice.appointment.services.forEach(service => {
        if (service.staffId && service.staffId.name) {
          addName(service.staffId.name);
        } else if (service.staffName) {
          addName(service.staffName);
        }
      });
    }

    // 3. Extract from staffCommissions (fallback)
    if (names.size === 0 && invoice?.staffCommissions && invoice.staffCommissions.length > 0) {
      invoice.staffCommissions.forEach(sc => addName(sc.staffName));
    }

    // 4. Fallback to top-level staff
    if (names.size === 0) {
      names.add(adminName);
    }

    previewStaffName = Array.from(names).join(", ");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Side Sheet */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[520px] ${bg} shadow-2xl z-50 flex flex-col`}
        style={{
          animation: "slideInRight 0.3s ease-out forwards",
        }}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b ${borderColor}`}
        >
          <div className="flex items-center gap-2">
            <Eye size={18} className={textSecondary} />
            <span className={`text-sm font-bold ${textPrimary} hidden sm:inline`}>Preview</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                darkMode
                  ? "bg-gray-700 text-yellow-400"
                  : "bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400"
              }`}
              title="Toggle theme"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleShareImage}
              disabled={!invoice}
              className={`px-2 sm:px-4 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                !invoice ? "bg-gray-50 dark:bg-dark-card text-gray-400 cursor-not-allowed" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
              }`}
              title="Share Receipt Image"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>
            {onDownload && (
              <button
                onClick={handleDownloadPDF}
                disabled={!invoice}
                className={`px-2 sm:px-4 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  !invoice ? "bg-gray-50 dark:bg-dark-card text-gray-400 cursor-not-allowed" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
                }`}
                title="Save as PDF via Print Dialog"
              >
                <Download size={14} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={!invoice}
              className="px-2 sm:px-4 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border text-xs font-bold transition-colors flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card disabled:opacity-40"
              title="Print Invoice"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border"
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-6 ${bg}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invoice ? (
            <div
              ref={printRef}
              className="flex justify-center"
            >
              <div className="w-auto shadow-md border border-gray-200 dark:border-dark-border overflow-hidden" id="invoice-preview-print-container">
                <InvoicePrintLayout
                  shopInfo={{
                    name: shopName,
                    address: shopAddress,
                    phone: invoice?.shop?.phone || invoice?.shop?.phoneNumber || invoice?.branchId?.phone || invoice?.branchId?.phoneNumber || salonConfig?.phone || salonConfig?.phoneNumber || salonConfig?.contactNumber || "",
                    gstin: invoice?.shop?.gstin || invoice?.branchId?.gstin,
                  }}
                  staffName={previewStaffName}
                  invoiceNumber={invoice?.invoiceNumber}
                  invoiceDate={invoice?.createdAt || invoice?.date}
                  items={items}
                  subTotal={subtotalBeforeDiscount}
                  discount={totalDiscount}
                  taxAmount={tax}
                  finalTotal={roundedPayableTotal}
                  roundOffAmount={storedRoundOff}
                  showRoundOffInReceipt={showRoundOffInPreview}
                  payments={invoice?.payments || []}
                  dueAmount={invoice?.dueAmount || 0}
                  walletAmount={invoice?.walletAmount || 0}
                  overpaidAmount={invoice?.overpaidAmount || 0}
                  paymentStatus={dynamicStatus}
                  customerName={invoice?.customer?.name || invoice?.user?.name || "LOCAL CUSTOMER"}
                  customerPhone={invoice?.customer?.phone || invoice?.customer?.phoneNumber || invoice?.user?.phone || invoice?.user?.phoneNumber || ""}
                  logoUrl={salonConfig?.logo || invoice?.shop?.logo || ""}
                  {...printSettings}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className={textSecondary}>Invoice not found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InvoicePreviewSheet;
