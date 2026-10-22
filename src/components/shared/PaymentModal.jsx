import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, CheckCircle2, CircleDollarSign, Tag, Trash2 } from 'lucide-react';
import CustomTextField from './CustomTextField';
import CustomDropdown from './CustomDropdown';
import { useAuth } from '../../features/auth/hooks/useAuth';

const PaymentModal = ({ isOpen, onClose, onConfirm, amount = 0, serviceName, staffList = [], paymentMethods = [], isAdmin = false }) => {
    const { currencySymbol } = useAuth();
    const [discount, setDiscount] = useState(0);
    const finalAmount = Math.max(0, amount - discount);
    const [payments, setPayments] = useState([{ method: '', amount: finalAmount || '' }]);
    const [selectedStaffId, setSelectedStaffId] = useState('');

    const handleConfirm = () => {
        const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        if (totalPaid === finalAmount) {
            onConfirm(
                payments.length > 1 ? 'Split' : payments[0].method,
                Number(discount),
                selectedStaffId,
                payments.map(p => ({ method: p.method, amount: Number(p.amount) || 0 }))
            );
            handleClose();
        }
    };

    const handleClose = () => {
        setPayments([{ method: '', amount: 0 }]);
        setDiscount(0);
        onClose();
    };

    const handleAddPaymentRow = () => {
        setPayments([...payments, { method: '', amount: '' }]);
    };

    const handleRemovePaymentRow = (index) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const handleUpdatePayment = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;
        setPayments(newPayments);
    };

    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remainingToPay = finalAmount - totalPaid;

    const defaultMethods = [
        { id: 'Cash', label: 'Cash', icon: Banknote },
        { id: 'UPI', label: 'UPI / GPay', icon: Smartphone },
        { id: 'Card', label: 'Card', icon: CreditCard },
    ];

    const displayMethods = paymentMethods.length > 0
        ? paymentMethods.map(pm => {
            const def = defaultMethods.find(d => d.id === pm.name) || { icon: Banknote };
            return {
                id: pm.name,
                label: pm.name === 'UPI' ? 'UPI / GPay' : pm.name,
                icon: def.icon
            };
        })
        : defaultMethods;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white dark:bg-dark-surface rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Complete Payment</h2>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{serviceName || 'Service'}</p>
                            </div>
                            <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-card dark:bg-dark-card rounded-xl transition-colors text-gray-400 dark:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Amount Summary */}
                            <div className="bg-gray-50 dark:bg-dark-card rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                    <span>Subtotal</span>
                                    <span><span className="notranslate">{currencySymbol}{amount}</span></span>
                                </div>

                                <div className="space-y-3">
                                    <CustomTextField
                                        label="Discount Amount"
                                        type="number"
                                        icon={Tag}
                                        value={discount || ''}
                                        onChange={(e) => setDiscount(Math.min(amount, Math.max(0, Number(e.target.value))))}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="h-px bg-gray-200 dark:bg-dark-border" />

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Total Payable</span>
                                    <span className="text-2xl font-black text-brand-primary dark:text-blue-400"><span className="notranslate">{currencySymbol}{finalAmount}</span></span>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="space-y-4">
                                {isAdmin && staffList.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Assign Staff for Commission</label>
                                        <CustomDropdown
                                            value={selectedStaffId}
                                            onChange={(e) => setSelectedStaffId(e.target.value)}
                                            options={[
                                                { value: "", label: "Select Staff (Optional)" },
                                                ...staffList.map(s => ({ value: s._id, label: s.name }))
                                            ]}
                                            placeholder="Select Staff (Optional)"
                                            buttonClassName="w-full bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary/20 transition-all flex items-center justify-between"
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Payment Methods</label>
                                        <button
                                            onClick={handleAddPaymentRow}
                                            className="text-[10px] font-black text-brand-primary dark:text-blue-400 hover:text-brand-secondary uppercase"
                                        >
                                            + Add
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="flex gap-2 items-start">
                                                <div className="flex-1">
                                                    <CustomDropdown
                                                        value={p.method}
                                                        onChange={(e) => handleUpdatePayment(idx, 'method', e.target.value)}
                                                        options={[
                                                            { value: "", label: "Select Method" },
                                                            ...displayMethods.map(pm => ({ value: pm.id, label: pm.label }))
                                                        ]}
                                                        placeholder="Select Method"
                                                        variant="compact"
                                                        buttonClassName="w-full bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary/20 transition-all flex items-center justify-between"
                                                    />
                                                </div>
                                                <div className="w-28">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[10px] font-bold notranslate">{currencySymbol}</span>
                                                        <input
                                                            type="number"
                                                            placeholder="Amount"
                                                            value={p.amount}
                                                            onChange={(e) => handleUpdatePayment(idx, 'amount', e.target.value)}
                                                            className="w-full bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl pl-6 pr-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary/20 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                {payments.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemovePaymentRow(idx)}
                                                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {remainingToPay !== 0 && (
                                        <div className={`text-[10px] font-bold px-1 ${remainingToPay > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                            {remainingToPay > 0
                                                ? <span>Pending: <span className="notranslate">{currencySymbol}{remainingToPay}</span></span>
                                                : <span>Overpaid: <span className="notranslate">{currencySymbol}{Math.abs(remainingToPay)}</span></span>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleConfirm}
                                disabled={remainingToPay !== 0 || payments.some(p => !p.method)}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg
                                    ${remainingToPay === 0 && !payments.some(p => !p.method)
                                        ? 'bg-brand-primary hover:bg-brand-secondary text-white shadow-brand-primary/20 active:scale-95'
                                        : 'bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'}`}
                            >
                                {remainingToPay === 0 && !payments.some(p => !p.method) ? <span>Confirm <span className="notranslate">{currencySymbol}{finalAmount}</span> Payment</span> : 'Balance Amount to Proceed'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PaymentModal;
