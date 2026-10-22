import { useState, useEffect, useRef } from "react";
import moment from "moment";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CustomMonthPicker = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(moment(value || new Date()).year());
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMonthClick = (monthIndex) => {
    const newMonth = moment().year(viewYear).month(monthIndex).format("YYYY-MM");
    onChange(newMonth);
    setIsOpen(false);
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const displayValue = value ? moment(value).format("MMMM, YYYY") : "Select Month";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className="w-full h-10 flex items-center justify-between bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-3 cursor-pointer outline-none focus:ring-1 focus:ring-brand-primary truncate"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs sm:text-sm text-gray-900 dark:text-white font-medium truncate">
          {displayValue}
        </span>
        <Calendar size={14} className="text-gray-400 shrink-0 ml-1.5 sm:ml-2" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[60] right-0 mt-2 bg-white dark:bg-dark-surface rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-100 dark:border-dark-border p-3"
            style={{ width: '240px', maxWidth: 'calc(100vw - 32px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewYear(y => y - 1)}
                className="p-1 hover:bg-gray-50 dark:hover:bg-dark-card rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-black text-gray-900 dark:text-white">
                {viewYear}
              </span>
              <button
                type="button"
                onClick={() => setViewYear(y => y + 1)}
                className="p-1 hover:bg-gray-50 dark:hover:bg-dark-card rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {months.map((m, idx) => {
                const isSelected = value && moment(value).year() === viewYear && moment(value).month() === idx;
                const isCurrentMonth = moment().year() === viewYear && moment().month() === idx;

                let btnClass = "py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center ";
                if (isSelected) {
                  btnClass += "bg-brand-primary text-white shadow-md shadow-brand-primary/30";
                } else if (isCurrentMonth) {
                  btnClass += "bg-brand-primary/10 text-brand-primary border border-brand-primary/20";
                } else {
                  btnClass += "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border";
                }

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthClick(idx)}
                    className={btnClass}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-dark-border flex justify-between items-center">
              <button 
                className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                onClick={() => { setViewYear(moment().year()); handleMonthClick(moment().month()); }}
              >
                This month
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomMonthPicker;
