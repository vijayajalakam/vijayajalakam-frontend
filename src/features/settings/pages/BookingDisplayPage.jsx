import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import {
  Calendar,
  Clock,
  RefreshCw,
  Scissors,
  Store,
  ChevronLeft,
  ChevronRight,
  Phone,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS = {
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    bar: "bg-amber-400",
  },
  confirmed: {
    label: "Confirmed",
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    bar: "bg-blue-400",
  },
};

/* ─── Booking card ──────────────────────────────────────────────── */
const BookingCard = ({ booking }) => {
  const cfg = STATUS[booking.status] || STATUS.pending;

  // Extract services with proper fallback handling
  const servicesList = booking.services || [];
  const services =
    servicesList.length > 0
      ? servicesList
          .map((s) => {
            // Get service name - handle both populated and non-populated
            const serviceName = s.serviceId?.name || s.name || "Service";
            // Get variant name if exists
            const variantName = s.variantName || s.variantId?.name || "";
            // Combine service and variant name
            return variantName
              ? `${serviceName} - ${variantName}`
              : serviceName;
          })
          .filter(Boolean)
          .join(", ")
      : "N/A";

  // Extract products if any
  const productsList = booking.products || [];
  const products =
    productsList.length > 0
      ? productsList
          .map((p) => {
            // Handle both populated and non-populated product data
            const productName =
              p.product?.name || p.productName || p.name || "Product";
            const variantName = p.variantId?.name || p.variantName || "";
            const quantity = p.quantity || 1;
            const productDisplay = variantName
              ? `${productName} - ${variantName}`
              : productName;
            return quantity > 1
              ? `${productDisplay} (${quantity})`
              : productDisplay;
          })
          .filter(Boolean)
          .join(", ")
      : "";

  // Combine services and products
  const allItems = [services, products].filter(Boolean).join(", ") || "N/A";

  // Format time slots - show only the start time (first slot)
  const timeSlots = booking.slotTimes || [];
  const formattedTime =
    timeSlots.length > 0
      ? (() => {
          const firstSlot = timeSlots[0];
          if (!firstSlot) return "Today";
          try {
            // Try parsing with moment - handles HH:mm, h:mm A, HH:mm:ss formats
            const parsed = moment(firstSlot, ["HH:mm", "h:mm A", "HH:mm:ss"], true);
            if (parsed.isValid()) {
              return parsed.format("h:mm A");
            }
            // If not a valid time format, return as-is
            return firstSlot;
          } catch (e) {
            return firstSlot;
          }
        })()
      : "Today"; // Show "Today" for product-only bookings without time slots

  const initials = (booking.user?.name || "G")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="group relative bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-[24px] overflow-hidden hover:border-brand-primary/30 hover:-translate-y-1 transition-all duration-300">
      {/* decorative blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-brand-primary/10 transition-colors" />

      <div className="p-5">
        {/* avatar + name + status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 flex items-center justify-center shrink-0 border border-brand-primary/10">
              <span className="text-base font-black text-brand-primary dark:text-blue-400">
                {initials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 dark:text-white text-base tracking-tight truncate">
                {booking.user?.name || "Guest"}
              </p>
              {booking.user?.phone ? (
                <a
                  href={`tel:${booking.user.phone}`}
                  className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 font-medium hover:text-brand-primary dark:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone size={11} className="text-gray-400 dark:text-gray-500" />
                  {booking.user.phone}
                </a>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                  No phone
                </p>
              )}
            </div>
          </div>
          <span
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border shrink-0 ${cfg.badge}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`}
            />
            {cfg.label}
          </span>
        </div>

        {/* services and products */}
        <div className="flex items-start gap-2.5 mb-5 bg-gray-50 dark:bg-dark-card/80 rounded-2xl p-3.5 border border-gray-100 dark:border-dark-border/50 max-h-[88px] overflow-y-auto">
          <Scissors
            size={14}
            className="text-brand-primary dark:text-blue-400/60 mt-0.5 shrink-0"
          />
          <p className="text-sm text-gray-700 dark:text-gray-300 font-bold leading-snug">
            {allItems}
          </p>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2">
          {/* Highlighted time display */}
          <div className="flex items-center gap-2 text-white bg-gradient-to-r from-brand-primary to-brand-primary/90 px-4 py-2 rounded-xl border border-brand-primary/20">
            <Clock size={14} className="text-white animate-pulse" />
            <span className="text-[14px] font-black tracking-wide">
              {formattedTime}
            </span>
          </div>
          <div className="flex flex-col items-end">
            {booking.branchId?.name && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-surface px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm shadow-gray-100/30 min-w-0">
                <Store size={11} className="shrink-0 text-gray-400 dark:text-gray-500" />
                <span className="text-[11px] font-bold truncate max-w-[100px]">
                  {booking.branchId.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Skeleton ──────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-[24px] p-5 animate-pulse">
    <div className="flex items-center gap-3.5 mb-4">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-dark-card" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 dark:bg-dark-card rounded-md w-2/3" />
        <div className="h-3 bg-gray-100 dark:bg-dark-card rounded-md w-1/2" />
      </div>
      <div className="h-6 w-20 bg-gray-100 dark:bg-dark-card rounded-full" />
    </div>
    <div className="h-16 bg-gray-50 dark:bg-dark-card rounded-2xl w-full mb-5" />
    <div className="flex justify-between items-end">
      <div className="h-8 bg-gray-100 dark:bg-dark-card rounded-xl w-24" />
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-5 bg-gray-100 dark:bg-dark-card rounded-md w-16" />
        <div className="h-3 bg-gray-100 dark:bg-dark-card rounded-md w-12" />
      </div>
    </div>
  </div>
);

/* ─── Main page ─────────────────────────────────────────────────── */
const BookingDisplayPage = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { user, portalRole } = useAuth();
  const isStaff = user?.role === "staff";

  const [bookings, setBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD"),
  );
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branchOpen, setBranchOpen] = useState(false);
  const [error, setError] = useState("");

  /* fetch branches (admin only) */
  useEffect(() => {
    if (isStaff) return;
    api
      .get("/shops")
      .then((res) => {
        if (res.data.success) setBranches(res.data.data);
      })
      .catch(() => {});
  }, [isStaff]);

  /* fetch bookings */
  const fetchBookings = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        const params = new URLSearchParams({ date: selectedDate });
        if (!isStaff && selectedBranch !== "all") {
          params.append("branchId", selectedBranch);
        }

        const res = await api.get(`/appointments?${params.toString()}`);
        if (res.data.success) setBookings(res.data.data);
      } catch {
        setError("Failed to load bookings");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, selectedBranch, isStaff],
  );

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  /* helpers */
  const changeDate = (delta) =>
    setSelectedDate((p) => moment(p).add(delta, "days").format("YYYY-MM-DD"));
  const goToday = () => setSelectedDate(moment().format("YYYY-MM-DD"));
  const isToday = selectedDate === moment().format("YYYY-MM-DD");

  // Keep all bookings except completed and cancelled (matches Schedule page logic)
  const filtered = bookings.filter(
    (b) => b.status !== "completed" && b.status !== "cancelled",
  );

  const activeBranchName =
    selectedBranch === "all"
      ? "All Branches"
      : branches.find((b) => b._id === selectedBranch)?.name || "Branch";

  const backPath = shopSlug
    ? `/${shopSlug}/${portalRole}/settings/more`
    : `/${portalRole}/settings/more`;

  const pendingCount = filtered.length;

  return (
    <div className="h-screen w-screen bg-white dark:bg-dark-surface flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-dark-surface overflow-hidden flex-1 flex flex-col">
        {/* ══ TOP BAR ══════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-dark-surface border-b border-gray-50 z-30 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* back button */}
              <button
                onClick={() => navigate(backPath)}
                className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-dark-card/80 border border-gray-100 dark:border-dark-border flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all shrink-0 group"
              >
                <ArrowLeft
                  size={18}
                  className="group-hover:-translate-x-0.5 transition-transform"
                />
              </button>

              {/* title + date */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Booking Display
                </h1>
                <p className="text-[13px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                  {isToday ? "Today, " : ""}
                  {moment(selectedDate).format("DD MMM YYYY")}
                  {isStaff ? " · your branch" : ""}
                  <span className="inline-block mx-2 text-gray-200">|</span>
                  <span className="text-brand-primary dark:text-blue-400 font-bold">
                    {pendingCount} Active
                  </span>
                </p>
              </div>
            </div>

            {/* right controls */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0 shrink-0">
              {/* branch filter (admin only) */}
              {!isStaff && (
                <div className="relative">
                  <button
                    onClick={() => setBranchOpen((p) => !p)}
                    className="flex items-center gap-2 h-10 px-4 rounded-xl bg-gray-50/80 border border-gray-100 dark:border-dark-border text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:border-brand-primary/40 hover:bg-white dark:bg-dark-surface transition-all shadow-sm shadow-transparent hover:shadow-gray-100"
                  >
                    <Store size={14} className="text-brand-primary dark:text-blue-400/80" />
                    <span className="max-w-[120px] truncate">
                      {activeBranchName}
                    </span>
                    <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
                  </button>
                  {branchOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setBranchOpen(false)}
                      />
                      <div className="absolute right-0 top-12 z-20 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl shadow-gray-200/50 min-w-[200px] p-2 overflow-hidden">
                        <button
                          onClick={() => {
                            setSelectedBranch("all");
                            setBranchOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                            selectedBranch === "all"
                              ? "bg-brand-primary/10 text-brand-primary"
                              : "text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-gray-900 dark:text-white"
                          }`}
                        >
                          All Branches
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-dark-card my-1 mx-2" />
                        {branches.map((b) => (
                          <button
                            key={b._id}
                            onClick={() => {
                              setSelectedBranch(b._id);
                              setBranchOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                              selectedBranch === b._id
                                ? "bg-brand-primary/10 text-brand-primary"
                                : "text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-gray-900 dark:text-white"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span>{b.name}</span>
                              {(b.mapAddress || b.address) && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                                  {b.mapAddress || b.address}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* date controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToday}
                  className={`flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-bold transition-all border ${
                    isToday
                      ? "bg-brand-primary text-white border-brand-primary shadow-sm shadow-brand-primary/30"
                      : "bg-gray-50/80 border-gray-100 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-white dark:bg-dark-surface hover:border-brand-primary/40 hover:shadow-sm shadow-transparent"
                  }`}
                >
                  <span className="uppercase tracking-wider">Today</span>
                </button>

                <button
                  className="flex items-center gap-2 h-10 px-4 rounded-xl bg-gray-50/80 border border-gray-100 dark:border-dark-border text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:border-brand-primary/40 hover:bg-white dark:bg-dark-surface transition-all shadow-sm shadow-transparent hover:shadow-gray-100"
                >
                  <Calendar size={14} className="text-brand-primary dark:text-blue-400/80" />
                  <span>{moment(selectedDate).format("DD-MM-YYYY")}</span>
                </button>

                <div className="flex items-center bg-gray-50 dark:bg-dark-card/80 border border-gray-100 dark:border-dark-border rounded-xl p-1 shadow-sm shadow-transparent hover:shadow-gray-100 transition-all">
                  <button
                    onClick={() => changeDate(-1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white dark:bg-dark-surface hover:text-brand-primary dark:text-blue-400 hover:shadow-sm transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <button
                    onClick={() => changeDate(1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white dark:bg-dark-surface hover:text-brand-primary dark:text-blue-400 hover:shadow-sm transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* refresh */}
              <button
                onClick={() => fetchBookings(true)}
                disabled={refreshing}
                className="w-10 h-10 rounded-xl bg-gray-50/80 border border-gray-100 dark:border-dark-border flex items-center justify-center text-gray-500 hover:bg-white dark:bg-dark-surface hover:text-brand-primary dark:text-blue-400 hover:border-brand-primary/20 hover:shadow-sm transition-all"
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing ? "animate-spin text-brand-primary" : ""
                  }
                />
              </button>
            </div>
          </div>
        </div>

        {/* ══ CONTENT ══════════════════════════════════════════════ */}
        <div className="flex-1 p-6 md:p-8 bg-[#fafcff] overflow-y-auto">
          {error && (
            <div className="mb-6 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-[13px] font-bold text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center h-full">
              <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border flex items-center justify-center mb-6 shadow-sm shadow-gray-100/50">
                <Calendar size={36} className="text-gray-300" />
              </div>
              <p className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                No Active Bookings
              </p>
              <p className="text-[15px] font-medium text-gray-400 dark:text-gray-500 mt-2 max-w-md">
                There are no pending or confirmed bookings for{" "}
                {isToday ? "today" : moment(selectedDate).format("DD MMM YYYY")}
                .
              </p>
              {!isToday && (
                <button
                  onClick={goToday}
                  className="mt-8 px-6 py-3 bg-brand-primary text-white rounded-xl text-[13px] font-bold hover:brightness-110 shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/30 hover:-translate-y-0.5 transition-all"
                >
                  Go to today
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDisplayPage;
