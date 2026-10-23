import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import {
  FileText,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import * as exportUtils from "../../utils/exportUtils";
import { useAuth } from "../../features/auth/hooks/useAuth";

const ExportModal = ({
  isOpen,
  onClose,
  data = [],
  columns = [],
  filename = "Report",
  onExportAll = null,
}) => {
  const { shopConfig } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState("idle");
  const [exportingFormat, setExportingFormat] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStatus("idle");
      setIsExporting(false);
      setExportingFormat(null);
    }
  }, [isOpen]);

  const formats = [
    {
      id: "pdf",
      label: "PDF Document",
      icon: FileText,
      color: "text-rose-600",
    },
    {
      id: "excel",
      label: "Excel Sheet",
      icon: FileSpreadsheet,
      color: "text-emerald-600",
    },
  ];

  const handleExport = async (formatId) => {
    try {
      setIsExporting(true);
      setStatus("exporting");
      setExportingFormat(formatId);

      let exportData = [];
      if (onExportAll) {
        exportData = await onExportAll();
      } else {
        exportData = data;
      }

      if (!exportData || exportData.length === 0) {
        setStatus("idle");
        setIsExporting(false);
        setExportingFormat(null);
        return;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename.replace(/\s+/g, "_")}_${timestamp}`;

      // Short delay for user feedback
      await new Promise((r) => setTimeout(r, 600));

      switch (formatId) {
        case "excel":
          exportUtils.exportToExcel(
            exportData,
            columns,
            `${fullFilename}.xlsx`,
          );
          break;
        case "pdf":
          await exportUtils.exportToPDF(
            exportData,
            columns,
            `${fullFilename}.pdf`,
            { title: filename, shopDetails: shopConfig }
          );
          break;
      }

      setStatus("success");
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error("Export error:", error);
      setStatus("error");
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExporting ? undefined : onClose}
      title="Export Options"
      size="sm"
    >
      <div className="p-1">
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 px-1 text-center">
            Choose Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {formats.map((format) => {
              const isCurrentExporting = exportingFormat === format.id;
              return (
                <button
                  key={format.id}
                  disabled={isExporting}
                  onClick={() => handleExport(format.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left cursor-pointer disabled:opacity-50 ${
                    isCurrentExporting
                      ? "border-brand-primary bg-brand-primary/5"
                      : "border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-card"
                  }`}
                >
                  {isCurrentExporting ? (
                    <Loader2 size={20} className="animate-spin text-brand-primary" />
                  ) : (
                    <format.icon size={20} className={format.color} />
                  )}
                  <span
                    className={`font-bold text-sm ${
                      isCurrentExporting
                        ? "text-brand-primary"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {format.label}
                  </span>
                  {status === "success" && exportingFormat === format.id && (
                    <Check size={16} className="ml-auto text-brand-primary dark:text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {status === "error" && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-in fade-in duration-300">
            <AlertCircle size={18} />
            <span className="text-xs font-bold">
              Failed to generate file. Please try another format.
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExportModal;
