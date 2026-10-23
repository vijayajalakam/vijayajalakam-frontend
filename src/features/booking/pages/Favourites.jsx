import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Star } from "lucide-react";
import api from "../../../api/axiosInstance";
import UserDesktopShell from "../../../components/user/UserDesktopShell";

const Favourites = () => {
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_favorites");
      setFavoriteIds(saved ? JSON.parse(saved) : []);
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await api.get("/public/shops");
        if (res.data.success) {
          setShops(res.data.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, []);

  const removeFavorite = (id) => {
    const updated = favoriteIds.filter(f => f !== id);
    setFavoriteIds(updated);
    localStorage.setItem("vijayajalakam_favorites", JSON.stringify(updated));
    // Sync with backend
    const token = localStorage.getItem("accessToken");
    if (token) {
      api.delete(`/user/favorites/${id}`).catch(() => {});
    }
  };

  const favoriteShops = shops.filter(s => favoriteIds.includes(s._id));

  const handleShopClick = (shop) => {
    if (shop.slug) {
      navigate(`/${shop.slug}/user/home`);
    }
  };

  const fallbackImages = [
    "https://images.unsplash.com/photo-1516975080661-46bfa2c3000b?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1600948836101-f9ff09c1f076?auto=format&fit=crop&w=600&q=80",
  ];

  const getImageUrl = (shop) => {
    // Prefer gallery image, then shop image
    if (shop.galleryImage) return shop.galleryImage;
    const img = typeof shop.image === "string" ? shop.image : shop.image?.url;
    if (!img || img.includes("default") || img.includes("placeholder") || img.includes("svg") || img.includes("mqm3rrkpvtzoedommirq")) {
      return fallbackImages[(shop.name || "").length % fallbackImages.length];
    }
    return img;
  };

  return (
    <UserDesktopShell activeItem="favorites">
    <div className="min-h-screen bg-white dark:bg-dark-surface pb-6">
      {/* Sticky App Bar — mobile only */}
      <div
        className="sticky top-0 z-20 bg-white dark:bg-dark-surface transition-shadow duration-200 md:hidden"
        style={{ boxShadow: isScrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
      >
        <div className="flex items-center gap-3 px-4 h-[56px]">
          <button
            onClick={() => navigate(-1)}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={2.2} className="text-black dark:text-white" />
          </button>
          <span
            className="text-[15px] font-semibold text-black dark:text-white transition-opacity duration-200"
            style={{ opacity: isScrolled ? 1 : 0 }}
          >
            Favourites
          </span>
        </div>
      </div>

      {/* Page Title */}
      <div className="px-5 pt-1 pb-4 md:pt-0 md:pb-6">
        <h1 className="text-[24px] md:text-[28px] font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Favorites
        </h1>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="w-full aspect-[4/3] rounded-2xl bg-gray-100 dark:bg-dark-card animate-pulse" />
                <div className="mt-3 h-5 w-2/3 bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
                <div className="mt-2 h-4 w-1/2 bg-gray-100 dark:bg-dark-card rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : favoriteShops.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={40} className="mx-auto text-gray-200 mb-4" />
            <p className="text-[17px] font-bold text-gray-900 dark:text-white mb-1">No favourites yet</p>
            <p className="text-[14px] text-gray-400 dark:text-gray-500 mb-6">
              Tap the heart icon on shops to save them here.
            </p>
            <Link
              to={shopSlug ? `/${shopSlug}/user/home` : "/"}
              className="inline-block px-6 py-3 bg-black text-white rounded-full text-[14px] font-semibold hover:bg-black/90 transition-colors"
            >
              Browse shops
            </Link>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {favoriteShops.map(shop => {
              const locationText = shop.area
                ? `${shop.area}${shop.state ? `, ${shop.state}` : ''}${shop.country ? `, ${shop.country}` : ''}`
                : (shop.state ? `${shop.state}, ${shop.country || ''}` : (shop.country || ''));
              const rating = Number(shop.rating) || 0;
              const reviewsCount = shop.reviewsCount || 0;
              const categoryName = shop.category?.name || shop.category || "Vijayajalakam";

              return (
                <div
                  key={shop._id}
                  onClick={() => handleShopClick(shop)}
                  className="cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-card">
                    <img
                      src={getImageUrl(shop)}
                      alt={shop.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(shop._id);
                      }}
                      className="absolute top-3 right-3 w-9 h-9 bg-white dark:bg-dark-surface rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
                    >
                      <Heart size={18} fill="#e53935" color="#e53935" strokeWidth={0} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="mt-3">
                    <h3 className="text-[17px] font-bold text-gray-900 dark:text-white leading-tight">
                      {shop.name}
                    </h3>
                    {rating > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Star size={14} fill="#FFB800" color="#FFB800" />
                        <span className="text-[14px] font-bold text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
                        {reviewsCount > 0 && (
                          <span className="text-[14px] text-gray-500 dark:text-gray-400">({reviewsCount.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                    {locationText && (
                      <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {locationText}
                      </p>
                    )}
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {categoryName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </UserDesktopShell>
  );
};

export default Favourites;
