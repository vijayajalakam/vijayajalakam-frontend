import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Usb,
  Wifi,
  Bluetooth,
  Search,
  Check,
  Printer,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { isFlutterWebView, scanPrinters } from "../../utils/flutterPrinter";

const ScanPrinterPopup = ({ isOpen, onClose, onPrintersDetected }) => {
  const [connectionTypes, setConnectionTypes] = useState({
    usb: true,
    network: false,
    bluetooth: false,
  });

  const [scanning, setScanning] = useState(false);
  const [foundPrinters, setFoundPrinters] = useState([]);
  const [scanComplete, setScanComplete] = useState(false);

  const toggleType = (type) => {
    setConnectionTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleScan = async () => {
    setScanning(true);
    setFoundPrinters([]);
    setScanComplete(false);

    try {
      let detectedPrinters = [];

      if (isFlutterWebView()) {
        const nativePrinters = await scanPrinters(connectionTypes);
        detectedPrinters = nativePrinters || [];
      } else {
        // Browser fallback – mock devices for UI testing
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (connectionTypes.usb) {
          detectedPrinters.push({
            id: "usb-1",
            name: "POS-80 USB Printer",
            type: "USB",
          });
        }
        if (connectionTypes.network) {
          detectedPrinters.push({
            id: "net-1",
            name: "Epson Network Printer (192.168.1.100)",
            type: "Network",
          });
        }
        if (connectionTypes.bluetooth) {
          detectedPrinters.push({
            id: "bt-1",
            name: "Bluetooth Receipt Printer",
            type: "Bluetooth",
          });
        }
      }

      setFoundPrinters(detectedPrinters);
      setScanComplete(true);

      if (detectedPrinters.length > 0) {
        onPrintersDetected(detectedPrinters);
      }
    } catch (err) {
      console.error("Printer scan failed:", err);
      setScanComplete(true);
    } finally {
      setScanning(false);
    }
  };

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
            className="relative bg-white dark:bg-dark-surface rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden z-10 border border-gray-100 dark:border-dark-border"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-50 dark:border-dark-border flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">
                  Scan Printers
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-sm tracking-wide mt-0.5">
                  SEARCHING NEARBY DEVICES
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 bg-gray-50 dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-dark-border rounded-2xl text-gray-400 dark:text-gray-500 hover:text-gray-950 dark:hover:text-white transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Connection Types */}
              {!scanComplete && !scanning && (
                <div className="space-y-5">
                  <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em] px-1 block text-center">
                    Select Connection Types
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        id: "usb",
                        label: "USB Port",
                        icon: Usb,
                        color: "blue",
                      },
                      {
                        id: "network",
                        label: "Network",
                        icon: Wifi,
                        color: "orange",
                      },
                      {
                        id: "bluetooth",
                        label: "Bluetooth",
                        icon: Bluetooth,
                        color: "purple",
                      },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => toggleType(type.id)}
                        className={`
                          relative flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 group
                          ${
                            connectionTypes[type.id]
                              ? "bg-brand-primary/5 border-brand-primary shadow-lg shadow-brand-primary/5"
                              : "bg-gray-50 dark:bg-dark-card border-transparent hover:border-gray-200 dark:border-dark-border dark:hover:border-dark-border"
                          }
                        `}
                      >
                        <div
                          className={`
                            mb-3 p-4 rounded-2xl transition-all duration-300
                            ${
                              connectionTypes[type.id]
                                ? "bg-brand-primary text-white scale-110"
                                : "bg-white dark:bg-dark-surface text-gray-400 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300"
                            }
                          `}
                        >
                          <type.icon size={24} strokeWidth={2.5} />
                        </div>
                        <span
                          className={`text-[13px] font-black transition-colors ${
                            connectionTypes[type.id]
                              ? "text-brand-primary"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {type.label}
                        </span>

                        {/* Selected Indicator Dot */}
                        <AnimatePresence>
                          {connectionTypes[type.id] && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-3 right-3 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center shadow-md"
                            >
                              <Check
                                size={12}
                                strokeWidth={4}
                                className="text-white"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scanning State */}
              {scanning && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping" />
                    <div className="relative bg-brand-primary text-white p-6 rounded-full shadow-xl shadow-brand-primary/40">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">
                      Scanning Devices...
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-bold">
                      Please wait while we look for printers
                    </p>
                  </div>
                </div>
              )}

              {/* Scan Results */}
              {scanComplete && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      {foundPrinters.length} Printer(s) Found
                    </h3>
                    <button
                      onClick={handleScan}
                      className="text-xs font-black text-brand-primary dark:text-blue-400 hover:underline"
                    >
                      SCAN AGAIN
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {foundPrinters.length > 0 ? (
                      foundPrinters.map((printer) => (
                        <div
                          key={printer.id}
                          className="flex items-center justify-between p-5 bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500/20 rounded-3xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                              <Printer size={20} />
                            </div>
                            <div>
                              <p className="font-black text-gray-800 dark:text-white leading-tight">
                                {printer.name}
                              </p>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                {printer.type}
                              </span>
                            </div>
                          </div>
                          <CheckCircle2
                            size={24}
                            className="text-emerald-500"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center bg-gray-50 dark:bg-dark-card rounded-3xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                        <p className="font-bold text-gray-400 dark:text-gray-500">
                          No printers found.
                          <br />
                          Try different connection types.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!scanning && (
              <div className="p-8 bg-gray-50 dark:bg-dark-card/50">
                <button
                  onClick={scanComplete ? onClose : handleScan}
                  disabled={
                    !scanComplete &&
                    !connectionTypes.usb &&
                    !connectionTypes.network &&
                    !connectionTypes.bluetooth
                  }
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
                >
                  {scanComplete ? (
                    <>Done</>
                  ) : (
                    <>
                      <Search size={20} strokeWidth={3} />
                      Start Scanning
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ScanPrinterPopup;
