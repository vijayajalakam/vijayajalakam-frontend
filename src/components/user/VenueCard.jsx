import React from "react";
import { Heart, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

/**
 * Fresha-style Venue/Service Card
 * Horizontal scroll card with image, badge, rating, and meta info.
 */
const VenueCard = ({ service, badge = "Featured" }) => {
  const { currencySymbol } = useAuth();
  const { shopSlug } = useParams();
  const {
    name,
    duration,
    price,
    image,
    description,
    _id,
    avgRating,
    categories,
  } = service;

  const imageUrl = typeof image === "string" ? image : image?.url;
  const rating = Number(avgRating) || 0;
  const reviewCount = service.reviewCount || service.totalReviews || 0;
  
  // Get category name for meta
  const categoryName = categories?.[0]?.name || categories?.[0] || "Service";

  // Badge style
  const getBadgeClass = () => {
    switch (badge) {
      case "Deals": return "deals";
      case "New": return "new-badge";
      default: return "featured";
    }
  };

  return (
    <Link
      to={`/${shopSlug}/user/checkout/${_id}`}
      className="fresha-venue-card"
    >
      {/* Image */}
      <div className="fresha-venue-card-image">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" />
        ) : (
          <div className="fresha-no-image">{name.charAt(0)}</div>
        )}

        {/* Badge */}
        {badge && (
          <span className={`fresha-venue-card-badge ${getBadgeClass()}`}>
            {badge}
          </span>
        )}

        {/* Favorite */}
        <button
          className="fresha-venue-card-fav"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Heart size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="fresha-venue-card-info">
        <div className="fresha-venue-card-name">
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </span>
          {rating > 0 && (
            <span className="fresha-venue-card-rating">
              <span className="rating-dot" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
        {description && (
          <div className="fresha-venue-card-location">{description}</div>
        )}
        <div className="fresha-venue-card-meta">
          <span>{typeof categoryName === "object" ? categoryName?.name || "Service" : categoryName}</span>
          {reviewCount > 0 && (
            <>
              <span className="dot-sep" />
              <span>{reviewCount} reviews</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

export default VenueCard;