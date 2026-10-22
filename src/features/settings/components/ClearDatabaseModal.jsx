import React, { useState } from "react";
import { AlertTriangle, X, Loader2, Database } from "lucide-react";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";

const ClearDatabaseModal = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  if (!isOpen) return null;

  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleConfirm = async () => {
    if (password !== "121212") {
      showSnack("Incorrect password", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.delete("/admin/clear-database", {
        data: { password }
      });
      showSnack(response.data.message || "Database cleared successfully", "success");
      
      // Close modal and reload page after a short delay
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      showSnack(
        error.response?.data?.message || "Failed to clear database",
        "error"
      );
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setPassword("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <Database size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Clear Database
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-red-700 dark:text-red-400 space-y-2 font-medium">
              <p>
                <strong>Warning:</strong> This is a destructive operation!
              </p>
              <p>
                This action will delete all transactional data including:
                <br />
                • Invoices, Receipts & Payments
                <br />
                • Stock & Purchase Entries
                <br />
                • Reports & Account Data
              </p>
              <p>
                It will <strong>not</strong> delete Products, Services, Customers, Staff, or Suppliers. Invoice numbering will restart from 00001.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Enter Password to Confirm
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter confirmation password"
              className="w-full px-4 h-11 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg/50 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || password !== "121212"}
            className="px-5 h-10 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Database size={16} />
            )}
            <span>Clear Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearDatabaseModal;
