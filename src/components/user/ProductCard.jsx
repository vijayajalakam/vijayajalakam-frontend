import { ShoppingBag, Star } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

/**
 * Premium Product Card
 * Displays product details, image, price. Clicks navigate to product detail page.
 */
const ProductCard = ({ product }) => {
  const { currencySymbol } = useAuth();
  const { 
    name, 
    sellingPrice, 
    image, 
    category, 
    _id, 
    useVariants, 
    variants, 
    avgRating,
    taxId,
    taxPercent,
    isTaxInclusive 
  } = product;

  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const imageUrl = typeof image === 'string' ? image : image?.url;

  // Tax Logic
  const taxPct = taxId?.percentage || taxPercent || 0;

  // Calculate display price (base price only - no tax on cards)
  const basePrice = useVariants && variants?.length > 0 
    ? Math.min(...variants.map(v => v.sellingPrice || 0))
    : (sellingPrice || 0);
  
  // Show base price only on product cards
  const displayPrice = basePrice;

  const rating = Number(avgRating) || 0;

  return (
    <div 
      onClick={() => navigate(`/${shopSlug}/user/product/${_id}`)}
      className="premium-card group animate-fade-up flex flex-col no-underline text-inherit cursor-pointer h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-dark-card rounded-t-xl">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ShoppingBag size={48} strokeWidth={1} />
          </div>
        )}

        {useVariants && (
          <div className="absolute bottom-4 right-4">
             <span className="bg-user-gold text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-lg">
                {variants?.length} Options
             </span>
          </div>
        )}
      </div>

      <div className="p-5 text-center flex flex-col flex-1 bg-white dark:bg-dark-surface rounded-b-xl">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-2 line-clamp-1 group-hover:text-user-gold transition-colors">
          {name}
        </h3>
        <div className="flex flex-col items-center flex-1">
          <p className="text-user-gold font-black text-lg">
            {useVariants && <span className="text-[10px] text-user-text-muted font-bold mr-1 uppercase">From</span>}
            {currencySymbol}{displayPrice.toFixed(0)}
          </p>

          {useVariants && (
             <p className="text-[10px] text-user-text-muted italic mt-0.5">
               {variants?.map(v => v.variantId?.name).filter(Boolean).slice(0, 2).join(", ")}
               {variants?.length > 2 && "..."}
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
    </div>
  );
};

export default ProductCard;
