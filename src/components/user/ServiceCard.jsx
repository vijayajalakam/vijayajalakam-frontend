import { Clock, Scissors, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

/**
 * Premium Service Card
 * Displays service name, duration, price, and navigates to checkout on click.
 */
const ServiceCard = ({ service }) => {
  const { currencySymbol } = useAuth();
  const { 
    name, 
    duration, 
    price, 
    image, 
    description, 
    _id, 
    avgRating,
    taxId,
    isTaxInclusive 
  } = service;
  
  const { shopSlug } = useParams();
  const imageUrl = typeof image === 'string' ? image : image?.url;

  // Price Calculation - Show base price only (no tax on service cards)
  const hasVariants = service.useVariants && service.variants?.length > 0;
  
  // Find minimum base price across service and its variants
  const displayPrice = hasVariants 
    ? Math.min(...service.variants.map(v => v.price || v.pricing?.[0]?.price || price || 0))
    : (price || 0);

  const rating = Number(avgRating) || 0;

  return (
    <Link 
      to={`/${shopSlug}/user/checkout/${_id}`}
      className="premium-card group animate-fade-up flex flex-col no-underline text-inherit h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-dark-card rounded-t-xl">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <span className="serif-display text-3xl opacity-20">{name.charAt(0)}</span>
          </div>
        )}
      </div>

      <div className="p-5 text-center flex flex-col flex-1 bg-white dark:bg-dark-surface rounded-b-xl">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-2 line-clamp-1 group-hover:text-user-gold transition-colors">
          {name}
        </h3>
        <div className="flex flex-col items-center flex-1">
          <p className="text-user-gold font-black text-lg">
            {hasVariants && <span className="text-[10px] text-user-text-muted font-bold mr-1 uppercase">From</span>}
            {currencySymbol}{displayPrice.toFixed(0)}
          </p>

          {description && (
            <p className="text-[10px] text-user-text-muted italic mt-0.5 line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {rating > 0 && (
          <div className="mt-auto pt-4 border-t border-black/5 flex items-center justify-center gap-3">
            <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star 
                        key={i} 
                        size={12} 
                        fill={i < Math.round(rating) ? "#D4AF37" : "none"} 
                        className={i < Math.round(rating) ? "text-user-gold" : "text-gray-200"}
                    />
                ))}
            </div>
            <span className="text-[11px] font-black text-user-gold">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ServiceCard;
