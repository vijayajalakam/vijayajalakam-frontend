import React from "react";
import { Search } from "lucide-react";

const CustomTextField = React.forwardRef(
  (
    {
      label,
      type = "text",
      placeholder,
      value,
      onChange,
      icon: Icon,
      disabled = false,
      className = "",
      error,
      variant = "default", // "default" or "compact"
      ...props
    },
    ref,
  ) => {
    return (
      <div className={`w-full space-y-1 ${className}`}>
        {label && (
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
            {label} {props.required && <span className="text-red-400">*</span>}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <div
              className={`absolute inset-y-0 left-0 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors ${variant === "compact" ? "pl-2.5" : "pl-3"}`}
            >
              <Icon size={variant === "compact" ? 14 : 16} />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            className={`
                        w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 font-medium 
                        outline-none transition-all duration-200
                        placeholder:text-gray-400 dark:text-gray-500
                        ${variant === "compact" ? "px-3 py-1.5 h-[34px] rounded-lg text-[11px]" : "px-4 py-2 h-[42px] rounded-xl text-sm"}
                        ${Icon ? (variant === "compact" ? "pl-8" : "pl-10") : ""}
                        ${
                          disabled
                            ? "opacity-60 cursor-not-allowed"
                            : "focus:ring-2 focus:ring-brand-primary/20 focus:bg-white dark:bg-dark-surface dark:focus:bg-dark-surface"
                        }
                        ${error ? "ring-2 ring-red-100 focus:ring-red-200" : ""}
                    `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 font-medium ml-1">{error}</p>
        )}
      </div>
    );
  },
);

export default CustomTextField;
