/**
 * useInvoiceCart
 * Single hook that gives invoice entry components everything they need:
 *  - Typed selectors (no raw useSelector boilerplate in components)
 *  - Bound action dispatchers
 *  - Derived totals (memoized)
 *
 * Usage:
 *   const { cart, addToCart, totals, ... } = useInvoiceCart(salonConfig);
 */
import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { calculateCartTotals } from "../../../utils/precisionHelper";
import {
  addToCart as _add,
  removeFromCart as _remove,
  updateCartItem as _update,
  setCartItemQty as _setQty,
  clearCart as _clear,
  setSelectedCustomer as _setCustomer,
  setCustomerSearch as _setCustomerSearch,
  setPaymentMethod as _setPaymentMethod,
  setPayments as _setPayments,
  setDiscount as _setDiscount,
  setSelectedStaffId as _setStaff,
  setSelectedShopId as _setShop,
  setActiveTab as _setTab,
  setActiveDept as _setDept,
  setActiveSvcCat as _setSvcCat,
  setActiveProdCat as _setProdCat,
  setSearchQuery as _setSearch,
  toggleFavourites as _toggleFav,
  toggleProductFavourites as _toggleProdFav,
  setEditMode as _setEditMode,
  clearEditMode as _clearEditMode,
  setBookingDate as _setBookingDate,
  setBookingTime as _setBookingTime,
  openVariantModal as _openVariant,
  closeVariantModal as _closeVariant,
  showSuccess as _showSuccess,
  hideSuccess as _hideSuccess,
  setStaffCommissions as _setCommissions,
  setCommissionType as _setCommissionType,
  setInvoiceDate as _setInvoiceDate,
  resetInvoiceEntry as _reset,
  selectCart,
  selectCartCount,
  selectSelectedCustomer,
  selectCustomerSearch,
  selectPaymentMethod,
  selectPayments,
  selectDiscount,
  selectSelectedStaffId,
  selectSelectedShopId,
  selectActiveTab,
  selectActiveDept,
  selectActiveSvcCat,
  selectActiveProdCat,
  selectSearchQuery,
  selectShowOnlyFavourites,
  selectShowOnlyProductFavourites,
  selectIsEditing,
  selectEditInvoiceId,
  selectBookingDate,
  selectBookingTime,
  selectVariantModalOpen,
  selectItemForVariants,
  selectShowSuccessPopup,
  selectSuccessData,
  selectStaffCommissions,
  selectCommissionType,
  selectInvoiceDate,
} from "../../../store/slices/invoiceSlice";

/**
 * @param {object} [salonConfig] - Salon settings for precision/round-off calculations
 */
export function useInvoiceCart(salonConfig) {
  const dispatch = useDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const cart = useSelector(selectCart);
  const cartCount = useSelector(selectCartCount);
  const selectedCustomer = useSelector(selectSelectedCustomer);
  const customerSearch = useSelector(selectCustomerSearch);
  const paymentMethod = useSelector(selectPaymentMethod);
  const payments = useSelector(selectPayments);
  const discount = useSelector(selectDiscount);
  const selectedStaffId = useSelector(selectSelectedStaffId);
  const selectedShopId = useSelector(selectSelectedShopId);
  const activeTab = useSelector(selectActiveTab);
  const activeDept = useSelector(selectActiveDept);
  const activeSvcCat = useSelector(selectActiveSvcCat);
  const activeProdCat = useSelector(selectActiveProdCat);
  const searchQuery = useSelector(selectSearchQuery);
  const showOnlyFavourites = useSelector(selectShowOnlyFavourites);
  const showOnlyProductFavourites = useSelector(selectShowOnlyProductFavourites);
  const isEditing = useSelector(selectIsEditing);
  const editInvoiceId = useSelector(selectEditInvoiceId);
  const bookingDate = useSelector(selectBookingDate);
  const bookingTime = useSelector(selectBookingTime);
  const variantModalOpen = useSelector(selectVariantModalOpen);
  const itemForVariants = useSelector(selectItemForVariants);
  const showSuccessPopup = useSelector(selectShowSuccessPopup);
  const successData = useSelector(selectSuccessData);
  const staffCommissions = useSelector(selectStaffCommissions);
  const commissionType = useSelector(selectCommissionType);
  const invoiceDate = useSelector(selectInvoiceDate);

  // ── Derived totals (memoized — only recalculates when cart/discount changes) ─
  const totals = useMemo(
    () =>
      calculateCartTotals({
        items: cart,
        discount: Number(discount) || 0,
        settings: salonConfig,
      }),
    [cart, discount, salonConfig]
  );

  // ── Bound dispatchers ──────────────────────────────────────────────────────
  const addToCart = useCallback((item) => dispatch(_add(item)), [dispatch]);
  const removeFromCart = useCallback(
    (id, itemType, variantId) => dispatch(_remove({ id, itemType, variantId })),
    [dispatch]
  );
  const updateCartItem = useCallback(
    (id, itemType, variantId, changes) =>
      dispatch(_update({ id, itemType, variantId, changes })),
    [dispatch]
  );
  const setCartItemQty = useCallback(
    (id, itemType, variantId, qty) =>
      dispatch(_setQty({ id, itemType, variantId, qty })),
    [dispatch]
  );
  const clearCart = useCallback(() => dispatch(_clear()), [dispatch]);
  const setSelectedCustomer = useCallback(
    (c) => dispatch(_setCustomer(c)),
    [dispatch]
  );
  const setCustomerSearch = useCallback(
    (v) => dispatch(_setCustomerSearch(v)),
    [dispatch]
  );
  const setPaymentMethod = useCallback(
    (m) => dispatch(_setPaymentMethod(m)),
    [dispatch]
  );
  const setPayments = useCallback(
    (p) => dispatch(_setPayments(p)),
    [dispatch]
  );
  const setDiscount = useCallback(
    (d) => dispatch(_setDiscount(d)),
    [dispatch]
  );
  const setSelectedStaffId = useCallback(
    (id) => dispatch(_setStaff(id)),
    [dispatch]
  );
  const setSelectedShopId = useCallback(
    (id) => dispatch(_setShop(id)),
    [dispatch]
  );
  const setActiveTab = useCallback(
    (t) => dispatch(_setTab(t)),
    [dispatch]
  );
  const setActiveDept = useCallback(
    (d) => dispatch(_setDept(d)),
    [dispatch]
  );
  const setActiveSvcCat = useCallback(
    (c) => dispatch(_setSvcCat(c)),
    [dispatch]
  );
  const setActiveProdCat = useCallback(
    (c) => dispatch(_setProdCat(c)),
    [dispatch]
  );
  const setSearchQuery = useCallback(
    (q) => dispatch(_setSearch(q)),
    [dispatch]
  );
  const toggleFavourites = useCallback(
    () => dispatch(_toggleFav()),
    [dispatch]
  );
  const toggleProductFavourites = useCallback(
    () => dispatch(_toggleProdFav()),
    [dispatch]
  );
  const setEditMode = useCallback(
    (opts) => dispatch(_setEditMode(opts)),
    [dispatch]
  );
  const clearEditMode = useCallback(
    () => dispatch(_clearEditMode()),
    [dispatch]
  );
  const setBookingDate = useCallback(
    (d) => dispatch(_setBookingDate(d)),
    [dispatch]
  );
  const setBookingTime = useCallback(
    (t) => dispatch(_setBookingTime(t)),
    [dispatch]
  );
  const openVariantModal = useCallback(
    (item) => dispatch(_openVariant(item)),
    [dispatch]
  );
  const closeVariantModal = useCallback(
    () => dispatch(_closeVariant()),
    [dispatch]
  );
  const showSuccess = useCallback(
    (data) => dispatch(_showSuccess(data)),
    [dispatch]
  );
  const hideSuccess = useCallback(
    () => dispatch(_hideSuccess()),
    [dispatch]
  );
  const setStaffCommissions = useCallback(
    (c) => dispatch(_setCommissions(c)),
    [dispatch]
  );
  const setCommissionType = useCallback(
    (t) => dispatch(_setCommissionType(t)),
    [dispatch]
  );
  const setInvoiceDate = useCallback(
    (d) => dispatch(_setInvoiceDate(d)),
    [dispatch]
  );
  const resetInvoiceEntry = useCallback(
    () => dispatch(_reset()),
    [dispatch]
  );

  return {
    // State
    cart,
    cartCount,
    selectedCustomer,
    customerSearch,
    paymentMethod,
    payments,
    discount,
    selectedStaffId,
    selectedShopId,
    activeTab,
    activeDept,
    activeSvcCat,
    activeProdCat,
    searchQuery,
    showOnlyFavourites,
    showOnlyProductFavourites,
    isEditing,
    editInvoiceId,
    bookingDate,
    bookingTime,
    variantModalOpen,
    itemForVariants,
    showSuccessPopup,
    successData,
    staffCommissions,
    commissionType,
    invoiceDate,
    // Derived
    totals,
    // Actions
    addToCart,
    removeFromCart,
    updateCartItem,
    setCartItemQty,
    clearCart,
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
  };
}
