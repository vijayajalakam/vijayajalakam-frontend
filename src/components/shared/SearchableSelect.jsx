import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, X } from "lucide-react";

/**
 * SearchableSelect – A premium, reusable searchable dropdown.
 *
 * Props:
 *  - label        (string)    Field label
 *  - icon         (Component) Lucide icon for the trigger
 *  - options      [{value, label, group?, indent?}]
 *  - value        Current selected value
 *  - onChange     (value) => void
 *  - placeholder  Trigger placeholder text
 *  - disabled     boolean
 *  - searchable   boolean (default true) – show search box
 *  - required     boolean – show * after label
 *  - error        string – error message
 *  - dropdownHeight string – max height of dropdown list (default "280px")
 */
const SearchableSelect = ({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  searchable = true,
  required = false,
  error = "",
  dropdownHeight = "280px",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!open) return;
    
    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open && searchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, searchable]);

  // Selected option label
  const selected = options.find((o) => o.value === value);

  // Filtered options
  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.description && o.description.toLowerCase().includes(search.toLowerCase())),
      )
    : options;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && filtered[highlightIndex]) {
            onChange(filtered[highlightIndex].value);
            setOpen(false);
            setSearch("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          setSearch("");
          break;
        default:
          break;
      }
    },
    [open, filtered, highlightIndex, onChange],
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-option]");
      if (items[highlightIndex]) {
        items[highlightIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIndex]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const toggleOpen = () => {
    if (!disabled) {
      setOpen(!open);
      if (open) setSearch("");
    }
  };

  return (
    <div className="space-y-1" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {/* ── Trigger Button ── */}
        <button
          type="button"
          onClick={toggleOpen}
          className={`
            w-full flex items-center gap-2 pl-11 pr-10 py-2.5
            bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-medium
            transition-all outline-none text-left
            ${
              open
                ? "border-brand-primary ring-2 ring-brand-primary/20"
                : error
                  ? "border-red-300 hover:border-red-400"
                  : "hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card hover:border-gray-300 dark:border-dark-border"
            }
            ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
          `}
        >
          {/* Left icon */}
          <div
            className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${
              open ? "text-brand-primary dark:text-blue-400" : "text-gray-400"
            }`}
          >
            {Icon && <Icon size={18} />}
          </div>

          {/* Label */}
          <span
            className={`truncate ${selected ? "text-gray-900 dark:text-white" : "text-gray-400"}`}
          >
            {selected ? selected.label : placeholder}
          </span>

          {/* Right: clear / chevron */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
            {selected && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setSearch("");
                }}
                className="p-0.5 rounded-md text-gray-300 hover:text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown
              size={16}
              className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {/* ── Dropdown Panel ── */}
        {open && createPortal(
          <div
            ref={dropdownRef}
            className="absolute z-[9999999] bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              boxShadow:
                "0 12px 40px -8px rgba(0,0,0,0.12), 0 4px 16px -4px rgba(0,0,0,0.06)",
            }}
          >
            {/* Search input */}
            {searchable && (
              <div className="p-2.5 border-b border-gray-50">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHighlightIndex(0);
                    }}
                    placeholder="Type to search..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:border-brand-primary focus:ring-brand-primary/20 transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div
              ref={listRef}
              className="overflow-y-auto py-1.5 overscroll-contain"
              style={{ maxHeight: dropdownHeight }}
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                    No results found
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : (
                filtered.map((opt, idx) => {
                  const isActive = opt.value === value;
                  const isHighlighted = idx === highlightIndex;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      data-option
                      onClick={() => handleSelect(opt.value)}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium
                        transition-all text-left cursor-pointer rounded-lg mx-1.5
                        ${
                          isActive
                            ? "bg-brand-primary/8 text-brand-primary"
                            : isHighlighted
                              ? "bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-white"
                              : "text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-gray-900 dark:text-white"
                        }
                      `}
                      style={{
                        width: "calc(100% - 12px)",
                        paddingLeft: `${0.75 + (opt.indent || 0) * 1}rem`,
                      }}
                    >
                      {/* Checkmark */}
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                        {isActive && (
                          <span className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center">
                            <Check
                              size={12}
                              className="text-brand-primary dark:text-blue-400"
                              strokeWidth={3}
                            />
                          </span>
                        )}
                      </span>

                      {/* Label */}
                      <div className="flex flex-col overflow-hidden flex-grow min-w-0">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className={`text-[10px] truncate ${isActive ? "text-brand-primary dark:text-blue-400/70" : "text-gray-400"}`}>
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-[10px] font-semibold text-red-500 px-1 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
};

export default SearchableSelect;
