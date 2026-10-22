import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import { 
  ChevronLeft, 
  ShoppingBag, 
  Check, 
  ArrowRight,
  CreditCard,
  MapPin,
  Building,
  Navigation,
  Plus,
  CheckCircle2
} from "lucide-react";
import { motion as Motion } from "framer-motion";

import api from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { 
    selectSelectedBranchId, 
    selectUserCart, 
    clearUserCart,
    updateUserCartQty
} from "../../../store/slices/userAppSlice";
import { selectCurrentUser, updateUser as updateAuthUser } from "../../../store/slices/authSlice";
import Snackbar from "../../../components/shared/Snackbar";
import CustomTextField from "../../../components/shared/CustomTextField";
import BookingSuccessModal from "../../../components/user/BookingSuccessModal";

const CartCheckout = () => {
    const { shopSlug } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { currencySymbol } = useAuth();
    const { formatDisplayNumber } = useCurrency();
    
    const selectedBranchId = useSelector(selectSelectedBranchId);
    const currentUser = useSelector(selectCurrentUser);
    const cart = useSelector(selectUserCart);
    
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

    // Financial calculations with proper tax breakdown
    const { subtotal, taxTotal, grandTotal } = useMemo(() => {
        let subtotalAmount = 0;
        let totalTax = 0;

        cart.forEach(item => {
            const lineTotal = item.price * item.qty;
            const taxPct = item.taxPercent || item.taxPercentage || 0;
            const isInclusive = item.isTaxInclusive || false;

            if (isInclusive && taxPct > 0) {
                // Tax-inclusive: extract tax from the total
                const taxAmount = lineTotal - (lineTotal / (1 + (taxPct / 100)));
                const exTaxAmount = lineTotal - taxAmount;
                
                subtotalAmount += exTaxAmount;
                totalTax += taxAmount;
            } else if (!isInclusive && taxPct > 0) {
                // Tax-exclusive: add tax to the amount
                subtotalAmount += lineTotal;
                totalTax += lineTotal * (taxPct / 100);
            } else {
                // No tax
                subtotalAmount += lineTotal;
            }
        });

        const finalTotal = subtotalAmount + totalTax;
        return { subtotal: subtotalAmount, taxTotal: totalTax, grandTotal: finalTotal };
    }, [cart]);

    const handlePlaceOrder = async () => {
        if (cart.length === 0) {
            showSnack("Your cart is empty", "error");
            return;
        }

        try {
            setSubmitting(true);
            
            // 1. Handle New Address Addition
            let selectedAddress = currentUser?.addresses?.[selectedAddressIndex];

            if (isAddingNew) {
                if (!newAddr.address || !newAddr.city || !newAddr.postalCode) {
                    showSnack("Please fill in the delivery address", "error");
                    setSubmitting(false);
                    return;
                }

                const updatedAddresses = [...(currentUser?.addresses || []), newAddr].slice(0, 3);
                const profileRes = await api.put("/user/profile", { addresses: updatedAddresses });
                
                if (profileRes.data.success) {
                    dispatch(updateAuthUser(profileRes.data.data));
                    selectedAddress = newAddr;
                }
            }

            if (!selectedAddress) {
                showSnack("Please select or add a delivery address", "error");
                setSubmitting(false);
                return;
            }

            // 2. Prepare items payload
            const payloadItems = cart.map(item => ({
                product: item._id,
                variantId: item.variantId,
                variantName: item.variantName || "",
                quantity: item.qty,
                price: item.price,
                // Passing exact tax values as fallback if needed by backend
                isTaxInclusive: true, 
            }));

            // 3. Place the order
            const payload = {
                shopId: selectedBranchId,
                branchId: selectedBranchId,
                date: moment().format('YYYY-MM-DD'),
                items: payloadItems,
                paymentMethod: "COD",
                deliveryAddress: selectedAddress 
            };

            const res = await api.post('/appointments', payload);
            if (res.data.success) {
                const order = res.data.data;
                const modalData = {
                    orderId: order.bookingId || order._id,
                    date: new Date(),
                    items: cart.map(item => ({
                        name: item.name,
                        quantity: item.qty,
                        price: item.price,
                        image: item.image,
                        variantName: item.variantName
                    })),
                    subtotal: subtotal,
                    taxAmount: taxTotal,
                    taxPercentage: cart[0]?.taxPercent || 0, // Fallback to first item's tax
                    isTaxInclusive: true,
                    grandTotal: grandTotal,
                    currencySymbol: currencySymbol
                };
                
                dispatch(clearUserCart());
                setSuccessData(modalData);
                setShowSuccess(true);
            }
        } catch (err) {
            showSnack(err.response?.data?.message || "Order placement failed", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
                <ShoppingBag size={48} className="text-gray-300" />
                <p className="text-lg font-bold">Your Cart is Empty</p>
                <button onClick={() => navigate(`/${shopSlug}/user/home`)} className="btn-add-cart px-8 py-3 bg-black text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-user-accent transition-colors">
                    Continue Shopping
                </button>
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
                Back to Shopping
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Left Side: Delivery & Items */}
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

                            {/* New Address Form */}
                            {(isAddingNew || !currentUser?.addresses?.length) && (
                                <Motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-4 space-y-6 bg-gray-50 dark:bg-dark-card p-8 rounded-[2rem] border border-gray-100 dark:border-dark-border"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Add New Delivery Location</h3>
                                        {currentUser?.addresses?.length > 0 && (
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

                    {/* Order Summary Items */}
                    <section className="bg-white dark:bg-dark-surface rounded-[2.5rem] p-8 shadow-sm border border-black/5 space-y-6">
                        <div className="flex items-center gap-4 border-b border-black/5 pb-4">
                            <div className="w-12 h-12 bg-user-accent/10 rounded-2xl flex items-center justify-center text-user-accent">
                                <ShoppingBag size={24} />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Items in Order</h2>
                        </div>

                        <div className="space-y-4">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex gap-6 items-center bg-gray-50 dark:bg-dark-card p-4 rounded-2xl border border-gray-100 dark:border-dark-border">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white dark:bg-dark-surface shadow-sm border border-black/5">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                <ShoppingBag size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</h3>
                                        <div className="flex justify-between items-end mt-1">
                                            <div>
                                                {item.variantName && (
                                                    <p className="text-[10px] text-user-text-muted font-bold uppercase tracking-widest">{item.variantName}</p>
                                                )}
                                                <div className="flex items-center bg-white dark:bg-dark-surface rounded-xl border border-black/5 p-1 mt-2 h-9 w-fit shadow-sm">
                                                    <button 
                                                        onClick={() => dispatch(updateUserCartQty({ id: item._id, itemType: item.itemType, variantId: item.variantId, qty: item.qty - 1 }))}
                                                        className="w-7 h-full flex items-center justify-center rounded hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card text-gray-400 dark:text-gray-500 text-sm transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="min-w-[2rem] text-center font-bold text-xs">{item.qty}</span>
                                                    <button 
                                                        onClick={() => dispatch(updateUserCartQty({ id: item._id, itemType: item.itemType, variantId: item.variantId, qty: item.qty + 1 }))}
                                                        className="w-7 h-full flex items-center justify-center rounded hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card text-user-accent text-sm transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="font-black text-user-gold">
                                                {currencySymbol} {formatDisplayNumber(item.price * item.qty)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Side: Price Details & Payment */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="glass-effect rounded-[2.5rem] p-8 space-y-8 sticky top-32 border border-white/80 shadow-xl">
                        
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
                                        <p className="text-[10px] text-user-text-muted font-bold uppercase tracking-widest">Pay upon arrival</p>
                                    </div>
                                </div>
                                <div className="w-6 h-6 rounded-full bg-user-gold flex items-center justify-center text-white ring-4 ring-user-gold/10">
                                    <Check size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Price Summary */}
                        <div className="space-y-4 pt-6 border-t border-black/5">
                            <div className="flex justify-between items-center text-user-text-muted">
                                <span className="text-xs font-bold uppercase tracking-widest">Subtotal ({cart.length} items)</span>
                                <span className="font-bold">{currencySymbol} {formatDisplayNumber(subtotal)}</span>
                            </div>

                            {/* Tax Row */}
                            {taxTotal > 0 && (
                                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                                    <span className="text-xs font-bold uppercase tracking-widest">
                                        Tax (Included)
                                    </span>
                                    <span className="font-bold">
                                        {currencySymbol} {formatDisplayNumber(taxTotal)}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-user-text-muted">
                                <span className="text-xs font-bold uppercase tracking-widest">Shipping</span>
                                <span className="text-success-600 font-bold text-[10px] uppercase tracking-widest">Free</span>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-black/5 mt-2">
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Total Amount</span>
                                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {currencySymbol} {formatDisplayNumber(grandTotal)}
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

export default CartCheckout;
