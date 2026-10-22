import { X, CheckCircle2 } from "lucide-react";

const BookingAlertFooter = ({ alert, onDismiss, currencySymbol = "₹", isMobile = false }) => {
  if (!alert) return null;

  const slotTimes = alert.slotTimes?.length
    ? [...new Set(alert.slotTimes)].join(", ")
    : null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] left-4 sm:left-auto max-w-sm w-auto sm:w-[380px] animate-slide-up pointer-events-auto"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden p-4 relative flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            New Booking!
          </p>
          <div className="flex flex-col gap-1 mt-1 text-xs text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-semibold text-gray-400 dark:text-gray-500">User:</span> {alert.customerName}
            </p>
            <p className="leading-relaxed">
              <span className="font-semibold text-gray-400 dark:text-gray-500">Items:</span> {alert.items}
            </p>
            {Number(alert.totalPrice) > 0 && (
              <p>
                <span className="font-semibold text-gray-400 dark:text-gray-500">Total Price:</span> {currencySymbol}
                {Number(alert.totalPrice).toFixed(2)}
              </p>
            )}
            {slotTimes && (
              <p>
                <span className="font-semibold text-gray-400 dark:text-gray-500">Time:</span> {slotTimes}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          aria-label="Dismiss booking alert"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default BookingAlertFooter;
