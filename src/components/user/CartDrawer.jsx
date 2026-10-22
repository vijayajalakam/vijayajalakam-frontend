import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import {
    selectUserCart,
    selectIsCartOpen,
    setCartOpen,
    updateUserCartQty,
    removeFromUserCart
} from "../../store/slices/userAppSlice";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";

const CartDrawer = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { shopSlug } = useParams();
    const { currencySymbol } = useAuth();
    const { formatDisplayNumber } = useCurrency();

    const cart = useSelector(selectUserCart);
    const isOpen = useSelector(selectIsCartOpen);

    const handleClose = () => {
        dispatch(setCartOpen(false));
    };

    const handleCheckout = () => {
        handleClose();
        navigate(`/${shopSlug}/user/cart-checkout`);
    };

    // Calculate totals based on cart items (using the exact same logic that checkout will use)
    const { subtotal } = useMemo(() => {
        let sub = 0;
        cart.forEach(item => {
            const lineTotal = item.price * item.qty;
            sub += lineTotal;
        });
        return { subtotal: sub };
    }, [cart]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-dark-surface shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gray-50 dark:bg-dark-card/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-user-accent/10 flex items-center justify-center text-user-accent">
                                    <ShoppingBag size={20} />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Your Cart</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border flex items-center justify-center text-gray-500 hover:text-black dark:text-white hover:border-gray-400 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                    <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-dark-card flex items-center justify-center text-gray-300">
                                        <ShoppingBag size={48} strokeWidth={1} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">Your cart is empty</p>
                                        <p className="text-sm text-user-text-muted mt-1">Looks like you haven't added any products yet.</p>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="mt-4 px-6 py-3 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-user-accent transition-colors"
                                    >
                                        Continue Shopping
                                    </button>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={`${item._id}-${item.variantId || idx}`} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white dark:bg-dark-surface shadow-sm hover:border-gray-200 dark:border-dark-border hover:shadow-md transition-all">
                                        <div className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border overflow-hidden flex-shrink-0">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <ShoppingBag size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col py-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.name}</h4>
                                                    {item.variantName && (
                                                        <p className="text-[10px] text-user-text-muted font-bold uppercase tracking-widest mt-0.5">{item.variantName}</p>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => dispatch(removeFromUserCart({ id: item._id, itemType: item.itemType, variantId: item.variantId }))}
                                                    className="w-8 h-8 rounded-full hover:bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            
                                            <div className="mt-auto flex items-center justify-between">
                                                <div className="flex items-center bg-gray-50 dark:bg-dark-card rounded-lg p-1 border border-gray-200 dark:border-dark-border">
                                                    <button 
                                                        onClick={() => dispatch(updateUserCartQty({ id: item._id, itemType: item.itemType, variantId: item.variantId, qty: item.qty - 1 }))}
                                                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="min-w-[2rem] text-center font-bold text-xs">{item.qty}</span>
                                                    <button 
                                                        onClick={() => dispatch(updateUserCartQty({ id: item._id, itemType: item.itemType, variantId: item.variantId, qty: item.qty + 1 }))}
                                                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white dark:bg-dark-surface text-user-accent transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <p className="font-black text-user-gold">
                                                    {currencySymbol} {formatDisplayNumber(item.price * item.qty)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer / Checkout */}
                        {cart.length > 0 && (
                            <div className="p-6 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-user-text-muted uppercase tracking-widest">Subtotal</span>
                                        <span className="text-lg font-black text-gray-900 dark:text-white">{currencySymbol} {formatDisplayNumber(subtotal)}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold tracking-wide italic">Taxes and shipping calculated at checkout</p>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    className="w-full py-4 bg-user-accent text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-user-accent/20 active:scale-95"
                                >
                                    Proceed to Checkout
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
