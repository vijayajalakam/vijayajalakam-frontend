import React from "react";
import { Heart, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";

/**
 * Mobile Venue List Card — horizontal layout (image left, info right)
 * Used in "Nearby venues" section on mobile
 */
const MobileVenueListCard = ({ service }) => {
  const { shopSlug } = useParams();
  const {
    name,
    image,
    description,
    _id,
    avgRating,
    categories,
  } = service;

  const imageUrl = typeof image === "string" ? image : image?.url;
  const rating = Number(avgRating) || 0;
  const reviewCount = service.reviewCount || service.totalReviews || 0;
  const categoryName = categories?.[0]?.name || categories?.[0] || "Service";

  return (
    <Link
      to={`/${shopSlug}/user/checkout/${_id}`}
      className="mobile-venue-list-card"
    >
      {/* Image */}
      <div className="mobile-venue-list-image">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" />
        ) : (
          <div className="mobile-venue-list-no-img">{name.charAt(0)}</div>
        )}
      </div>

      {/* Info */}
      <div className="mobile-venue-list-info">
        <div className="mobile-venue-list-header">
          <h3 className="mobile-venue-list-name">{name}</h3>
          <button
            className="mobile-venue-list-fav"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Heart size={18} />
          </button>
        </div>
        {description && (
          <p className="mobile-venue-list-location">
            {description.length > 40 ? description.substring(0, 40) + '...' : description}
          </p>
        )}
        <div className="mobile-venue-list-meta">
          {rating > 0 && (
            <span className="mobile-venue-list-rating">
              <Star size={13} fill="#FFB800" color="#FFB800" />
              <strong>{rating.toFixed(1)}</strong>
              {reviewCount > 0 && <span className="text-gray-400 dark:text-gray-500">{reviewCount} reviews</span>}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MobileVenueListCard;
