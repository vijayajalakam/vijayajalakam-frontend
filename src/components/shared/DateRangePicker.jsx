import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "./ThemeContext";

const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const { primaryColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(
    moment(startDate || undefined).startOf("month"),
  );
  const [tempStart, setTempStart] = useState(
    startDate ? moment(startDate) : null,
  );
  const [tempEnd, setTempEnd] = useState(endDate ? moment(endDate) : null);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Track previous prop values to sync state when props change externally
  const [prevStartDate, setPrevStartDate] = useState(startDate);
  const [prevEndDate, setPrevEndDate] = useState(endDate);

  useEffect(() => {
    if (startDate !== prevStartDate || endDate !== prevEndDate) {
      setPrevStartDate(startDate);
      setPrevEndDate(endDate);
      setTempStart(startDate ? moment(startDate) : null);
      setTempEnd(endDate ? moment(endDate) : null);
      if (startDate) {
        setViewDate(moment(startDate).startOf("month"));
      }
    }
  }, [startDate, endDate, prevStartDate, prevEndDate]);

  const toggleOpen = () => {
    if (!isOpen) {
      setTempStart(startDate ? moment(startDate) : null);
      setTempEnd(endDate ? moment(endDate) : null);
      if (startDate) {
        setViewDate(moment(startDate).startOf("month"));
      }

      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        let left = rect.left;

        if (left + 580 > viewportWidth) {
          left = rect.right - 580;
        }

        left = Math.max(10, left);

        setPopoverPos({
          top: rect.bottom + 8,
          left: left,
        });
      }
    }
    setIsOpen((prev) => !prev);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const shortcuts = [
    {
      label: "TODAY",
      getValue: () => [moment().startOf("day"), moment().endOf("day")],
    },
    {
      label: "LAST 7 DAYS",
      getValue: () => [
        moment().subtract(6, "days").startOf("day"),
        moment().endOf("day"),
      ],
    },
    {
      label: "THIS MONTH",
      getValue: () => [moment().startOf("month"), moment().endOf("month")],
    },
    {
      label: "FY 26",
      getValue: () => [
        moment("2026-01-01").startOf("day"),
        moment("2026-12-31").endOf("day")
      ],
    },
    {
      label: "FY 27",
      getValue: () => [
        moment("2027-01-01").startOf("day"),
        moment("2027-12-31").endOf("day")
      ],
    },
    {
      label: "FY 28",
      getValue: () => [
        moment("2028-01-01").startOf("day"),
        moment("2028-12-31").endOf("day")
      ],
    },
  ];

  const handleShortcutClick = (shortcut) => {
    const [start, end] = shortcut.getValue();
    setTempStart(start);
    setTempEnd(end);
    setViewDate(start.clone().startOf("month"));
    onStartDateChange(start.format("YYYY-MM-DD"));
    onEndDateChange(end.format("YYYY-MM-DD"));
    setIsOpen(false);
  };

  const handleDateClick = (date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date.clone().startOf("day"));
      setTempEnd(null);
    } else {
      if (date.isBefore(tempStart)) {
        setTempEnd(tempStart.clone().endOf("day"));
        setTempStart(date.clone().startOf("day"));
      } else {
        setTempEnd(date.clone().endOf("day"));
      }
    }
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onStartDateChange("");
    onEndDateChange("");
  };

  const handleDone = () => {
    if (tempStart) {
      onStartDateChange(tempStart.format("YYYY-MM-DD"));
      onEndDateChange((tempEnd || tempStart).format("YYYY-MM-DD"));
    } else {
      onStartDateChange("");
      onEndDateChange("");
    }
    setIsOpen(false);
  };

  // Helper function to convert hex to RGB with opacity
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const renderCalendar = () => {
    const startOfMonth = viewDate.clone().startOf("month");
    const startDay = startOfMonth.day();
    const daysInMonth = viewDate.daysInMonth();

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-9 w-9" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = startOfMonth.clone().date(d);
      const isStart = tempStart && date.isSame(tempStart, "day");
      const isEnd = tempEnd && date.isSame(tempEnd, "day");
      const isInRange =
        tempStart &&
        tempEnd &&
        date.isAfter(tempStart, "day") &&
        date.isBefore(tempEnd, "day");
      const isToday = date.isSame(moment(), "day");

      let btnClass = "h-8 w-8 flex items-center justify-center text-xs font-bold rounded-xl transition-all";
      let btnStyle = {};

      if (isStart || isEnd) {
        btnStyle = {
          backgroundColor: primaryColor,
          color: "white",
        };
        btnClass += " shadow-md";
      } else if (isInRange) {
        btnStyle = {
          backgroundColor: hexToRgba(primaryColor, 0.12),
          color: primaryColor,
        };
        btnClass += " font-extrabold";
      } else if (isToday) {
        btnClass += " border text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-border";
        btnStyle.borderColor = primaryColor;
      } else {
        btnClass += " text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-border";
      }

      days.push(
        <div 
          key={d} 
          className="h-9 w-9 flex items-center justify-center"
        >
          <button
            onClick={() => handleDateClick(date)}
            style={btnStyle}
            className={btnClass}
          >
            {d}
          </button>
        </div>
      );
    }

    return days;
  };

  const formattedDisplay = useMemo(() => {
    if (!startDate) return "Select Date";
    const startStr = moment(startDate).format("DD-MM-YYYY");
    const endStr = moment(endDate).format("DD-MM-YYYY");
    return startDate === endDate ? startStr : `${startStr} - ${endStr}`;
  }, [startDate, endDate]);

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99998] md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "fixed",
              ...(window.innerWidth >= 768 ? {
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
              } : {}),
            }}
            className="z-[99999] bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border overflow-hidden
              fixed inset-x-4 bottom-4 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]
              md:inset-auto md:flex-row md:bottom-auto md:rounded-2xl md:w-[520px] md:max-h-none"
          >
            {/* Shortcuts Sidebar */}
            <div className="flex md:flex-col md:w-[140px] overflow-x-auto md:overflow-x-visible scrollbar-hide bg-gray-50 dark:bg-dark-card border-b md:border-b-0 md:border-r border-gray-200 dark:border-dark-border p-3 gap-1.5 shrink-0">
              {shortcuts.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleShortcutClick(s)}
                  className="py-2 px-3 rounded-xl transition-all text-left whitespace-nowrap bg-white dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-dark-border border border-transparent hover:border-gray-200 dark:border-dark-border dark:hover:border-dark-border"
                >
                  <span className="text-[10px] font-black text-gray-900 dark:text-white tracking-wide">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Calendar Area */}
            <div className="flex-1 p-4 flex flex-col overflow-y-auto">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {viewDate.format("MMMM YYYY")}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewDate(viewDate.clone().subtract(1, "month"))}
                    className="p-1.5 hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card rounded-lg transition-all"
                  >
                    <ChevronLeft size={16} className="text-gray-700 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => setViewDate(viewDate.clone().add(1, "month"))}
                    className="p-1.5 hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card rounded-lg transition-all"
                  >
                    <ChevronRight size={16} className="text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-0.5 text-center mb-2">
                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d) => (
                  <div key={d} className="h-7 flex items-center justify-center text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 mb-4">{renderCalendar()}</div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-200 dark:border-dark-border flex items-center justify-end gap-2">
                <button
                  onClick={handleClear}
                  className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card transition-all"
                >
                  CLEAR
                </button>
                <button
                  onClick={handleDone}
                  style={{
                    backgroundColor: primaryColor,
                  }}
                  className="px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  DONE
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="h-10 w-auto px-3 md:px-3.5 flex items-center justify-center gap-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-border active:scale-95 text-[10px] uppercase tracking-wider shrink-0 shadow-none"
        style={{
          '--hover-border': hexToRgba(primaryColor, 0.3),
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = hexToRgba(primaryColor, 0.3)}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
      >
        <CalendarIcon size={14} style={{ color: primaryColor }} />
        <span>{formattedDisplay}</span>
      </button>

      {createPortal(popoverContent, document.body)}
    </div>
  );
};

export default DateRangePicker;
