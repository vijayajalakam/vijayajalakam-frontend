import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  position = "center",
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  // Determine animation and layout based on position
  const isRight = position === "right";

  const modalVariants = isRight
    ? {
        hidden: { opacity: 0, x: "100%" },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: "100%" },
      }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 20 },
      };

  const containerClasses = isRight
    ? `fixed inset-0 z-[999999] flex justify-end`
    : `fixed inset-0 z-[999999] flex items-center justify-center p-4`;

  const panelClasses = isRight
    ? `bg-white dark:bg-dark-surface w-full ${sizeClasses[size]} h-full shadow-2xl flex flex-col relative`
    : `bg-white dark:bg-dark-surface rounded-[1rem] shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col relative`;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999998]"
            onClick={onClose}
          />

          {/* Modal */}

          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            transition={
              isRight
                ? { type: "spring", damping: 25, stiffness: 200 }
                : undefined
            }
            className={containerClasses}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={panelClasses}>
              {/* Header */}
              {title ? (
                <div className="px-6 py-5 flex flex-shrink-0 items-center justify-between border-b border-gray-100 dark:border-dark-border">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>

                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card transition-colors cursor-pointer z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto overflow-x-visible p-6">{children}</div>

              {/* Footer */}
              {footer && (
                <div
                  className={`px-6 py-4 flex-shrink-0 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-card/50 ${!isRight && "rounded-b-[1rem]"}`}
                >
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
