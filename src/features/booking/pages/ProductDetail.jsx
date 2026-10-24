import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { 
  ChevronLeft, 
  ShoppingBag, 
  ShoppingCart, 
  ArrowRight,
  ShieldCheck,
  Truck,
  Star,
  AlertCircle
} from "lucide-react";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { addToUserCart } from "../../../store/slices/userAppSlice";
import Snackbar from "../../../components/shared/Snackbar";

/**
 * Premium Product Detail Page
 * Features large image, variants selection, and CTA buttons.
 */
const ProductDetail = () => {
    const { productId, shopSlug } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { currencySymbol } = useAuth();
    const { formatDisplayNumber } = useCurrency();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [snack, setSnack] = useState({ message: "", type: "success" });

    const showSnack = (message, type = "success") => setSnack({ message, type });

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/products/${productId}`);
                if (res.data.success) {
                    const p = res.data.data;
                    setProduct(p);
                    if (p.useVariants && p.variants?.length > 0) {
                        setSelectedVariant(p.variants[0]);
                    }
                }
            } catch (err) {
                console.error("Error fetching product:", err);
                showSnack("Failed to load product", "error");
                setProduct(null); // Explicitly set to null if error occurs
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);

    const taxPct = product?.taxId?.percentage || product?.taxPercent || 0;
    const isInc = product?.isTaxInclusive || false;
    const basePrice = selectedVariant ? (selectedVariant.sellingPrice || product?.sellingPrice) : product?.sellingPrice;
    // Show base price only on product detail page (tax will be added at checkout)
    const displayPrice = basePrice;
    const imageUrl = typeof product?.image === 'string' ? product.image : product?.image?.url;

    const handleAddToCart = () => {
        if (!product) return;
        dispatch(addToUserCart({
            _id: product._id,
            name: product.name,
            price: displayPrice,
            image: imageUrl,
            itemType: 'product',
            qty: quantity,
            variantId: selectedVariant?.variantId?._id || selectedVariant?.variantId,
            variantName: selectedVariant?.variantId?.name || "",
            taxPercent: taxPct,
            taxPercentage: taxPct,
            isTaxInclusive: isInc
        }));
        showSnack("Added to cart!");
    };

    const handleBuyNow = () => {
        if (!product) return;
        navigate(`/${shopSlug}/user/product-checkout/${productId}`, { 
            state: { 
                variantId: selectedVariant?.variantId?._id || selectedVariant?.variantId,
                quantity 
            } 
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-user-gold border-t-transparent rounded-full animate-spin"></div>
                <p className="text-user-text-muted font-bold uppercase tracking-widest text-xs">Unveiling Excellence...</p>
            </div>
        );
    }

    if (!product) {
       return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <AlertCircle size={48} className="text-rose-400" />
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Not Found</h2>
                    <p className="text-user-text-muted mt-2">The product you are looking for might have been removed or is currently unavailable.</p>
                </div>
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-2xl font-bold transition-all hover:bg-user-accent shadow-lg"
                >
                    <ChevronLeft size={20} />
                    Go Back
                </button>
            </div>
       );
    }

    return (
        <div className="py-8 max-w-7xl mx-auto px-4 sm:px-8 pb-32">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-user-text-muted hover:text-user-gold transition-colors font-bold text-sm uppercase tracking-widest mb-12 group"
            >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* Left: Product Image */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-dark-surface rounded-[3rem] p-4 shadow-2xl shadow-black/5 border border-black/5 aspect-square overflow-hidden group">
                        <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-gray-50 dark:bg-dark-card relative">
                            {imageUrl ? (
                                <img 
                                    src={imageUrl} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-200">
                                    <ShoppingBag size={120} strokeWidth={1} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Details */}
                <div className="flex flex-col justify-center space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="bg-user-accent/10 text-user-accent px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                                {product.category}
                            </span>
                            <div className="flex items-center gap-1 text-user-gold">
                                <Star size={14} fill="currentColor" />
                                <span className="text-xs font-bold">4.8 (Premium Choice)</span>
                            </div>
                        </div>
                        <h1 className="serif-display text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                            {product.name}
                        </h1>
                        <p className="text-user-text-muted text-xl leading-relaxed max-w-xl">
                            {product.description || "Experience perfection with our professional-grade products. Specifically formulated for high-performance care and stunning results."}
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-4">
                            <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                                {currencySymbol} {formatDisplayNumber(displayPrice)}
                            </span>
                            {product.mrp > displayPrice && (
                                <span className="text-xl text-gray-300 line-through font-bold">
                                    {currencySymbol} {formatDisplayNumber(product.mrp)}
                                </span>
                            )}
                        </div>

                    </div>

                    {/* Variants */}
                    {product.useVariants && product.variants?.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-user-text-muted">Available Options</h3>
                            <div className="flex flex-wrap gap-3">
                                {product.variants.map((v, idx) => {
                                    const vId = v.variantId?._id || v.variantId;
                                    const isSelected = (selectedVariant?.variantId?._id || selectedVariant?.variantId) === vId;
                                    
                                    // Show base price only (no tax on product detail page)
                                    const vBasePrice = v.sellingPrice || product.sellingPrice || 0;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedVariant(v)}
                                            className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border-2 flex flex-col items-center gap-1 min-w-[120px] ${
                                                isSelected 
                                                ? 'bg-user-accent border-user-accent text-white shadow-xl shadow-user-accent/20' 
                                                : 'bg-white dark:bg-dark-surface border-black/5 text-user-text-muted hover:border-user-gold'
                                            }`}
                                        >
                                            <span>{v.variantId?.name || "Standard"}</span>
                                            <span className="text-[9px] opacity-80">{currencySymbol}{formatDisplayNumber(vBasePrice)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-user-text-muted">Quantity</h3>
                        <div className="flex items-center bg-white dark:bg-dark-surface rounded-2xl border border-black/5 p-1.5 w-fit shadow-sm">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card text-gray-400 dark:text-gray-500 text-xl"
                            >
                                -
                            </button>
                            <span className="w-16 text-center font-black text-xl">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card text-user-accent text-xl"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            onClick={handleBuyNow}
                            className="flex-1 bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-user-accent transition-all shadow-2xl shadow-black/10 active:scale-95 group"
                        >
                            Buy Now
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={handleAddToCart}
                            className="flex-1 bg-white dark:bg-dark-surface text-black dark:text-white border-2 border-black/5 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:border-user-gold transition-all shadow-xl shadow-black/5 active:scale-95"
                        >
                            <ShoppingCart size={18} />
                            Add to Cart
                        </button>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex items-center gap-8 pt-8 border-t border-black/5">
                        <div className="flex items-center gap-3 text-user-text-muted">
                            <div className="w-10 h-10 bg-gray-50 dark:bg-dark-card rounded-xl flex items-center justify-center">
                                <Truck size={20} className="text-user-gold" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Free Express</p>
                                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500">Delivery in 2 days</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-user-text-muted">
                            <div className="w-10 h-10 bg-gray-50 dark:bg-dark-card rounded-xl flex items-center justify-center">
                                <ShieldCheck size={20} className="text-user-gold" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Premium quality</p>
                                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500">100% Authentic</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <Snackbar 
                message={snack.message} 
                type={snack.type} 
                onClose={() => setSnack({ ...snack, message: "" })} 
            />
        </div>
    );
};

export default ProductDetail;
