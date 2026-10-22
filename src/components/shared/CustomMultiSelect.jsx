import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CustomMultiSelect = ({
  label,
  icon: Icon,
  value = [],
  onChange,
  options = [],
  placeholder,
  required = false,
  disabled = false,
  isSearchable = false,
  showSelectAll = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const allSelected =
    options.length > 0 && options.every((opt) => value.includes(opt.value));
  const someSelected =
    options.length > 0 &&
    options.some((opt) => value.includes(opt.value)) &&
    !allSelected;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isSearchable]);

  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];

    onChange({ target: { value: newValue } });
  };

  const handleSelectAll = () => {
    const newValue = allSelected ? [] : options.map((opt) => opt.value);
    onChange({ target: { value: newValue } });
  };

  const getDisplayValue = () => {
    if (!value || value.length === 0) return placeholder || "Select Options";
    if (value.length === options.length && options.length > 1)
      return "All Options Selected";
    if (value.length === 1) {
      const option = options.find((o) => o.value === value[0]);
      return option ? option.label : value[0];
    }
    return `${value.length} Options Selected`;
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
                        w-full flex items-center justify-between
                        bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white text-sm font-medium rounded-xl 
                        px-4 py-2.5 outline-none transition-all duration-200
                        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card focus:ring-2 focus:border-brand-primary focus:ring-brand-primary/20"}
                        ${isOpen ? "ring-2 border-brand-primary ring-brand-primary/20" : ""}
                    `}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {Icon && <Icon size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />}
            <span
              className={`truncate ${value.length === 0 ? "text-gray-400 dark:text-gray-500" : ""}`}
            >
              {getDisplayValue()}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-primary dark:text-blue-400" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden"
            >
              {(isSearchable || showSelectAll) && (
                <div className="p-2 border-b border-gray-50 space-y-2">
                  {isSearchable && (
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:border-brand-primary focus:ring-brand-primary/20 transition-all font-medium"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {showSelectAll && options.length > 0 && !searchTerm && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-brand-primary dark:text-blue-400 bg-brand-primary/5 hover:bg-brand-primary/10 transition-colors"
                    >
                      <span>{allSelected ? "Deselect All" : "Select All"}</span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? "bg-brand-primary border-brand-primary" : "border-gray-300 dark:border-dark-border"}`}
                      >
                        {allSelected && (
                          <Check
                            size={10}
                            className="text-white"
                            strokeWidth={4}
                          />
                        )}
                        {someSelected && (
                          <div className="w-2 h-0.5 bg-brand-primary rounded-full" />
                        )}
                      </div>
                    </button>
                  )}
                </div>
              )}
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = value.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleOption(opt.value)}
                        className={`
                                                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                                                    ${
                                                      isSelected
                                                        ? "bg-brand-primary/5 text-brand-primary font-bold"
                                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
                                                    }
                                                `}
                      >
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="truncate">{opt.label}</span>
                          {opt.description && (
                            <span
                              className={`text-[10px] truncate ${isSelected ? "text-brand-primary dark:text-blue-400/60" : "text-gray-400"}`}
                            >
                              {opt.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={14} className="flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500 italic">
                    No results found
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomMultiSelect;
