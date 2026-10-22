import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Calendar, ShoppingBag, ArrowRight, X } from "lucide-react";
import moment from "moment";
import { useCurrency } from "../../hooks/useCurrency";

/**
 * Premium Success Modal for Bookings and Product Orders
 * Shows itemized details, tax breakdown, and redirect action.
 */
const BookingSuccessModal = ({ 
    isOpen, 
    onClose, 
    data 
}) => {
    const { formatDisplayNumber } = useCurrency();

    React.useEffect(() => {
        if (isOpen) {
            try {
                const audio = new Audio("/audio/invoice.mp3");
                audio.play().catch((err) => console.log("Audio play failed:", err));
            } catch (e) {
                console.error("Audio error:", e);
            }
        }
    }, [isOpen]);

    if (!data) return null;

    const {
        orderId = "N/A",
        items = [],
        subtotal = 0,
        taxAmount = 0,
        taxPercentage = 0,
        isTaxInclusive = false,
        grandTotal = 0,
        currencySymbol = "$",
        date = new Date()
    } = data;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white dark:bg-dark-surface w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Success Header Area */}
                        <div className="relative h-48 bg-emerald-500 flex flex-col items-center justify-center overflow-hidden">
                            {/* Close Icon Button */}
                            <button 
                                onClick={onClose}
                                className="absolute top-6 right-6 z-20 w-8 h-8 flex items-center justify-center bg-white dark:bg-dark-surface/20 hover:bg-white dark:bg-dark-surface/30 rounded-full text-white transition-colors"
                            >
                                <X size={18} />
                            </button>

                            {/* Decorative background circles */}
                            <div className="absolute top-[-50%] left-[-20%] w-64 h-64 bg-white dark:bg-dark-surface/10 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute bottom-[-50%] right-[-20%] w-64 h-64 bg-white dark:bg-dark-surface/10 rounded-full blur-3xl animate-pulse" />
                            
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                                className="w-20 h-20 bg-white dark:bg-dark-surface rounded-full flex items-center justify-center shadow-xl mb-3"
                            >
                                <Check size={40} className="text-emerald-500" strokeWidth={3} />
                            </motion.div>
                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-white text-2xl font-black uppercase tracking-widest"
                            >
                                Success!
                            </motion.h2>
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1"
                            >
                                Reference: {orderId}
                            </motion.p>
                        </div>

                        {/* Order Details Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            
                            {/* Date & Time */}
                            <div className="flex items-center justify-between pb-6 border-b border-black/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-dark-card rounded-xl flex items-center justify-center text-emerald-500">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-user-text-muted">Placed On</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{moment(date).format('MMMM DD, YYYY')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-user-text-muted">Status</p>
                                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg">Confirmed</span>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Ordered Items</h3>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-gray-50 dark:bg-dark-card p-4 rounded-2xl border border-black/[0.02]">
                                        <div className="w-14 h-14 bg-white dark:bg-dark-surface rounded-xl overflow-hidden border border-black/5 flex-shrink-0">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                    <ShoppingBag size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                                            <p className="text-[10px] font-bold text-user-text-muted uppercase tracking-widest">
                                                {item.variantName || (item.itemType === 'service' ? 'Standard Session' : 'Standard Unit')} × {item.quantity}
                                            </p>
                                        </div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">
                                            {currencySymbol}{formatDisplayNumber(item.price * item.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-gray-50 dark:bg-dark-card/50 p-6 rounded-3xl border border-black/5 space-y-3">
                                <div className="flex justify-between items-center text-sm font-medium text-user-text-muted">
                                    <span>Subtotal</span>
                                    <span>{currencySymbol}{formatDisplayNumber(subtotal)}</span>
                                </div>
                                {taxPercentage > 0 && (
                                    <div className="flex justify-between items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                        <span>Tax ({taxPercentage}%) {isTaxInclusive ? '(Included)' : ''}</span>
                                        <span>{currencySymbol}{formatDisplayNumber(taxAmount)}</span>
                                    </div>
                                )}
                                <div className="pt-3 border-t border-black/10 flex justify-between items-center">
                                    <span className="text-sm font-black uppercase tracking-widest">Grand Total</span>
                                    <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                                        {currencySymbol}{formatDisplayNumber(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Spacer (Removed button as requested) */}
                        <div className="h-4" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BookingSuccessModal;
