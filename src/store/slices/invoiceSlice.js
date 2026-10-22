/**
 * invoiceSlice.js
 * Centralizes all invoice entry state: cart, checkout, UI filters, metadata cache.
 * Replaces scattered useState calls in UnifiedInvoiceEntry & SalesInvoiceEntry.
 */
import { createSlice } from "@reduxjs/toolkit";

const defaultPayment = { method: "CASH", amount: "" };

const initialState = {
  // ── Cart ──────────────────────────────────────────────────────────────────
  cart: [],

  // ── Customer ──────────────────────────────────────────────────────────────
  selectedCustomer: null,
  customerSearch: "",

  // ── Payment ───────────────────────────────────────────────────────────────
  paymentMethod: "CASH",
  payments: [defaultPayment],
  discount: "",

  // ── Staff / Branch ────────────────────────────────────────────────────────
  selectedStaffId: "admin",
  selectedShopId: "",

  // ── UI Filters ────────────────────────────────────────────────────────────
  activeTab: "services",          // "services" | "products"
  activeDept: "",
  activeSvcCat: "All",
  activeProdCat: "All",
  searchQuery: "",
  showOnlyFavourites: false,
  showOnlyProductFavourites: false,

  // ── Edit Mode ─────────────────────────────────────────────────────────────
  // "?"? Edit Mode "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  isEditing: false,
  editInvoiceId: null,
  editInvoiceNumber: null,

  // ── Booking ───────────────────────────────────────────────────────────────
  bookingDate: "",
  bookingTime: "",

  // ── Variant Modal ─────────────────────────────────────────────────────────
  variantModalOpen: false,
  itemForVariants: null,

  // ── Success Popup ─────────────────────────────────────────────────────────
  successData: null,
  showSuccessPopup: false,

  // ── Staff Commissions ─────────────────────────────────────────────────────
  staffCommissions: {},
  commissionType: {},

  // ── Invoice Date (custom date for backdating) ─────────────────────────────
  invoiceDate: "",  // empty = today
};

const invoiceSlice = createSlice({
  name: "invoice",
  initialState,
  reducers: {
    // ── Cart actions ─────────────────────────────────────────────────────────
    addToCart(state, { payload: item }) {
      const idx = state.cart.findIndex(
        (c) =>
          c._id === item._id &&
          c.itemType === item.itemType &&
          (item.variantId ? c.variantId === item.variantId : !c.variantId)
      );
      if (idx >= 0) {
        state.cart[idx].qty += 1;
      } else {
        state.cart.push({
          ...item,
          qty: item.qty ?? 1,
          discount: item.discount ?? 0,
          staffId: state.selectedStaffId,
        });
      }
    },

    removeFromCart(state, { payload: { id, itemType, variantId } }) {
      state.cart = state.cart.filter(
        (c) =>
          !(
            c._id === id &&
            c.itemType === itemType &&
            (variantId ? c.variantId === variantId : !c.variantId)
          )
      );
    },

    updateCartItem(state, { payload: { id, itemType, variantId, changes } }) {
      const idx = state.cart.findIndex(
        (c) =>
          c._id === id &&
          c.itemType === itemType &&
          (variantId ? c.variantId === variantId : !c.variantId)
      );
      if (idx >= 0) {
        state.cart[idx] = { ...state.cart[idx], ...changes };
      }
    },

    setCartItemQty(state, { payload: { id, itemType, variantId, qty } }) {
      const idx = state.cart.findIndex(
        (c) =>
          c._id === id &&
          c.itemType === itemType &&
          (variantId ? c.variantId === variantId : !c.variantId)
      );
      if (idx >= 0) {
        if (qty <= 0) {
          state.cart.splice(idx, 1);
        } else {
          state.cart[idx].qty = qty;
        }
      }
    },

    setCart(state, { payload }) {
      state.cart = payload;
    },

    clearCart(state) {
      state.cart = [];
      state.discount = "";
      state.payments = [{ method: state.paymentMethod, amount: "" }];
      state.selectedCustomer = null;
      state.customerSearch = "";
      state.staffCommissions = {};
      state.commissionType = {};
      state.invoiceDate = "";
    },

    // Sync all cart items' staffId when top-level staff changes
    syncCartStaff(state) {
      state.cart = state.cart.map((item) => ({
        ...item,
        staffId: state.selectedStaffId,
      }));
    },

    // ── Customer ──────────────────────────────────────────────────────────────
    setSelectedCustomer(state, { payload }) {
      state.selectedCustomer = payload;
      state.customerSearch = payload?.name ?? "";
    },

    setCustomerSearch(state, { payload }) {
      state.customerSearch = payload;
    },

    // ── Payment ───────────────────────────────────────────────────────────────
    setPaymentMethod(state, { payload }) {
      state.paymentMethod = payload;
    },

    setPayments(state, { payload }) {
      state.payments = payload;
    },

    setDiscount(state, { payload }) {
      state.discount = payload;
    },

    // ── Staff / Branch ────────────────────────────────────────────────────────
    setSelectedStaffId(state, { payload }) {
      state.selectedStaffId = payload;
      // Sync cart items immediately
      state.cart = state.cart.map((item) => ({
        ...item,
        staffId: payload,
      }));
    },

    setSelectedShopId(state, { payload }) {
      state.selectedShopId = payload;
    },

    // ── UI Filters ────────────────────────────────────────────────────────────
    setActiveTab(state, { payload }) {
      state.activeTab = payload;
      state.searchQuery = "";
    },

    setActiveDept(state, { payload }) {
      state.activeDept = payload;
    },

    setActiveSvcCat(state, { payload }) {
      state.activeSvcCat = payload;
    },

    setActiveProdCat(state, { payload }) {
      state.activeProdCat = payload;
    },

    setSearchQuery(state, { payload }) {
      state.searchQuery = payload;
    },

    toggleFavourites(state) {
      state.showOnlyFavourites = !state.showOnlyFavourites;
    },

    toggleProductFavourites(state) {
      state.showOnlyProductFavourites = !state.showOnlyProductFavourites;
    },

    // ── Edit Mode ─────────────────────────────────────────────────────────────
    setEditMode(state, { payload: { invoiceId, invoiceNumber, cartItems, customer, staffId, shopId, discount, payments } }) {
      state.isEditing = true;
      state.editInvoiceId = invoiceId;
      state.editInvoiceNumber = invoiceNumber || null;
      state.cart = cartItems ?? [];
      state.selectedCustomer = customer ?? null;
      state.customerSearch = customer?.name ?? "";
      state.selectedStaffId = staffId ?? "admin";
      state.selectedShopId = shopId ?? "";
      state.discount = discount ?? "";
      if (payments && payments.length > 0) {
        state.payments = payments;
      }
    },
    
    setEditFlags(state, { payload: { isEditing, invoiceId, invoiceNumber } }) {
      state.isEditing = isEditing;
      if (invoiceId !== undefined) state.editInvoiceId = invoiceId;
      if (invoiceNumber !== undefined) state.editInvoiceNumber = invoiceNumber;
    },

    clearEditMode(state) {
      state.isEditing = false;
      state.editInvoiceId = null;
      state.editInvoiceNumber = null;
    },

    // ── Booking ───────────────────────────────────────────────────────────────
    setBookingDate(state, { payload }) {
      state.bookingDate = payload;
    },

    setBookingTime(state, { payload }) {
      state.bookingTime = payload;
    },

    // ── Variant Modal ─────────────────────────────────────────────────────────
    openVariantModal(state, { payload: item }) {
      state.variantModalOpen = true;
      state.itemForVariants = item;
    },

    closeVariantModal(state) {
      state.variantModalOpen = false;
      state.itemForVariants = null;
    },

    // ── Success Popup ─────────────────────────────────────────────────────────
    showSuccess(state, { payload }) {
      state.successData = payload;
      state.showSuccessPopup = true;
    },

    hideSuccess(state) {
      state.showSuccessPopup = false;
      state.successData = null;
    },

    // ── Staff Commissions ─────────────────────────────────────────────────────
    setStaffCommissions(state, { payload }) {
      state.staffCommissions = payload;
    },

    setCommissionType(state, { payload }) {
      state.commissionType = payload;
    },

    // ── Invoice Date ─────────────────────────────────────────────────────────
    setInvoiceDate(state, { payload }) {
      state.invoiceDate = payload;
    },

    // ── Full reset (after invoice saved) ─────────────────────────────────────
    resetInvoiceEntry(state) {
      Object.assign(state, {
        ...initialState,
        // Preserve branch/staff context so next invoice is fast
        selectedShopId: state.selectedShopId,
        selectedStaffId: state.selectedStaffId,
        paymentMethod: state.paymentMethod,
        payments: [{ method: state.paymentMethod, amount: "" }],
        activeTab: state.activeTab,
        activeDept: state.activeDept,
      });
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateCartItem,
  setCartItemQty,
  setCart,
  clearCart,
  syncCartStaff,
  setSelectedCustomer,
  setCustomerSearch,
  setPaymentMethod,
  setPayments,
  setDiscount,
  setSelectedStaffId,
  setSelectedShopId,
  setActiveTab,
  setActiveDept,
  setActiveSvcCat,
  setActiveProdCat,
  setSearchQuery,
  toggleFavourites,
  toggleProductFavourites,
  setEditMode,
  setEditFlags,
  clearEditMode,
  setBookingDate,
  setBookingTime,
  openVariantModal,
  closeVariantModal,
  showSuccess,
  hideSuccess,
  setStaffCommissions,
  setCommissionType,
  setInvoiceDate,
  resetInvoiceEntry,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectCart = (s) => s.invoice.cart;
export const selectCartCount = (s) =>
  s.invoice.cart.reduce((n, i) => n + i.qty, 0);
export const selectSelectedCustomer = (s) => s.invoice.selectedCustomer;
export const selectCustomerSearch = (s) => s.invoice.customerSearch;
export const selectPaymentMethod = (s) => s.invoice.paymentMethod;
export const selectPayments = (s) => s.invoice.payments;
export const selectDiscount = (s) => s.invoice.discount;
export const selectSelectedStaffId = (s) => s.invoice.selectedStaffId;
export const selectSelectedShopId = (s) => s.invoice.selectedShopId;
export const selectActiveTab = (s) => s.invoice.activeTab;
export const selectActiveDept = (s) => s.invoice.activeDept;
export const selectActiveSvcCat = (s) => s.invoice.activeSvcCat;
export const selectActiveProdCat = (s) => s.invoice.activeProdCat;
export const selectSearchQuery = (s) => s.invoice.searchQuery;
export const selectShowOnlyFavourites = (s) => s.invoice.showOnlyFavourites;
export const selectShowOnlyProductFavourites = (s) =>
  s.invoice.showOnlyProductFavourites;
export const selectIsEditing = (s) => s.invoice.isEditing;
export const selectEditInvoiceId = (s) => s.invoice.editInvoiceId;
export const selectEditInvoiceNumber = (s) => s.invoice.editInvoiceNumber;
export const selectBookingDate = (s) => s.invoice.bookingDate;
export const selectBookingTime = (s) => s.invoice.bookingTime;
export const selectVariantModalOpen = (s) => s.invoice.variantModalOpen;
export const selectItemForVariants = (s) => s.invoice.itemForVariants;
export const selectShowSuccessPopup = (s) => s.invoice.showSuccessPopup;
export const selectSuccessData = (s) => s.invoice.successData;
export const selectStaffCommissions = (s) => s.invoice.staffCommissions;
export const selectCommissionType = (s) => s.invoice.commissionType;
export const selectInvoiceDate = (s) => s.invoice.invoiceDate;
