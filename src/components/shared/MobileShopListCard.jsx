import React from "react";
import { Heart, Star } from "lucide-react";

/**
 * Mobile Shop List Card — vertical card with full-width image, info below
 * Shows nearest branch address with distance like "20km> Ramanattukara, Kerala"
 */
const MobileShopListCard = ({ shop, onClick, onToggleFavorite, isFavorite }) => {
  const { name, image, galleryImage, area, city, location, category, _id, slug, rating, reviewsCount } = shop;
  const shopId = _id || slug;
  const dbImage = galleryImage || (typeof image === "string" ? image : image?.url);
  const fallbackImages = [
    "https://images.unsplash.com/photo-1516975080661-46bfa2c3000b?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1600948836101-f9ff09c1f076?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1595152452543-e5fc28ebc2b8?auto=format&fit=crop&w=600&q=80"
  ];
  const isDefaultDbImage = !dbImage || dbImage.includes('default') || dbImage.includes('placeholder') || dbImage.includes('svg') || dbImage.includes('mqm3rrkpvtzoedommirq');
  const imageUrl = isDefaultDbImage ? fallbackImages[(name || "").length % fallbackImages.length] : dbImage;
  const shopRating = Number(rating) || 0;
  const shopReviews = reviewsCount || 0;
  const categoryName = category?.name || category || "Salon";
  
  // Calculate nearest branch address with distance, or use user's selected branch for this shop
  const locationText = (() => {
    const branches = shop.branchAddresses || shop.branches || [];
    let userLoc = null;
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.lat && loc.lng) userLoc = loc;
      }
    } catch {}

    // Check if user has a selected branch for this specific shop
    let selectedBranchForShop = null;
    try {
      const perShop = JSON.parse(localStorage.getItem("selectedBranches") || "{}");
      if (shop.slug && perShop[shop.slug]) {
        const sel = perShop[shop.slug];
        // Find this branch in the shop's branches
        const found = branches.find(b => b._id === sel.id);
        if (found) selectedBranchForShop = found;
      }
    } catch {}

    // If user selected a branch for this shop, use that branch
    if (selectedBranchForShop && userLoc && selectedBranchForShop.latitude && selectedBranchForShop.longitude) {
      const R = 6371;
      const dLat = ((selectedBranchForShop.latitude - userLoc.lat) * Math.PI) / 180;
      const dLon = ((selectedBranchForShop.longitude - userLoc.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLoc.lat * Math.PI) / 180) * Math.cos((selectedBranchForShop.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.round(R * c);
      const addr = selectedBranchForShop.mapAddress || "";
      const shortAddr = addr ? addr.split(",").slice(0, 2).map(s => s.trim()).join(", ") : "";
      if (shortAddr) return `${dist}km> ${shortAddr}`;
      return `${dist}km>`;
    }
    // If selected branch exists but no coordinates, just show its address
    if (selectedBranchForShop && selectedBranchForShop.mapAddress) {
      const shortAddr = selectedBranchForShop.mapAddress.split(",").slice(0, 2).map(s => s.trim()).join(", ");
      return shortAddr;
    }

    // No selected branch for this shop — find nearest branch
    let nearestBranch = null;
    let nearestDistance = null;

    if (userLoc && branches.length > 0) {
      let minDist = Infinity;
      for (const b of branches) {
        if (b.latitude && b.longitude) {
          const R = 6371;
          const dLat = ((b.latitude - userLoc.lat) * Math.PI) / 180;
          const dLon = ((b.longitude - userLoc.lng) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLoc.lat * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = Math.round(R * c);
          if (d < minDist) {
            minDist = d;
            nearestBranch = b;
            nearestDistance = d;
          }
        }
      }
    }

    // Use backend-provided distance if available
    if (nearestDistance === null && shop.distance != null) {
      nearestDistance = shop.distance;
    }

    // Build distance prefix like "20km>"
    const distancePrefix = nearestDistance != null ? `${nearestDistance}km>` : "";

    // Get address from nearest branch, or fallback
    let addressPart = "";
    if (nearestBranch && nearestBranch.mapAddress) {
      addressPart = nearestBranch.mapAddress;
    } else if (shop.branchMapAddress) {
      addressPart = shop.branchMapAddress;
    } else if (area) {
      addressPart = `${area}${shop.country ? `, ${shop.country}` : ''}`;
    } else if (shop.state) {
      addressPart = `${shop.state}${shop.country ? `, ${shop.country}` : ''}`;
    } else {
      addressPart = location || shop.country || "";
    }

    // Shorten address — take first 2 parts
    if (addressPart) {
      const parts = addressPart.split(",").map(s => s.trim());
      addressPart = parts.slice(0, 2).join(", ");
    }

    // Combine: "20km> Ramanattukara, Kerala"
    if (distancePrefix && addressPart) return `${distancePrefix} ${addressPart}`;
    return addressPart || distancePrefix || "";
  })();

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-[260px] cursor-pointer"
    >
      {/* Image */}
      <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-card">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-border text-gray-400 dark:text-gray-500 text-3xl font-bold">{(name || "S").charAt(0)}</div>
        )}
        {/* Heart Button */}
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-[2px] flex items-center justify-center hover:bg-black/50 transition-all active:scale-90 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(shopId, e);
          }}
        >
          <Heart 
            size={15} 
            fill={isFavorite ? "#e53935" : "none"} 
            color={isFavorite ? "#e53935" : "#ffffff"} 
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Info */}
      <div className="mt-2 pr-1">
        <div className="flex justify-between items-start gap-1">
          <h3 className="text-[14px] font-extrabold text-gray-900 dark:text-white line-clamp-1 flex-1">{name}</h3>
          {shopRating > 0 && (
            <span className="flex items-center gap-0.5 text-[12px] font-bold shrink-0">
              <Star size={12} fill="#FFB800" color="#FFB800" />
              {shopRating.toFixed(1)}
            </span>
          )}
        </div>
        {locationText && (
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{locationText}</p>
        )}
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
          {categoryName}{shopReviews > 0 ? ` • ${shopReviews} reviews` : ''}
        </p>
      </div>
    </div>
  );
};

export default MobileShopListCard;
