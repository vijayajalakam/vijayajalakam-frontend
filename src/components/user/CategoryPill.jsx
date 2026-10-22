import React from "react";

const CategoryPill = ({ label, active, onClick, count }) => {
  return (
    <button
      onClick={onClick}
      className={`category-pill ${active ? "active" : "hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card"}`}
    >
      <span className="flex items-center gap-2">
        {label}
        {count !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white dark:bg-dark-surface/20 text-white" : "bg-gray-100 text-gray-500 dark:text-gray-400"}`}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
};

export default CategoryPill;
