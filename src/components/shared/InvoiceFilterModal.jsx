import React, { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  CreditCard,
  Scissors,
  Store,
  Filter,
  User,
  Search,
  Package,
} from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";
import { useAuth } from "../../features/auth/hooks/useAuth";

const InvoiceFilterModal = ({
  isOpen,
  onClose,
  onApply,
  services = [],
  products = [],
  branches = [],
  staff = [],
  customers = [],
  paymentMethods = [],
  initialFilters = {},
}) => {
  const { currencySymbol } = useAuth();
  const [activeTab, setActiveTab] = useState("payment");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filters, setFilters] = useState(
    initialFilters || {
      startDate: "",
      endDate: "",
      paymentMethod: [],
      services: [],
      products: [],
      staff: [],
      customers: [],
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

  const categories = [
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "services", label: "Services", icon: Scissors },
    { id: "products", label: "Products", icon: Package },
    { id: "staff", label: "Completed By", icon: User },
    { id: "customers", label: "Customers", icon: User },
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

  const handleReset = () => {
    setFilters({
      startDate: "",
      endDate: "",
      paymentMethod: [],
      services: [],
      products: [],
      staff: [],
      customers: [],
    });
    setCustomerSearch("");
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
            className={`shrink-0 bg-gray-50 dark:bg-dark-card/50 border-r border-gray-100 dark:border-dark-border 
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

              {[
                "payment",
                "services",
                "products",
                "staff",
              ].includes(activeTab) && (
                <div className="grid grid-cols-1 gap-3">
                  {(activeTab === "payment"
                    ? [
                        "Due",
                        ...(paymentMethods.length > 0
                          ? paymentMethods.map((pm) => pm.name)
                          : ["CASH", "UPI", "CARD"]),
                      ]
                    : activeTab === "services"
                      ? services
                      : activeTab === "products"
                        ? products
                        : staff
                  ).map((item) => {
                    const id = typeof item === "string" ? item : item._id;
                    const label = typeof item === "string" ? item : item.name;
                    const subLabel =
                      typeof item === "string"
                        ? null
                        : item.price
                          ? `${currencySymbol}${item.price}`
                          : item.email || item.mapAddress || item.address;
                    const filterKey =
                      activeTab === "payment" ? "paymentMethod" : activeTab;
                    
                    // For payment methods, we want to store the NAME (label) because backend filters by string
                    const effectiveId = activeTab === "payment" ? label : id;
                    const isSelected = (filters[filterKey] || []).includes(effectiveId);

                    return (
                      <button
                        key={id}
                        onClick={() => handleToggleArrayFilter(filterKey, effectiveId)}
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

              {activeTab === "customers" && (
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name or phone..."
                      className="w-full bg-gray-50 dark:bg-dark-card border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold placeholder:text-gray-400 dark:text-gray-500 focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {customers
                      .filter(
                        (c) =>
                          c.name
                            .toLowerCase()
                            .includes(customerSearch.toLowerCase()) ||
                          c.phone.includes(customerSearch),
                      )
                      .map((customer) => {
                        const isSelected = (filters.customers || []).includes(
                          customer._id,
                        );
                        return (
                          <button
                            key={customer._id}
                            onClick={() =>
                              handleToggleArrayFilter("customers", customer._id)
                            }
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200
                                                        ${
                                                          isSelected
                                                            ? "border-brand-primary bg-blue-50/30 text-brand-primary"
                                                            : "border-gray-100 bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card/50"
                                                        }`}
                          >
                            <div className="flex flex-col items-start text-left">
                              <span className="text-xs font-bold uppercase tracking-tight">
                                {customer.name}
                              </span>
                              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-widest">
                                {customer.phone}
                              </span>
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

export default InvoiceFilterModal;
