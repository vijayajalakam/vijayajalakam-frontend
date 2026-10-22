import React from "react";
import {
  LayoutGrid,
  Scissors,
  Paintbrush,
  Eye,
  Sparkles,
  Heart,
  Stethoscope,
  SmilePlus,
  Dumbbell,
  HandMetal,
} from "lucide-react";

/**
 * Mobile Category Grid — Fresha-style category icons
 * Two rows of scrollable icon + label categories
 */

const DEFAULT_CATEGORIES = [
  { id: "all", name: "All", icon: LayoutGrid },
  { id: "hair", name: "Hair and styling", icon: Scissors },
  { id: "nails", name: "Nails", icon: Paintbrush },
  { id: "brows", name: "Brows & lashes", icon: Eye },
  { id: "hair-removal", name: "Hair removal", icon: Sparkles },
  { id: "makeup", name: "Makeup", icon: Heart },
  { id: "tattoos", name: "Tattoos & piercing", icon: HandMetal },
  { id: "medical", name: "Medical", icon: Stethoscope },
  { id: "dental", name: "Dental", icon: SmilePlus },
  { id: "fitness", name: "Fitness", icon: Dumbbell },
];

const MobileCategoryGrid = ({ categories = [], activeCategory, onCategorySelect }) => {
  // Merge real categories with default icons
  const displayCategories = categories.length > 0
    ? categories.map((cat, idx) => {
        const isAll = cat.name && cat.name.toLowerCase() === "all";
        return {
          _id: isAll ? "all" : (cat._id || cat.id || `cat-${idx}`),
          name: cat.name || cat,
          icon: isAll ? LayoutGrid : DEFAULT_CATEGORIES[Math.min(idx, DEFAULT_CATEGORIES.length - 1)]?.icon || Sparkles,
        };
      })
    : DEFAULT_CATEGORIES;

  return (
    <div className="mobile-category-grid">
      <div className="mobile-category-scroll">
        {displayCategories.map((cat) => {
          const Icon = cat.icon || Sparkles;
          const isActive = activeCategory === cat._id || (cat._id === "all" && !activeCategory);

          return (
            <button
              key={cat._id || cat.id}
              className={`mobile-category-item ${isActive ? "active" : ""}`}
              onClick={() => onCategorySelect(cat._id === "all" ? null : cat._id)}
            >
              <div className={`mobile-category-icon ${isActive ? "active" : ""}`}>
                <Icon size={24} strokeWidth={1.5} />
              </div>
              <span className="mobile-category-label">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileCategoryGrid;
