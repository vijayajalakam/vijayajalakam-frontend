import React from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, RefreshCw } from "lucide-react";
import { useAuth } from "../../features/auth/hooks/useAuth";

/**
 * Mobile "Book Again" Card — shows a previously booked venue
 * Card layout with image, location pin, venue name, price, service info, and rebook button
 */
const MobileBookAgainCard = ({ service }) => {
  const { currencySymbol } = useAuth();
  const { shopSlug } = useParams();
  const {
    name,
    price,
    image,
    description,
    _id,
  } = service;

  const imageUrl = typeof image === "string" ? image : image?.url;

  return (
    <Link
      to={`/${shopSlug}/user/checkout/${_id}`}
      className="mobile-book-again-card"
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
        <h3 className="mobile-book-again-name">{name}</h3>
        <p className="mobile-book-again-meta">
          {currencySymbol}{price}
          {description && ` · ${description.length > 35 ? description.substring(0, 35) + '...' : description}`}
        </p>
      </div>

      {/* Rebook Button */}
      <button
        className="mobile-book-again-btn"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <RefreshCw size={14} />
        <span>Rebook</span>
      </button>
    </Link>
  );
};

export default MobileBookAgainCard;
