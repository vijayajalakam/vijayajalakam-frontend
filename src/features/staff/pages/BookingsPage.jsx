import React, { useEffect, useState, useMemo } from "react";
import api from "../../../api/axiosInstance";
import BookingFilterModal from "../../../components/shared/BookingFilterModal";
import { 
  Phone, 
  CheckCircle, 
  Calendar, 
  Clock, 
  XCircle, 
  Scissors, 
  ShoppingBag, 
  Package 
} from "lucide-react";
import moment from "moment";
import CustomTable from "../../../components/shared/CustomTable";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";

const BookingsPage = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { currencySymbol, hasPermission } = useAuth();
  const isAdmin = true; // Temporary: Allow everyone to see all buttons/fields
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmStatusData, setConfirmStatusData] = useState(null);

  const [filters, setFilters] = useState({
    startDate: new Date().toLocaleDateString("en-CA"),
    endDate: new Date().toLocaleDateString("en-CA"),
    type: [],
    status: [],
    branchId: [],
    staffId: [],
  });

  useEffect(() => {
    fetchBookings();
    fetchBranches();
    if (isAdmin) fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/admin/staff");
      if (res.data.success) {
        const filteredStaff = res.data.data.filter(
          (s) =>
            !s.role?.toLowerCase().includes("admin") &&
            !s.role?.toLowerCase().includes("owner"),
        );
        setStaffList(filteredStaff);
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get("/shops");
      if (res.data.success) {
        setAllBranches(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.status.length > 0)
        params.append("status", filters.status.join(","));
      if (filters.branchId.length > 0)
        params.append("branchId", filters.branchId.join(","));
      if (filters.staffId.length > 0)
        params.append("staffId", filters.staffId.join(","));

      const res = await api.get(`/appointments?${params.toString()}`);
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    if (newStatus === "completed") {
      const booking = bookings.find((b) => b._id === id);
      if (booking) {
        const targetPath = shopSlug
          ? `/${shopSlug}/staff/invoice`
          : "/admin/staff/invoice";
        navigate(targetPath, { state: { booking } });
      }
      return;
    }

    setConfirmStatusData({ id, newStatus });
    setIsConfirmOpen(true);
  };

  const executeStatusUpdate = async () => {
    if (!confirmStatusData) return;
    const { id, newStatus } = confirmStatusData;

    try {
      let endpoint = `/appointments/${id}`;
      if (newStatus === "cancelled") {
        endpoint = `/appointments/${id}/cancel`;
        await api.put(endpoint);
      } else {
        await api.put(endpoint, { status: newStatus });
      }

      fetchBookings();
      showSnack(`Booking marked as ${newStatus}`, "success");
    } catch (err) {
      console.error("Error updating status:", err);
      showSnack("Failed to update booking status", "error");
    } finally {
      setIsConfirmOpen(false);
      setConfirmStatusData(null);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filters.type && filters.type.length > 0) {
        const hasService = b.services && b.services.length > 0;
        const hasProduct = b.products && b.products.length > 0;
        const matchesType = (hasService && filters.type.includes("service")) || 
                            (hasProduct && filters.type.includes("product"));
        if (!matchesType) return false;
      }

      const serviceNames = b.services?.map((s) => s.serviceId?.name || s.name).join(" ") || "";
      const productNames = b.products?.map((p) => p.product?.name || p.productName || "Product").join(" ") || "";
      const userName = b.user?.name || "";
      const userPhone = b.user?.phone || "";
      const lowerSearch = searchTerm.toLowerCase();

      return (
        serviceNames.toLowerCase().includes(lowerSearch) ||
        productNames.toLowerCase().includes(lowerSearch) ||
        userName.toLowerCase().includes(lowerSearch) ||
        userPhone.includes(searchTerm)
      );
    });
  }, [bookings, searchTerm, filters.type]);

  const getFinancials = (app) => {
    if (!app) return { subtotal: 0, tax: 0, discount: 0, roundoff: 0, total: 0 };

    if (app.invoice) {
      return {
        subtotal: app.invoice.amount || 0,
        tax: app.invoice.taxAmount || 0,
        discount: app.invoice.discount || 0,
        roundoff: app.invoice.roundOffAmount || 0,
        total: (app.invoice.amount || 0) + (app.invoice.taxAmount || 0) - (app.invoice.discount || 0) + (app.invoice.roundOffAmount || 0)
      };
    }

    let subtotal = 0;
    let taxTotal = 0;
    
    (app.services || []).forEach(s => {
      if (!s) return;
      const sInfo = (s.serviceId && typeof s.serviceId === "object") ? s.serviceId : s;
      let price = Number(s.price) || 0;
      const taxPct = s.taxPercentage !== undefined ? Number(s.taxPercentage) : (Number(sInfo?.taxPercentage) || Number(sInfo?.taxId?.percentage) || 0);
      const isInc = s.isTaxInclusive !== undefined ? s.isTaxInclusive : (sInfo?.isTaxInclusive || false);
      
      const variantId = s.variantId?._id || s.variantId;
      const deptIdStr = typeof app.departmentId === "object" 
        ? (app.departmentId?._id || app.departmentId?.id)?.toString() 
        : app.departmentId?.toString();

      if (!price && variantId && variantId !== "base" && sInfo?.variants) {
        const variantObj = sInfo.variants.find(v => (v.variantId?._id || v.variantId || v._id)?.toString() === variantId.toString());
        if (variantObj) {
          const vPricing = variantObj.pricing?.find(p => (p.department?._id || p.department)?.toString() === deptIdStr);
          price = Number(vPricing?.price) || Number(variantObj.pricing?.[0]?.price) || Number(sInfo?.price) || 0;
        }
      }
      
      const qty = Number(s.quantity) || Number(s.qty) || 1;
      const lineTotal = price * qty;
      const lineTax = isInc ? lineTotal - (lineTotal / (1 + (taxPct / 100))) : lineTotal * (taxPct / 100);
      const lineExTax = isInc ? (lineTotal - lineTax) : lineTotal;
      
      subtotal += lineExTax;
      taxTotal += lineTax;
    });

    (app.products || []).forEach(p => {
      if (!p) return;
      const pPrice = Number(p.price) || 0;
      const qty = Number(p.quantity) || Number(p.qty) || 1;
      const taxPct = p.taxPercentage !== undefined ? Number(p.taxPercentage) : (Number(p.taxPercent) || 0);
      const isInc = p.isTaxInclusive !== undefined ? p.isTaxInclusive : false;
      
      const lineTotal = pPrice * qty;
      const lineTax = isInc ? lineTotal - (lineTotal / (1 + (taxPct / 100))) : lineTotal * (taxPct / 100);
      const lineExTax = isInc ? (lineTotal - lineTax) : lineTotal;
      
      subtotal += lineExTax;
      taxTotal += lineTax;
    });

    const beforeRoundOff = subtotal + taxTotal - (Number(app.discount) || 0);
    const roundOffAmount = 0;
    const roundedTotal = beforeRoundOff;

    return {
      subtotal,
      tax: taxTotal,
      discount: Number(app.discount) || 0,
      roundoff: roundOffAmount,
      total: roundedTotal
    };
  };

  const summaryData = useMemo(() => {
    const completed = filteredBookings.filter(
      (b) => b.status === "completed",
    ).length;
    const confirmed = filteredBookings.filter(
      (b) => b.status === "confirmed",
    ).length;
    const pending = filteredBookings.filter(
      (b) => b.status === "pending" || b.status === "booked",
    ).length;
    const cancelled = filteredBookings.filter(
      (b) => b.status === "cancelled",
    ).length;

    const totalValue = filteredBookings.reduce((sum, b) => sum + getFinancials(b).total, 0);

    return {
      totalValue,
      segments: [
        {
          id: "completed",
          label: "Completed",
          count: completed,
          value: filteredBookings
            .filter((b) => b.status === "completed")
            .reduce((sum, b) => sum + (b.invoice?.amount || 0), 0),
          color: "#10b981",
          inProgressBar: true,
        },
        {
          id: "confirmed",
          label: "Confirmed",
          count: confirmed,
          value: 0,
          color: "#3b82f6",
          inProgressBar: true,
        },
        {
          id: "pending",
          label: "Pending",
          count: pending,
          value: 0,
          color: "#f59e0b",
          inProgressBar: true,
        },
        {
          id: "cancelled",
          label: "Cancelled",
          count: cancelled,
          value: 0,
          color: "#ef4444",
          inProgressBar: true,
        },
      ],
    };
  }, [filteredBookings]);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "confirmed":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "pending":
      case "booked":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "cancelled":
        return "bg-red-50 text-red-600 border-red-100";
      default:
        return "bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-100 dark:border-dark-border";
    }
  };

  // Columns for All Bookings
  const unifiedColumns = [
    {
      header: "Booking Info",
      render: (booking) => {
        const hasServices = booking.services && booking.services.length > 0;
        return (
        <div className="flex items-center gap-3">
          {hasServices ? (
            <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border group-hover:bg-brand-primary/5 transition-colors">
              <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">
                {moment(booking.date).format("MMM")}
              </span>
              <span className="text-sm font-black text-gray-900 dark:text-white leading-none">
                {moment(booking.date).format("DD")}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-10 h-10 bg-amber-50 rounded-xl border border-amber-100">
              <Package size={18} className="text-amber-600" />
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {booking.user?.name || "Guest"}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${getStatusStyle(booking.status)}`}>
                {booking.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {hasServices ? (
                <>
                  <Clock size={10} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    {booking.slotTimes?.map((t) => moment(t, ["HH:mm", "h:mm A"]).format("h:mm A")).join(", ") || "No slot"}
                  </span>
                </>
              ) : (
                <>
                  <Calendar size={10} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    {moment(booking.date).format("DD MMM YYYY")}
                  </span>
                </>
              )}
              {booking.user?.phone && (
                <>
                  <span className="text-gray-300">·</span>
                  <Phone size={10} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{booking.user.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )},
    },
    {
      header: "Items",
      render: (booking) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(
              (booking.services || []).reduce((acc, s) => {
                const name = s.serviceId?.name || s.name || "Service";
                const staffObj = s?.staffId || booking.staff;
                const staffName = staffObj?.name || staffObj?.firstName;
                const displayName = staffName ? `${name} (with ${staffName})` : name;
                acc[displayName] = (acc[displayName] || 0) + 1;
                return acc;
              }, {})
            ).map(([name, count], idx) => (
              <div key={`s-${idx}`} className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark-card px-2 py-0.5 rounded border border-gray-100 dark:border-dark-border">
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{name}</span>
                <span className="text-[10px] font-black text-brand-primary dark:text-blue-400">x{count}</span>
              </div>
            ))}
            {booking.products?.map((p, idx) => (
              <div key={`p-${idx}`} className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{p.product?.name || p.productName || "Product"}</span>
                <span className="text-[10px] font-black text-amber-600">x{p.quantity || 1}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="px-1.5 py-0.5 bg-gray-50 dark:bg-dark-card rounded text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border border-gray-100 dark:border-dark-border">
              {booking.branchId?.name || booking.shop?.name || booking.shopId?.name}
            </span>
            {booking.paymentMethod && (
              <span className="px-1.5 py-0.5 bg-amber-50 rounded text-[9px] font-black text-amber-600 uppercase tracking-widest border border-amber-100">
                {booking.paymentMethod}
              </span>
            )}
            {booking.paymentStatus && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                booking.paymentStatus === "Paid" 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 text-emerald-600 dark:text-emerald-400" 
                  : "bg-amber-50 border-amber-100 text-amber-600"
              }`}>
                {booking.paymentStatus === "Paid" ? "Paid" : "Pay In Store"}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Value",
      render: (booking) => {
        const fin = getFinancials(booking);
        const val = fin.subtotal;
        const tax = fin.tax;
        const discount = fin.discount;
        const roundoff = fin.roundoff;
        const total = fin.total;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter">Sub:</span>
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 notranslate">{currencySymbol}{val?.toLocaleString()}</span>
            </div>
            {tax > 0 && (
                <div className="flex justify-between items-center gap-4">
                    <span className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">Tax:</span>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">+{currencySymbol}{tax.toLocaleString()}</span>
                </div>
            )}
            {discount > 0 && (
                <div className="flex justify-between items-center gap-4">
                    <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">Disc:</span>
                    <span className="text-[10px] font-black text-rose-500">-{currencySymbol}{discount.toLocaleString()}</span>
                </div>
            )}
             {roundoff !== 0 && (
                <div className="flex justify-between items-center gap-4">
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-tighter">Rnd:</span>
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400">{roundoff > 0 ? "+" : ""}{currencySymbol}{roundoff.toLocaleString()}</span>
                </div>
            )}
            <div className="mt-1 pt-1 border-t border-gray-100 dark:border-dark-border flex justify-between items-center gap-4">
                <span className="text-[10px] text-brand-primary dark:text-blue-400 font-black uppercase tracking-tighter">Total:</span>
                <span className="text-sm font-black text-brand-primary dark:text-blue-400 notranslate">
                   {currencySymbol}{total.toLocaleString()}
                </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Actions",
      align: "right",
      render: (booking) => (
        <div className="flex items-center justify-end gap-2">
          {(booking.status === "pending" || booking.status === "booked") && hasPermission('reports:sales:bookings_report:confirm') && (
            <button
              onClick={() => handleStatusUpdate(booking._id, "confirmed")}
              className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all"
              title="Confirm"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {(booking.status === "pending" || booking.status === "booked" || booking.status === "confirmed") && hasPermission('reports:sales:bookings_report:cancel') && (
            <button
              onClick={() => handleStatusUpdate(booking._id, "cancelled")}
              className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 transition-all"
              title="Cancel"
            >
              <XCircle size={16} />
            </button>
          )}
          {booking.status === "confirmed" && hasPermission('reports:sales:bookings_report:edit') && (
            <button
              onClick={() => handleStatusUpdate(booking._id, "completed")}
              className="px-3 py-1.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase hover:bg-brand-secondary transition-all active:scale-95"
            >
              Checkout
            </button>
          )}
          {booking.user?.phone && hasPermission('reports:sales:bookings_report:call') && (
            <a
              href={`tel:${booking.user.phone}`}
              className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
              title="Call Client"
            >
              <Phone size={14} />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <ReportLayout>
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />



      <ReportSummaryCard
        title="Booking & Order Metrics"
        totalValue={summaryData.totalValue}
        totalCount={filteredBookings.length}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
      />

      <CustomTable
        columns={unifiedColumns}
        data={filteredBookings}
        loading={loading}
        onRefresh={fetchBookings}
        isRefreshing={loading}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        onFilterClick={() => setIsFilterModalOpen(true)}
        filterCount={
          filters.status.length +
          filters.branchId.length +
          filters.staffId.length
        }
        mobileMapper={{
          leading: (booking) => {
            const hasServices = booking.services && booking.services.length > 0;
            return hasServices ? (
              <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border">
                <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">
                  {moment(booking.date).format("MMM")}
                </span>
                <span className="text-sm font-black text-gray-900 dark:text-white leading-none">
                  {moment(booking.date).format("DD")}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-12 h-12 bg-amber-50 rounded-xl border border-amber-100">
                <Package size={18} className="text-amber-600" />
              </div>
            );
          },
          title: (booking) => (
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate">
                {booking.user?.name || "Guest"}
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider border ${getStatusStyle(booking.status)}`}>
                {booking.status}
              </span>
            </div>
          ),
          subtitle: (booking) => {
            const hasServices = booking.services && booking.services.length > 0;
            return (
              <div className="flex items-center gap-1.5 mt-0.5">
                {hasServices ? (
                  <>
                    <Clock size={10} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      {booking.slotTimes?.map((t) => moment(t, ["HH:mm", "h:mm A"]).format("h:mm A")).join(", ") || "No slot"}
                    </span>
                  </>
                ) : (
                  <>
                    <Calendar size={10} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      {moment(booking.date).format("DD MMM YYYY")}
                    </span>
                  </>
                )}
              </div>
            );
          },
          trailing: (booking) => {
            const fin = getFinancials(booking);
            return (
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">{currencySymbol}{fin.subtotal?.toLocaleString()}</span>
                <span className="text-xs font-black text-brand-primary dark:text-blue-400 notranslate">{currencySymbol}{fin.total.toLocaleString()}</span>
              </div>
            );
          },
          expandedContent: (booking) => {
            const fin = getFinancials(booking);
            const val = fin.subtotal;
            const tax = fin.tax;
            const discount = fin.discount;
            const roundoff = fin.roundoff;
            const total = fin.total;
            return (
              <div className="space-y-3">
                {/* Services */}
                {booking.services && booking.services.length > 0 && (
                  <div>
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Services</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Object.entries(
                        (booking.services || []).reduce((acc, s) => {
                          const name = s.serviceId?.name || s.name || "Service";
                          acc[name] = (acc[name] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([name, count], idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-white dark:bg-dark-surface px-2.5 py-1 rounded-lg border border-gray-100 dark:border-dark-border">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{name}</span>
                          <span className="text-[10px] font-black text-brand-primary dark:text-blue-400">x{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Products */}
                {booking.products && booking.products.length > 0 && (
                  <div>
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Products</span>
                    <div className="flex flex-col gap-1.5 mt-1.5">
                      {booking.products.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white dark:bg-dark-surface px-3 py-1.5 rounded-lg border border-gray-100 dark:border-dark-border">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{p.product?.name || p.productName || "Product"}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-brand-primary dark:text-blue-400">x{p.quantity || 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Staff */}
                {booking.services?.some(s => s.staffId?.name || s.staff?.name) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Staff:</span>
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      {[...new Set(booking.services.map(s => s.staffId?.name || s.staff?.name).filter(Boolean))].join(", ")}
                    </span>
                  </div>
                )}
                {/* Branch */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Branch:</span>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    {booking.branchId?.name || booking.shop?.name || booking.shopId?.name || "—"}
                  </span>
                </div>
                {/* Value Breakdown */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Subtotal</span>
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 notranslate">{currencySymbol}{val?.toLocaleString()}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase">Tax</span>
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 notranslate">+{currencySymbol}{tax.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-rose-500 font-bold uppercase">Discount</span>
                      <span className="text-[11px] font-black text-rose-500 notranslate">-{currencySymbol}{discount.toLocaleString()}</span>
                    </div>
                  )}
                  {roundoff !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Round Off</span>
                      <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 notranslate">{roundoff > 0 ? "+" : ""}{currencySymbol}{roundoff.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-1.5 mt-1.5 border-t border-gray-100 dark:border-dark-border flex justify-between items-center">
                    <span className="text-[10px] text-brand-primary dark:text-blue-400 font-black uppercase">Total</span>
                    <span className="text-sm font-black text-brand-primary dark:text-blue-400 notranslate">{currencySymbol}{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          },
          actions: (booking) => (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {(booking.status === "pending" || booking.status === "booked") && hasPermission('reports:sales:bookings_report:confirm') && (
                <button
                  onClick={() => handleStatusUpdate(booking._id, "confirmed")}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-black uppercase flex items-center gap-1 hover:bg-blue-100 transition-all active:scale-95"
                >
                  <CheckCircle size={12} /> Confirm
                </button>
              )}
              {(booking.status === "pending" || booking.status === "booked" || booking.status === "confirmed") && hasPermission('reports:sales:bookings_report:cancel') && (
                <button
                  onClick={() => handleStatusUpdate(booking._id, "cancelled")}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase flex items-center gap-1 hover:bg-rose-100 transition-all active:scale-95"
                >
                  <XCircle size={12} /> Cancel
                </button>
              )}
              {booking.status === "confirmed" && hasPermission('reports:sales:bookings_report:edit') && (
                <button
                  onClick={() => handleStatusUpdate(booking._id, "completed")}
                  className="px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase hover:bg-brand-secondary transition-all active:scale-95"
                >
                  Checkout
                </button>
              )}
              {booking.user?.phone && hasPermission('reports:sales:bookings_report:call') && (
                <a
                  href={`tel:${booking.user.phone}`}
                  className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
                >
                  <Phone size={14} />
                </a>
              )}
            </div>
          ),
        }}
      />

      <BookingFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        branches={allBranches}
        staff={staffList}
        initialFilters={filters}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setConfirmStatusData(null);
        }}
        onConfirm={executeStatusUpdate}
        title={`Confirm ${confirmStatusData?.newStatus || "Status"} Update`}
        message={`Are you sure you want to mark this booking/order as ${confirmStatusData?.newStatus}?`}
      />
    </ReportLayout>
  );
};

export default BookingsPage;
