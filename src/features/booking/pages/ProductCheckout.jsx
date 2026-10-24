import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import { 
  ChevronLeft, 
  ShoppingBag, 
  Check, 
  ArrowRight,
  AlertCircle,
  Truck,
  ShieldCheck,
  CreditCard,
  MapPin,
  Building,
  Navigation,
  Plus,
  Trash2,
  Tag,
  CheckCircle2
} from "lucide-react";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { selectSelectedBranchId } from "../../../store/slices/userAppSlice";
import { selectCurrentUser, updateUser as updateAuthUser } from "../../../store/slices/authSlice";
import { motion as Motion } from "framer-motion";
import Snackbar from "../../../components/shared/Snackbar";
import CustomTextField from "../../../components/shared/CustomTextField";
import BookingSuccessModal from "../../../components/user/BookingSuccessModal";

const ProductCheckout = () => {
    const { productId, shopSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { currencySymbol } = useAuth();
    const { formatDisplayNumber } = useCurrency();
    const selectedBranchId = useSelector(selectSelectedBranchId);
    const currentUser = useSelector(selectCurrentUser);
    
    // Get state from navigation (quantity, variantId)
    const navState = location.state || {};
    
    // Local states
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(navState.quantity || 1);
    const [variantId, setVariantId] = useState(navState.variantId || null);
    const [submitting, setSubmitting] = useState(false);
    const [snack, setSnack] = useState({ message: "", type: "success" });
    const [showSuccess, setShowSuccess] = useState(false);
    const [successData, setSuccessData] = useState(null);

    const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newAddr, setNewAddr] = useState({
        label: "Home",
        address: "",
        city: "",
        state: "",
        postalCode: ""
    });

    const showSnack = (message, type = "success") => setSnack({ message, type });

    useEffect(() => {
        if (currentUser && currentUser.addresses?.length > 0) {
            setIsAddingNew(false);
            setSelectedAddressIndex(0);
        } else {
            setIsAddingNew(true);
        }
    }, [currentUser]);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/products/${productId}`);
                if (res.data.success) {
                    const p = res.data.data;
                    setProduct(p);
                    if (!variantId && p.useVariants && p.variants?.length > 0) {
                        setVariantId(p.variants[0].variantId?._id || p.variants[0].variantId);
                    }
                }
            } catch (err) {
                console.error("Error fetching product:", err);
                showSnack("Failed to load product details", "error");
            } finally {
                setLoading(false);
            }
        };

        if (productId) fetchProduct();
    }, [productId, variantId]);

    const activeVariant = useMemo(() => {
        if (!product?.useVariants || !variantId) return null;
        return product.variants.find(v => (v.variantId?._id || v.variantId) === variantId);
    }, [product, variantId]);

    const currentBasePrice = useMemo(() => {
        if (!product) return 0;
        return activeVariant ? (activeVariant.sellingPrice || product.sellingPrice) : product.sellingPrice;
    }, [product, activeVariant]);

    const taxPct = 0;
    const isInc = false;
    
    // Books have no tax
    const basePrice = currentBasePrice;
    const lineTotal = basePrice * quantity;
    const taxableAmount = lineTotal;
    const taxAmount = 0;
    const finalAmount = lineTotal;
    const handlePlaceOrder = async () => {
        try {
            setSubmitting(true);
            
            // 1. Handle New Address Addition
            let selectedAddress = currentUser.addresses?.[selectedAddressIndex];

            if (isAddingNew) {
                if (!newAddr.address || !newAddr.city || !newAddr.postalCode) {
                    showSnack("Please fill in the delivery address", "error");
                    return;
                }

                const updatedAddresses = [...(currentUser.addresses || []), newAddr].slice(0, 3);
                const profileRes = await api.put("/user/profile", { addresses: updatedAddresses });
                
                if (profileRes.data.success) {
                    dispatch(updateAuthUser(profileRes.data.data));
                    selectedAddress = newAddr;
                }
            }

            if (!selectedAddress) {
                showSnack("Please select or add a delivery address", "error");
                return;
            }

            // 2. Place the order
            const payload = {
                shopId: selectedBranchId,
                branchId: selectedBranchId,
                date: moment().format('YYYY-MM-DD'),
                items: [{
                    product: productId,
                    variantId: variantId,
                    variantName: activeVariant?.variantId?.name || activeVariant?.variantName || "",
                    quantity: quantity,
                    price: basePrice, // Send base price without tax
                    isTaxInclusive: isInc,
                    taxPercent: taxPct
                }],
                paymentMethod: "COD",
                deliveryAddress: selectedAddress // Pass the full address object
            };

            const res = await api.post('/appointments', payload);
            if (res.data.success) {
                const order = res.data.data;
                const modalData = {
                    orderId: order.bookingId || order._id,
                    date: new Date(),
                    items: [{
                        name: product.name,
                        quantity: quantity,
                        price: finalAmount,
                        image: typeof product.image === 'string' ? product.image : product.image?.url,
                        variantName: activeVariant?.variantId?.name || ""
                    }],
                    subtotal: taxableAmount,
                    taxAmount: taxAmount,
                    taxPercentage: taxPct,
                    isTaxInclusive: isInc,
                    grandTotal: finalAmount,
                    currencySymbol: currencySymbol
                };
                setSuccessData(modalData);
                setShowSuccess(true);
            }
        } catch (err) {
            showSnack(err.response?.data?.message || "Order placement failed", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
                <div className="w-12 h-12 border-4 border-user-gold border-t-transparent rounded-full animate-spin"></div>
                <p className="text-user-text-muted font-bold uppercase tracking-widest text-xs">Loading secure checkout...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
                <AlertCircle size={48} className="text-red-400" />
                <p className="text-lg font-bold">Product not found</p>
                <button onClick={() => navigate(-1)} className="btn-add-cart">Go Back</button>
            </div>
        );
    }

    return (
        <div className="py-8 max-w-6xl mx-auto px-4 pb-32">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-user-text-muted hover:text-user-gold transition-colors font-bold text-sm uppercase tracking-widest mb-8 group"
            >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Product
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Left Side: Product Summary & Address */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Delivery Address Section */}
                    <section className="bg-white dark:bg-dark-surface rounded-[2.5rem] p-8 shadow-sm border border-black/5 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-user-gold/10 rounded-2xl flex items-center justify-center text-user-gold">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Delivery Address</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-user-text-muted">Where should we send your order?</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Saved Address Selection */}
                            {currentUser?.addresses?.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(currentUser.addresses || []).map((addr, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setSelectedAddressIndex(idx);
                                                setIsAddingNew(false);
                                            }}
                                            className={`p-5 rounded-3xl border-2 text-left transition-all relative group ${
                                                selectedAddressIndex === idx && !isAddingNew 
                                                ? "border-user-gold bg-user-gold/5 shadow-lg shadow-user-gold/5" 
                                                : "border-gray-100 bg-gray-50 dark:bg-dark-card hover:border-gray-200 dark:border-dark-border"
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                                    selectedAddressIndex === idx && !isAddingNew 
                                                    ? "bg-user-gold text-white" 
                                                    : "bg-white dark:bg-dark-surface text-user-text-muted"
                                                }`}>
                                                    {addr.label}
                                                </span>
                                                {selectedAddressIndex === idx && !isAddingNew && (
                                                    <CheckCircle2 size={16} className="text-user-gold" />
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{addr.address}</p>
                                            <p className="text-[10px] font-bold text-user-text-muted uppercase tracking-widest mt-1">{addr.city}, {addr.postalCode}</p>
                                        </button>
                                    ))}
                                    
                                    {(currentUser?.addresses || []).length < 3 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingNew(true)}
                                            className={`p-5 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                                                isAddingNew 
                                                ? "border-user-gold bg-user-gold/5" 
                                                : "border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:border-user-gold/30 hover:bg-gray-50 dark:hover:bg-dark-card"
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-card flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                <Plus size={16} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-user-text-muted">Add New Address</p>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* New Address Form / First Address Form */}
                            {(isAddingNew || !currentUser.addresses?.length) && (
                                <Motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-4 space-y-6 bg-gray-50 dark:bg-dark-card p-8 rounded-[2rem] border border-gray-100 dark:border-dark-border"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Add New Delivery Location</h3>
                                        {currentUser.addresses?.length > 0 && (
                                            <button 
                                                onClick={() => setIsAddingNew(false)}
                                                className="text-[10px] font-bold text-user-gold uppercase tracking-widest"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-user-text-muted ml-1">Label</label>
                                            <div className="flex gap-2">
                                                {["Home", "Work", "Other"].map(label => (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        onClick={() => setNewAddr({ ...newAddr, label })}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            newAddr.label === label 
                                                            ? "bg-black text-white shadow-lg shadow-black/10" 
                                                            : "bg-white dark:bg-dark-surface text-gray-400 hover:text-black dark:text-white border border-transparent hover:border-black/5"
                                                        }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <CustomTextField 
                                                label="Street Address"
                                                placeholder="Enter House No, Street, Road"
                                                value={newAddr.address}
                                                onChange={(e) => setNewAddr({...newAddr, address: e.target.value})}
                                                icon={MapPin}
                                            />
                                        </div>
                                        <div>
                                            <CustomTextField 
                                                label="City"
                                                placeholder="City Name"
                                                value={newAddr.city}
                                                onChange={(e) => setNewAddr({...newAddr, city: e.target.value})}
                                                icon={Building}
                                            />
                                        </div>
                                        <div>
                                            <CustomTextField 
                                                label="Postal Code"
                                                placeholder="Pin Code"
                                                value={newAddr.postalCode}
                                                onChange={(e) => setNewAddr({...newAddr, postalCode: e.target.value})}
                                                icon={Navigation}
                                            />
                                        </div>
                                    </div>
                                </Motion.div>
                            )}
                        </div>
                    </section>

                    {/* Order Summary Item */}
                    <section className="bg-white dark:bg-dark-surface rounded-[2.5rem] p-8 shadow-sm border border-black/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-user-accent/10 rounded-2xl flex items-center justify-center text-user-accent">
                                <ShoppingBag size={24} />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Order Summary</h2>
                        </div>

                        <div className="flex gap-6 items-center bg-gray-50 dark:bg-dark-card p-6 rounded-[2rem]">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white dark:bg-dark-surface shadow-sm border border-black/5">
                                {product.image?.url || typeof product.image === 'string' ? (
                                    <img 
                                        src={typeof product.image === 'string' ? product.image : product.image.url} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                        <ShoppingBag size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{product.name}</h3>
                                <div className="flex items-center gap-4 mt-1">
                                    <p className="text-xs text-user-text-muted font-bold uppercase tracking-widest">
                                        {activeVariant?.variantId?.name || "Standard Variant"}
                                    </p>
                                    <div className="flex items-center bg-white dark:bg-dark-surface rounded-lg border border-black/5 p-1 shadow-sm h-8">
                                        <button 
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card text-gray-400 dark:text-gray-500 text-sm"
                                        >
                                            -
                                        </button>
                                        <span className="min-w-[2rem] text-center font-bold text-xs">{quantity}</span>
                                        <button 
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card text-user-accent text-sm"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <p className="font-black text-user-gold mt-1 text-lg">
                                    {currencySymbol} {formatDisplayNumber(finalAmount)}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Side: Price Details & Payment */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="glass-effect rounded-[2.5rem] p-8 space-y-8 sticky top-32 border border-white/80 shadow-2xl">
                        
                        {/* Payment Method */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-user-text-muted">Payment Method</h3>
                                <span className="text-[10px] font-black text-user-gold uppercase">Secure Checkout</span>
                            </div>
                            <div className="bg-user-accent/[0.03] border-2 border-user-gold rounded-[2rem] p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-surface border border-user-gold/20 flex items-center justify-center text-user-gold shadow-sm">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-tight">Cash on Delivery</p>
                                        <p className="text-[10px] text-user-text-muted font-bold uppercase tracking-widest">Proceed to Pay at delivery</p>
                                    </div>
                                </div>
                                <div className="w-6 h-6 rounded-full bg-user-gold flex items-center justify-center text-white ring-4 ring-user-gold/10">
                                    <Check size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Price Summary */}
                        <div className="space-y-3 pt-6 border-t border-black/5">
                            <div className="flex justify-between items-center text-user-text-muted">
                                <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                                <span className="font-bold">{currencySymbol} {formatDisplayNumber(taxableAmount)}</span>
                            </div>

                            <div className="flex justify-between items-center text-user-text-muted">
                                <span className="text-xs font-bold uppercase tracking-widest">Shipping</span>
                                <span className="text-success-600 font-bold text-[10px] uppercase">Free</span>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-black/5">
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Total Amount</span>
                                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {currencySymbol} {formatDisplayNumber(finalAmount)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={submitting}
                            className={`w-full flex items-center justify-center gap-3 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${
                                submitting 
                                ? 'bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                : 'bg-user-accent text-white hover:bg-black active:scale-[0.98]'
                            }`}
                        >
                            {submitting ? "Processing..." : "Confirm order"}
                            <ArrowRight size={18} />
                        </button>
                        <p className="text-[9px] text-center text-user-text-muted font-bold uppercase tracking-widest px-8">
                            By placing an order, you agree to our terms and conditions.
                        </p>
                    </div>
                </div>
            </div>

            <Snackbar 
                message={snack.message} 
                type={snack.type} 
                onClose={() => setSnack({ ...snack, message: "" })} 
            />

            <BookingSuccessModal 
                isOpen={showSuccess}
                onClose={() => navigate('/')}
                data={successData}
            />
        </div>
    );
};

export default ProductCheckout;
