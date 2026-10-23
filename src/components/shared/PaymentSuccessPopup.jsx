import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Share2, Printer, X, Loader2 } from "lucide-react";
import moment from "moment";
import html2canvas from "html2canvas";
import InvoicePrintLayout from "../../features/sales/components/InvoicePrintLayout";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import api from "../../api/axiosInstance";
import { printReceipt } from "../../utils/flutterPrinter";

const PaymentSuccessPopup = ({
  isOpen,
  onClose,
  amount,
  invoiceNo,
  paymentMethod,
  paymentTime,
  currencySymbol = "",
  onShare,
  receiptPayload, // Added this prop
}) => {
  const [isSharing, setIsSharing] = React.useState(false);
  const { user, shopConfig } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const userId = user?._id || user?.id || "default";
  const settingsKey = `printerSettings_${userId}`;
  const printersKey = `availablePrinters_${userId}`;

  const printSettings = useMemo(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem(settingsKey);
      return savedSettings ? JSON.parse(savedSettings) : null;
    }
    return null;
  }, [isOpen, settingsKey]);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      const container = document.getElementById("invoice-print-layout-container-popup");
      
      if (!container || !receiptPayload) {
        if (onShare) onShare();
        setIsSharing(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 300 // Constrain width for thermal receipt layout
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharing(false);
          return;
        }
        
        const file = new File([blob], `invoice-${invoiceNo || 'receipt'}.png`, { type: "image/png" });
        
        const downloadImage = () => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice-${invoiceNo || 'receipt'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            // Send only the file. Sending text drops the file on Windows WhatsApp.
            await navigator.share({
              files: [file]
            });
          } catch (err) {
            console.error("Error sharing file:", err);
            // If share fails or is not allowed, download instead
            if (err.name !== 'AbortError') {
              downloadImage();
            }
          }
        } else {
          // If browser doesn't support file sharing, download it instead
          downloadImage();
        }
        setIsSharing(false);
      }, "image/png");
      
    } catch (err) {
      console.error("Failed to generate receipt image", err);
      if (onShare) onShare();
      setIsSharing(false);
    }
  };

  const handleManualPrint = async () => {
    const container = document.getElementById(
      "invoice-print-layout-container-popup",
    );
    if (!container) return;

    const selectedPrinter = printSettings?.selectedPrinter || "";
    const savedPrinters = localStorage.getItem(printersKey);
    const availablePrinters = savedPrinters ? JSON.parse(savedPrinters) : [];
    const selectedPrinterName =
      availablePrinters.find((p) => p.id === selectedPrinter)?.name || "";

    const printed = await printReceipt({
      containerElement: container,
      printerId: selectedPrinter,
      printerName: selectedPrinterName,
      paperSize: printSettings?.paperSize || "80mm",
      copies: printSettings?.copies || 1,
      fileName: `Invoice_${invoiceNo || receiptPayload?.invoiceNumber || "receipt"}.pdf`,
    });

    if (printed) return;

    // Browser iframe fallback (handled inside printReceipt when not in Flutter)
  };

  const hasPrintedRef = useRef(false);

  // Auto close timer
  useEffect(() => {
    if (isOpen) {
      hasPrintedRef.current = false; // Reset print ref on open
      const timer = setTimeout(() => {
        onClose();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // Removed onClose to prevent timer reset on re-renders

  // Printer logic
  useEffect(() => {
    if (isOpen && printSettings?.selectedPrinter && receiptPayload && !hasPrintedRef.current) {
      if (!receiptPayload.invoiceNumber) {
        return;
      }
      
      hasPrintedRef.current = true;
      // Delay so receipt layout renders before capture
      const timer = setTimeout(() => {
        handleManualPrint();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, printSettings?.selectedPrinter, receiptPayload]);

  // WhatsApp receipt sending is now handled directly by the backend via Baileys
  // when the invoice is created in appointmentController.js
  // No frontend html2canvas capture needed anymore

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-[360px] p-8 flex flex-col items-center z-10"
          >
            {/* Hidden Print Layout */}
            <div className="pointer-events-none" style={{ position: 'fixed', left: 0, top: 0, zIndex: -9999, visibility: 'hidden', overflow: 'hidden', height: 0 }} id="invoice-print-layout-container-popup">
              {receiptPayload && (
                <InvoicePrintLayout
                  {...receiptPayload}
                  {...printSettings}
                  invoiceNumber={receiptPayload?.invoiceNumber || invoiceNo}
                  customerName={receiptPayload?.customerName}
                  currencySymbol={currencySymbol}
                  logoUrl={shopConfig?.logo || ""}
                />
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors z-50 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.1,
              }}
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-500"
            >
              <Check size={40} strokeWidth={3.5} />
            </motion.div>

            {/* Title & Amount */}
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1">
              Payment Success
            </p>
            <h2 className="text-4xl font-black text-gray-800 dark:text-gray-100 mb-6 notranslate">
              {currencySymbol}
              {formatDisplayNumber(amount)}
            </h2>

            {/* Details Table */}
            <div className="w-full bg-gray-50 dark:bg-dark-card/80 rounded-2xl p-4 space-y-3 mb-8 border border-gray-100 dark:border-dark-border/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Invoice No</span>
                <span className="text-gray-800 dark:text-gray-100 font-bold tracking-wide">
                  {invoiceNo || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Payment Method
                </span>
                <span className="text-gray-800 dark:text-gray-100 font-bold uppercase tracking-wider">
                  {paymentMethod || "Cash"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Date & Time</span>
                <span className="text-gray-800 dark:text-gray-100 font-bold uppercase tracking-wider">
                  {paymentTime
                    ? moment(paymentTime).format("DD-MM-YYYY hh:mm A")
                    : moment().format("DD-MM-YYYY hh:mm A")}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex w-full gap-3">
              <button
                onClick={handleManualPrint}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-blue-400 font-bold hover:bg-brand-primary/20 transition-all shadow-sm"
              >
                <Printer size={18} /> Print
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white dark:bg-dark-surface border border-gray-100 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-dark-card hover:border-gray-200 dark:border-dark-border transition-all shadow-sm"
              >
                {isSharing ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <Share2 size={18} className="text-gray-500" />} {isSharing ? "Preparing..." : "Share"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PaymentSuccessPopup;
