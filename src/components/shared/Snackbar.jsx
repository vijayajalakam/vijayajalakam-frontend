import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const variants = {
  success: {
    icon: <CheckCircle2 size={20} className="text-white" />,
    iconBg: "bg-emerald-400",
    gradient: "from-transparent via-emerald-100 to-emerald-200/60",
    border: "border-emerald-100",
  },
  error: {
    icon: <XCircle size={20} className="text-white" />,
    iconBg: "bg-red-300",
    gradient: "from-transparent via-red-100 to-red-200/60",
    border: "border-red-100",
  },
  warning: {
    icon: <AlertTriangle size={20} className="text-white" />,
    iconBg: "bg-amber-400",
    gradient: "from-transparent via-amber-100 to-amber-200/60",
    border: "border-amber-100",
  },
  info: {
    icon: <Info size={20} className="text-white" />,
    iconBg: "bg-gray-400",
    gradient: "from-transparent via-blue-100 to-blue-200/60",
    border: "border-blue-100",
  },
};

const Snackbar = ({ title, message, type = "success", onClose, duration = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message && !title) {
      const timer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(timer);
    }

    // Small delay ensures the component renders first before animating in
    const showTimer = setTimeout(() => setVisible(true), 10);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [title, message, duration, onClose]);

  if (!message && !title) return null;

  const v = variants[type] || variants.info;

  return createPortal(
    <div
      className={`fixed z-[99999] pointer-events-auto transition-all duration-300 ease-out 
        top-4 left-1/2 
        sm:top-auto sm:bottom-6 sm:left-auto sm:right-6
        ${
          visible
            ? "opacity-100 -translate-x-1/2 sm:translate-x-0 translate-y-0 scale-100"
            : "opacity-0 -translate-x-1/2 sm:translate-x-0 -translate-y-4 sm:translate-y-4 scale-95"
        }`}
    >
      <div
        className={`
          relative overflow-hidden 
          bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl 
          rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-black/40 
          border border-white/20 dark:border-white/5 
          min-w-[320px] max-w-[90vw]
        `}
      >
        {/* Content Row */}
        <div className="flex items-start gap-4 p-4">
          {/* Icon Section */}
          <div
            className={`${v.iconBg} rounded-xl w-10 h-10 flex items-center justify-center shrink-0 shadow-lg shadow-black/5`}
          >
            {v.icon}
          </div>

          {/* Text Section */}
          <div className="flex-1 min-w-0 py-0.5">
            {title && (
              <h5 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-0.5">
                {title}
              </h5>
            )}
            <p className={`text-[12px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed ${!title ? "mt-1.5" : ""}`}>
              {message}
            </p>
          </div>

          {/* Close Section */}
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="text-gray-300 hover:text-gray-500 dark:text-gray-400 transition-colors shrink-0 p-1 -mr-1"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Optional: Subtle progress bar indicator at the bottom */}
        <div className="absolute bottom-0 left-0 h-[3px] bg-brand-primary opacity-20 w-full" />
      </div>
    </div>,
    document.body
  );
};

export default Snackbar;
