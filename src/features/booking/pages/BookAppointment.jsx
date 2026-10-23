import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api, { getSocketURL } from '../../../api/axiosInstance';
import moment from 'moment';
import {
    Search,
    Calendar as CalendarIcon,
    User,
    Store,
    MapPin,
    ChevronDown,
    Clock,
    Check,
    Heart,
    Star,
    ArrowRight,
    AlertCircle,
    X,
    ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useCurrency } from '../../../hooks/useCurrency';
import Snackbar from '../../../components/shared/Snackbar';
import '../../../styles/user-appointment.css';



const ServiceCard = ({ service, isSelected, onClick, priceInfo }) => {
    const { currencySymbol } = useAuth();
    const { formatDisplayNumber } = useCurrency();
    const apiBase = getSocketURL();

    return (
        <Motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(service)}
            className={`relative bg-white dark:bg-dark-surface rounded-3xl p-4 border transition-all cursor-pointer flex flex-col h-full group ${isSelected
                ? 'border-brand-primary bg-brand-primary/[0.01] shadow-sm'
                : 'border-transparent bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-card/50'
                }`}
        >
            <div className={`h-48 rounded-2xl mb-4 overflow-hidden relative ${!service.image?.path ? 'bg-gray-50 dark:bg-dark-card' : 'bg-gray-100'}`}>
                {service.image?.path ? (
                    <img
                        src={`${apiBase}/${service.image.path}`}
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-200 font-bold text-6xl transition-transform duration-[1.5s] group-hover:scale-110">
                        {service.name.charAt(0)}
                    </div>
                )}

                {/* Duration Overlay */}
                <div className="absolute bottom-3 right-3 bg-white dark:bg-dark-surface/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm border border-white/20">
                    <Clock size={10} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 tracking-tight">{service.duration} MIN</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col pt-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className={`font-semibold text-sm leading-tight transition-colors ${isSelected ? 'text-brand-primary' : 'text-gray-800 dark:text-gray-100'}`}>
                        {service.name}
                    </h4>
                    {service.isFavourite && (
                        <Heart size={14} fill="#ef4444" className="text-red-500 shrink-0 mt-0.5" />
                    )}
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-[0.1em]">{service.categories?.[0]?.name || 'Service'}</span>
                        <div className="font-bold text-base text-gray-900 dark:text-white mt-0.5 flex items-baseline gap-1">
                            {service.useVariants && service.variants?.length > 0 && (
                                <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">From</span>
                            )}
                            <span className="text-[10px] opacity-50 font-medium">{currencySymbol}</span>
                            <span className="notranslate tracking-tight">{formatDisplayNumber(priceInfo.total)}</span>
                        </div>

                    </div>

                    {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-md">
                            <Check size={16} strokeWidth={3} />
                        </div>
                    )}
                </div>
            </div>
        </Motion.div>
    );
};

const BookAppointment = () => {
    const { currencySymbol, user } = useAuth();
    const { formatDisplayNumber } = useCurrency();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { shopSlug } = useParams();
    const currentShopId = searchParams.get('shopId');

    const [snack, setSnack] = useState({ message: "", type: "success" });
    const showSnack = (message, type = "success") => setSnack({ message, type });

    // Data states
    const [shops, setShops] = useState([]);
    const [shop, setShop] = useState(null);
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [slots, setSlots] = useState([]);
    const [showShopDropdown, setShowShopDropdown] = useState(false);

    // Selection/Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    const [selectedSlot, setSelectedSlot] = useState(null);
    // const [editBooking, setEditBooking] = useState(null);
    const editBookingId = searchParams.get('edit');

    // UI states
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [blockedReason, setBlockedReason] = useState(null);

    const handleShopSelect = useCallback((selectedShop) => {
        setSearchParams({ shopId: selectedShop._id });
        setSelectedService(null);
        setSelectedStaff(null);
        setSelectedSlot(null);
        setShowShopDropdown(false);
    }, [setSearchParams]);

    const fetchShops = useCallback(async () => {
        try {
            const res = await api.get('/shops');
            if (res.data.success) {
                setShops(res.data.data);
                // Only auto-select if no shop is currently selected in URL
                const shopIdInUrl = searchParams.get('shopId');
                if (!shopIdInUrl && res.data.data.length > 0) {
                    handleShopSelect(res.data.data[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching shops:', err);
        }
    }, [searchParams, handleShopSelect]);

    const fetchShopData = useCallback(async (id) => {
        try {
            setLoading(true);
            const [shopRes, servicesRes, categoriesRes, staffRes] = await Promise.all([
                api.get(`/shops/${id}`),
                api.get(`/services?shopId=${id}`),
                api.get('/categories'),
                api.get(`/shops/${id}/staff`)
            ]);

            if (shopRes.data.success) setShop(shopRes.data.data);
            if (servicesRes.data.success) setServices(servicesRes.data.data);
            if (categoriesRes.data.success) setCategories(categoriesRes.data.data);
            if (staffRes.data.success) setStaffList(staffRes.data.data);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setLoading(false);
        }
    }, []);

    const fetchSlots = useCallback(async () => {
        try {
            setLoadingSlots(true);
            setBlockedReason(null);
            const res = await api.get(`/appointments/slots?date=${selectedDate}&shopId=${currentShopId}&branchId=${currentShopId}`);
            if (res.data.success) {
                if (res.data.blocked) {
                    setBlockedReason(res.data.reason);
                    setSlots([]);
                } else {
                    setSlots(res.data.data);
                }
            }
            setLoadingSlots(false);
        } catch (err) {
            console.error(err);
            setLoadingSlots(false);
        }
    }, [selectedDate, currentShopId]);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await api.get('/departments');
            if (res.data.success) {
                const activeDepts = res.data.data.filter(d => d.isActive);
                setDepartments(activeDepts);
                if (activeDepts.length > 0) {
                    setSelectedDepartment(activeDepts[0]._id);
                }
            }
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    }, []);

    const fetchBookingForEdit = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/appointments/my');
            if (res.data.success) {
                const booking = res.data.data.find(b => b._id === editBookingId);
                if (booking) {
                    // setEditBooking(booking);
                    setSearchParams({ shopId: booking.shopId?._id || booking.shop?._id, edit: editBookingId });
                    setSelectedDepartment(booking.departmentId?._id || booking.departmentId);
                    setSelectedService(booking.services?.[0]);
                    setSelectedStaff(booking.staff);
                    setSelectedDate(moment(booking.date).format('YYYY-MM-DD'));
                    setSelectedSlot(booking.slotTimes?.[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching booking for edit:', err);
        } finally {
            setLoading(false);
        }
    }, [editBookingId, setSearchParams]);

    useEffect(() => {
        fetchShops();
        fetchDepartments();
        if (editBookingId) {
            fetchBookingForEdit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editBookingId]);

    useEffect(() => {
        if (currentShopId) {
            fetchShopData(currentShopId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentShopId]);

    useEffect(() => {
        if (currentShopId && selectedDate) {
            fetchSlots();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, currentShopId]);

    const filteredServices = useMemo(() => {
        return services.filter(s => {
            const name = s.name?.toLowerCase() || '';
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = name.includes(searchLower);

            // Category Filter
            const matchesCategory = selectedCategory === 'All' ||
                s.categories?.some(cat => cat.name === selectedCategory || cat._id === selectedCategory);

            // Department Filter
            // Service must have pricing for the selected department OR no specific department pricing (fallback logic dependent on business rule)
            // Usually, checking if pricing array has an entry for the department
            let matchesDepartment = true;
            if (selectedDepartment) {
                // If service has specific pricing array, check if it includes the department
                if (s.pricing && s.pricing.length > 0) {
                    matchesDepartment = s.pricing.some(p => p.department === selectedDepartment || p.department._id === selectedDepartment);
                } else {
                    // Legacy services without pricing array might be shown to all? Or hidden?
                    // Assuming hidden if departments are strict, or shown if generic.
                    // For now, let's assume we show them only if they don't have *other* department restrictions, 
                    // but since pricing is the link, if array is empty, it belongs to no department strictly.
                    // BUT, to avoid hiding everything, maybe we allow them?
                    // Let's enforce strict Department matching if Departments exist.
                    matchesDepartment = false;
                }
            }

            return matchesSearch && matchesCategory && matchesDepartment;
        });
    }, [services, searchTerm, selectedCategory, selectedDepartment]);

    const getDepartmentPrice = (service) => {
        if (!service) return { total: 0, basePrice: 0, taxAmount: 0, taxPercentage: 0, isTaxInclusive: false };
        
        let basePrice = service.price || 0;

        // Account for variants if they exist (find minimum price)
        if (service.useVariants && service.variants?.length > 0) {
            basePrice = Math.min(...service.variants.map(v => {
                if (selectedDepartment && v.pricing) {
                    const deptPrice = v.pricing.find(p => p.department === selectedDepartment || p.department?._id === selectedDepartment);
                    if (deptPrice) return deptPrice.price;
                }
                return v.price || service.price || 0;
            }));
        } else if (selectedDepartment && service.pricing) {
            const pricing = service.pricing.find(p => p.department === selectedDepartment || p.department?._id === selectedDepartment);
            if (pricing) basePrice = pricing.price;
        }
        
        const taxPct = service.taxPercentage || service.taxId?.percentage || 0;
        const isInc = service.isTaxInclusive || false;
        
        let taxAmount = 0;
        let total = basePrice;
        
        if (taxPct > 0) {
            if (isInc) {
                // Tax is included in the price
                taxAmount = basePrice - (basePrice / (1 + (taxPct / 100)));
                total = basePrice;
            } else {
                // Tax is added to the price
                taxAmount = basePrice * (taxPct / 100);
                total = basePrice + taxAmount;
            }
        }
        
        return {
            total,
            basePrice: isInc ? (basePrice - taxAmount) : basePrice,
            taxAmount,
            taxPercentage: taxPct,
            isTaxInclusive: isInc
        };
    };

    const handleServiceSelect = (service) => {
        if (selectedService?._id === service._id) {
            setSelectedService(null);
        } else {
            setSelectedService(service);
            setSelectedStaff(null);
            setSelectedSlot(null);

            // Scroll to bottom/payment section after short delay
            setTimeout(() => {
                const bookingSection = document.getElementById('booking-section');
                if (bookingSection) {
                    bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);
        }
    };

    const handleBooking = async () => {
        if (!selectedService || !selectedSlot || !selectedDate) return;

        try {
            // Robustly determine branch/shop ID
            const targetShopId = currentShopId || shop?._id || (shops.length > 0 ? shops[0]._id : null);

            if (!targetShopId) {
                showSnack("Please select a branch first.", "error");
                return;
            }

            const payload = {
                shopId: targetShopId,
                branchId: targetShopId,
                departmentId: selectedDepartment,
                services: [selectedService._id],
                staff: selectedStaff?._id,
                date: selectedDate,
                slotTimes: [selectedSlot]
            };

            if (editBookingId) {
                await api.put(`/appointments/my/${editBookingId}`, payload);
            } else {
                await api.post('/appointments', payload);
            }

            const redirectPath = shopSlug ? `/${shopSlug}/my-bookings` : '/my-bookings';
            navigate(redirectPath);
        } catch (err) {
            showSnack(err.response?.data?.message || 'Booking Failed', "error");
        }
    };

    const dates = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 14; i++) {
            arr.push(moment().add(i, 'days'));
        }
        return arr;
    }, []);

    if (loading && !shops.length) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-dark-surface">
                <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f8f8] dark:bg-dark-bg pb-32">
            <Snackbar
                message={snack.message}
                type={snack.type}
                onClose={() => setSnack({ ...snack, message: "" })}
            />
            {/* Nav Header */}
            <header className="bg-white dark:bg-dark-surface/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-dark-border/60">
                <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary dark:text-blue-400">
                            <CalendarIcon size={18} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                            {editBookingId ? 'Edit Booking' : 'Book Appointment'}
                        </h1>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowShopDropdown(!showShopDropdown)}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card rounded-xl transition-all group"
                        >
                            <MapPin size={14} className="text-brand-primary dark:text-blue-400" strokeWidth={2.5} />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{shop?.name || 'Branches'}</span>
                            <ChevronDown size={12} strokeWidth={3} className={`text-gray-300 transition-transform ${showShopDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showShopDropdown && (
                                <Motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl z-50 overflow-hidden p-2"
                                >
                                    {shops.map(s => (
                                        <button
                                            key={s._id}
                                            onClick={() => handleShopSelect(s)}
                                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${currentShopId === s._id ? 'bg-brand-primary/5 text-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            <Store size={14} className={currentShopId === s._id ? 'text-brand-primary' : 'text-gray-300'} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate">{s.name}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{s.address}</p>
                                            </div>
                                        </button>
                                    ))}
                                </Motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <div className="max-w-screen-xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Services & Selection */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* Departments & Filters */}
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                {departments.length > 0 && (
                                    <div className="flex gap-1 bg-gray-100 dark:bg-dark-card p-1 rounded-2xl w-fit">
                                        {departments.map(dept => (
                                            <button
                                                key={dept._id}
                                                onClick={() => setSelectedDepartment(dept._id)}
                                                className={`px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${selectedDepartment === dept._id ? 'bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {dept.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="relative w-full md:max-w-[240px]">
                                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                    <input
                                        type="text"
                                        placeholder="Search services..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium focus:ring-1 focus:ring-brand-primary/10 focus:border-brand-primary/20 transition-all outline-none text-gray-800 dark:text-gray-100"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                                <button
                                    onClick={() => setSelectedCategory('All')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedCategory === 'All' ? 'bg-brand-primary border-brand-primary text-white shadow-sm' : 'bg-white dark:bg-dark-surface border-gray-100 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:border-dark-border'}`}
                                >
                                    All
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat._id}
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${selectedCategory === cat.name ? 'bg-brand-primary border-brand-primary text-white shadow-sm' : 'bg-white dark:bg-dark-surface border-gray-100 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:border-dark-border'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Service Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredServices.map(service => (
                                <ServiceCard
                                    key={service._id}
                                    service={service}
                                    isSelected={selectedService?._id === service._id}
                                    onClick={handleServiceSelect}
                                    priceInfo={getDepartmentPrice(service)}
                                />
                            ))}

                            {filteredServices.length === 0 && (
                                <Motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="col-span-full py-24 bg-white dark:bg-dark-surface rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-dark-border flex flex-col items-center justify-center"
                                >
                                    <div className="w-24 h-24 bg-gray-50 dark:bg-dark-card rounded-3xl flex items-center justify-center text-gray-200 mb-6 border-2 border-white shadow-sm">
                                        <Search size={44} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2 tracking-tight">Curated Selection Empty</h3>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 font-bold max-w-[200px] text-center leading-relaxed">We couldn't find any services matching your criteria. Try adjusting your filters.</p>
                                    <Motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                                        className="mt-8 px-8 py-3 bg-brand-primary/5 text-brand-primary dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-brand-primary/10 hover:bg-brand-primary hover:text-white transition-all"
                                    >
                                        Clear All Filters
                                    </Motion.button>
                                </Motion.div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Booking Confirmation (Sticky) */}
                    <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-8">
                        <AnimatePresence mode="wait">
                            {!selectedService ? (
                                <Motion.div
                                    key="empty-state"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white dark:bg-dark-surface rounded-[3rem] p-12 border-2 border-dashed border-gray-100 dark:border-dark-border text-center flex flex-col items-center justify-center min-h-[550px] shadow-sm"
                                >
                                    <div className="w-24 h-24 bg-brand-primary/5 rounded-[2rem] flex items-center justify-center text-brand-primary dark:text-blue-400 mb-8 relative">
                                        <div className="absolute inset-0 bg-brand-primary/10 rounded-[2rem] animate-ping opacity-20" />
                                        <ArrowRight size={40} strokeWidth={2.5} className="relative z-10" />
                                    </div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-xl mb-3 tracking-tight">Your Journey Starts Here</h3>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 font-bold max-w-[240px] leading-relaxed">Choose a service from our curated collection to begin your premium shopping experience.</p>
                                </Motion.div>
                            ) : (
                                <Motion.div
                                    key="booking-flow"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 30 }}
                                    className="space-y-8"
                                >
                                    {/* Selected Service Summary */}
                                    <div className="bg-brand-primary rounded-[2.5rem] p-8 text-white shadow-[0_25px_50px_-12px_rgba(23,37,84,0.3)] relative overflow-hidden group">
                                        {/* Decorative Elements */}
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-white dark:bg-dark-surface/10 rounded-full -mr-20 -mt-20 transition-transform group-hover:scale-110 duration-[1.5s]" />
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white dark:bg-dark-surface/5 rounded-full -ml-16 -mb-16" />

                                        <div className="relative">
                                            <div className="flex items-start justify-between mb-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-0.5 bg-white dark:bg-dark-surface/20 text-white text-[8px] font-black uppercase tracking-widest rounded-md">Curated Choice</span>
                                                        <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">
                                                            {departments.find(d => d._id === selectedDepartment)?.name || 'General'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-2xl font-black leading-tight tracking-tight mb-2">
                                                        {selectedService.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-[10px] font-black opacity-80 uppercase tracking-widest">
                                                        <MapPin size={12} strokeWidth={2.5} />
                                                        <span>{shop?.name || 'Selected Branch'}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedService(null)}
                                                    className="w-10 h-10 bg-white dark:bg-dark-surface/10 hover:bg-white dark:bg-dark-surface/20 rounded-xl transition-all flex items-center justify-center group/close"
                                                >
                                                    <X size={18} strokeWidth={2.5} className="group-hover/close:rotate-90 transition-transform" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-5">
                                                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-surface/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                                                    <Clock size={14} strokeWidth={2.5} />
                                                    <span className="text-xs font-black tracking-wider">{selectedService.duration} MIN</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-surface/15 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg">
                                                        <span className="text-xs font-black tracking-wider">
                                                            <span className="notranslate">{currencySymbol}{formatDisplayNumber(getDepartmentPrice(selectedService).total)}</span>
                                                        </span>
                                                    </div>
                                                    {getDepartmentPrice(selectedService).taxPercentage > 0 && (
                                                        <span className="text-[8px] font-bold opacity-80 px-2">
                                                            {getDepartmentPrice(selectedService).isTaxInclusive ? 'incl.' : '+'} Tax {getDepartmentPrice(selectedService).taxPercentage}% 
                                                            ({currencySymbol}{formatDisplayNumber(getDepartmentPrice(selectedService).taxAmount)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selectable Steps */}
                                    <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-sm border border-gray-100 dark:border-dark-border divide-y divide-gray-50">
                                        {/* 1. Professionals */}
                                        <div className="p-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold">1</div>
                                                    <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Expert</h3>
                                                </div>
                                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{selectedStaff ? selectedStaff.name : 'Anyone'}</span>
                                            </div>

                                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                                <Motion.div
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setSelectedStaff(null)}
                                                    className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                                                >
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${!selectedStaff
                                                        ? 'border-brand-primary bg-brand-primary/5 text-brand-primary dark:text-blue-400 shadow-sm'
                                                        : 'border-gray-50 bg-gray-50 dark:bg-dark-card group-hover:border-gray-200 dark:border-dark-border'
                                                        }`}>
                                                        <User size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${!selectedStaff ? 'text-brand-primary dark:text-blue-400' : 'text-gray-400'}`}>Anyone</span>
                                                </Motion.div>

                                                {staffList.map(item => (
                                                    <Motion.div
                                                        key={item._id}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setSelectedStaff(item)}
                                                        className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                                                    >
                                                        <div className={`w-14 h-14 rounded-2xl overflow-hidden border transition-all ${selectedStaff?._id === item._id
                                                            ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
                                                            : 'border-gray-50 bg-gray-50 dark:bg-dark-card group-hover:border-gray-200 dark:border-dark-border'
                                                            }`}>
                                                            <div className={`w-full h-full flex items-center justify-center font-bold text-lg ${selectedStaff?._id === item._id ? 'text-brand-primary dark:text-blue-400' : 'text-gray-400'}`}>
                                                                {item.name.charAt(0)}
                                                            </div>
                                                        </div>
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest truncate max-w-[56px] ${selectedStaff?._id === item._id ? 'text-brand-primary dark:text-blue-400' : 'text-gray-400'}`}>
                                                            {item.name}
                                                        </span>
                                                    </Motion.div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 2. Date Selection */}
                                        <div className="p-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold">2</div>
                                                    <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Date</h3>
                                                </div>
                                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{moment(selectedDate).format('MMM D, YYYY')}</span>
                                            </div>

                                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                {dates.map(date => {
                                                    const isSelected = selectedDate === date.format('YYYY-MM-DD');
                                                    const isToday = moment().isSame(date, 'day');
                                                    return (
                                                        <Motion.button
                                                            key={date.toString()}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setSelectedDate(date.format('YYYY-MM-DD'))}
                                                            className={`flex flex-col items-center justify-center min-w-[50px] h-16 rounded-2xl border transition-all ${isSelected
                                                                ? 'bg-brand-primary border-brand-primary text-white shadow-md'
                                                                : 'bg-white dark:bg-dark-surface border-gray-50 text-gray-400 hover:border-gray-200 dark:border-dark-border hover:text-gray-600 dark:text-gray-400'
                                                                }`}
                                                        >
                                                            <span className="text-[8px] font-bold uppercase tracking-widest mb-1">{date.format('ddd')}</span>
                                                            <span className="text-base font-bold leading-none">{date.format('DD')}</span>
                                                            {isToday && <div className={`w-1 h-1 rounded-full mt-1.5 ${isSelected ? 'bg-white dark:bg-dark-surface' : 'bg-brand-primary'}`} />}
                                                        </Motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* 3. Time Slots */}
                                        <div className="p-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold">3</div>
                                                    <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Time</h3>
                                                </div>
                                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                                    {selectedSlot ? moment(selectedSlot, 'hh:mm A').format('h:mm A') : 'Select'}
                                                </span>
                                            </div>

                                            {loadingSlots ? (
                                                <div className="h-24 flex flex-col items-center justify-center text-gray-300">
                                                    <div className="animate-spin h-5 w-5 border-2 border-brand-primary border-t-transparent rounded-full mb-3" />
                                                    <p className="text-[9px] font-bold uppercase tracking-widest">Searching...</p>
                                                </div>
                                            ) : blockedReason ? (
                                                <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-center border border-red-100 flex items-center gap-3">
                                                    <AlertCircle size={16} />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">{blockedReason}</p>
                                                </div>
                                            ) : slots.length > 0 ? (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {slots.map(slot => (
                                                        <Motion.button
                                                            key={slot}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setSelectedSlot(slot)}
                                                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${selectedSlot === slot
                                                                ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                                                                : 'bg-white dark:bg-dark-surface border-gray-100 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:border-dark-border'
                                                                }`}
                                                        >
                                                            {moment(slot, 'hh:mm A').format('h:mm A')}
                                                        </Motion.button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-6 text-center text-gray-300 border border-dashed border-gray-100 dark:border-dark-border rounded-2xl">
                                                    <Clock size={24} className="mx-auto mb-2 opacity-20" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">No slots today</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Final Action */}
                                    <div className="pt-4">
                                        <Motion.button
                                            whileHover={selectedSlot ? { y: -2 } : {}}
                                            whileTap={selectedSlot ? { scale: 0.98 } : {}}
                                            onClick={handleBooking}
                                            disabled={!selectedSlot}
                                            className={`w-full py-5 rounded-3xl font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${selectedSlot
                                                ? 'bg-brand-primary text-white shadow-brand-primary/30 hover:shadow-brand-primary/40'
                                                : 'bg-gray-100 dark:bg-dark-card text-gray-300 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            <span>{editBookingId ? 'Update Booking' : 'Confirm Appointment'}</span>
                                            <ArrowRight size={16} strokeWidth={2.5} />
                                        </Motion.button>
                                    </div>
                                </Motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookAppointment;


