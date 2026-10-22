import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion as Motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { 
  ChevronLeft, 
  Clock, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Check, 
  ArrowRight,
  AlertCircle,
  Scissors
} from "lucide-react";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { 
  selectSelectedBranchId,
  updateBookingField,
  clearCurrentBooking,
  selectCurrentBooking
} from "../../../store/slices/userAppSlice";
import Snackbar from "../../../components/shared/Snackbar";
import ReviewSection from "../../../components/user/ReviewSection";
import BookingSuccessModal from "../../../components/user/BookingSuccessModal";

const BookingCheckout = () => {
    const { serviceId, shopSlug } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { currencySymbol, user } = useAuth();
    const { formatDisplayNumber } = useCurrency();
    const selectedBranchId = useSelector(selectSelectedBranchId);
    
    // Local data states
    const [service, setService] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [slots, setSlots] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [blockedReason, setBlockedReason] = useState(null);
    const [snack, setSnack] = useState({ message: "", type: "success" });
    const [showSuccess, setShowSuccess] = useState(false);
    const [successData, setSuccessData] = useState(null);

    // Selection states from Redux
    const { departmentId, variantId, date, slot, staff } = useSelector(selectCurrentBooking);

    const showSnack = (message, type = "success") => setSnack({ message, type });

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [serviceRes, deptsRes, staffRes] = await Promise.all([
                    api.get(`/services/${serviceId}`),
                    api.get('/departments'),
                    api.get(`/shops/${selectedBranchId}/staff`)
                ]);

                if (serviceRes.data.success) {
                    const s = serviceRes.data.data;
                    setService(s);
                    
                    // Auto-select first department that has pricing
                    if (deptsRes.data.success) {
                        const depts = deptsRes.data.data.filter(d => d.isActive);
                        setDepartments(depts);
                        
                        const availableDept = depts.find(d => 
                            s.pricing?.some(p => p.department === d._id || p.department?._id === d._id)
                        );
                        if (availableDept) {
                            dispatch(updateBookingField({ field: 'departmentId', value: availableDept._id }));
                        }
                    }
                }
                
                if (staffRes.data.success) setStaffList(staffRes.data.data);
                
                // Set default date to today
                dispatch(updateBookingField({ field: 'date', value: moment().format('YYYY-MM-DD') }));
                
            } catch (err) {
                console.error("Error fetching checkout data:", err);
                showSnack("Failed to load service details", "error");
            } finally {
                setLoading(false);
            }
        };

        if (serviceId && selectedBranchId) {
            fetchData();
        }
    }, [serviceId, selectedBranchId, dispatch]);

    // Fetch slots when date or staff changes
    const fetchSlots = useCallback(async () => {
        if (!date || !selectedBranchId) return;
        try {
            setLoadingSlots(true);
            setBlockedReason(null);
            const res = await api.get(`/appointments/slots?date=${date}&shopId=${selectedBranchId}&branchId=${selectedBranchId}`);
            if (res.data.success) {
                if (res.data.blocked) {
                    setBlockedReason(res.data.reason);
                    setSlots([]);
                } else {
                    setSlots(res.data.data);
                }
            }
        } catch (err) {
            console.error("Error fetching slots:", err);
        } finally {
            setLoadingSlots(false);
        }
    }, [date, selectedBranchId]);

    useEffect(() => {
        fetchSlots();
    }, [fetchSlots]);

    // Price Calculation
    // Price Calculation Helper
    const getPriceData = useCallback((item, isVariant = false) => {
        if (!item) return { total: 0, taxAmount: 0, taxPercentage: 0, isTaxInclusive: false, basePrice: 0 };
        
        let bPrice = 0;
        if (isVariant) {
            const deptPrice = item.pricing?.find(p => (p.department?._id || p.department) === departmentId);
            bPrice = deptPrice ? deptPrice.price : (item.price || 0);
        } else {
            const pricing = service?.pricing?.find(p => (p.department?._id || p.department) === departmentId);
            bPrice = pricing ? pricing.price : (service?.price || 0);
        }

        const tPct = (isVariant && (item.taxPercentage !== undefined || item.taxId))
            ? (item.taxPercentage || item.taxId?.percentage || 0)
            : (service?.taxPercentage || service?.taxId?.percentage || 0);
            
        const iInc = (isVariant && item.isTaxInclusive !== undefined)
            ? item.isTaxInclusive
            : (service?.isTaxInclusive || false);

        let taxAmount = 0;
        let total = bPrice;

        if (tPct > 0) {
            if (iInc) {
                taxAmount = bPrice - (bPrice / (1 + (tPct / 100)));
            } else {
                taxAmount = bPrice * (tPct / 100);
                total = bPrice + taxAmount;
            }
        }

        return { 
            total: parseFloat(total.toFixed(2)), 
            taxAmount: parseFloat(taxAmount.toFixed(2)), 
            taxPercentage: tPct, 
            isTaxInclusive: iInc, 
            basePrice: parseFloat(bPrice.toFixed(2)) 
        };
    }, [service, departmentId]);

    const activeVariant = useMemo(() => {
        if (!service?.useVariants || !variantId) return null;
        return service.variants.find(v => (v.variantId?._id || v.variantId || v._id) === variantId);
    }, [service, variantId]);

    const currentPriceData = useMemo(() => {
        return getPriceData(activeVariant || service, !!activeVariant);
    }, [getPriceData, activeVariant, service]);

    const currentPrice = currentPriceData.total;
    const taxPct = currentPriceData.taxPercentage;
    const isInc = currentPriceData.isTaxInclusive;

    const handleBooking = async () => {
        if (!slot) {
            showSnack("Please select a time slot", "error");
            return;
        }

        try {
            const payload = {
                shopId: selectedBranchId,
                branchId: selectedBranchId,
                departmentId: departmentId,
                services: [{ 
                    serviceId: serviceId, 
                    variantId: variantId,
                    price: currentPriceData.basePrice !== undefined ? currentPriceData.basePrice : currentPrice,
                    isTaxInclusive: isInc || false,
                    taxPercentage: taxPct
                }],
                staffId: staff?._id, // Match backend key
                date: date,
                slotTimes: [slot],
            };

            const res = await api.post('/appointments', payload);
            if (res.data.success) {
                dispatch(clearCurrentBooking());
                
                // Prepare data for success modal
                const booking = res.data.data;
                const modalData = {
                    orderId: booking.bookingId || booking._id,
                    date: booking.date,
                    items: [{
                        name: service.name,
                        quantity: 1,
                        price: currentPrice,
                        image: service.image?.url || service.image,
                        variantName: activeVariant?.variantId?.name || ""
                    }],
                    subtotal: currentPriceData.basePrice,
                    taxAmount: currentPriceData.taxAmount,
                    taxPercentage: taxPct,
                    isTaxInclusive: isInc,
                    grandTotal: currentPrice,
                    currencySymbol: currencySymbol
                };
                
                setSuccessData(modalData);
                setShowSuccess(true);
            }
        } catch (err) {
            showSnack(err.response?.data?.message || err.message || "Booking failed", "error");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
                <div className="w-12 h-12 border-4 border-user-gold border-t-transparent rounded-full animate-spin"></div>
                <p className="text-user-text-muted font-bold uppercase tracking-widest text-xs">Preparing your session...</p>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
                <AlertCircle size={48} className="text-red-400" />
                <p className="text-lg font-bold">Service not found</p>
                <button onClick={() => navigate(-1)} className="btn-add-cart">Go Back</button>
            </div>
        );
    }

    const dates = [];
    for (let i = 0; i < 14; i++) {
        dates.push(moment().add(i, 'days'));
    }

    return (
        <div className="py-8 max-w-5xl mx-auto px-4">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-user-text-muted hover:text-user-gold transition-colors font-bold text-sm uppercase tracking-widest mb-8 group"
            >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Catalog
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Left Side: Summary & Options */}
                <div className="lg:col-span-12 space-y-12">
                    
                    {/* Hero Header */}
                    <section className="flex flex-col md:flex-row gap-8 items-center md:items-start animate-fade-up">
                        <div className="w-full md:w-64 h-64 rounded-[2rem] overflow-hidden bg-gray-100 dark:bg-dark-card shadow-2xl relative">
                            {service.image?.url || typeof service.image === 'string' ? (
                                <img 
                                    src={typeof service.image === 'string' ? service.image : service.image.url} 
                                    alt={service.name} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Scissors size={64} strokeWidth={1} />
                                </div>
                            )}
                            <div className="absolute bottom-4 right-4 glass-effect px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                                <Clock size={16} className="text-user-gold" />
                                <span className="font-black text-sm">{service.duration} MIN</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <h1 className="serif-display text-4xl sm:text-6xl font-bold tracking-tight">
                                {service.name}
                            </h1>
                            <p className="text-user-text-muted text-lg max-w-2xl font-medium leading-relaxed">
                                {service.description || "Experience our premium treatment designed to provide excellence and relaxation."}
                            </p>
                            
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                                {service.categories?.map(cat => (
                                    <span key={cat._id} className="glass-effect px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-user-gold">
                                        {cat.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Step 1: Personalized Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        
                        {/* Department Selection */}
                        <div className="animate-fade-up stagger-1 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-user-accent text-white flex items-center justify-center font-bold">1</div>
                                <h3 className="text-xl font-bold tracking-tight uppercase">Who is this for?</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {departments.map(dept => (
                                    <button
                                        key={dept._id}
                                        onClick={() => dispatch(updateBookingField({ field: 'departmentId', value: dept._id }))}
                                        className={`px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${
                                            departmentId === dept._id 
                                            ? 'bg-user-accent text-white border-user-accent shadow-xl scale-105' 
                                            : 'bg-white dark:bg-dark-surface border-black/[0.05] text-user-text-muted hover:border-user-gold'
                                        }`}
                                    >
                                        {dept.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Variant Selection */}
                        {service.useVariants && service.variants?.length > 0 && (
                            <div className="animate-fade-up stagger-2 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-user-accent text-white flex items-center justify-center font-bold">2</div>
                                    <h3 className="text-xl font-bold tracking-tight uppercase">Choose Style</h3>
                                </div>
                                
                                <div className="space-y-3">
                                    {service.variants.map(v => {
                                        const vId = v.variantId?._id || v.variantId;
                                        const isSelected = variantId === vId;
                                        return (
                                            <button
                                                key={vId}
                                                onClick={() => dispatch(updateBookingField({ field: 'variantId', value: vId }))}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                                    isSelected 
                                                    ? 'bg-user-accent/5 border-user-gold shadow-md' 
                                                    : 'bg-white dark:bg-dark-surface border-black/[0.05] hover:border-user-gold'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                        isSelected ? 'border-user-gold bg-user-gold' : 'border-gray-200 dark:border-dark-border'
                                                    }`}>
                                                        {isSelected && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <span className={`font-bold text-sm tracking-tight ${isSelected ? 'text-user-accent' : 'text-user-text-muted'}`}>
                                                        {v.variantId?.name || "Premium Version"}
                                                    </span>
                                                </div>
                                                <span className="font-black text-user-gold">
                                                    {currencySymbol} {formatDisplayNumber(getPriceData(v, true).total)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Date & Slots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12">
                        
                        {/* Calendar Scroll */}
                        <div className="animate-fade-up stagger-3 space-y-6">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-user-accent text-white flex items-center justify-center font-bold">
                                        {service.useVariants ? '3' : '2'}
                                    </div>
                                    <h3 className="text-xl font-bold tracking-tight uppercase">Select Date</h3>
                                </div>
                                <span className="text-sm font-bold text-user-gold uppercase tracking-widest">
                                    {moment(date).format('MMMM YYYY')}
                                </span>
                            </div>

                            <div className="flex gap-3 overflow-x-auto pb-6 hide-scrollbar">
                                {dates.map(d => {
                                    const isSelected = date === d.format('YYYY-MM-DD');
                                    const isToday = moment().isSame(d, 'day');
                                    return (
                                        <button
                                            key={d.toString()}
                                            onClick={() => dispatch(updateBookingField({ field: 'date', value: d.format('YYYY-MM-DD') }))}
                                            className={`flex flex-col items-center justify-center min-w-[70px] h-24 rounded-3xl transition-all border ${
                                                isSelected 
                                                ? 'bg-user-accent text-white border-user-accent shadow-2xl scale-105' 
                                                : 'bg-white dark:bg-dark-surface border-black/[0.05] text-user-text-muted hover:border-user-gold'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">{d.format('ddd')}</span>
                                            <span className="text-xl font-black">{d.format('DD')}</span>
                                            {isToday && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-user-gold mt-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Staff Selection */}
                        <div className="animate-fade-up stagger-4 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-user-accent text-white flex items-center justify-center font-bold">
                                    {service.useVariants ? '4' : '3'}
                                </div>
                                <h3 className="text-xl font-bold tracking-tight uppercase">Preferred Expert</h3>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                <button
                                    onClick={() => dispatch(updateBookingField({ field: 'staff', value: null }))}
                                    className={`flex flex-col items-center gap-3 shrink-0 group ${!staff ? 'scale-105' : ''}`}
                                >
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all ${
                                        !staff ? 'bg-user-accent border-user-accent text-white shadow-xl' : 'bg-white dark:bg-dark-surface border-black/[0.05] text-user-text-muted hover:border-user-gold'
                                    }`}>
                                        <UserIcon size={24} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${!staff ? 'text-user-accent' : 'text-user-text-muted'}`}>Anyone</span>
                                </button>

                                {staffList.map(item => (
                                    <button
                                        key={item._id}
                                        onClick={() => dispatch(updateBookingField({ field: 'staff', value: item }))}
                                        className={`flex flex-col items-center gap-3 shrink-0 group ${staff?._id === item._id ? 'scale-105' : ''}`}
                                    >
                                        <div className={`w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 transition-all ${
                                            staff?._id === item._id ? 'border-user-gold shadow-xl' : 'border-black/[0.05] hover:border-user-gold'
                                        }`}>
                                            {item.profileImage ? (
                                                <img src={item.profileImage} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-dark-card font-bold text-user-gold">
                                                    {item.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest max-w-[64px] truncate ${staff?._id === item._id ? 'text-user-accent' : 'text-user-text-muted'}`}>
                                            {item.name.split(' ')[0]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Time Slot Grid */}
                    <div className="animate-fade-up stagger-5 space-y-8 pt-12 pb-32 md:pb-24">
                        <div className="flex items-center gap-3 border-b border-black/[0.03] pb-6">
                            <div className="w-10 h-10 rounded-2xl bg-user-accent text-white flex items-center justify-center font-bold">
                                {service.useVariants ? '5' : '4'}
                            </div>
                            <h3 className="text-xl font-bold tracking-tight uppercase">Pick Your Time</h3>
                        </div>

                        {loadingSlots ? (
                            <div className="py-20 flex flex-col items-center justify-center text-user-text-muted">
                                <div className="w-10 h-10 border-4 border-user-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-bold text-[10px] uppercase tracking-[0.2em]">Checking Availability...</p>
                            </div>
                        ) : blockedReason ? (
                            <div className="py-20 text-center glass-effect rounded-[3rem] border-2 border-dashed border-red-100 flex flex-col items-center">
                                <AlertCircle size={40} className="text-red-400 mb-4" />
                                <h4 className="font-bold text-lg mb-1">Unavailable</h4>
                                <p className="text-user-text-muted font-medium">{blockedReason}</p>
                            </div>
                        ) : slots.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {slots.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => dispatch(updateBookingField({ field: 'slot', value: s }))}
                                        className={`py-4 rounded-2xl font-black text-xs transition-all border ${
                                            slot === s 
                                            ? 'bg-user-accent text-white border-user-accent shadow-xl ring-4 ring-user-gold/10' 
                                            : 'bg-white dark:bg-dark-surface border-black/[0.05] text-user-text-muted hover:border-user-gold'
                                        }`}
                                    >
                                        {moment(s, ['hh:mm A', 'HH:mm']).format('h:mm A')}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center glass-effect rounded-[3rem] border-2 border-dashed border-black/[0.03]">
                                <CalendarIcon size={40} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-user-text-muted italic">No slots available for this selection.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Reviews Section with proper spacing */}
            <div className="pb-32 md:pb-24">
                <ReviewSection itemType="Service" itemId={serviceId} />
            </div>

            {/* Sticky Action Footer - Simplified for Mobile */}
            <div className="fixed bottom-0 md:bottom-0 inset-x-0 p-3 md:p-6 z-50 animate-fade-up pb-20 md:pb-6">
                <div className="max-w-4xl mx-auto glass-effect rounded-2xl md:rounded-[2.5rem] p-3 md:p-4 flex flex-col md:flex-row items-center justify-between shadow-2xl border border-white/80 gap-3 md:gap-0">
                    {/* Price Summary - Simplified on Mobile */}
                    <div className="w-full md:w-auto md:pl-6">
                        <div className="flex flex-col">
                            <div className="flex items-center justify-between md:justify-start gap-4 text-[9px] font-bold text-user-text-muted uppercase tracking-widest mb-1">
                                <span>Subtotal: {currencySymbol}{formatDisplayNumber(currentPriceData.basePrice)}</span>
                                {taxPct > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        Tax ({taxPct}%): {currencySymbol} {formatDisplayNumber(currentPriceData.taxAmount)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold opacity-50">{currencySymbol}</span>
                                <span className="text-2xl font-black tracking-tight">
                                    {formatDisplayNumber(currentPriceData.total)}
                                </span>
                                <span className="text-[10px] font-bold text-user-text-muted uppercase ml-1">
                                    Total Payable {taxPct > 0 ? (isInc ? "(Incl. Tax)" : "(Excl. Tax)") : ""}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Confirm Button - Full width on mobile */}
                    <button
                        onClick={handleBooking}
                        disabled={!slot}
                        className={`w-full md:w-auto flex items-center justify-center gap-3 px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                            slot 
                            ? 'bg-user-accent text-white shadow-2xl hover:bg-black active:scale-95' 
                            : 'bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Confirm Booking
                        <ArrowRight size={18} />
                    </button>
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

export default BookingCheckout;
