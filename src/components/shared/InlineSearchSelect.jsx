import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, X } from "lucide-react";

export default function InlineSearchSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className = "",
  dropdownWidth = "100%",
  allowClear = false,
  customDropdownClass = "",
  id = "",
  searchable = true,
  onNoResultsAction,
  noResultsActionLabel,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click — must check both container and portal dropdown
  useEffect(() => {
    const handler = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest("[data-inline-select-dropdown]")
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Recalculate dropdown position whenever it opens or window scrolls/resizes
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownMaxHeight = 220;

    // Open upward if not enough space below
    const openUpward = spaceBelow < dropdownMaxHeight + 8 && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: dropdownWidth === "100%" ? rect.width : parseInt(dropdownWidth, 10),
      minWidth: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [dropdownWidth]);

  useEffect(() => {
    if (open) {
      updateDropdownPosition();
      // Only focus if searchable, otherwise keyboard pops up on mobile unnecessarily for readonly inputs on some old browsers, but actually we can focus it.
      if (searchable) {
        inputRef.current?.focus();
      }
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [open, updateDropdownPosition, searchable]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightIndex(-1);
    }
  }, [open, options, value]);

  const selected = options.find((o) => o.value === value);
  const filtered = search && searchable
    ? options.filter((o) => {
        const searchStr =
          o.searchValue || (typeof o.label === "string" ? o.label : "");
        return searchStr.toLowerCase().includes(search.toLowerCase());
      })
    : options;

  const handleSelect = useCallback(
    (val) => {
      onChange(val);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          const idx = options.findIndex((o) => o.value === value);
          setHighlightIndex(idx >= 0 ? idx : 0);
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
            handleSelect(filtered[highlightIndex].value);
          } else if (filtered.length > 0) {
            handleSelect(filtered[0].value);
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
    [open, filtered, highlightIndex, handleSelect],
  );

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-option]");
      if (items[highlightIndex]) {
        items[highlightIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIndex]);

  const dropdownEl = open
    ? createPortal(
        <div
          data-inline-select-dropdown
          className={`bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden ${customDropdownClass}`}
          style={{
            ...dropdownStyle,
            boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
          }}
        >
          <div ref={listRef} className="overflow-y-auto max-h-[220px] p-1.5">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                <span>No results found</span>
                {onNoResultsAction && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onNoResultsAction(search);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="mt-1 px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-secondary transition-all cursor-pointer shadow-sm"
                  >
                    {noResultsActionLabel || "Click here"}
                  </button>
                )}
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
                    onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium
                      transition-all text-left cursor-pointer rounded-lg
                      ${
                        isActive
                          ? "bg-brand-primary/10 text-brand-primary"
                          : isHighlighted
                            ? "bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                  >
                    <span className="w-4 flex-shrink-0 flex items-center justify-center">
                      {isActive && (
                        <Check
                          size={14}
                          strokeWidth={3}
                          className="text-brand-primary dark:text-blue-400"
                        />
                      )}
                    </span>
                    <div className="flex-1 min-w-0 w-full text-left flex flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className={`text-[10px] truncate w-full mt-0.5 ${isActive ? "text-brand-primary/70 dark:text-blue-400/70" : "text-gray-400 dark:text-gray-500"}`}>
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
        document.body,
      )
    : null;

  return (
    <div
      className="relative w-full"
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="relative flex items-center group cursor-pointer"
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
            setSearch("");
          }
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={`${className} w-full pr-10 outline-none transition-all placeholder:text-gray-300 font-inherit ${!searchable ? 'cursor-pointer' : ''}`}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!searchable}
          value={
            open && searchable
              ? search
              : selected
                ? selected.displayValue ||
                  (typeof selected.label === "string" ? selected.label : "")
                : ""
          }
          onChange={(e) => {
            if (searchable) {
              if (!open) setOpen(true);
              setSearch(e.target.value);
              setHighlightIndex(0);
            }
          }}
          onClick={(e) => {
            if (searchable) {
              e.stopPropagation();
              if (!open) {
                setOpen(true);
                setSearch("");
              }
            }
          }}
          onFocus={() => {
            if (!disabled && searchable) {
              setOpen(true);
              setSearch("");
            }
          }}
          autoComplete="off"
          style={!searchable ? { caretColor: 'transparent' } : {}}
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {allowClear && selected && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
              }}
              className="p-1 text-gray-300 hover:text-gray-500 dark:text-gray-400 rounded-md transition-colors pointer-events-auto"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 dark:text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {dropdownEl}
    </div>
  );
}
