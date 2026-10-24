import React, { useState, useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  X,
  Calendar,
  User,
  Filter,
  Clock,
  CheckCircle,
  Package,
} from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";

const BookingFilterModal = ({
  isOpen,
  onClose,
  onApply,
  staff = [],
  initialFilters = {},
}) => {
  const [activeTab, setActiveTab] = useState("date");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filters, setFilters] = useState(
    initialFilters || {
      date: "",
      type: [],
      status: [],
      staffId: [],
    },
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    if (isOpen && initialFilters) {
      setFilters(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const categories = [
    { id: "date", label: "Date", icon: Calendar },
    { id: "type", label: "Type", icon: Filter },
    { id: "status", label: "Status", icon: CheckCircle },
    { id: "staff", label: "Staff", icon: User },
  ];

  const typeOptions = [
    { id: "service", label: "Service Bookings", icon: Clock },
    { id: "product", label: "Product Orders", icon: Package },
  ];

  const statusOptions = [
    { id: "pending", label: "Pending", icon: Clock },
    { id: "confirmed", label: "Confirmed", icon: CheckCircle },
    { id: "completed", label: "Completed", icon: CheckCircle },
    { id: "cancelled", label: "Cancelled", icon: X },
  ];

  const handleToggleArrayFilter = (key, value) => {
    setFilters((prev) => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleSingleDateChange = (date) => {
    setFilters((prev) => ({ ...prev, date: date }));
  };

  const handleReset = () => {
    setFilters({
      date: new Date().toISOString().split("T")[0],
      type: [],
      status: [],
      staffId: [],
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!isOpen) return null;

  const modalVariants = {
    hidden: isMobile
      ? { y: "100%", opacity: 1 }
      : { y: 20, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1 },
    exit: isMobile
      ? { y: "100%", opacity: 1 }
      : { y: 20, opacity: 0, scale: 0.95 },
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        />

        <Motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-2xl bg-white dark:bg-dark-surface overflow-hidden flex flex-col md:flex-row shadow-2xl border-t md:border border-gray-100 dark:border-dark-border
                        ${isMobile ? "rounded-t-[2rem] h-[85vh]" : "rounded-3xl h-[480px]"}`}
        >
          {/* Mobile Handle */}
          {isMobile && (
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-dark-border rounded-full" />
            </div>
          )}

          {/* Sidebar / Category Tabs */}
          <div
            className={`shrink-0 bg-gray-50 dark:bg-dark-card/50 border-r border-gray-100 dark:border-dark-border overflow-y-auto
                        ${isMobile ? "w-full h-auto flex flex-row p-2 gap-1 border-b overflow-x-auto overflow-y-hidden" : "w-52 p-4 h-full flex flex-col overflow-y-auto"}`}
          >
            {!isMobile && (
              <div className="flex items-center gap-2 mb-6 px-1">
                <Filter size={14} className="text-brand-primary dark:text-blue-400" />
                <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                  Filters
                </h3>
              </div>
            )}

            <div
              className={`flex ${isMobile ? "flex-row w-full gap-2 p-1" : "flex-col space-y-3"}`}
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-2.5 rounded-xl transition-all duration-300 relative shrink-0
                                        ${
                                          isMobile
                                            ? `px-4 py-2 text-[10px] font-black uppercase tracking-tight
                                               ${activeTab === cat.id ? "bg-blue-50 text-brand-primary dark:text-blue-400 border border-blue-100" : "text-gray-500"}`
                                            : `px-3 py-3 text-[11px] font-bold uppercase w-full
                                               ${activeTab === cat.id ? "bg-blue-50 text-brand-primary dark:text-blue-400 border border-blue-100 shadow-sm" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"}`
                                        }`}
                >
                  <cat.icon
                    size={isMobile ? 12 : 14}
                    className={
                      activeTab === cat.id
                        ? "text-brand-primary"
                        : "text-gray-400 dark:text-gray-500"
                    }
                  />
                  <span>{cat.label}</span>

                  {!isMobile && activeTab === cat.id && (
                    <Motion.div
                      layoutId="modal-sidebar-pill"
                      className="absolute left-0 w-1 h-6 bg-brand-primary rounded-r-full"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-dark-surface">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between shrink-0">
              <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                {categories.find((c) => c.id === activeTab)?.label}
              </h4>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card rounded-lg transition-all active:scale-90"
              >
                <X size={18} className="text-gray-400 dark:text-gray-500" />
              </button>
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-24 md:pb-5">
              {activeTab === "date" && (
                <div
                  className={`space-y-5 mx-auto ${isMobile ? "w-full" : "max-w-sm pt-2"}`}
                >
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                      Select Date
                    </label>
                    <CustomDatePicker
                      value={filters.date}
                      onChange={handleSingleDateChange}
                    />
                  </div>
                </div>
              )}

              {["type", "status", "staff"].includes(activeTab) && (
                <div className="grid grid-cols-1 gap-3">
                  {(activeTab === "type"
                    ? typeOptions
                    : activeTab === "status"
                    ? statusOptions
                    : staff
                  ).map((item) => {
                    const id =
                      typeof item === "string" ? item : item._id || item.id;
                    const label =
                      typeof item === "string" ? item : item.label || item.name;
                    const subLabel = item.role || item.mapAddress || item.address;
                    const filterKey =
                      activeTab === "type"
                        ? "type"
                        : activeTab === "status"
                        ? "status"
                        : "staffId";
                    const isSelected = (filters[filterKey] || []).includes(id);

                    return (
                      <button
                        key={id}
                        onClick={() => handleToggleArrayFilter(filterKey, id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200
                                                    ${
                                                      isSelected
                                                        ? "border-brand-primary bg-blue-50/30 text-brand-primary dark:text-blue-400"
                                                        : "border-gray-100 bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card/50"
                                                    }`}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="text-xs font-bold uppercase tracking-tight">
                            {label}
                          </span>
                          {subLabel && (
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 mt-0.5 uppercase truncate max-w-[180px]">
                              {subLabel}
                            </span>
                          )}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all
                                                    ${isSelected ? "border-brand-primary bg-brand-primary" : "border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface"}`}
                        >
                          {isSelected && (
                            <div className="w-1 h-1 rounded-full bg-white dark:bg-dark-surface" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`p-4 border-t border-gray-50 flex items-center gap-3 bg-white dark:bg-dark-surface shrink-0
                            ${isMobile ? "fixed bottom-0 left-0 w-full z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" : ""}`}
            >
              <button
                onClick={handleReset}
                className="px-16 py-3.5 bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-8 py-3.5 bg-brand-primary hover:bg-brand-secondary text-white text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg shadow-blue-900/10 active:scale-[0.98]"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </Motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BookingFilterModal;
