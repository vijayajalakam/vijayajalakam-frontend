import React, { useState, useMemo } from "react";
import {
  Calendar,
  MapPin,
  FileText,
  Trash2,
  Package,
  Truck,
  Home,
  Check
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useGetAppointmentsQuery, useCancelAppointmentMutation } from "../../../store/api/tenantEndpoints";
import api from "../../../api/axiosInstance";
import ConfirmModal from "../../../components/shared/Confirm Modal";
import Snackbar from "../../../components/shared/Snackbar";

const MyBookings = () => {
  const { currencySymbol } = useAuth();
  const navigate = useNavigate();
  const { shopSlug } = useParams();

  // Use RTK Query for data fetching with automatic caching
  const { data: bookingsData = [], isLoading: loading, refetch } = useGetAppointmentsQuery({ my: true });
  const [cancelAppointment] = useCancelAppointmentMutation();

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  // Memoize sorted bookings to avoid re-sorting on every render
  const bookings = useMemo(() => {
    return [...bookingsData].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [bookingsData]);

  const handleDownloadInvoice = async (invoice, e) => {
    e?.stopPropagation();
    if (!invoice?._id) return;
    
    try {
      showSnack("Generating PDF...", "success");
      const res = await api.get(`/invoices/${invoice._id}/download`, {
        responseType: "blob",
      });
      
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      showSnack("Failed to download invoice.", "error");
    }
  };

  const handleCancelClick = (bookingId, e) => {
    e?.stopPropagation();
    setBookingToCancel(bookingId);
    setIsConfirmOpen(true);
  };

  const executeBookingAction = async () => {
    if (!bookingToCancel) return;
    try {
      await cancelAppointment(bookingToCancel).unwrap();
      showSnack("Booking cancelled successfully", "success");
    } catch (err) {
      console.error("Action failed:", err);
      showSnack(
        err.data?.message || "Failed to cancel booking",
        "error",
      );
    } finally {
      setIsConfirmOpen(false);
      setBookingToCancel(null);
    }
  };

  const getBookingAmount = (booking) => {
    if (!booking) return 0;
    if (booking.invoice?.amount) return booking.invoice.amount;
    
    const serviceTotal = booking.services?.reduce((sum, s) => {
      if (!s) return sum;
      const serviceObj = s.serviceId || s;
      if (serviceObj.pricing?.length > 0 && booking.departmentId) {
        const deptId = booking.departmentId._id || booking.departmentId;
        const deptPricing = serviceObj.pricing.find(
          (p) => (p.department?._id || p.department) === (deptId?._id || deptId)
        );
        if (deptPricing) return sum + (deptPricing.price || 0);
        return sum + (serviceObj.pricing[0]?.price || 0);
      }
      return sum + (serviceObj.price || serviceObj.pricing?.[0]?.price || 0);
    }, 0) || 0;

    const productTotal = booking.products?.reduce((sum, p) => {
      return sum + ((p.price || 0) * (p.quantity || 1));
    }, 0) || 0;

    return serviceTotal + productTotal;
  };

  const getStatusBadgeStyles = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "text-emerald-600 bg-emerald-50 border border-emerald-100";
      case "booked":
      case "confirmed":
        return "text-brand-primary bg-blue-50 border border-blue-100";
      case "shipped":
        return "text-indigo-600 bg-indigo-50 border border-indigo-100";
      case "out_for_delivery":
        return "text-violet-600 bg-violet-50 border border-violet-100";
      case "delivered":
        return "text-emerald-600 bg-emerald-50 border border-emerald-100";
      case "cancelled":
        return "text-rose-500 bg-rose-50 border border-rose-100";
      default:
        return "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "shipped": return <Package size={10} />;
      case "out_for_delivery": return <Truck size={10} />;
      case "delivered": return <Home size={10} />;
      case "completed": return <Check size={10} />;
      default: return null;
    }
  };

  const getAllBookedItems = (booking) => {
    const services = (booking.services || []).map(s => ({
      name: s.serviceId?.name || s.name || "Service",
      quantity: 1,
      variant: s.variantName || s.variantId?.name || null
    }));

    const products = (booking.products || []).map(p => ({
      name: p.product?.name || p.name || "Product",
      quantity: p.quantity || 1,
      variant: p.variantName || p.variantId?.name || null
    }));

    const invoiceItems = (booking.invoice?.items || [])
      .filter(item => item.product || item.service)
      .map(item => ({
        name: item.name || item.productName || "Item",
        quantity: item.quantity || 1,
        variant: item.variantName || item.variantId?.name || null,
        isFromInvoice: true
      }));

    if (invoiceItems.length > 0) return invoiceItems;
    
    return [...services, ...products];
  };

  return (
    <div className="min-h-screen bg-transparent pb-32">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      <div className="max-w-full mx-auto px-4 pt-2">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-surface/40 rounded-3xl border border-gray-100 dark:border-dark-border animate-pulse h-48"
                />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <Calendar size={48} className="text-gray-200 mb-6" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No history found</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Start your journey by booking an appointment.</p>
              <button
                onClick={() => navigate(`/${shopSlug}/book`)}
                className="px-8 py-3 bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/10 active:scale-95 transition-transform"
              >
                Book Now
              </button>
            </Motion.div>
          ) : (
            <Motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {bookings.map((booking, idx) => {
                const allItems = getAllBookedItems(booking);
                
                return (
                  <Motion.div
                    key={booking._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-white dark:bg-dark-surface rounded-3xl border border-[#f0f0f0] transition-all duration-300 group overflow-hidden flex flex-col"
                  >
                    {/* Header: Date & Status */}
                    <div className="p-5 flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border flex flex-col items-center justify-center flex-shrink-0">
                             <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase leading-none mb-0.5">
                               {moment(booking.date).format("MMM")}
                             </span>
                             <span className="text-base font-black text-gray-900 dark:text-white leading-none">
                               {moment(booking.date).format("DD")}
                             </span>
                          </div>
                           <div className="min-w-0">
                             <div className="flex items-center gap-2 text-gray-900 dark:text-white leading-tight">
                               <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase whitespace-nowrap">
                                 <MapPin size={10} className="text-brand-primary dark:text-blue-400" />
                                 <span>{booking.branchId?.name || "Main"}</span>
                                 {booking.branchId?.address && (
                                   <>
                                     <span className="text-gray-400 dark:text-gray-500">, {booking.branchId.address}</span>
                                   </>
                                 )}
                               </div>
                             </div>
                             
                             {(booking.slotTimes?.[0] || booking.shipping?.expectedDeliveryDate) && (
                               <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                 {booking.slotTimes?.[0] && (
                                   <p className="text-[10px] text-brand-primary dark:text-blue-400 font-black uppercase tracking-widest">
                                     {booking.slotTimes[0]}
                                   </p>
                                 )}
                                 {booking.shipping?.expectedDeliveryDate && (
                                   <div className="flex items-center gap-1.5">
                                      {booking.slotTimes?.[0] && <div className="w-1 h-1 bg-gray-300 rounded-full" />}
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight">
                                        Expected Delivery: <span className="text-gray-900 dark:text-white">{moment(booking.shipping.expectedDeliveryDate).format("DD MMM, YYYY")}</span>
                                      </p>
                                   </div>
                                 )}
                               </div>
                             )}
                          </div>
                       </div>
                       <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 ${getStatusBadgeStyles(booking.status)}`}>
                         {getStatusIcon(booking.status)}
                         {booking.status?.replace(/_/g, " ")}
                       </div>
                    </div>

                    {/* Content Section: Items List */}
                    <div className="px-5 pb-5">
                      <div className="p-4 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border/50 space-y-2">
                        <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Order Details</p>
                        <ul className="space-y-1">
                          {allItems.map((item, i) => (
                            <li key={i} className="flex flex-col gap-0.5 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                <div className="w-1.5 h-1.5 bg-brand-primary/20 rounded-full flex-shrink-0 flex items-center justify-center">
                                  <div className="w-1 h-1 bg-brand-primary rounded-full" />
                                </div>
                                <span className="truncate">
                                  {item.name}
                                  {item.variant && <span className="text-gray-400 dark:text-gray-500 font-medium ml-1">({item.variant})</span>}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-[10px] bg-brand-primary/10 text-brand-primary dark:text-blue-400 px-1.5 py-0.5 rounded-md font-black">
                                    x{item.quantity}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                          {allItems.length === 0 && (
                            <li className="text-[11px] font-bold text-gray-400 dark:text-gray-500 italic">No details available</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Tracking Section for Products */}
                    {booking.shipping?.shippingId && (
                      <div className="mx-5 mb-4 p-3 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-dashed border-gray-200 dark:border-dark-border flex items-center justify-between group/track animate-fade-in">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-white dark:bg-dark-surface rounded-xl shadow-sm flex items-center justify-center border border-gray-100 dark:border-dark-border">
                            <Package size={16} className="text-brand-primary dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[7px] font-black text-gray-400 dark:text-gray-500 uppercase leading-none mb-1">Tracking ID</p>
                            <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase truncate">#{booking.shipping.shippingId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] font-black text-gray-400 dark:text-gray-500 uppercase leading-none mb-1">Carrier</p>
                          <p className="text-[9px] font-bold text-brand-primary dark:text-blue-400">{booking.shipping.carrier || 'Logistics'}</p>
                        </div>
                      </div>
                    )}

                    {/* Footer: Price & Small Action Buttons */}
                    <div className="mt-auto px-5 py-4 bg-gray-50 dark:bg-dark-card/30 border-t border-[#f8f8f8] flex items-center justify-between">
                       <span className="font-black text-gray-900 dark:text-white text-lg tracking-tighter uppercase">
                         {currencySymbol}{getBookingAmount(booking)}
                       </span>

                       <div className="flex items-center gap-1.5">
                         {booking.status?.toLowerCase() === "completed" && (
                           <button
                             onClick={(e) => handleDownloadInvoice(booking.invoice, e)}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:text-emerald-600 hover:border-emerald-100 transition-all text-[9px] font-bold uppercase"
                             title="Download Invoice"
                           >
                             <FileText size={12} className="opacity-40" />
                             <span>PDF</span>
                           </button>
                         )}
                         {/* Cancel Button */}
                         {["booked", "pending", "confirmed"].includes(booking.status?.toLowerCase()) && (
                           <button
                             onClick={(e) => handleCancelClick(booking._id, e)}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:text-red-500 hover:border-red-100 transition-all text-[9px] font-bold uppercase"
                           >
                             <Trash2 size={12} className="opacity-40" />
                             <span>Cancel</span>
                           </button>
                         )}
                       </div>
                    </div>
                  </Motion.div>
                );
              })}
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setBookingToCancel(null);
        }}
        onConfirm={executeBookingAction}
        title="Confirm Cancellation"
        message="Are you sure you want to cancel this appointment?"
        confirmLabel="Cancel"
        cancelLabel="No"
      />
    </div>
  );
};

export default MyBookings;
