import React from "react";
import { Heart, Star, MapPin, RefreshCw } from "lucide-react";

/**
 * Mobile "Book Again" Card for Shop Selector — shows a previously booked shop
 * Card layout with image, location pin, shop name, category info, and rebook button
 */
const MobileShopBookAgainCard = ({ shop, onClick, onToggleFavorite, isFavorite }) => {
  const { name, image, area, city, location, category, _id, currencySymbol } = shop;
  const currency = currencySymbol || "₹";
  const dbImage = typeof image === "string" ? image : image?.url;
  const fallbackImages = [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=600&q=80"
  ];
  // Determine if dbImage is a boring placeholder or missing, if so use beautiful fallback
  // Catches the specific cloudinary silhouette image (mqm3rrkpvtzoedommirq)
  const isDefaultDbImage = !dbImage || dbImage.includes('default') || dbImage.includes('placeholder') || dbImage.includes('svg') || dbImage.includes('mqm3rrkpvtzoedommirq');
  const imageUrl = isDefaultDbImage ? fallbackImages[name.length % fallbackImages.length] : dbImage;
  const locationText = area ? `${area}, ${city || ''}` : location || 'Bengaluru, India';
  const categoryName = category?.name || category || 'Salon';

  return (
    <div
      onClick={onClick}
      className="mobile-book-again-card cursor-pointer"
    >
      {/* Image with location pin */}
      <div className="mobile-book-again-image">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" />
        ) : (
          <div className="mobile-book-again-no-img">{name.charAt(0)}</div>
        )}
        {/* Location Pin Overlay */}
        <div className="mobile-book-again-pin">
          <MapPin size={16} fill="white" color="white" />
        </div>
      </div>

      {/* Info */}
      <div className="mobile-book-again-info">
        <h3 className="mobile-book-again-name text-base font-extrabold text-gray-900 dark:text-white line-clamp-1">{name}</h3>
        <p className="mobile-book-again-meta text-[13px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
          {currency}{Math.floor(Math.random() * 2000 + 500).toLocaleString()} • Premium {categoryName} Service
        </p>
      </div>

      {/* Rebook Button */}
      <button
        className="mobile-book-again-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <RefreshCw size={14} />
        <span>Rebook</span>
      </button>
    </div>
  );
};

export default MobileShopBookAgainCard;
