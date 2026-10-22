import React from "react";
import { X } from "lucide-react";

const ExitBookingSheet = ({ onCancel, onConfirm }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[80]"
        onClick={onCancel}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />

      {/* Sheet: bottom sheet on mobile, centered popup on desktop */}
      <div
        className="fixed bottom-0 left-0 right-0 top-[10vh] max-h-[90vh] bg-white dark:bg-dark-surface z-[90] flex flex-col rounded-t-3xl
          lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-full lg:max-w-[460px] lg:max-h-none lg:shadow-2xl"
        style={{ animation: "slideUp 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with X */}
        <div className="flex items-center justify-end px-4 h-[56px] flex-shrink-0">
          <button
            onClick={onCancel}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"
          >
            <X size={20} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Title */}
        <div className="px-5 pb-2 lg:pb-4">
          <h1 className="text-[24px] font-bold text-black dark:text-white leading-tight lg:text-[22px]">
            Are you sure you want to leave this booking?
          </h1>
          <p className="text-[14px] text-gray-400 dark:text-gray-500 mt-3 lg:mt-2">All selections will be lost</p>
        </div>

        {/* Spacer to push buttons to bottom (mobile only) */}
        <div className="flex-1 lg:hidden" />

        {/* Bottom action buttons */}
        <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0 lg:px-5 lg:pt-2 lg:pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-4 lg:py-3 rounded-full text-[14px] font-semibold text-black dark:text-white bg-white dark:bg-dark-surface"
            style={{ border: "1.5px solid #e8e8e8" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 lg:py-3 rounded-full text-[14px] font-semibold text-white"
            style={{ backgroundColor: "#111" }}
          >
            Yes, exit
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default ExitBookingSheet;
