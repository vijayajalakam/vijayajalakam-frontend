import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { X } from "lucide-react";

const ShopGallery = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { shopConfig } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const shopName = shopConfig?.shopName || "Shop";

  // Build gallery images - same logic as UserHome
  const galleryImages = (() => {
    const images = [];
    if (shopConfig?.galleryImages && shopConfig.galleryImages.length > 0) {
      const sorted = [...shopConfig.galleryImages].sort((a, b) => {
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        return a.order - b.order;
      });
      return sorted.map(img => img.url);
    }
    if (shopConfig?.logo) images.push(shopConfig.logo);
    if (shopConfig?.banner && shopConfig.banner !== shopConfig?.logo) images.push(shopConfig.banner);
    if (shopConfig?.coverImage && !images.includes(shopConfig.coverImage)) images.push(shopConfig.coverImage);
    if (images.length === 0) images.push("https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200");
    return images;
  })();

  const handleBack = () => {
    navigate(`/${shopSlug}/user/home`);
  };

  // Track scroll to show compact sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface">
      {/* Sticky Header - compact on scroll, like Fresha */}
      <div className={`sticky top-0 z-50 bg-white dark:bg-dark-surface transition-all duration-200 ${scrolled ? 'border-b border-gray-200 dark:border-dark-border shadow-sm' : ''}`}>
        <div className="max-w-[900px] mx-auto px-6 md:px-8 flex items-center justify-between" style={{ height: scrolled ? '56px' : '0px', overflow: scrolled ? 'visible' : 'hidden', opacity: scrolled ? 1 : 0, transition: 'height 0.2s, opacity 0.2s' }}>
          <h2 className="text-[16px] font-bold text-black dark:text-white">Image gallery</h2>
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors"
          >
            <X size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Gallery Content */}
      <div className="max-w-[900px] mx-auto px-6 md:px-8 pt-10 pb-12">
        {/* Title Section */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-black dark:text-white leading-tight">Image gallery</h1>
            <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1">{shopName}</p>
          </div>
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors mt-1"
          >
            <X size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Images */}
        <div className="space-y-5">
          {/* First image - full width, large */}
          {galleryImages.length > 0 && (
            <div className="w-full rounded-xl overflow-hidden">
              <img
                src={galleryImages[0]}
                alt={`${shopName} 1`}
                className="w-full h-auto max-h-[520px] object-cover"
              />
            </div>
          )}

          {/* Remaining images in pairs (2-column grid) */}
          {galleryImages.length > 1 && (() => {
            const remaining = galleryImages.slice(1);
            const rows = [];
            for (let i = 0; i < remaining.length; i += 2) {
              const pair = remaining.slice(i, i + 2);
              rows.push(pair);
            }
            return rows.map((pair, rowIdx) => {
              if (pair.length === 2) {
                return (
                  <div key={rowIdx} className="grid grid-cols-2 gap-5">
                    <div className="rounded-xl overflow-hidden">
                      <img
                        src={pair[0]}
                        alt={`${shopName} ${rowIdx * 2 + 2}`}
                        className="w-full h-[300px] object-cover"
                      />
                    </div>
                    <div className="rounded-xl overflow-hidden">
                      <img
                        src={pair[1]}
                        alt={`${shopName} ${rowIdx * 2 + 3}`}
                        className="w-full h-[300px] object-cover"
                      />
                    </div>
                  </div>
                );
              } else {
                // Single remaining image - full width
                return (
                  <div key={rowIdx} className="w-full rounded-xl overflow-hidden">
                    <img
                      src={pair[0]}
                      alt={`${shopName} ${rowIdx * 2 + 2}`}
                      className="w-full h-auto max-h-[520px] object-cover"
                    />
                  </div>
                );
              }
            });
          })()}
        </div>
      </div>
    </div>
  );
};

export default ShopGallery;
