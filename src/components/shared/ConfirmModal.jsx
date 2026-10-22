import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import Modal from "./Modal";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  type = "danger", // danger, warning, info
}) => {
  const isDanger = type === "danger";

  const footer = (
    <div className="flex gap-3 w-full border-t border-gray-50 dark:border-dark-border pt-4 mt-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all active:scale-95 cursor-pointer"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          onConfirm();
          onClose();
        }}
        className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer ${
          isDanger
            ? "bg-red-500 hover:bg-red-600 shadow-red-200"
            : "bg-brand-primary hover:bg-brand-secondary shadow-brand-primary/20"
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
    >
      <div className="flex flex-col items-center text-center py-2">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isDanger
              ? "bg-red-50 text-red-500"
              : "bg-blue-50 dark:bg-blue-900/20 text-brand-primary dark:text-blue-400"
          }`}
        >
          <AlertCircle size={32} />
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
          {message}
        </p>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
