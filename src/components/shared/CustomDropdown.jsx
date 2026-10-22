import React, { useState, useRef, useEffect, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CustomDropdown = React.forwardRef(
  (
    {
      label,
      icon: Icon,
      value,
      onChange,
      options,
      disabled,
      placeholder,
      required = false,
      isSearchable = false,
      variant = "default", // "default" or "compact"
      onKeyDown: propsOnKeyDown,
      buttonClassName,
      buttonStyle,
      dropdownClassName,
      matchWidthRef,
      matchWidthPadding = 0,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        buttonRef.current?.focus();
      },
      open: () => {
        setFocusedIndex(0);
        setIsOpen(true);
      },
      close: () => {
        setIsOpen(false);
        setFocusedIndex(-1);
        setSearchTerm("");
      },
      isOpen: () => isOpen,
    }));

    const selectedOption = options.find(
      (opt) => String(opt.value).toLowerCase() === String(value).toLowerCase(),
    );

    const filteredOptions = options.filter((opt) => {
      const labelText =
        opt.searchLabel ||
        (typeof opt.label === "string" ? opt.label : String(opt.value));
      return (
        labelText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.description &&
          opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)
        ) {
          setIsOpen(false);
          setFocusedIndex(-1);
          setSearchTerm("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && isSearchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, isSearchable]);

    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        let isUpward = false;
        let maxHeight = 280; // Default max height
        
        // If there's less than 240px below, but more space above, flip it up
        if (spaceBelow < 240 && spaceAbove > spaceBelow) {
          isUpward = true;
          maxHeight = Math.min(spaceAbove - 16, 280);
        } else {
          maxHeight = Math.min(spaceBelow - 16, 280);
        }

        setDropdownPosition({
          top: isUpward ? 'auto' : rect.bottom,
          bottom: isUpward ? window.innerHeight - rect.top : 'auto',
          left: matchWidthRef?.current ? matchWidthRef.current.getBoundingClientRect().left + matchWidthPadding : rect.left,
          width: matchWidthRef?.current ? matchWidthRef.current.getBoundingClientRect().width - (matchWidthPadding * 2) : rect.width,
          maxHeight: Math.max(maxHeight, 100), // ensure at least 100px
          isUpward,
        });
      }
    };

    useEffect(() => {
      if (isOpen) {
        updatePosition();
      }
    }, [isOpen]);

    useEffect(() => {
      if (!isOpen) return;
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }, [isOpen]);

    const handleSelect = (val, e) => {
      onChange({ target: { value: val } });
      setIsOpen(false);
      setFocusedIndex(-1);
      setSearchTerm("");

      // If selection was made via keyboard, notify parent to move focus
      if (e && e.key === "Enter" && propsOnKeyDown) {
        propsOnKeyDown(e);
      }
    };

    const toggleOpen = () => {
      if (disabled) return;
      if (!isOpen) {
        setFocusedIndex(0);
        setIsOpen(true);
      } else {
        setIsOpen(false);
        setFocusedIndex(-1);
        setSearchTerm("");
      }
    };

    const handleKeyDown = (e) => {
      if (disabled) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          toggleOpen();
        } else {
          setFocusedIndex((prev) =>
            Math.min(prev + 1, filteredOptions.length - 1),
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === "Enter") {
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].value, e);
          }
        } else {
          // Let it propagate unless we are specifically targeting the button
          if (document.activeElement === buttonRef.current) {
            e.preventDefault();
            toggleOpen();
          } else if (propsOnKeyDown) {
            propsOnKeyDown(e);
          }
        }
      } else if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          setSearchTerm("");
        }
      } else if (!isOpen && propsOnKeyDown) {
        propsOnKeyDown(e);
      }
    };

    return (
      <div
        className="w-full space-y-1.5 min-w-0"
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        {label && (
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
            {label} {required && <span className="text-red-400">*</span>}
          </label>
        )}
        <div className="relative min-w-0">
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleOpen}
            disabled={disabled}
            className={buttonClassName || `
                        w-full flex items-center justify-between min-w-0
                          bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 text-sm font-medium 
                          outline-none transition-all duration-200
                          ${variant === "compact" ? "px-3 py-1.5 h-[34px] rounded-lg" : "px-4 py-2 h-[42px] rounded-xl"}
                          ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card focus:ring-2 focus:border-brand-primary focus:ring-brand-primary/20"}
                        ${isOpen ? "ring-2 border-brand-primary ring-brand-primary/20" : ""}
                    `}
            style={buttonStyle}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-grow w-full min-w-0">
              {Icon && (
                <Icon
                  size={variant === "compact" ? 14 : 16}
                  className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                />
              )}
              <div className="flex flex-col items-start overflow-hidden leading-tight flex-grow w-full min-w-0">
                <div
                  className={`w-full truncate ${variant === "compact" ? "text-[11px]" : "text-sm"} ${!selectedOption ? "text-gray-400" : "text-gray-900 dark:text-gray-100"}`}
                  title={selectedOption ? selectedOption.label : placeholder}
                >
                  {selectedOption ? selectedOption.label : placeholder}
                </div>
              </div>
            </div>
            <ChevronDown
              size={variant === "compact" ? 14 : 16}
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-primary dark:text-blue-400" : ""}`}
            />
          </button>

          {createPortal(
            <AnimatePresence>
              {isOpen && !disabled && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className={`fixed z-[9999999] bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden ${dropdownPosition.isUpward ? "mb-2" : "mt-2"} ${dropdownClassName || ""}`}
                  style={{
                    top: dropdownPosition.top === 'auto' ? 'auto' : `${dropdownPosition.top}px`,
                    bottom: dropdownPosition.bottom === 'auto' ? 'auto' : `${dropdownPosition.bottom}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                  }}
                >
                  {isSearchable && (
                    <div className="p-2 border-b border-gray-50 dark:border-dark-border">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:border-brand-primary focus:ring-brand-primary/20 transition-all font-medium"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div 
                    className="overflow-y-auto custom-scrollbar p-1 space-y-0.5 bg-white dark:bg-dark-surface relative z-[9999999]"
                    style={{ maxHeight: `${dropdownPosition.maxHeight}px` }}
                  >
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((opt, index) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelect(opt.value)}
                          className={`
                                                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                                                  ${String(value) === String(opt.value) ? "bg-brand-primary/10 text-brand-primary font-bold" : "text-gray-700 dark:text-gray-300 font-medium"}
                                                  ${focusedIndex === index ? "bg-gray-100 dark:bg-dark-card" : "hover:bg-gray-50 dark:hover:bg-dark-card"}
                                              `}
                        >
                          <div className="flex flex-col items-start overflow-hidden flex-grow w-full min-w-0">
                            <div
                              className="truncate text-left w-full"
                              title={opt.label}
                            >
                              {opt.label}
                            </div>
                            {opt.description && (
                              <span
                                className={`text-[10px] truncate w-full ${value === opt.value ? "text-brand-primary dark:text-blue-400/70" : "text-gray-400"}`}
                              >
                                {opt.description}
                              </span>
                            )}
                          </div>
                          {String(value) === String(opt.value) && (
                            <Check size={14} className="shrink-0 ml-2 text-brand-primary" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500 italic">
                        No results found
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
      </div>
    );
  },
);

export default CustomDropdown;
