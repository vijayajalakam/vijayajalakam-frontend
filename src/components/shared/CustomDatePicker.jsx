import { useState, useEffect, useRef } from "react";
import moment from "moment";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CustomDatePicker = ({ label, value, onChange, required = false, compact = false, disableFuture = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(moment(value || new Date()));
  const containerRef = useRef(null);

  // Sync viewDate during render if value changed
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (moment(value).isValid()) {
      setViewDate(moment(value).startOf("month"));
    }
  }

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

  // Navigation handlers
  const handlePrevDay = () => {
    const current = moment(value).isValid() ? moment(value) : moment();
    onChange(current.subtract(1, "days").format("YYYY-MM-DD"));
  };

  const handleNextDay = () => {
    const current = moment(value).isValid() ? moment(value) : moment();
    const nextDate = current.add(1, "days");
    if (disableFuture && nextDate.isAfter(moment(), "day")) return;
    onChange(nextDate.format("YYYY-MM-DD"));
  };

  const handlePrevMonth = () =>
    setViewDate((d) => moment(d).subtract(1, "month").startOf("month"));
  const handleNextMonth = () => {
    setViewDate((d) => {
      const nextMonth = moment(d).add(1, "month").startOf("month");
      if (disableFuture && nextMonth.isAfter(moment(), "month")) return d;
      return nextMonth;
    });
  };

  const handleDayClick = (day) => {
    const newDate = moment(viewDate).date(day).format("YYYY-MM-DD");
    onChange(newDate);
    setIsOpen(false);
  };

  const daysInMonth = viewDate.daysInMonth();
  const firstDay = moment(viewDate).startOf("month").day(); // 0 = Sun
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Sync input field value when external value changes
  const [inputValue, setInputValue] = useState(
    value && moment(value).isValid() ? moment(value).format("DD-MM-YYYY") : "",
  );

  // Sync input field value when external value changes during render
  const [prevExternalValue, setPrevExternalValue] = useState(value);
  if (value !== prevExternalValue) {
    setPrevExternalValue(value);
    setInputValue(
      value && moment(value).isValid()
        ? moment(value).format("DD-MM-YYYY")
        : "",
    );
  }

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val); // Allow typing

    if (!val) {
      onChange("");
      return;
    }

    // Auto-update if valid format
    if (val.length === 10 && moment(val, "DD-MM-YYYY", true).isValid()) {
      const parsedDate = moment(val, "DD-MM-YYYY");
      if (disableFuture && parsedDate.isAfter(moment(), "day")) return;
      onChange(parsedDate.format("YYYY-MM-DD"));
    }
  };

  const handleBlur = () => {
    // Reset to valid date on blur if invalid, but allow empty
    if (!inputValue) {
      onChange("");
      return;
    }
    if (!moment(inputValue, "DD-MM-YYYY", true).isValid()) {
      setInputValue(
        value && moment(value).isValid()
          ? moment(value).format("DD-MM-YYYY")
          : "",
      );
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="relative">
        <div className={`flex items-center justify-between bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border transition-all duration-300 group hover:bg-gray-50 dark:hover:bg-dark-card focus-within:ring-2 focus-within:border-brand-primary focus-within:ring-brand-primary/20 ${compact ? 'px-2.5 h-[28px] rounded-lg' : 'px-4 py-2 h-[42px] rounded-xl'}`}>
          {!compact && (
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-white dark:bg-dark-surface rounded-lg transition-all active:scale-95 shadow-sm hover:shadow"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
          )}

          <div
            className="flex-1 flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <input
              type="text"
              value={inputValue}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                handleInputChange(e);
              }}
              onBlur={handleBlur}
              placeholder="DD-MM-YYYY"
              className={`text-center font-bold text-gray-700 dark:text-gray-300 outline-none border-none bg-transparent p-0 cursor-text font-mono tracking-wide ${compact ? 'w-[70px] text-[10px]' : 'w-24 text-sm'}`}
            />
            <button
              type="button"
              className="text-gray-500 group-hover:text-brand-primary dark:text-blue-400 transition-colors"
            >
              <Calendar size={compact ? 11 : 14} className="stroke-[2.5]" />
            </button>
          </div>

          {!compact && (
            <button
              type="button"
              onClick={handleNextDay}
              disabled={disableFuture && (moment(value).isValid() ? moment(value) : moment()).add(1, "days").isAfter(moment(), "day")}
              className="p-1 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-white dark:bg-dark-surface rounded-lg transition-all active:scale-95 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Calendar Popup (Inside UI) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`absolute z-50 mt-2 bg-white dark:bg-dark-surface rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 dark:border-dark-border p-4 min-w-[280px] origin-top-right ${compact ? 'right-0 w-[280px]' : 'left-0 right-0 w-full'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-black text-gray-900 dark:text-white">
                  {viewDate.format("MMMM YYYY")}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={disableFuture && moment(viewDate).add(1, "month").startOf("month").isAfter(moment(), "month")}
                  className="p-1.5 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {weekDays.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider h-6 flex items-center justify-center"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  if (!day) return <div key={idx} />;

                  const currentDayDate = moment(viewDate)
                    .date(day)
                    .format("YYYY-MM-DD");
                  const isSelected = currentDayDate === value;
                  const isToday =
                    currentDayDate === moment().format("YYYY-MM-DD");
                  const isFuture = moment(currentDayDate).isAfter(moment(), "day");
                  const isDisabled = disableFuture && isFuture;

                  if (isDisabled) {
                    return <div key={idx} />; // Hide future dates completely as requested
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleDayClick(day)}
                      className={`
                                                aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center
                                                ${
                                                  isSelected
                                                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/30"
                                                    : isToday
                                                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                                                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
                                                }
                                            `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomDatePicker;
