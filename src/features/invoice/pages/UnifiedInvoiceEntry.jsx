/**
 * UnifiedInvoiceEntry — Redux Migration Guide
 * ─────────────────────────────────────────────
 * Cart / checkout / UI-filter state is now managed in Redux via `useInvoiceCart`.
 *
 * REPLACE these useState calls with the hook:
 *
 *   // OLD
 *   const [cart, setCart] = useState([]);
 *   const [selectedCustomer, setSelectedCustomer] = useState(null);
 *   const [paymentMethod, setPaymentMethod] = useState("CASH");
 *   const [payments, setPayments] = useState([...]);
 *   const [discount, setDiscount] = useState("");
 *   const [selectedStaffId, setSelectedStaffId] = useState("admin");
 *   const [selectedShopId, setSelectedShopId] = useState("");
 *   const [activeDept, setActiveDept] = useState("");
 *   const [activeSvcCat, setActiveSvcCat] = useState("All");
 *   const [activeProdCat, setActiveProdCat] = useState("All");
 *   const [searchQuery, setSearchQuery] = useState("");
 *   const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
 *   const [showOnlyProductFavourites, setShowOnlyProductFavourites] = useState(false);
 *   const [isEditing, setIsEditing] = useState(false);
 *   const [editInvoiceId, setEditInvoiceId] = useState(null);
 *   const [showVariantModal, setShowVariantModal] = useState(false);
 *   const [itemForVariants, setItemForVariants] = useState(null);
 *   const [showSuccessPopup, setShowSuccessPopup] = useState(false);
 *   const [successData, setSuccessData] = useState(null);
 *   const [staffCommissions, setStaffCommissions] = useState({});
 *   const [commissionType, setCommissionType] = useState({});
 *
 *   // NEW — one line replaces all of the above
 *   const {
 *     cart, addToCart, removeFromCart, setCartItemQty, updateCartItem, clearCart,
 *     selectedCustomer, setSelectedCustomer,
 *     paymentMethod, setPaymentMethod,
 *     payments, setPayments,
 *     discount, setDiscount,
 *     selectedStaffId, setSelectedStaffId,
 *     selectedShopId, setSelectedShopId,
 *     activeDept, setActiveDept,
 *     activeSvcCat, setActiveSvcCat,
 *     activeProdCat, setActiveProdCat,
 *     searchQuery, setSearchQuery,
 *     showOnlyFavourites, toggleFavourites,
 *     showOnlyProductFavourites, toggleProductFavourites,
 *     isEditing, editInvoiceId, setEditMode, clearEditMode,
 *     variantModalOpen, itemForVariants, openVariantModal, closeVariantModal,
 *     showSuccessPopup, successData, showSuccess, hideSuccess,
 *     staffCommissions, setStaffCommissions,
 *     commissionType, setCommissionType,
 *     totals,           // ← pre-calculated subtotal/tax/finalAmount/roundOff
 *     resetInvoiceEntry,
 *   } = useInvoiceCart(shopConfig);
 *
 * The `useEffect` that synced staffId to cart items is now handled inside the
 * `setSelectedStaffId` reducer — no manual effect needed.
 *
 * After a successful invoice save call `resetInvoiceEntry()` instead of
 * manually clearing each piece of state.
 */
import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import moment from "moment";
import {
  useLazyGetAppointmentSlotsQuery,
  useLazyGetInvoiceByIdQuery,
  useLazyGetProductsQuery,
  useGetInvoiceMetadataQuery,
  useLazyGetInvoiceMetadataQuery,
  useUpdateInvoiceMutation,
  useCompleteAppointmentMutation,
  useCreateAppointmentMutation,
  useCreateAdminCustomerMutation,
  useToggleProductFavouriteMutation,
  useCreateRazorpayOrderMutation,
  useGetOffersQuery,
} from "../../../store/api/tenantEndpoints";
import { useGetIntegrationStatusQuery } from "../../../store/api/integrationEndpoints";
import {
  useUpdateUserThemeMutation,
  useRedeemLoyaltyPointsMutation,
} from "../../../store/api/tenantCrudEndpoints";
import api from "../../../api/axiosInstance";
import { useSelector, useDispatch } from "react-redux";
import {
  selectCart,
  selectPayments,
  selectDiscount,
  setCart as reduxSetCart,
  setPayments as reduxSetPayments,
  setDiscount as reduxSetDiscount,
  clearCart as reduxClearCart,
  selectIsEditing,
  selectEditInvoiceId,
  selectEditInvoiceNumber,
  setEditFlags,
  clearEditMode,
} from "../../../store/slices/invoiceSlice";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import Snackbar from "../../../components/shared/Snackbar";
import PaymentSuccessPopup from "../../../components/shared/PaymentSuccessPopup";
import CustomDatePicker from "../../../components/shared/CustomDatePicker";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  User,
  Phone,
  Mail,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  CheckCircle2,
  Clock,
  Search as SearchIcon,
  ArrowLeft,
  Store,
  Heart,
  Users,
  Check,
  Wallet,
  Package,
  FileText,
  SlidersHorizontal,
  Calendar,
  Scissors,
  Percent,
  CreditCard,
  Truck,
  Settings,
  MapPin,
  ClipboardList,
  Home as HomeIcon,
  LayoutGrid,
  List,
  Award,
  Gift,
} from "lucide-react";
import { ServicesSkeleton, InvoiceListSkeleton } from "../../../components/shared/Skeleton";
import Modal from "../../../components/shared/Modal";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { useKeyboardShortcut } from "../../../hooks/useKeyboardShortcut";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll";
import {
  applyPrecision,
  applyRoundOff,
  calculateCartTotals,
  formatNumber,
} from "../../../utils/precisionHelper";

const ServiceCard = memo(({ service, displayPrice, onAdd, onUpdateQty, viewMode = "grid", cart = [], cardStyle = "image-details", offerInfo }) => {
  const { formatDisplayNumber, currencySymbol } = useCurrency();
  
  const hasVariants = service.useVariants && service.variants?.length > 0;
  
  let taxPct = service.taxId?.percentage || 0;
  let isInc = service.isTaxInclusive || false;
  
  if (hasVariants && service.variants[0]) {
    const firstVariant = service.variants[0];
    taxPct = firstVariant.taxId?.percentage || firstVariant.taxPercent || taxPct;
    isInc = firstVariant.isTaxInclusive !== undefined ? firstVariant.isTaxInclusive : isInc;
  }
  
  const finalDisplayPrice = isInc ? displayPrice : displayPrice + (displayPrice * (taxPct / 100));

  const finalOfferPrice = offerInfo?.hasOffer
    ? (isInc ? offerInfo.price : offerInfo.price + (offerInfo.price * (taxPct / 100)))
    : finalDisplayPrice;
  const originalDisplayPrice = offerInfo?.hasOffer
    ? (isInc ? offerInfo.originalPrice : offerInfo.originalPrice + (offerInfo.originalPrice * (taxPct / 100)))
    : finalDisplayPrice;

  const cartItems = cart.filter((c) => c.itemType === "service" && c._id === service._id);
  const isInCart = cartItems.length > 0;
  const cartItem = cartItems[0];
  const qty = cartItem ? cartItem.qty : 0;

  const showImage = viewMode === 'list' || cardStyle === 'image-details' || cardStyle === 'image-details-add';
  const showControls = viewMode === 'grid' && (cardStyle === 'details-qty' || cardStyle === 'image-details-add');

  const handleCardClick = () => {
    if (!showControls || hasVariants) {
      onAdd(service, offerInfo?.hasOffer ? offerInfo.price : displayPrice);
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (qty > 0 && cartItem) {
      if (onUpdateQty) onUpdateQty(cartItem.variantKey, 1);
    } else {
      onAdd(service, offerInfo?.hasOffer ? offerInfo.price : displayPrice);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (qty > 0 && cartItem) {
      if (onUpdateQty) onUpdateQty(cartItem.variantKey, -1);
    }
  };

  return (
    <div
      className={`${viewMode === 'list'
        ? `flex flex-row h-24 border-b last:border-b-0 cursor-pointer transition-colors group ${isInCart ? 'bg-brand-primary/5 border-brand-primary/30 dark:bg-brand-primary/10' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-dark-surface hover:bg-brand-primary/[0.02] dark:hover:bg-white/[0.02]'}`
        : `rounded-2xl overflow-hidden flex flex-col h-full group transition-all duration-300 border ${!showControls || hasVariants ? 'cursor-pointer active:scale-[0.98]' : ''} ${isInCart ? 'bg-brand-primary/5 border-brand-primary ring-2 ring-brand-primary/20 dark:bg-brand-primary/10' : 'bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border hover:border-brand-primary/40'}`
        }`}
      onClick={handleCardClick}
    >
      {showImage && (
        <div className={`${viewMode === 'list' ? 'w-24 h-24 shrink-0 p-3' : 'h-32 w-full bg-gray-50 dark:bg-dark-card'} relative overflow-hidden flex items-center justify-center shrink-0`}>
          {service.image && (service.image.url || typeof service.image === "string") ? (
            <img
              src={service.image.url || service.image}
              alt={service.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${viewMode === 'list' ? 'rounded-xl shadow-sm' : ''}`}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gray-50 dark:bg-dark-card transition-colors group-hover:bg-brand-primary/[0.02] ${viewMode === 'list' ? 'rounded-xl shadow-sm' : ''}`}>
              <Scissors size={viewMode === 'list' ? 24 : 32} strokeWidth={1.5} className="text-gray-200 dark:text-gray-700 transition-colors group-hover:text-brand-primary/20" />
            </div>
          )}
          {hasVariants && (
            <div className={`absolute ${viewMode === 'list' ? 'bottom-3 right-3' : 'top-2 right-2'}`}>
              <span className={`bg-brand-primary text-white text-[8px] font-black uppercase tracking-widest ${viewMode === 'list' ? 'px-1.5 py-0.5 rounded-md' : 'px-2 py-1 rounded-lg'}`}>
                {service.variants.length} Var
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`flex-1 flex ${viewMode === 'list' ? 'flex-row items-center justify-between gap-4 py-3 pr-4' : 'flex-col p-3 sm:p-4'}`}>
        <div className={`${viewMode === 'list' ? 'flex-1' : 'w-full text-left'}`}>
          <h4 className={`font-bold text-gray-800 dark:text-gray-200 text-[14px] mb-1.5 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors text-left`}>
            {service.name}
          </h4>
          {viewMode === 'list' && taxPct > 0 && (
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 w-fit">
              {taxPct}% Tax
            </span>
          )}
        </div>

        <div className={`flex ${viewMode === 'list' ? 'flex-row items-center gap-6' : 'mt-auto flex-col items-start justify-start gap-1 w-full'}`}>
          <div className={`flex flex-col shrink-0 min-w-0 ${viewMode === 'list' ? 'items-end text-right pl-1' : 'items-start text-left w-full mt-1'}`}>
            <div className="font-black text-[15px] sm:text-[16px] text-brand-primary dark:text-blue-400 notranslate leading-none truncate max-w-full mb-1 text-left w-full">
              {formatDisplayNumber(finalOfferPrice || 0)}
            </div>
            
            <div className={`flex items-center gap-1.5 w-full ${viewMode === 'list' ? 'justify-end' : 'justify-start flex-wrap'}`}>
              {viewMode === 'grid' && taxPct > 0 && (
                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 whitespace-nowrap">
                  {taxPct}% Tax
                </span>
              )}
              {offerInfo?.hasOffer && (
                <>
                  <span className="text-gray-400 dark:text-gray-500 text-[10px] line-through font-bold truncate">
                    {formatDisplayNumber(originalDisplayPrice)}
                  </span>
                  <span className="inline-flex items-center px-1 py-[2px] rounded text-[8px] font-bold bg-emerald-100/80 text-emerald-700 dark:text-emerald-400 tracking-widest shrink-0 leading-none">
                    {offerInfo.discountType === "percentage"
                      ? `${offerInfo.discountValue}% OFF`
                      : `${currencySymbol}${offerInfo.discountValue} OFF`}
                  </span>
                </>
              )}
              {taxPct > 0 && !offerInfo?.hasOffer && (
                <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight whitespace-nowrap">
                  Incl. Tax
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Qty Controls for Grid Mode */}
        {showControls && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border w-full flex items-center justify-between">
            {hasVariants ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(service, offerInfo?.hasOffer ? offerInfo.price : displayPrice); }}
                className="w-full bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:text-blue-400 font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Variant
              </button>
            ) : qty > 0 ? (
              <div className="flex items-center justify-between w-full bg-white dark:bg-dark-card border border-brand-primary/30 rounded-lg overflow-hidden h-8 shadow-sm">
                <button
                  onClick={handleDecrement}
                  className="w-8 h-full flex items-center justify-center text-brand-primary dark:text-blue-400 hover:bg-brand-primary/10 transition-colors"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <span className="flex-1 text-center font-black text-brand-primary dark:text-blue-400 text-xs">
                  {qty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-8 h-full flex items-center justify-center text-brand-primary dark:text-blue-400 hover:bg-brand-primary/10 transition-colors"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleIncrement}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const ProductCard = memo(({
  product,
  cart,
  onAdd,
  onUpdateQty,
  selectedShopId,
  onToggleFavourite,
  viewMode = "grid",
  cardStyle = "image-details",
  offerInfo
}) => {
  const { formatDisplayNumber, currencySymbol } = useCurrency();
  const hasVariants = product.useVariants && product.variants?.length > 0;

  const getBranchStock = (itemStockArr, fallback) => {
    if (!selectedShopId || !itemStockArr) return fallback;
    const bInfo = itemStockArr.find(
      (b) => String(b.branchId?._id || b.branchId) === String(selectedShopId),
    );
    return bInfo ? bInfo.currentStock : 0;
  };

  const totalVariantStock = hasVariants
    ? product.variants.reduce(
      (sum, v) => sum + getBranchStock(v.branchStock, v.currentStock || 0),
      0,
    )
    : 0;

  const baseProductStock = getBranchStock(product.branchStock, product.currentStock || 0);

  const cartItems = cart.filter((c) => c.itemType === "product" && c._id === product._id);
  const isInCart = cartItems.length > 0;
  const cartItem = cartItems[0];
  const qty = cartItem ? cartItem.qty : 0;

  const totalCartQty = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const availableStock = hasVariants
    ? totalVariantStock - totalCartQty
    : baseProductStock - totalCartQty;

  const taxPct = product.taxId?.percentage || product.taxPercent || 0;
  const isInclusive = product.isTaxInclusive || false;
  const basePrice = product.sellingPrice || 0;

  const effectiveBasePrice = offerInfo?.hasOffer ? offerInfo.price : basePrice;
  const effectivePrice = isInclusive ? effectiveBasePrice : effectiveBasePrice + (effectiveBasePrice * (taxPct / 100));

  const originalEffectivePrice = isInclusive ? basePrice : basePrice + (basePrice * (taxPct / 100));

  let priceRange = null;
  if (hasVariants && product.variants[0]) {
    const firstVariant = product.variants[0];
    const p = firstVariant.sellingPrice || 0;
    const vTaxPct = firstVariant.taxId?.percentage || firstVariant.taxPercent || taxPct;
    const vIsInclusive = firstVariant.isTaxInclusive !== undefined ? firstVariant.isTaxInclusive : isInclusive;
    const firstPrice = vIsInclusive ? p : p + (p * (vTaxPct / 100));
    priceRange = `${formatDisplayNumber(firstPrice)}`;
  }

  const isOutOfStock = hasVariants ? totalVariantStock <= 0 : availableStock <= 0;

  const showImage = viewMode === 'list' || cardStyle === 'image-details' || cardStyle === 'image-details-add';
  const showControls = viewMode === 'grid' && (cardStyle === 'details-qty' || cardStyle === 'image-details-add');

  const handleCardClick = () => {
    if (isOutOfStock) return;
    if (hasVariants) {
      onAdd(product, effectiveBasePrice);
    } else {
      if (qty > 0 && cartItem) {
        if (onUpdateQty) onUpdateQty(cartItem.variantKey, 1);
      } else {
        onAdd(product, effectiveBasePrice);
      }
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (qty > 0 && cartItem) {
      if (onUpdateQty) onUpdateQty(cartItem.variantKey, 1);
    } else {
      onAdd(product, effectiveBasePrice);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (qty > 0 && cartItem) {
      if (onUpdateQty) onUpdateQty(cartItem.variantKey, -1);
    }
  };

  return (
    <div
      className={`
        flex group transition-all duration-300
        ${viewMode === 'list'
          ? `flex-row h-24 border-b last:border-b-0 cursor-pointer ${isInCart ? 'bg-brand-primary/5 border-brand-primary/30 dark:bg-brand-primary/10' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-dark-surface hover:bg-brand-primary/[0.02] dark:hover:bg-white/[0.02]'}`
          : `rounded-2xl overflow-hidden flex-col h-full border ${isInCart ? 'bg-brand-primary/5 border-brand-primary ring-2 ring-brand-primary/20 dark:bg-brand-primary/10' : 'bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border hover:border-brand-primary/40'}`
        }
        ${isOutOfStock
          ? "opacity-60 cursor-not-allowed"
          : (!showControls || hasVariants) ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]" : ""
        }
      `}
      onClick={handleCardClick}
    >
      {showImage && (
        <div className={`${viewMode === 'list' ? 'w-24 h-24 shrink-0 p-3' : 'h-24 w-full bg-gray-50 dark:bg-dark-card'} relative overflow-hidden flex items-center justify-center shrink-0`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleFavourite) onToggleFavourite(product);
            }}
            className={`absolute ${viewMode === 'list' ? 'top-1 left-1 p-1' : 'top-2 left-2 p-1.5'} z-10 rounded-full bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm shadow-sm transition-all hover:scale-110 ${product.isFavourite ? "text-red-500" : "text-gray-300 hover:text-red-400"}`}
          >
            <Heart size={viewMode === 'list' ? 12 : 14} fill={product.isFavourite ? "currentColor" : "none"} />
          </button>

          {product.image && (product.image.url || typeof product.image === "string") ? (
            <img
              src={product.image.url || product.image}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${viewMode === 'list' ? 'rounded-xl shadow-sm' : ''}`}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gray-50 dark:bg-dark-card ${viewMode === 'list' ? 'rounded-xl shadow-sm' : ''}`}>
              <Package size={viewMode === 'list' ? 24 : 24} strokeWidth={1.5} className="text-gray-200 dark:text-gray-700 transition-colors group-hover:text-brand-primary/20" />
            </div>
          )}

          {isOutOfStock ? (
            <div className={`absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center ${viewMode === 'list' ? 'm-3 rounded-xl' : ''}`}>
              <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg text-center">
                Out of Stock
              </span>
            </div>
          ) : hasVariants && (
            <div className={`absolute ${viewMode === 'list' ? 'bottom-3 right-3' : 'top-2 right-2'}`}>
              <span className={`bg-brand-primary text-white text-[8px] font-black uppercase tracking-widest ${viewMode === 'list' ? 'px-1.5 py-0.5 rounded-md' : 'px-2 py-1 rounded-lg'}`}>
                {product.variants.length} Var
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`flex-1 flex ${viewMode === 'list' ? 'flex-row items-center justify-between gap-4 py-3 pr-4' : 'flex-col p-2.5 sm:p-3'}`}>
        <div className={`${viewMode === 'list' ? 'flex-1' : 'w-full text-left'}`}>
          <div className={`flex items-start justify-between gap-2 ${viewMode === 'list' ? '' : 'w-full relative'}`}>
            <h4 className={`font-bold text-gray-800 dark:text-gray-200 text-[13px] mb-1 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors text-left pr-6`}>
              {product.name}
            </h4>
            {!showImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleFavourite) onToggleFavourite(product);
                }}
                className={`p-1 shrink-0 rounded-full transition-all hover:scale-110 ${product.isFavourite ? "text-red-500 bg-red-50" : "text-gray-300 hover:text-red-400 bg-gray-50 dark:bg-dark-card"} ${viewMode === 'list' ? '' : 'absolute top-0 right-0'}`}
              >
                <Heart size={14} fill={product.isFavourite ? "currentColor" : "none"} />
              </button>
            )}
          </div>
          {viewMode === 'list' && (
            <div className="flex gap-2 items-center">
              <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-lg border w-fit ${availableStock <= 5 ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100"}`}>
                {availableStock} Stock
              </span>
              {taxPct > 0 && (
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 w-fit">
                  {taxPct}% Tax
                </span>
              )}
            </div>
          )}
        </div>

        <div className={`flex ${viewMode === 'list' ? 'flex-row items-center gap-6 text-right' : 'mt-auto flex-col items-start justify-start gap-1 w-full'}`}>
          <div className={`flex flex-col shrink-0 min-w-0 ${viewMode === 'list' ? 'items-end text-right pl-1 ml-auto' : 'items-start text-left w-full mt-1'}`}>
            <div className="font-black text-[13px] sm:text-[14px] text-brand-primary dark:text-blue-400 notranslate leading-none truncate max-w-full mb-0.5 text-left w-full">
              {hasVariants
                ? priceRange
                : `${formatDisplayNumber(effectivePrice)}`}
            </div>

            <div className={`flex items-center gap-1.5 w-full ${viewMode === 'list' ? 'justify-end' : 'justify-start flex-wrap'}`}>
              {viewMode === 'grid' && (
                <span className={`text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-lg border whitespace-nowrap ${availableStock <= 5 ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100"}`}>
                  {availableStock} Stock
                </span>
              )}
              {viewMode === 'grid' && taxPct > 0 && (
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 whitespace-nowrap">
                  {taxPct}% Tax
                </span>
              )}
              {offerInfo?.hasOffer && !hasVariants && (
                <>
                  <span className="text-gray-400 dark:text-gray-500 text-[9px] line-through font-bold truncate">
                    {formatDisplayNumber(originalEffectivePrice)}
                  </span>
                  <span className="inline-flex items-center px-1 py-[2px] rounded text-[8px] font-bold bg-emerald-100/80 text-emerald-700 dark:text-emerald-400 tracking-widest shrink-0 leading-none">
                    {offerInfo.discountType === "percentage"
                      ? `${offerInfo.discountValue}% OFF`
                      : `${currencySymbol}${offerInfo.discountValue} OFF`}
                  </span>
                </>
              )}
              {taxPct > 0 && !(offerInfo?.hasOffer && !hasVariants) && (
                <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight whitespace-nowrap">
                  Incl. Tax
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Qty Controls for Grid Mode */}
        {showControls && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-dark-border w-full flex items-center justify-between">
            {isOutOfStock ? (
              <button
                disabled
                className="w-full bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg cursor-not-allowed flex items-center justify-center"
              >
                Out of Stock
              </button>
            ) : hasVariants ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(product, effectiveBasePrice); }}
                className="w-full bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:text-blue-400 font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Variant
              </button>
            ) : qty > 0 ? (
              <div className="flex items-center justify-between w-full bg-white dark:bg-dark-card border border-brand-primary/30 rounded-lg overflow-hidden h-8 shadow-sm">
                <button
                  onClick={handleDecrement}
                  className="w-8 h-full flex items-center justify-center text-brand-primary dark:text-blue-400 hover:bg-brand-primary/10 transition-colors"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <span className="flex-1 text-center font-black text-brand-primary dark:text-blue-400 text-xs">
                  {qty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-8 h-full flex items-center justify-center text-brand-primary dark:text-blue-400 hover:bg-brand-primary/10 transition-colors"
                  disabled={availableStock <= 0}
                >
                  <Plus size={14} strokeWidth={2.5} className={availableStock <= 0 ? "opacity-50" : ""} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleIncrement}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.product !== next.product) return false;
  if (prev.selectedShopId !== next.selectedShopId) return false;
  if (prev.viewMode !== next.viewMode) return false;
  if (prev.cardStyle !== next.cardStyle) return false;
  if (prev.product?.isFavourite !== next.product?.isFavourite) return false;

  const prevCartItems = (prev.cart || []).filter((item) => item.itemType === "product" && item._id === prev.product._id);
  const nextCartItems = (next.cart || []).filter((item) => item.itemType === "product" && item._id === next.product._id);

  const prevQty = prevCartItems.reduce((sum, item) => sum + item.qty, 0);
  const nextQty = nextCartItems.reduce((sum, item) => sum + item.qty, 0);

  return prevQty === nextQty;
});

// Global cache for invoice metadata
let metadataCache = null;

// Preload success sound for instant playback
const successAudio = new Audio('/audio/invoice.mp3');
successAudio.preload = 'auto';

const VariantSelectionModal = ({
  isOpen,
  onClose,
  item,
  activeDept,
  departments,
  selectedShopId,
  cart,
  getOfferInfo,
  onSelect,
  onRemove,
  duplicateItemAction,
}) => {
  const { formatDisplayNumber, currencySymbol } = useCurrency();
  const [selectedVariants, setSelectedVariants] = useState([]);
  const initialVariantIdsRef = useRef([]);

  const getInitialVariants = () => {
    if (!item || !cart) return [];
    const cartItems = cart.filter(c =>
      c.itemType === item.itemType &&
      c._id === item._id &&
      c.variantId && c.variantId !== "base"
    );
    if (!cartItems.length) return [];
    return cartItems.map(cartItem => {
      const variant = item.variants?.find(v => {
        const vId = v._id || v.variantId?._id || v.variantId;
        return vId === cartItem.variantId;
      });
      if (!variant) return null;
      const vId = variant._id || variant.variantId?._id || variant.variantId;
      return {
        _id: vId,
        name: variant.variantId?.name || variant.name || variant.variantName || "Variant",
        price: cartItem.price,
        originalPrice: cartItem.price,
        taxId: variant.taxId,
        taxPercent: variant.taxPercent || item.taxPercent || 0,
        taxPercentage: variant.taxId?.percentage || item.taxId?.percentage || 0,
        isTaxInclusive: variant.isTaxInclusive !== undefined ? variant.isTaxInclusive : item.isTaxInclusive || false,
        qty: cartItem.qty || 1,
        currentStock: 0,
      };
    }).filter(Boolean);
  };

  useEffect(() => {
    if (isOpen) {
      const initial = getInitialVariants();
      queueMicrotask(() => {
        setSelectedVariants(initial);
      });
      initialVariantIdsRef.current = initial.map(v => v._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    setSelectedVariants([]);
    onClose();
  };

  if (!item) return null;

  const getVariantPriceForDept = (vInfo) => {
    if (item.itemType === "product") {
      return vInfo.sellingPrice || 0;
    }

    let price = vInfo.price || item.price || 0;

    if (vInfo.pricing && vInfo.pricing.length > 0) {
      const po = vInfo.pricing.find((p) => {
        const deptId = (p.department?._id || p.department)?.toString();
        const activeDeptId = departments
          ?.find((d) => d.name === activeDept)
          ?._id?.toString();
        return (
          deptId === activeDeptId ||
          (p.department?.name && p.department.name === activeDept)
        );
      });
      if (po && po.price != null) price = po.price;
      else if (vInfo.pricing[0].price != null) price = vInfo.pricing[0].price;
    }

    return price;
  };

  const toggleVariant = (v, price, originalPrice) => {
    const vId = v._id || v.variantId?._id || v.variantId;
    const exists = selectedVariants.some((sv) => sv._id === vId);
    if (exists) {
      if (duplicateItemAction === "duplicate") {
        setSelectedVariants((prev) =>
          prev.map((sv) =>
            sv._id === vId ? { ...sv, qty: sv.qty + 1 } : sv
          )
        );
      } else {
        if (onRemove) onRemove(item, [vId]);
        setSelectedVariants((prev) => prev.filter((sv) => sv._id !== vId));
      }
    } else {
      const cartQty = item.itemType === "product"
        ? cart.find((c) => c.itemType === "product" && (c.variantId === vId || c._id === vId))?.qty || 1
        : 1;
      setSelectedVariants((prev) => [...prev, {
        _id: vId,
        name: v.variantId?.name || v.name || v.variantName || "Variant",
        price,
        originalPrice: originalPrice || price,
        taxId: v.taxId,
        taxPercent: v.taxPercent || item.taxPercent || 0,
        taxPercentage: v.taxId?.percentage || item.taxId?.percentage || 0,
        isTaxInclusive:
          v.isTaxInclusive !== undefined
            ? v.isTaxInclusive
            : item.isTaxInclusive || false,
        qty: cartQty,
        currentStock:
          item.itemType === "product"
            ? (() => {
              if (!selectedShopId || !v.branchStock)
                return v.currentStock || 0;
              const bInfo = v.branchStock.find(
                (b) =>
                  String(b.branchId?._id || b.branchId) ===
                  String(selectedShopId),
              );
              return bInfo ? bInfo.currentStock : 0;
            })()
            : 0,
      }]);
    }
  };

  const updateVariantQty = (vId, delta) => {
    setSelectedVariants((prev) => {
      const idx = prev.findIndex((sv) => sv._id === vId);
      if (idx === -1) return prev;
      const item = prev[idx];
      const newQty = item.qty + delta;
      const stockVal = item.itemType === "product"
        ? prev[idx].currentStock
        : null;
      if (stockVal !== null && newQty > stockVal) return prev;
      if (newQty <= 0) {
        if (onRemove) onRemove(item, [vId]);
        return prev.filter((sv) => sv._id !== vId);
      }
      const updated = [...prev];
      updated[idx] = { ...item, qty: newQty };
      return updated;
    });
  };

  const handleConfirm = () => {
    selectedVariants.forEach((v) => {
      for (let i = 0; i < v.qty; i++) {
        onSelect(item, v.price, v);
      }
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[9998]"
        onClick={handleClose}
      />

      {/* Modal Container - Full width on mobile, centered on desktop */}
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center sm:justify-center pointer-events-none sm:p-4">
        <div
          className="pointer-events-auto w-full sm:max-w-md bg-white dark:bg-dark-surface sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[80vh] flex flex-col"
        >
          {/* Simple Header */}
          <div className="px-5 py-4 border-b border-gray-200 dark:border-dark-border">
            {/* Mobile drag handle */}
            <div className="sm:hidden w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select options</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card transition-colors"
              >
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Variants List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {item.variants?.map((v) => {
              const basePrice = getVariantPriceForDept(v);
              const currentDeptId = departments?.find((d) => d.name === activeDept)?._id;
              const vOfferInfo = getOfferInfo ? getOfferInfo(item, basePrice, item.itemType, currentDeptId, v) : { hasOffer: false, price: basePrice };
              const price = vOfferInfo.hasOffer ? vOfferInfo.price : basePrice;

              const vId = v._id || v.variantId?._id || v.variantId;
              const isSelected = selectedVariants.some((sv) => sv._id === vId);

              const taxPercentage = v.taxId?.percentage || v.taxPercent || item.taxId?.percentage || item.taxPercent || 0;
              const isInclusive = v.isTaxInclusive !== undefined ? v.isTaxInclusive : item.isTaxInclusive || false;

              const originalFinalPrice = isInclusive ? basePrice : basePrice + (basePrice * (taxPercentage / 100));
              const finalPrice = isInclusive ? price : price + (price * (taxPercentage / 100));

              const stockVal = item.itemType === "product"
                ? (() => {
                  if (!selectedShopId || !v.branchStock) return v.currentStock || 0;
                  const bInfo = v.branchStock.find(
                    (b) => String(b.branchId?._id || b.branchId) === String(selectedShopId)
                  );
                  return bInfo ? bInfo.currentStock : 0;
                })()
                : null;

              const cartQty = item.itemType === "product"
                ? cart.find((c) => c.itemType === "product" && (c.variantId === vId || c._id === vId))?.qty || 0
                : 0;

              const remainingStock = stockVal !== null ? stockVal - cartQty : null;
              const isOutOfStock = remainingStock !== null && remainingStock <= 0;

              const selectedItem = selectedVariants.find((sv) => sv._id === vId);
              const selQty = selectedItem?.qty || 0;

              return (
                <div
                  key={vId}
                  onClick={() => !isOutOfStock && toggleVariant(v, price, basePrice)}
                  className={`
                    w-full px-4 py-3 rounded-xl border transition-colors cursor-pointer
                    ${isOutOfStock
                      ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card"
                      : isSelected
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-gray-200 dark:border-dark-border hover:border-brand-primary/50 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      disabled={isOutOfStock}
                      onClick={(e) => { e.stopPropagation(); toggleVariant(v, price, basePrice); }}
                      className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                        ${isSelected
                          ? "border-brand-primary bg-brand-primary"
                          : "border-gray-300 dark:border-gray-600"
                        }
                      `}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                    </button>

                    {/* Name */}
                    <div className="flex-1 text-left min-w-0" onClick={(e) => { e.stopPropagation(); !isOutOfStock && toggleVariant(v, price, basePrice); }}>
                      <p className={`font-bold text-sm truncate cursor-pointer ${isSelected ? "text-brand-primary" : "text-gray-900 dark:text-gray-100"}`}>
                        {v.variantId?.name || v.name || v.variantName || "Variant"}
                      </p>
                      {remainingStock !== null && remainingStock <= 10 && (
                        <p className={`text-xs mt-0.5 ${remainingStock <= 5 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                          {remainingStock} left
                        </p>
                      )}
                    </div>

                    {/* Price + Qty */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-end">
                        <div className={`font-bold text-sm notranslate flex items-center gap-2 ${isSelected ? "text-brand-primary" : "text-gray-900 dark:text-gray-100"}`}>
                          {vOfferInfo?.hasOffer && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 dark:text-gray-500 text-xs line-through">
                                {formatDisplayNumber(originalFinalPrice)}
                              </span>
                              <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700 dark:text-emerald-400 tracking-wider">
                                {vOfferInfo.discountType === "percentage"
                                  ? `${vOfferInfo.discountValue}% OFF`
                                  : `${currencySymbol}${vOfferInfo.discountValue} OFF`}
                              </span>
                            </div>
                          )}
                          {formatDisplayNumber(finalPrice)}
                        </div>
                        {taxPercentage > 0 && (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight mt-0.5">
                            Incl. {taxPercentage}% Tax
                          </span>
                        )}
                      </div>

                      {isSelected && item.itemType === "product" && (
                        <div className="flex items-center gap-1 bg-white dark:bg-dark-surface rounded-lg p-1 border border-gray-200 dark:border-dark-border shadow-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateVariantQty(vId, -1); }}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Minus size={14} strokeWidth={3} />
                          </button>
                          <span className="text-sm font-black text-gray-800 dark:text-gray-200 min-w-[1.6rem] text-center">
                            {selQty}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateVariantQty(vId, 1); }}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-brand-primary/5 rounded transition-colors"
                          >
                            <Plus size={14} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-dark-border">
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedVariants.length === 0}
                className={`
                  flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
                  ${selectedVariants.length > 0
                    ? "bg-brand-primary text-white hover:bg-brand-primary/90"
                    : "bg-gray-200 dark:bg-dark-border text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }
                `}
              >
                Add {selectedVariants.length > 0 && `(${selectedVariants.reduce((sum, v) => sum + (v.qty || 1), 0)})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * CartItemRow — Memoized cart item row.
 * Only re-renders when its own item data changes (qty, discount, staffId, price).
 * Prevents the entire cart list from re-rendering when a single item's qty changes.
 */
const CartItemRow = memo(({
  item,
  onUpdateQty,
  onRemove,
  onUpdateDiscount,
  onUpdatePrice,
  onUpdateStaff,
  filteredStaff,
  isAdmin,
  isStaff,
  shopConfig,
  shopSettings,
  formatNumber,
  applyPrecision,
  canEditPrice,
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState("");

  const handlePriceClick = () => {
    if (!canEditPrice) return;
    setIsEditingPrice(true);
    setEditPriceValue(item.price);
  };

  const handlePriceBlur = () => {
    setIsEditingPrice(false);
    if (editPriceValue !== "" && Number(editPriceValue) !== item.price) {
      if (onUpdatePrice) onUpdatePrice(item.variantKey, editPriceValue);
    }
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePriceBlur();
    }
    if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setEditPriceValue(item.price);
    }
  };

  const lineTotal = item.price * item.qty;
  const itemDisc = Number(item.discount) || 0;
  let lineTax = 0,
    lineDisplay = lineTotal;
  let taxableAmount = lineTotal;
  const originalLineTotal = (item.originalPrice && item.originalPrice > item.price) ? item.originalPrice * item.qty : lineTotal;

  if (item.itemType === "service") {
    const taxPct = item.taxPercentage !== undefined ? item.taxPercentage : (item.taxPercent || 0);
    if (taxPct > 0) {
      if (item.isTaxInclusive) {
        lineTax = lineTotal - (lineTotal / (1 + taxPct / 100));
        taxableAmount = lineTotal - lineTax;
        lineDisplay = lineTotal - itemDisc;
      } else {
        lineTax = (lineTotal - itemDisc) * (taxPct / 100);
        taxableAmount = lineTotal;
        lineDisplay = lineTotal - itemDisc + lineTax;
      }
    } else {
      lineDisplay = lineTotal - itemDisc;
      taxableAmount = lineTotal;
    }
  } else {
    const taxPct = item.taxPercent !== undefined ? item.taxPercent : (item.taxPercentage || 0);
    if (taxPct > 0) {
      if (item.isTaxInclusive) {
        lineTax = lineTotal - (lineTotal / (1 + taxPct / 100));
        taxableAmount = lineTotal - lineTax;
        lineDisplay = lineTotal - itemDisc;
      } else {
        lineTax = (lineTotal - itemDisc) * (taxPct / 100);
        taxableAmount = lineTotal;
        lineDisplay = lineTotal - itemDisc + lineTax;
      }
    } else {
      lineDisplay = lineTotal - itemDisc;
      taxableAmount = lineTotal;
    }
  }

  const displayAmount = applyPrecision(lineDisplay, shopSettings);
  const displayOriginalAmount = item.originalPrice && item.originalPrice > item.price
    ? applyPrecision(originalLineTotal + lineTax, shopSettings) // approximation
    : null;

  const showFooter = (shopConfig?.showItemStaff !== false) || (shopConfig?.showItemDiscount !== false);

  return (
    <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl transition-all p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      {/* Header: Name, Qty Controls, Price, Remove */}
      <div className={`flex items-center gap-2 ${showFooter ? 'mb-2' : 'mb-0'}`}>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[11px] text-gray-800 dark:text-gray-200 leading-tight break-words">
            {item.name}
            {item.variantName && (
              <span className="text-brand-primary dark:text-blue-400 ml-1">• {item.variantName}</span>
            )}
          </h4>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {/* Tax Percentage Badge */}
            {((item.itemType === "service" && (item.taxPercentage || 0) > 0) ||
              (item.itemType === "product" && (item.taxPercent || item.taxPercentage || 0) > 0)) && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 flex items-center">
                  {item.itemType === "service"
                    ? (item.taxName?.includes("%") ? item.taxName : `${item.taxName || "Tax"} ${item.taxPercentage}%`)
                    : (item.taxName?.includes("%") ? item.taxName : `${item.taxName || "Tax"} ${item.taxPercent || item.taxPercentage}%`)}
                  {item.isTaxInclusive ? " incl." : ""}
                </span>
              )}

            {/* Stock Badge */}
            {item.itemType === "product" && item.currentStock !== undefined && (
              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">
                Stock: {item.currentStock - item.qty}
              </span>
            )}
          </div>
        </div>

        {/* Qty Controls */}
        <div className="flex items-center gap-1 bg-white dark:bg-dark-surface rounded-lg p-0.5 border border-gray-200 dark:border-dark-border shadow-sm">
          <button
            onClick={() => onUpdateQty(item.variantKey, -1)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Minus size={10} strokeWidth={3} />
          </button>
          <span className="text-[11px] font-black text-gray-800 dark:text-gray-200 min-w-[1.5rem] text-center">
            {item.qty}
          </span>
          <button
            onClick={() => onUpdateQty(item.variantKey, 1)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-brand-primary/5 rounded transition-colors"
          >
            <Plus size={10} strokeWidth={3} />
          </button>
        </div>

        {/* Price */}
        <div className="text-right min-w-[80px]">
          {displayOriginalAmount && (
            <div className="flex items-center justify-end gap-1 mb-0.5">
              <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] line-through notranslate leading-none">
                {formatNumber(displayOriginalAmount, shopSettings)}
              </p>
              <span className="inline-flex items-center px-1 py-0.5 rounded text-[7px] font-bold bg-emerald-100 text-emerald-700 dark:text-emerald-400 tracking-widest leading-none">
                {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
              </span>
            </div>
          )}
          {isEditingPrice && canEditPrice ? (
            <input
              type="number"
              autoFocus
              className="w-16 bg-gray-50 dark:bg-dark-card border border-brand-primary/50 rounded px-1 text-right text-[11px] font-black text-gray-900 dark:text-gray-100 outline-none"
              value={editPriceValue}
              onChange={(e) => setEditPriceValue(e.target.value)}
              onBlur={handlePriceBlur}
              onKeyDown={handlePriceKeyDown}
            />
          ) : (
            <div className="flex flex-col items-end">
              <p 
                className={`text-gray-900 dark:text-gray-100 font-black text-[13px] notranslate leading-none ${canEditPrice ? 'cursor-pointer hover:text-brand-primary border-b border-transparent hover:border-brand-primary/30' : ''}`}
                onClick={handlePriceClick}
                title={canEditPrice ? "Click to edit unit price" : ""}
              >
                {formatNumber(displayAmount, shopSettings)}
              </p>
              {(lineTax > 0 || (item.taxPercent > 0) || (item.taxPercentage > 0)) && (
                <div className="flex flex-col items-end mt-1.5 opacity-80">
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
                    Base: <span className="notranslate text-gray-700 dark:text-gray-300">{formatNumber(taxableAmount, shopSettings)}</span>
                  </span>
                  {lineTax > 0 && (
                    <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest leading-tight">
                      Tax: <span className="notranslate text-emerald-600 dark:text-emerald-400">+{formatNumber(lineTax, shopSettings)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(item.variantKey)}
          className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {/* Footer: Staff & Discount in same row */}
      {((shopConfig?.showItemStaff !== false) || (shopConfig?.showItemDiscount !== false)) && (
        <div className="flex items-center gap-2">
          {/* Staff Selection */}
          {(shopConfig?.showItemStaff !== false) && (isAdmin || isStaff) && (
            <div className="flex-1">
              <CustomDropdown
                variant="compact"
                icon={Users}
                value={item.staffId || "admin"}
                onChange={(e) => onUpdateStaff(item.variantKey, e.target.value)}
                options={[
                  ...filteredStaff.map((s) => ({
                    value: s._id,
                    label: s.name,
                  })),
                ]}
                placeholder="Select Staff"
              />
            </div>
          )}

          {/* Discount Input */}
          {(shopConfig?.showItemDiscount !== false) && (
            <div className="flex-1 relative">
              <CustomTextField
                variant="compact"
                type="number"
                icon={Percent}
                placeholder="Discount"
                value={item.discount || ""}
                onChange={(e) => onUpdateDiscount(item.variantKey, e.target.value)}
                min="0"
                max={lineTotal}
              />
              {itemDisc > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-500 notranslate pointer-events-none">
                  -{formatNumber(itemDisc, shopSettings)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const UnifiedInvoiceEntry = () => {
  const { shopSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, shopConfig, invoiceServiceCardView, invoiceProductCardView } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isShopAdmin = user?.role === "SHOP_ADMIN";
  const isStaff = user?.role === "staff";
  const isAdmin = isSuperAdmin || isShopAdmin; // Re-included isShopAdmin to ensure they can see branch/staff selectors and filter correctly
  const canSeeServices = isAdmin || hasPermission("invoice:services");
  const canSeeProducts = isAdmin || hasPermission("invoice:products");
  const canEditPrice = isAdmin || (isStaff && hasPermission("invoice:manage:edit_price"));

  const [loading, setLoading] = useState(false);

  const [fetchSlots] = useLazyGetAppointmentSlotsQuery();
  const [fetchInvoiceById] = useLazyGetInvoiceByIdQuery();
  const { data: invoiceMetadata, isLoading: isMetadataLoading } = useGetInvoiceMetadataQuery();
  const [fetchProducts] = useLazyGetProductsQuery();
  const [fetchMeta] = useLazyGetInvoiceMetadataQuery();
  const [updateInvoiceMut] = useUpdateInvoiceMutation();
  const [completeApptMut] = useCompleteAppointmentMutation();
  const [createApptMut] = useCreateAppointmentMutation();
  const [createCustomerMut] = useCreateAdminCustomerMutation();
  const [toggleProductFavourite] = useToggleProductFavouriteMutation();
  const [updateUserPreference] = useUpdateUserThemeMutation();
  const [createRazorpayOrderMut] = useCreateRazorpayOrderMutation();
  const [redeemPointsMut, { isLoading: isRedeemingPoints }] = useRedeemLoyaltyPointsMutation();

  // Loyalty Points State
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState("");

  const { data: integrationStatusObj } = useGetIntegrationStatusQuery(undefined, {
    skip: !canSeeServices && !canSeeProducts,
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState("products");

  // Service Data
  const [services, setServices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);

  // Product Data
  const [products, setProducts] = useState([]);
  const [productCategories, setProductCategories] = useState([]);

  // Shared Data
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const processedBookingIdRef = useRef(null);
  const processedEditIdRef = useRef(null);
  const headerRef = useRef(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [taxes, setTaxes] = useState([]);

  // Refs for Add Customer Modal
  const custNameRef = useRef(null);
  const custPhoneRef = useRef(null);
  const custEmailRef = useRef(null);

  // Service UI State
  const [activeDept, setActiveDept] = useState("");
  const [activeSvcCat, setActiveSvcCat] = useState("ALL");
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);

  // Product UI State
  const [activeProdCat, setActiveProdCat] = useState("ALL");
  const [showOnlyProductFavourites, setShowOnlyProductFavourites] = useState(false);

  // Shared UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedItemsCount, setDisplayedItemsCount] = useState(20);

  useEffect(() => {
    setDisplayedItemsCount(20);
  }, [searchQuery, activeSvcCat, activeProdCat, activeDept, activeTab]);

  const [viewMode, setViewMode] = useState(() => {
    const local = localStorage.getItem("invoiceViewMode");
    if (local) return local;
    return user?.invoiceViewMode || "grid";
  }); // "grid" | "list"
  const [showViewSettings, setShowViewSettings] = useState(false);

  const handleViewModeChange = async (mode) => {
    setViewMode(mode);
    setShowViewSettings(false);
    localStorage.setItem("invoiceViewMode", mode);
    try {
      await updateUserPreference({ invoiceViewMode: mode }).unwrap();
    } catch (err) {
      console.error("Failed to save view mode preference:", err);
    }
  };

  const showMobileCart = location.hash === "#cart";

  // Cart & Checkout (UNIFIED) — Redux-backed to prevent full-page re-renders
  const reduxDispatch = useDispatch();
  const cart = useSelector(selectCart);
  const payments = useSelector(selectPayments);
  const discount = useSelector(selectDiscount);

  // Stable setters that dispatch to Redux (no local state = no full re-render)
  const setCart = useCallback((valOrFn) => {
    if (typeof valOrFn === "function") {
      // For functional updates, we need current cart from store
      // Use a thunk-like pattern: read current, compute, dispatch
      reduxDispatch((dispatch, getState) => {
        const current = getState().invoice.cart;
        const next = valOrFn(current);
        dispatch(reduxSetCart(next));
      });
    } else {
      reduxDispatch(reduxSetCart(valOrFn));
    }
  }, [reduxDispatch]);

  const setPayments = useCallback((valOrFn) => {
    if (typeof valOrFn === "function") {
      reduxDispatch((dispatch, getState) => {
        const current = getState().invoice.payments;
        const next = valOrFn(current);
        dispatch(reduxSetPayments(next));
      });
    } else {
      reduxDispatch(reduxSetPayments(valOrFn));
    }
  }, [reduxDispatch]);

  const setDiscount = useCallback((val) => {
    reduxDispatch(reduxSetDiscount(val));
  }, [reduxDispatch]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [selectedStaffId, setSelectedStaffId] = useState("admin");

  // Fetch real ledger balance for selected customer
  useEffect(() => {
    if (selectedCustomer && selectedCustomer._id && selectedCustomer.name !== "LOCAL CUSTOMER") {
      const fetchLedger = async () => {
        try {
          const res = await api.get(`/sales/customer-statement/${selectedCustomer._id}?includeOpening=false`);
          if (res.data?.success && res.data?.summary) {
            setSelectedCustomer(prev => {
              if (!prev || prev._id !== selectedCustomer._id) return prev;
              const trueWalletBalance = -(res.data.summary.closingBalance || 0);
              if (prev.walletBalance !== trueWalletBalance) {
                return { ...prev, walletBalance: trueWalletBalance };
              }
              return prev;
            });
          }
        } catch (e) {
          console.error("Failed to fetch ledger balance", e);
        }
      };
      fetchLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?._id]);

  // Auto-update all cart items' staff when top-level staff changes
  useEffect(() => {
    if (selectedStaffId) {
      setCart((prevCart) =>
        prevCart.map((item) => ({
          ...item,
          staffId: selectedStaffId,
        }))
      );
    }
  }, [selectedStaffId, setCart]);

  // New Customer Modal
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [newCustData, setNewCustData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Auto-focus name field when modal opens
  useEffect(() => {
    if (isCustModalOpen) {
      setTimeout(() => {
        custNameRef.current?.focus();
      }, 100);
    }
  }, [isCustModalOpen]);

  // Miscellaneous Modal (Commission + Shipping)
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [miscActiveTab, setMiscActiveTab] = useState("commission"); // 'commission' or 'shipping'
  const [staffCommissions, setStaffCommissions] = useState({});
  const [commissionType, setCommissionType] = useState({}); // 'percentage' or 'amount'
  const [invoiceDate, setInvoiceDate] = useState(moment().format("YYYY-MM-DD")); // default today
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showUnfinishedCartModal, setShowUnfinishedCartModal] = useState(false);
  const [pendingEditId, setPendingEditId] = useState(null);

  const hasCheckedCartRef = useRef(false);

  // Shipping Details State
  const [shippingCarrier, setShippingCarrier] = useState("");
  const [shippingTrackingId, setShippingTrackingId] = useState("");
  const [shippingExpectedDate, setShippingExpectedDate] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");

  // Shop Context
  const [selectedShopId, setSelectedShopId] = useState("");
  const [shopSettings, setShopSettings] = useState({ showServices: true, showProducts: true });

  const { data: offersResponse } = useGetOffersQuery(undefined, { skip: !selectedShopId });
  const activeOffers = useMemo(() => {
    if (!Array.isArray(offersResponse)) return [];
    const now = new Date();
    return offersResponse.filter(o => new Date(o.endTime) > now && o.isActive !== false);
  }, [offersResponse]);

  const getOfferInfo = useCallback((item, basePrice, type, departmentId = null, variantObj = null) => {
    if (!activeOffers.length) return { hasOffer: false, price: basePrice, originalPrice: basePrice };

    const offer = activeOffers.find(o => {
      if (o.applicableType === "all") return true;
      if (o.applicableType === "all_services" && type === "service") return true;
      if (o.applicableType === "all_products" && type === "product") return true;
      if (o.applicableType === "specific") {
        if (type === "service" && o.applicableServices?.includes(item._id)) return true;
        if (type === "product" && o.applicableProducts?.includes(item._id)) return true;
        
        if (departmentId && o.applicableDepartments?.includes(departmentId)) return true;
        
        const cats = item.categories || (item.category ? [item.category] : []);
        if (type === "service" && cats.some(c => o.applicableServiceCategories?.includes(c._id || c))) return true;
        if (type === "product" && cats.some(c => o.applicableProductCategories?.includes(c._id || c))) return true;
        
        if (variantObj && o.applicableVariants?.includes(variantObj.variantId?._id || variantObj.variantId || variantObj._id)) return true;
      }
      return false;
    });

    if (!offer) return { hasOffer: false, price: basePrice, originalPrice: basePrice };

    let offerPrice = basePrice;
    if (offer.discountType === "percentage") {
      offerPrice = basePrice - (basePrice * (offer.discountValue / 100));
    } else {
      offerPrice = basePrice - offer.discountValue;
    }

    return {
      hasOffer: true,
      price: Math.max(0, offerPrice),
      originalPrice: basePrice,
      discountType: offer.discountType,
      discountValue: offer.discountValue
    };
  }, [activeOffers]);
  const currencySymbol = shopSettings?.currencySymbol || " ";
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [snack, setSnack] = useState({ title: "", message: "", type: "success" });
  const showSnack = useCallback((title, message = "", type = "success") =>
    setSnack({ title, message, type }), []);

  // Edit Mode State - Migrated to Redux
  const isEditing = useSelector(selectIsEditing);
  const editInvoiceId = useSelector(selectEditInvoiceId);
  const editInvoiceNumber = useSelector(selectEditInvoiceNumber);

  // Success Popup State
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState(null);



  const topMobileScrollRef = useHorizontalScroll();
  const midMobileScrollRef = useHorizontalScroll();
  const bottomDesktopLeftScrollRef = useHorizontalScroll();
  const bottomDesktopRightScrollRef = useHorizontalScroll();

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: moment().format("YYYY-MM-DD"),
    time: "", // Changed to empty to handle slot selection
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [itemForVariants, setItemForVariants] = useState(null);

  useEffect(() => {
    if (!isBookingModalOpen || !bookingData.date || !selectedShopId) return;
    let cancelled = false;
    (async () => {
      try {
        setSlotLoading(true);
        const res = await fetchSlots({
          date: bookingData.date,
          shopId: selectedShopId,
          branchId: selectedShopId,
          staffId: selectedStaffId !== "admin" ? selectedStaffId : undefined,
        }).unwrap();
        if (cancelled) return;
        if (res?.success) {
          let slots = res.data || [];
          
          // Filter past slots if the date is today
          if (moment(bookingData.date).isSame(moment(), 'day')) {
            const now = moment();
            slots = slots.filter((slot) => {
              const slotTime = moment(slot, ["h:mm A", "HH:mm"]);
              return slotTime.isAfter(now);
            });
          }

          setAvailableSlots(slots);
          if (bookingData.time && !slots.includes(bookingData.time)) {
            setBookingData((prev) => ({ ...prev, time: "" }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch slots", err);
          showSnack("Slot Error", "Failed to fetch available slots", "error");
        }
      } finally {
        if (!cancelled) setSlotLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isBookingModalOpen,
    bookingData.date,
    bookingData.time,
    selectedShopId,
    selectedStaffId,
    fetchSlots,
  ]);

  useEffect(() => {
    const applyMetadata = (data) => {
      if (data.services) setServices(data.services);
      if (data.departments) setDepartments(data.departments);
      if (data.departments?.length > 0 && !activeDept)
        setActiveDept(data.departments[0].name);
      if (data.serviceCategories) {
        // Sort service categories by count (most services first)
        const sortedServiceCategories = [...data.serviceCategories].sort((a, b) => {
          const countA = (data.services || []).filter(s =>
            s.categories?.some(c => c.name === a.name)
          ).length;
          const countB = (data.services || []).filter(s =>
            s.categories?.some(c => c.name === b.name)
          ).length;
          return countB - countA; // Descending order
        });
        setServiceCategories(sortedServiceCategories);
        // Auto-select ALL if none selected
        if (sortedServiceCategories.length > 0 && !activeSvcCat) {
          setActiveSvcCat("ALL");
        }
      }
      if (data.products) setProducts(data.products);
      if (data.productCategories) {
        // Sort product categories by count (most products first)
        const sortedProductCategories = [...data.productCategories].sort((a, b) => {
          const countA = (data.products || []).filter(p => p.category === a.name).length;
          const countB = (data.products || []).filter(p => p.category === b.name).length;
          return countB - countA; // Descending order
        });
        setProductCategories(sortedProductCategories);
        // Auto-select ALL if none selected
        if (sortedProductCategories.length > 0 && !activeProdCat) {
          setActiveProdCat("ALL");
        }
      }
      if (data.branches) setBranches(data.branches);
      if (data.customers) setCustomers(data.customers);
      if (data.paymentMethods) {
        // Inject RAZORPAY if enabled
        let pmData = [...data.paymentMethods];
        // Inject system DUE method
        if (!pmData.some(p => String(p.name).toUpperCase() === "DUE")) {
          pmData.push({ _id: "system_due", name: "DUE", isActive: true, isDefault: true, isSystem: true });
        }
        if (integrationStatusObj?.data?.isRazorpayEnabled && !pmData.some(p => String(p.name).toUpperCase() === "RAZORPAY")) {
          pmData.push({ name: "RAZORPAY" });
        }

        setPaymentMethods(pmData);
        if (pmData.length > 0) {
          const defName =
            data.settings?.defaultInvoicePaymentMethod || "CASH";
          const match = data.paymentMethods.find(
            (pm) =>
              String(pm.name || "").toUpperCase() ===
              String(defName).toUpperCase(),
          );
          const firstMethod =
            match?.name || data.paymentMethods[0].name;
          setPaymentMethod(firstMethod);
          setPayments((prev) => {
            if (
              prev.length === 1 &&
              (!prev[0].method ||
                String(prev[0].method).toUpperCase() === "CASH")
            ) {
              return [{ ...prev[0], method: firstMethod }];
            }
            return prev;
          });
        }
      }
      if (data.staff) setStaff(data.staff);
      if (data.taxes) setTaxes(data.taxes);
      if (data.settings) {
        setShopSettings(data.settings);
        // Always keep products active for invoice
        setActiveTab("products");
      }

      if (data.branches?.length > 0 && !selectedShopId) {
        // Default to assigned branch for staff, or user's branchId, or first branch
        const userBranchId = user?.branchId
          ? typeof user.branchId === "string"
            ? user.branchId
            : user.branchId._id
          : null;

        if (userBranchId) {
          setSelectedShopId(userBranchId);
        } else {
          setSelectedShopId(data.branches[0]._id);
        }
      }
    };

    const fetchData = async () => {
      try {
        let data = invoiceMetadata || metadataCache;
        if (!data) {
          setLoading(true);
          return;
        }

        metadataCache = data;
        applyMetadata(data);
        setLoading(false);

        const fetchedServices = data.services || [];
        const fetchedDepts = data.departments || [];
        const fetchedProducts = data.products || [];  // Add this line

        // Handle Redirection State (Pre-fill from Booking)
        if (location.state?.booking) {
          const booking = location.state.booking;
          if (processedBookingIdRef.current === booking._id) return;
          if (booking.user) setSelectedCustomer(booking.user);
          if (booking.departmentId) {
            const deptName =
              booking.departmentId.name ||
              fetchedDepts.find(
                (d) => d._id?.toString() === booking.departmentId?.toString(),
              )?.name;
            if (deptName) setActiveDept(deptName);
          }
          if (booking.services?.length > 0 || booking.products?.length > 0) {
            setCart(prev => {
              const cartMap = new Map();
              // Keep existing items in cart
              prev.forEach(item => cartMap.set(item.variantKey, { ...item }));

              // Process services
              (booking.services || []).forEach((s) => {
                const sId = s.serviceId?._id || s.serviceId || s._id || s;
                const fullService = fetchedServices.find(
                  (fs) => fs._id === sId.toString(),
                );
                const variantId = s.variantId?._id || s.variantId || "base";
                let deptName = "";
                let deptIdStr = "";

                if (booking.departmentId) {
                  deptName =
                    booking.departmentId.name ||
                    fetchedDepts.find(
                      (d) =>
                        d._id?.toString() === booking.departmentId?.toString(),
                    )?.name ||
                    "";
                  deptIdStr = (
                    booking.departmentId._id || booking.departmentId
                  ).toString();
                }

                let variantName = s.variantName || "";
                let price = s.price || fullService?.price || 0;

                if (!s.price && fullService && variantId && variantId !== "base") {
                  const vidStr = variantId.toString();
                  const variantObj = fullService.variants?.find((v) => {
                    const vvid = (
                      v.variantId?._id ||
                      v.variantId?.id ||
                      v.variantId ||
                      v._id
                    )?.toString();
                    return vvid === vidStr;
                  });

                  if (variantObj) {
                    variantName = variantObj.variantId?.name || variantName || "";
                    const vPricing = variantObj.pricing?.find((p) => {
                      const pDeptId = (
                        p.department?._id ||
                        p.department ||
                        p.department?.id
                      )?.toString();
                      return pDeptId === deptIdStr;
                    });
                    price =
                      vPricing?.price ||
                      variantObj.price ||
                      variantObj.pricing?.[0]?.price ||
                      price;
                  }
                } else if (fullService?.pricing?.length > 0) {
                  let po = fullService.pricing.find((p) => {
                    const pdId = (
                      p.department?._id || p.department
                    )?.toString();
                    return (
                      pdId === deptIdStr ||
                      (p.department?.name && p.department.name === deptName)
                    );
                  });
                  if (po && po.price != null) price = po.price;
                }

                const finalPrice = Number(price) || 0;
                const variantKey = `svc-${sId}-${variantId}-${finalPrice}-${deptName}`;

                // Get tax information from service or booking
                const taxPercentage = s.taxPercentage !== undefined
                  ? s.taxPercentage
                  : (fullService?.taxPercentage !== undefined
                    ? fullService.taxPercentage
                    : (fullService?.taxId?.percentage || 0));

                const isTaxInclusive = s.isTaxInclusive !== undefined
                  ? s.isTaxInclusive
                  : (fullService?.isTaxInclusive || false);

                const serviceItem = {
                  ...(fullService || s),
                  _id: sId,
                  name: fullService?.name || s.serviceId?.name || s.name || "Service",
                  price: finalPrice,
                  originalPrice: s.discount ? finalPrice + Number(s.discount) : undefined,
                  qty: s.qty || 1,
                  variantId,
                  variantName,
                  variantKey,
                  deptName,
                  fromBookingId: booking._id,
                  itemType: "service",
                  taxName: s.taxName || fullService?.taxId?.name || "Tax",
                  taxPercentage: taxPercentage,
                  taxPercent: taxPercentage, // Ensure both properties are set
                  isTaxInclusive: isTaxInclusive,
                  staffId: s.staffId || booking.staff?._id || booking.staff || selectedStaffId || "admin",
                  discount: s.discount || 0
                };

                if (cartMap.has(variantKey)) {
                  cartMap.get(variantKey).qty += (s.qty || 1);
                } else {
                  cartMap.set(variantKey, serviceItem);
                }
              });

              // Process products
              (booking.products || []).forEach((p) => {
                const pId = p.product?._id || p.product;
                const fullProduct = fetchedProducts.find(fp => fp._id === pId?.toString());
                const price = p.price || fullProduct?.sellingPrice || 0;
                const variantId = p.variantId?._id || p.variantId || "base";
                const variantName = p.variantName || (p.variantId?.name) || "";
                const finalPrice = Number(price) || 0;
                const variantKey = `prod-${pId}-${variantId}-${finalPrice}`;

                // Get current stock for the product/variant
                let currentStock = 0;
                if (fullProduct) {
                  if (variantId && variantId !== "base" && fullProduct.useVariants) {
                    const variantObj = fullProduct.variants?.find(v => {
                      const vId = (v.variantId?._id || v.variantId || v._id)?.toString();
                      return vId === variantId.toString();
                    });
                    currentStock = variantObj?.currentStock || 0;
                  } else {
                    currentStock = fullProduct.currentStock || 0;
                  }
                }

                // Get tax information from product or booking
                const taxPercent = p.taxPercentage !== undefined
                  ? p.taxPercentage
                  : (p.taxPercent !== undefined
                    ? p.taxPercent
                    : (fullProduct?.taxId?.percentage || p.product?.taxId?.percentage || 0));

                const isTaxInclusive = p.isTaxInclusive !== undefined
                  ? p.isTaxInclusive
                  : (fullProduct?.isTaxInclusive || p.product?.isTaxInclusive || false);

                const productItem = {
                  ...(fullProduct || p.product || {}),
                  _id: pId,
                  name: fullProduct?.name || p.product?.name || p.productName || "Product",
                  price: finalPrice,
                  originalPrice: p.discount ? finalPrice + Number(p.discount) : undefined,
                  qty: p.quantity || 1,
                  variantId: variantId,
                  variantName: variantName,
                  variantKey: variantKey,
                  itemType: "product",
                  fromBookingId: booking._id,
                  currentStock: currentStock,
                  taxName: p.taxName || fullProduct?.taxId?.name || p.product?.taxId?.name || "Tax",
                  taxPercent: taxPercent,
                  taxPercentage: taxPercent, // Ensure both properties are set
                  isTaxInclusive: isTaxInclusive,
                  staffId: p.staffId || booking.staff?._id || booking.staff || selectedStaffId || "admin",
                  discount: p.discount || 0
                };

                if (cartMap.has(variantKey)) {
                  cartMap.get(variantKey).qty += (p.quantity || 1);
                } else {
                  cartMap.set(variantKey, productItem);
                }
              });

              const finalCart = Array.from(cartMap.values());
              return finalCart;
            });
          }
          if (booking.branchId)
            setSelectedShopId(
              (booking.branchId._id || booking.branchId).toString(),
            );
          if (booking.staff)
            setSelectedStaffId(booking.staff._id || booking.staff);

          if (String(booking.paymentStatus).toUpperCase() === "PAID") {
            setPaymentMethod("UPI");
            setPayments([{ method: "UPI", amount: "" }]);
          }

          // Mark as processed
          processedBookingIdRef.current = booking._id;
        }

        // Handle Edit Mode Redirection (From Invoice Report)
        const queryParams = new URLSearchParams(location.search);
        const editId = queryParams.get("edit");
        
        let shouldLoadInvoice = true;
        if (cart.length > 0 && !hasCheckedCartRef.current) {
          hasCheckedCartRef.current = true;
          if (editId && processedEditIdRef.current !== editId) {
            setPendingEditId(editId);
          }
          setShowUnfinishedCartModal(true);
          shouldLoadInvoice = false;
        }

        if (editId && processedEditIdRef.current !== editId && shouldLoadInvoice) {
          reduxDispatch(setEditFlags({ isEditing: true, invoiceId: editId }));
          try {
            const invoice = await fetchInvoiceById(editId).unwrap();
            if (invoice) {
              processedEditIdRef.current = editId; // Mark as processed so it doesn't reload after successful checkout
              if (invoice.invoiceNumber) {
                reduxDispatch(setEditFlags({ isEditing: true, invoiceId: editId, invoiceNumber: invoice.invoiceNumber }));
              }
              if (invoice.date || invoice.createdAt) setInvoiceDate(moment(invoice.date || invoice.createdAt).format("YYYY-MM-DD"));
              if (invoice.user) setSelectedCustomer(invoice.user);
              if (invoice.shopId)
                setSelectedShopId(invoice.shopId._id || invoice.shopId);
              if (invoice.branchId)
                setSelectedShopId(invoice.branchId._id || invoice.branchId);
              if (invoice.staff)
                setSelectedStaffId(invoice.staff._id || invoice.staff);
              if (invoice.discount) setDiscount(invoice.discount.toString());
              if (invoice.payments && invoice.payments.length > 0) {
                setPayments(invoice.payments);
              } else if (invoice.paymentMethod) {
                setPayments([
                  {
                    method: invoice.paymentMethod,
                    amount: invoice.paidAmount || invoice.amount,
                  },
                ]);
                setPaymentMethod(invoice.paymentMethod);
              }

              let loadedCartMap = new Map();

              if (invoice.appointment && invoice.appointment.services) {
                let deptName = "";
                if (invoice.appointment.departmentId) {
                  const foundDept = fetchedDepts.find(
                    (d) =>
                      d._id?.toString() ===
                      invoice.appointment.departmentId?.toString(),
                  );
                  if (foundDept) deptName = foundDept.name;
                }
                if (!deptName && fetchedDepts.length > 0) {
                  deptName = fetchedDepts[0].name;
                }
                if (deptName) setActiveDept(deptName);

                invoice.appointment.services.forEach((s, index) => {
                  const sId =
                    typeof s === "object"
                      ? s.serviceId?._id || s.serviceId || s._id
                      : s;
                  const variantId =
                    typeof s === "object"
                      ? s.variantId?._id || s.variantId || "base"
                      : "base";
                  const fullService = fetchedServices.find(
                    (fs) => fs._id === sId,
                  );

                  let price =
                    typeof s === "object" && s.price
                      ? s.price
                      : fullService?.price || 0;

                  if (!(typeof s === "object" && s.price) && deptName && fullService?.pricing?.length > 0) {
                    const po = fullService.pricing.find(
                      (p) => p.department?.name === deptName,
                    );
                    if (po && po.price != null) price = po.price;
                    else if (fullService.price != null)
                      price = fullService.price;
                  }

                  // Attempt to match with invoice.items to get correct quantity and staff
                  const invItem = invoice.items && invoice.items[index];
                  const isServiceMatch = invItem && !invItem.product; // Services don't have a product field
                  
                  let itemQty = 1;
                  if (isServiceMatch && invItem.quantity) {
                      itemQty = invItem.quantity;
                  } else if (typeof s === "object" && s.quantity) {
                      itemQty = s.quantity;
                  }
                  
                  // Standardized Variant Key (must match addServiceToCart)
                  const baseVariantKey = `svc-${sId}-${variantId}-${price}-${deptName}`;
                  // Make it unique by appending index, so separate entries don't merge incorrectly!
                  const variantKey = `${baseVariantKey}-loaded-${index}`;

                  if (loadedCartMap.has(variantKey)) {
                    loadedCartMap.get(variantKey).qty += itemQty;
                  } else {
                    const variantData = fullService?.variants?.find(
                      (v) =>
                        (v._id || v.variantId?._id || v.variantId) ===
                        variantId,
                    );

                    loadedCartMap.set(variantKey, {
                      ...(fullService || s),
                      _id: sId,
                      price: price,
                      qty: itemQty,
                      variantKey: variantKey,
                      variantId: variantId,
                      variantName:
                        s.variantName ||
                        variantData?.variantId?.name ||
                        variantData?.name ||
                        "",
                      deptName: deptName,
                      itemType: "service",
                      taxName:
                        variantData?.taxId?.name ||
                        fullService?.taxId?.name ||
                        "",
                      taxPercentage:
                        variantData?.taxId?.percentage ??
                        fullService?.taxId?.percentage ??
                        0,
                      isTaxInclusive:
                        variantData?.isTaxInclusive ??
                        fullService?.isTaxInclusive ??
                        false,
                    });
                    
                    // Recover staffId
                    let recoveredStaffId = typeof s === "object" ? (s.staffId?._id || s.staffId) : null;
                    
                    if (!recoveredStaffId && isServiceMatch && invItem.staffId) {
                       recoveredStaffId = invItem.staffId?._id || invItem.staffId;
                    }

                    loadedCartMap.get(variantKey).staffId = recoveredStaffId || invoice.staff?._id || invoice.staff || "admin";
                  }
                });
              }

              if (invoice.items && invoice.items.length > 0) {
                invoice.items.forEach((pi) => {
                  const pId = pi.product?._id || pi.product;
                  const itemType = pi.itemType || (pId ? "product" : "service");

                  // Skip services if already loaded via appointment (to prevent duplication)
                  if (
                    itemType === "service" &&
                    invoice.appointment?.services?.length > 0
                  )
                    return;

                  const variantId = pi.variantId?._id || pi.variantId || "base";
                  const fullProduct =
                    products.find((p) => p._id === pId) || pi.product || {};

                  // Standardized Variant Key (must match addProductToCart)
                  const variantKey =
                    itemType === "service"
                      ? `svc-${pId || pi._id}-${variantId}-${pi.price}-${activeDept}`
                      : `prod-${pId}-${variantId}-${pi.price}`;

                  if (loadedCartMap.has(variantKey)) {
                    loadedCartMap.get(variantKey).qty += pi.quantity;
                  } else {
                    const variantData = fullProduct?.variants?.find(
                      (v) =>
                        (v._id || v.variantId?._id || v.variantId) ===
                        variantId,
                    );

                    loadedCartMap.set(variantKey, {
                      ...fullProduct,
                      _id: pId || pi._id,
                      name:
                        pi.productName || fullProduct.name || "Unknown Product",
                      price: pi.price,
                      qty: pi.quantity,
                      variantKey: variantKey,
                      variantId: variantId,
                      variantName:
                        pi.variantName ||
                        variantData?.variantId?.name ||
                        variantData?.name ||
                        "",
                      itemType: itemType,
                      taxName:
                        pi.taxName ||
                        variantData?.taxId?.name ||
                        fullProduct.taxId?.name ||
                        "",
                      taxPercent:
                        pi.taxPercent ??
                        variantData?.taxId?.percentage ??
                        fullProduct.taxId?.percentage ??
                        0,
                      taxPercentage:
                        pi.taxPercent ??
                        variantData?.taxId?.percentage ??
                        fullProduct.taxId?.percentage ??
                        0,
                      isTaxInclusive:
                        pi.isTaxInclusive ??
                        variantData?.isTaxInclusive ??
                        fullProduct.isTaxInclusive ??
                        false,
                      staffId: (pi.staffId?._id || pi.staffId) || invoice.staff?._id || invoice.staff || "admin",
                    });
                  }
                });
              }
              setCart(Array.from(loadedCartMap.values()));
            }
          } catch (err) {
            console.error("Failed to load invoice for editing", err);
            showSnack("Load Error", "Failed to load invoice details", "error");
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceMetadata]);

  // Ensure RAZORPAY is injected into paymentMethods if enabled (even if meta loaded first)
  useEffect(() => {
    if (integrationStatusObj?.data?.isRazorpayEnabled) {
      setPaymentMethods((prev) => {
        if (!prev.some((p) => String(p.name).toUpperCase() === "RAZORPAY")) {
          return [...prev, { name: "RAZORPAY" }];
        }
        return prev;
      });
    }
  }, [integrationStatusObj?.data?.isRazorpayEnabled, paymentMethods]);

  const filteredStaff = useMemo(() => {
    let list = staff;
    if (selectedShopId) {
      list = list.filter((s) => {
        if (!s.branchId) return true;
        const bid = s.branchId?._id || s.branchId;
        return String(bid) === String(selectedShopId);
      });
    }
    
    // Restrict staff list for non-admin users to only show themselves
    if (user && user.role !== "SHOP_ADMIN" && user.role !== "SUPER_ADMIN") {
      list = list.filter((s) => String(s._id) === String(user._id));
    }
    
    return list;
  }, [staff, selectedShopId, user]);

  // Reset staff selection if branch changes and current staff is not in the new branch
  useEffect(() => {
    if (user && user.role !== "SHOP_ADMIN" && user.role !== "SUPER_ADMIN" && filteredStaff.length > 0) {
      // If staff is logged in, force the global staff selection to themselves
      if (String(selectedStaffId) !== String(user._id)) {
        setSelectedStaffId(user._id);
      }
    } else if (filteredStaff.length > 0) {
      const isAvailable = filteredStaff.some((s) => s._id === selectedStaffId);
      if (!isAvailable || selectedStaffId === "admin") {
        setSelectedStaffId(filteredStaff[0]._id);
      }
    }
  }, [selectedShopId, filteredStaff, selectedStaffId, user, setSelectedStaffId]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      if (!service.isActive) return false;

      // Restrict services by branch
      const branchToFilter = isAdmin
        ? selectedShopId
        : user?.branchId?._id || user?.branchId;
      if (branchToFilter) {
        const hasBranchAccess =
          !service.branches ||
          service.branches.length === 0 ||
          service.branches.some(
            (b) => (b._id || b).toString() === String(branchToFilter),
          );
        if (!hasBranchAccess) return false;
      }

      if (
        searchQuery &&
        !service.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (showOnlyFavourites && !service.isFavourite) return false;
      if (activeDept) {
        const hasTopLevelPricing = service.pricing?.some(
          (p) =>
            p.department?.name === activeDept &&
            p.price != null &&
            p.price !== "",
        );
        const hasVariantPricing =
          service.useVariants &&
          service.variants?.some((v) =>
            v.pricing?.some((p) => {
              const dName =
                p.department?.name ||
                departments.find(
                  (d) => d._id === (p.department?._id || p.department),
                )?.name;
              return dName === activeDept && p.price != null && p.price !== "";
            }),
          );

        if (!hasTopLevelPricing && !hasVariantPricing) return false;
      }
      if (activeSvcCat && activeSvcCat !== "" && activeSvcCat !== "ALL") {
        if (!service.categories?.some((c) => c.name === activeSvcCat))
          return false;
      }
      return true;
    });
  }, [
    services,
    activeDept,
    activeSvcCat,
    searchQuery,
    showOnlyFavourites,
    isAdmin,
    selectedShopId,
    departments,
    user,
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (product.isActive === false) return false;

      // Restrict products by branch
      const branchToFilter = isAdmin
        ? selectedShopId
        : user?.branchId?._id || user?.branchId;
      if (branchToFilter) {
        const hasBranchAccess =
          !product.branches ||
          product.branches.length === 0 ||
          product.branches.some(
            (b) => (b._id || b).toString() === String(branchToFilter),
          );
        if (!hasBranchAccess) return false;
      }

      if (
        searchQuery &&
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (showOnlyProductFavourites && !product.isFavourite) return false;
      const prodCatName = product.category?.name || (typeof product.category === 'string' ? product.category : "");
      if (activeProdCat && activeProdCat !== "" && activeProdCat !== "ALL" && prodCatName !== activeProdCat)
        return false;
      if (product.isSale === false) return false;
      return true;
    });
  }, [products, activeProdCat, searchQuery, showOnlyProductFavourites, isAdmin, selectedShopId, user]);

  const getServicePrice = (service) => {
    if (!service) return 0;

    let basePrice = 0;
    let matchingVariant = null;

    if (activeDept) {
      const topLevelPo = service.pricing?.find(
        (p) => p.department?.name === activeDept,
      );
      if (topLevelPo && topLevelPo.price != null && topLevelPo.price !== "") {
        basePrice = topLevelPo.price;
      } else if (service.useVariants && service.variants?.length > 0) {
        matchingVariant = service.variants[0];
        const vp = matchingVariant.pricing?.find((p) => {
          const dName =
            p.department?.name ||
            departments.find(
              (d) => d._id === (p.department?._id || p.department),
            )?.name;
          return dName === activeDept;
        });
        if (vp && vp.price != null && vp.price !== "") {
          basePrice = vp.price;
        } else {
          basePrice = matchingVariant.price || matchingVariant.pricing?.[0]?.price || 0;
        }
      }
    } else {
      basePrice = service.price || 0;
      if (service.useVariants && service.variants?.length > 0) {
        matchingVariant = service.variants[0];
        basePrice = matchingVariant.price || matchingVariant.pricing?.[0]?.price || 0;
      }
    }



    return basePrice;
  };

  const filteredCustomers = useMemo(() => {
    const rawSearch = (customerSearch || "").trim();
    if (!rawSearch) return customers;
    const lower = rawSearch.toLowerCase();
    const cleanSearchPhone = rawSearch.replace(/[\s-]/g, "");

    return customers.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").replace(/[\s-]/g, "");
      const email = (c.email || "").toLowerCase();

      return (
        name.includes(lower) ||
        (cleanSearchPhone && phone.includes(cleanSearchPhone)) ||
        email.includes(lower)
      );
    });
  }, [customers, customerSearch]);

  // Dynamic server search fallback for customers if typing and not found in memory
  useEffect(() => {
    const term = (customerSearch || "").trim();
    if (term.length < 2) return;

    const lowerTerm = term.toLowerCase();
    const cleanTerm = term.replace(/[\s-]/g, "");
    const hasLocalMatch = customers.some((c) => {
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").replace(/[\s-]/g, "");
      return name.includes(lowerTerm) || (cleanTerm && phone.includes(cleanTerm));
    });

    if (!hasLocalMatch) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/admin/customers?search=${encodeURIComponent(term)}`);
          if (res?.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
            setCustomers((prev) => {
              const toAdd = res.data.data.filter((nc) => !prev.some((p) => p._id === nc._id));
              return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
            });
          }
        } catch {
          // ignore background search error
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [customerSearch, customers]);

  // --- Cart Calculations (handles both service and product tax models) ---
  const cartCalc = useMemo(() => {
    const result = calculateCartTotals({
      items: cart,
      discount: 0, // Item-level discounts only
      settings: shopSettings
    });

    return {
      subtotal: result.subtotal,
      totalTax: result.totalTax,
      totalItemDiscount: result.totalItemDiscount,
      totalCommission: 0, // Will calculate separately
      hasInclusiveTax: cart.some(item => item.isTaxInclusive)
    };
  }, [cart, shopSettings]);

  // Calculate cart total with precision
  const cartTotal = applyPrecision(
    cartCalc.subtotal + cartCalc.totalTax - cartCalc.totalItemDiscount,
    shopSettings
  );

  // Calculate final total with discount and round-off
  const finalTotalCalc = useMemo(() => {
    const beforeDiscount = cartTotal;
    const afterDiscount = applyPrecision(
      Math.max(0, beforeDiscount - (Number(discount) || 0)),
      shopSettings
    );

    // Apply round-off if enabled using the helper function
    const { finalAmount, roundOffAmount } = applyRoundOff(afterDiscount, shopSettings);

    return { finalTotal: finalAmount, roundOffAmount };
  }, [cartTotal, discount, shopSettings]);

  const finalTotal = finalTotalCalc.finalTotal;
  const roundOffAmount = finalTotalCalc.roundOffAmount;

  // --- Auto Apply Customer Group Discount ---
  const prevCustomerRef = useRef(null);

  useEffect(() => {
    const prevCustomer = prevCustomerRef.current;
    prevCustomerRef.current = selectedCustomer;

    if (selectedCustomer?.customerGroupId) {
      const group = selectedCustomer.customerGroupId;
      if (group.discountType === 'percentage') {
        // Calculate percentage from subtotal (or cartTotal, depending on policy. Subtotal is common)
        const val = (cartCalc.subtotal * (Number(group.discountValue) || 0)) / 100;
        setDiscount(val > 0 ? applyPrecision(val, shopSettings).toString() : "");
      } else if (group.discountType === 'amount') {
        const val = Number(group.discountValue) || 0;
        setDiscount(val > 0 ? val.toString() : "");
      }
    } else if (prevCustomer?.customerGroupId && !selectedCustomer?.customerGroupId) {
      // If we switched from a customer with a discount to one without (or cleared customer)
      setDiscount("");
    }
  }, [selectedCustomer, cartCalc.subtotal, shopSettings, setDiscount]);

  // --- Handlers ---
  const addServiceToCart = (service, price, variantData = null) => {
    if (service.useVariants && !variantData) {
      setItemForVariants({ ...service, itemType: "service" });
      setShowVariantModal(true);
      return;
    }

    setCart((prev) => {
      const variantId = variantData ? variantData._id : "base";
      const variantName = variantData ? variantData.name : "";
      const finalPrice = Number(price) || 0;
      const baseVariantKey = `svc-${service._id}-${variantId}-${finalPrice}-${activeDept}`;
      const duplicateItemAction = shopConfig?.duplicateItemAction || "unselect";

      const existingItems = prev.filter((item) => item.variantKey === baseVariantKey || item.variantKey.startsWith(`${baseVariantKey}-`));

      let targetVariantKey = baseVariantKey;

      if (existingItems.length > 0) {
        if (duplicateItemAction === "duplicate") {
          targetVariantKey = `${baseVariantKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        } else {
          return prev.filter((item) => item.variantKey !== baseVariantKey && !item.variantKey.startsWith(`${baseVariantKey}-`));
        }
      }

      const variantTaxId = variantData?.taxId?._id || variantData?.taxId;
      const variantTax = variantTaxId
        ? taxes.find((t) => t._id === variantTaxId) || variantData.taxId
        : null;

      const matchingPricing = variantData
        ? variantData.pricing?.find(
          (p) =>
            (p.department?.name ||
              taxes.find((d) => d._id === (p.department?._id || p.department))
                ?.name) === activeDept,
        )
        : service.pricing?.find((p) => p.department?.name === activeDept);

      const isDeptMatched = !!(
        matchingPricing &&
        matchingPricing.price != null &&
        matchingPricing.price !== ""
      );

      const basePrice = variantData
        ? (matchingPricing?.price || variantData.originalPrice || variantData.price || 0)
        : (matchingPricing?.price || service.originalPrice || service.price || 0);

      return [
        ...prev,
        {
          ...service,
          price: finalPrice,
          originalPrice: basePrice > finalPrice ? basePrice : finalPrice,
          qty: 1,
          discount: 0,
          staffId: selectedStaffId || "admin", // Add staff assignment
          variantKey: targetVariantKey,
          variantId,
          variantName,
          deptName: activeDept,
          isDeptMatched,
          itemType: "service",
          taxName:
            variantTax?.name ||
            variantData?.taxName ||
            service.taxId?.name ||
            service.taxName ||
            "",
          taxPercentage:
            variantTax?.percentage ??
            variantData?.taxPercentage ??
            variantData?.taxPercent ??
            service.taxId?.percentage ??
            service.taxPercentage ??
            0,
          isTaxInclusive:
            variantData?.isTaxInclusive !== undefined
              ? variantData.isTaxInclusive
              : service.isTaxInclusive || false,
        },
      ];
    });
    setShowVariantModal(false);
  };

  const addProductToCart = (product, price, variantData = null) => {
    if (product.useVariants && !variantData) {
      setItemForVariants({ ...product, itemType: "product" });
      setShowVariantModal(true);
      return;
    }

    const finalPrice = price !== undefined && price !== null
      ? Number(price)
      : (product.useVariants ? 0 : product.sellingPrice || 0);

    setCart((prev) => {
      const variantId = variantData
        ? variantData._id || variantData.variantId?._id || variantData.variantId
        : "base";
      const variantName = variantData
        ? variantData.name || variantData.variantId?.name || ""
        : "";
      const variantKey = `prod-${product._id}-${variantId}-${finalPrice}`;
      const existing = prev.find((item) => item.variantKey === variantKey);

      if (existing) {
        if (existing.qty + 1 > existing.currentStock) {
          showSnack(
            "Stock Limit",
            `Cannot add more than available stock (${existing.currentStock}).`,
            "warning",
          );
          return prev;
        }
        return prev.map((item) =>
          item.variantKey === variantKey
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          ...product,
          price: finalPrice || 0,
          originalPrice: variantData
            ? ((variantData.originalPrice || variantData.sellingPrice || 0) > finalPrice ? (variantData.originalPrice || variantData.sellingPrice || 0) : finalPrice)
            : ((product.originalPrice || product.sellingPrice || 0) > finalPrice ? (product.originalPrice || product.sellingPrice || 0) : finalPrice),
          qty: 1,
          discount: 0,
          staffId: selectedStaffId || "admin", // Add staff assignment
          variantKey,
          variantId,
          variantName,
          itemType: "product",
          taxName:
            variantData?.taxId?.name ||
            (variantData?.taxId
              ? taxes.find((t) => t._id === variantData.taxId)?.name
              : null) ||
            product.taxId?.name ||
            "",
          taxPercent:
            variantData?.taxId?.percentage ||
            variantData?.taxPercentage ||
            variantData?.taxPercent ||
            product.taxId?.percentage ||
            product.taxPercent ||
            0,
          taxPercentage:
            variantData?.taxId?.percentage ||
            variantData?.taxPercentage ||
            variantData?.taxPercent ||
            product.taxId?.percentage ||
            product.taxPercent ||
            0,
          isTaxInclusive:
            variantData?.isTaxInclusive !== undefined
              ? variantData.isTaxInclusive
              : product.isTaxInclusive || false,
          currentStock: (() => {
            const dataSource = variantData || product;
            if (!selectedShopId || !dataSource.branchStock)
              return dataSource.currentStock || 0;
            const bInfo = dataSource.branchStock.find(
              (b) =>
                String(b.branchId?._id || b.branchId) ===
                String(selectedShopId),
            );
            return bInfo ? bInfo.currentStock : 0;
          })(),
        },
      ];
    });
    setShowVariantModal(false);
  };

  // Stable callback refs for service/product grid — prevents ServiceCard/ProductCard re-renders
  const addServiceRef = useRef(addServiceToCart);
  addServiceRef.current = addServiceToCart;
  const stableAddService = useCallback((...args) => addServiceRef.current(...args), []);

  const addProductRef = useRef(addProductToCart);
  addProductRef.current = addProductToCart;
  const stableAddProduct = useCallback((...args) => addProductRef.current(...args), []);

  const updateQty = useCallback((variantKey, delta) => {
    reduxDispatch((dispatch, getState) => {
      const currentCart = getState().invoice.cart;
      const newCart = currentCart
        .map((item) => {
          if (item.variantKey === variantKey) {
            const newQty = item.qty + delta;
            if (item.itemType === "product" && newQty > item.currentStock) {
              showSnack(
                `Only ${item.currentStock} available in stock.`,
                "warning",
              );
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
      dispatch(reduxSetCart(newCart));
    });
  }, [reduxDispatch, showSnack]);

  const removeFromCart = useCallback((variantKey) => {
    reduxDispatch((dispatch, getState) => {
      const currentCart = getState().invoice.cart;
      dispatch(reduxSetCart(currentCart.filter((item) => item.variantKey !== variantKey)));
    });
  }, [reduxDispatch]);

  const handleClearCart = useCallback(() => {
    setShowClearCartModal(true);
  }, []);

  const confirmClearCart = useCallback(() => {
    setCart([]);
    reduxDispatch(reduxSetDiscount(""));
    reduxDispatch(reduxSetPayments([{ method: paymentMethods[0]?.name || "CASH", amount: "" }]));
    setStaffCommissions({});
    setCommissionType({});
    setSelectedCustomer(null);
    setSelectedStaffId("admin");
    setShowClearCartModal(false);
  }, [setCart, reduxDispatch, paymentMethods, setSelectedCustomer, setSelectedStaffId]);

  const handleToggleProductFavourite = async (product) => {
    // Optimistic update FIRST — instant UI response
    const newFavState = !product.isFavourite;
    setProducts((prev) =>
      prev.map((p) =>
        p._id === product._id ? { ...p, isFavourite: newFavState } : p
      )
    );
    if (metadataCache?.products) {
      metadataCache.products = metadataCache.products.map((p) =>
        p._id === product._id ? { ...p, isFavourite: newFavState } : p
      );
    }

    try {
      await toggleProductFavourite(product._id).unwrap();
    } catch (err) {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) =>
          p._id === product._id ? { ...p, isFavourite: product.isFavourite } : p
        )
      );
      if (metadataCache?.products) {
        metadataCache.products = metadataCache.products.map((p) =>
          p._id === product._id ? { ...p, isFavourite: product.isFavourite } : p
        );
      }
      showSnack(
        err?.data?.message || err?.error || "Failed to update favourite status",
        "error"
      );
    }
  };

  const updateItemDiscount = useCallback((variantKey, value) => {
    reduxDispatch((dispatch, getState) => {
      const currentCart = getState().invoice.cart;
      dispatch(reduxSetCart(
        currentCart.map((item) =>
          item.variantKey === variantKey
            ? { ...item, discount: value === "" ? 0 : Math.max(0, Number(value)) }
            : item,
        )
      ));
    });
  }, [reduxDispatch]);

  const updateItemPrice = useCallback((variantKey, newPrice) => {
    reduxDispatch((dispatch, getState) => {
      const currentCart = getState().invoice.cart;
      dispatch(reduxSetCart(
        currentCart.map((item) => {
          if (item.variantKey === variantKey) {
            const parsedPrice = newPrice === "" ? 0 : Math.max(0, Number(newPrice));
            let newOriginalPrice = parsedPrice;
            
            // Maintain offer percentage if it existed
            if (item.originalPrice && item.originalPrice > item.price && item.price > 0) {
              const offerRatio = item.price / item.originalPrice;
              newOriginalPrice = parsedPrice / offerRatio;
            } else if (item.originalPrice && item.originalPrice > item.price && item.price === 0) {
               // Edge case where old price was 0
               newOriginalPrice = parsedPrice;
            }

            return { ...item, price: parsedPrice, originalPrice: newOriginalPrice };
          }
          return item;
        })
      ));
    });
  }, [reduxDispatch]);

  const updateItemStaff = useCallback((variantKey, staffId) => {
    reduxDispatch((dispatch, getState) => {
      const currentCart = getState().invoice.cart;
      dispatch(reduxSetCart(
        currentCart.map((item) =>
          item.variantKey === variantKey
            ? { ...item, staffId: staffId || null }
            : item,
        )
      ));
    });
  }, [reduxDispatch]);

  const handleAddPaymentRow = () => {
    const remaining =
      finalTotal -
      payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    setPayments([
      ...payments,
      {
        method: paymentMethods[0]?.name || "CASH",
        amount: remaining > 0 ? remaining : "",
      },
    ]);
  };

  const handleRemovePaymentRow = (index) =>
    setPayments(payments.filter((_, i) => i !== index));

  const handleUpdatePayment = (index, field, value) => {
    setPayments((prev) => {
      const np = [...prev];
      np[index] = { ...np[index], [field]: value };
      if (field === "method" && String(value).toUpperCase() === "DUE") {
        np[index].amount = 0;
      }
      if (field === "amount" && np.length > 1) {
        const uv = Number(value) || 0;
        if (np.length === 2) {
          const oi = index === 0 ? 1 : 0;
          np[oi] = { ...np[oi], amount: Math.max(0, finalTotal - uv) || "" };
        } else {
          const ti = index === np.length - 1 ? np.length - 2 : np.length - 1;
          const to = np.reduce(
            (s, p, i) =>
              i === ti || i === index ? s : s + (Number(p.amount) || 0),
            0,
          );
          np[ti] = {
            ...np[ti],
            amount: Math.max(0, finalTotal - to - uv) || "",
          };
        }
      }
      return np;
    });
  };

  const remainingAmount = useMemo(() => {
    const paid = payments.reduce((sum, p) => sum + (String(p.method).toUpperCase() === "DUE" ? 0 : (Number(p.amount) || 0)), 0);
    return finalTotal - paid;
  }, [payments, finalTotal]);

  useEffect(() => {
    if (finalTotal >= 0) {
      setPayments((prev) => {
        if (!prev || prev.length === 0)
          return [
            { method: paymentMethods[0]?.name || "CASH", amount: finalTotal },
          ];

        // If editing and exactly one payment row exists, forcefully sync it with the new finalTotal
        // This prevents the "overpaid" issue when a discount is applied during edit
        if (prev.length === 1) {
          return [{ ...prev[0], amount: finalTotal }];
        }

        const ctp = prev.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        if (ctp > finalTotal) {
          const np = [...prev];
          let diff = ctp - finalTotal;

          // Reduce from the bottom up
          for (let i = np.length - 1; i >= 0 && diff > 0; i--) {
            const amt = Number(np[i].amount) || 0;
            if (amt > 0) {
              const reduceBy = Math.min(amt, diff);
              np[i] = { ...np[i], amount: Math.max(0, amt - reduceBy) };
              diff -= reduceBy;
            }
          }
          return np;
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalTotal, paymentMethods]);

  const handleCustomerSelect = (cust) => {
    setSelectedCustomer(cust);
    setCustomerSearch("");
    setShowCustomerResults(false);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", newCustData.name);
      formData.append("phone", newCustData.phone);
      if (newCustData.email) formData.append("email", newCustData.email);
      const res = await createCustomerMut(formData).unwrap();
      if (res?.success) {
        const nc = res.data;
        setCustomers((prev) => {
          if (!prev.some((c) => c._id === nc._id)) {
            return [nc, ...prev];
          }
          return prev;
        });
        setSelectedCustomer(nc);
        setIsCustModalOpen(false);
        setCustomerSearch("");
        setShowCustomerResults(false);
        setNewCustData({ name: "", phone: "", email: "" });
        showSnack("Success", "Customer Created & Selected", "success");
      }
    } catch (err) {
      const existing = err?.data?.data;
      if (existing) {
        // Customer already exists in the system -> automatically select them
        setCustomers((prev) => {
          if (!prev.some((c) => c._id === existing._id)) {
            return [existing, ...prev];
          }
          return prev;
        });
        setSelectedCustomer(existing);
        setIsCustModalOpen(false);
        setCustomerSearch("");
        setShowCustomerResults(false);
        setNewCustData({ name: "", phone: "", email: "" });
        showSnack("Success", `Customer "${existing.name}" found & selected`, "success");
        return;
      }
      const msg =
        err?.data?.message ||
        err?.error?.data?.message ||
        err?.message ||
        "Failed to create customer";
      showSnack("Error", msg, "error");
    }
  };

  const handleBookAppointment = async () => {
    const serviceItems = cart.filter((i) => i.itemType === "service");
    const productItems = cart.filter((i) => i.itemType === "product");

    if (serviceItems.length === 0 && productItems.length === 0)
      return showSnack(
        "Please add services or products to the cart for booking.",
        "warning",
      );

    try {
      setLoading(true);

      let serviceItemsPayload = [];
      serviceItems.forEach((item) => {
        serviceItemsPayload.push({
          serviceId: item._id,
          variantId: item.variantId !== "base" ? item.variantId : undefined,
          variantName: item.variantName || "",
          price: item.price,
          qty: item.qty,
          discount: item.qty > 0 ? applyPrecision((Number(item.discount) || 0) / item.qty, shopSettings) : 0,
          taxName: item.taxName || "",
          taxPercentage: item.taxPercentage || 0,
          isTaxInclusive: item.isTaxInclusive || false,
          hsnCode: item.hsnCode || "",
          staffId: item.staffId && item.staffId !== "admin" ? item.staffId : null,
        });
      });

      if (serviceItems.length > 0 && !bookingData.time) {
        return showSnack("Validation", "Please select a time for the service appointment", "warning");
      }

      // For service bookings, send the selected slot; for product-only, send empty array
      const slotTimes = serviceItems.length > 0 ? [bookingData.time] : [];

      const shop =
        selectedShopId || (branches.length === 1 ? branches[0]._id : null);

      const dominantDeptName = serviceItems[0]?.deptName || activeDept;
      const deptId = departments.find((d) => d.name === dominantDeptName)?._id;

      const payload = {
        shopId: shop,
        branchId: shop,
        departmentId: deptId,
        services: serviceItemsPayload,
        date: bookingData.date,
        slotTimes,
        customerId: selectedCustomer ? selectedCustomer._id : null,
        customerDetails: selectedCustomer
          ? {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            email: selectedCustomer.email,
          }
          : null,
        staffId: selectedStaffId === "admin" ? null : selectedStaffId,
        isDirectInvoice: false,
        items: productItems.map((p) => ({
          product: p._id,
          variantId: p.variantId !== "base" ? p.variantId : undefined,
          variantName: p.variantName || "",
          quantity: p.qty,
          price: p.price,
          discount: Number(p.discount) || 0,
          taxPercent: p.taxPercent || p.taxPercentage || 0,
          taxPercentage: p.taxPercentage || p.taxPercent || 0,
          taxName: p.taxName || `Tax ${p.taxPercent || p.taxPercentage || 0}%`,
          isTaxInclusive: p.isTaxInclusive || false,
          staffId: p.staffId && p.staffId !== "admin" ? p.staffId : null,
        })),
      };

      const res = await createApptMut(payload).unwrap();
      if (res?.success) {
        // Only relying on global socket "new-booking" alert now
        setIsBookingModalOpen(false);
        setCart([]); // Clear cart
      }
    } catch (err) {
      console.error("Booking error:", err);
      const msg =
        err?.data?.message ||
        err?.error?.data?.message ||
        err?.message ||
        "Failed to book appointment";
      showSnack("Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };


  //============================= CHECKOUT FUNCTION START 

  const handleCheckout = async () => {
    if (cart.length === 0) return showSnack("Cart Empty", "Cart is empty.", "warning");

    const walletPayment = payments.find((p) => p.method === "WALLET");
    // Wallet Payment Logic - No longer blocking, just ensuring customer is selected
    if (walletPayment && Number(walletPayment.amount) > 0) {
      if (!selectedCustomer)
        return showSnack(
          "Customer must be selected for Wallet payment.",
          "warning",
        );
    }

    const shop =
      selectedShopId || (branches.length === 1 ? branches[0]._id : null);
    const serviceItems = cart.filter((i) => i.itemType === "service");
    const productItems = cart.filter((i) => i.itemType === "product");

    try {
      setLoading(true);

      let serviceItemsPayload = [];
      let slotTimes = [];
      let bookingId = null;

      // Check if any cart item is from a booking (works for both services and products)
      if (!isEditing) {
        const bookingItem = cart.find((item) => item.fromBookingId);
        if (bookingItem) {
          bookingId = bookingItem.fromBookingId;
        }
      }

      if (serviceItems.length > 0) {
        serviceItems.forEach((item) => {
          serviceItemsPayload.push({
            serviceId: item._id,
            variantId: item.variantId !== "base" ? item.variantId : undefined,
            price: item.price,
            qty: item.qty,
            discount: item.qty > 0 ? applyPrecision((Number(item.discount) || 0) / item.qty, shopSettings) : 0,
            variantName: item.variantName || null,
            taxName: item.taxName || "",
            taxPercentage: item.taxPercentage || 0,
            isTaxInclusive: item.isTaxInclusive || false,
            hsnCode: item.hsnCode || "",
            amount: item.isTaxInclusive
              ? (item.price - (applyPrecision((Number(item.discount) || 0) / item.qty, shopSettings)))
              : (item.price - (applyPrecision((Number(item.discount) || 0) / item.qty, shopSettings))) +
              ((item.price - (applyPrecision((Number(item.discount) || 0) / item.qty, shopSettings))) * ((item.taxPercentage || 0) / 100)),
            staffId: item.staffId && item.staffId !== "admin" ? item.staffId : null, // Per-item staff assignment
          });
        });
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        slotTimes = serviceItemsPayload.map(() => timeString);
      }

      const serviceItemsForInvoice = serviceItems.map((item) => ({
        serviceId: item._id,
        variantId: item.variantId !== "base" ? item.variantId : undefined,
        productName: item.variantName && item.variantId !== "base" ? `${item.name} - ${item.variantName}` : item.name,
        variantName: item.variantName || null,
        quantity: item.qty,
        price: item.price,
        discount: Number(item.discount) || 0,
        taxPercent: item.taxPercent || item.taxPercentage || 0,
        taxPercentage: item.taxPercentage || item.taxPercent || 0,
        taxAmount: item.isTaxInclusive
          ? (item.price * item.qty) - ((item.price * item.qty) / (1 + (item.taxPercent || item.taxPercentage || 0) / 100))
          : ((item.price * item.qty) - (Number(item.discount) || 0)) * ((item.taxPercent || item.taxPercentage || 0) / 100),
        amount: item.isTaxInclusive
          ? (item.price * item.qty - (Number(item.discount) || 0))
          : (item.price * item.qty - (Number(item.discount) || 0)) +
          ((item.price * item.qty - (Number(item.discount) || 0)) * ((item.taxPercent || item.taxPercentage || 0) / 100)),
        itemType: "service",
        taxName: item.taxName || "",
        isTaxInclusive: item.isTaxInclusive || false,
        hsnCode: item.hsnCode || "",
        staffId: item.staffId && item.staffId !== "admin" ? item.staffId : null,
      }));

      const items = productItems.map((item) => ({
        product: item._id,
        variantId: item.variantId !== "base" ? item.variantId : undefined,
        productName: item.variantName && item.variantId !== "base" ? `${item.name} - ${item.variantName}` : item.name,
        variantName: item.variantName,
        quantity: item.qty,
        price: item.price,
        discount: Number(item.discount) || 0,
        taxPercent: item.taxPercent || item.taxPercentage || 0,
        taxPercentage: item.taxPercentage || item.taxPercent || 0,
        taxAmount:
          (item.price * item.qty - (Number(item.discount) || 0)) *
          ((item.taxPercent || item.taxPercentage || 0) / 100),
        amount: item.isTaxInclusive
          ? (item.price * item.qty - (Number(item.discount) || 0))
          : (item.price * item.qty - (Number(item.discount) || 0)) +
          ((item.price * item.qty - (Number(item.discount) || 0)) * ((item.taxPercent || item.taxPercentage || 0) / 100)),
        itemType: "product",
        taxName:
          item.taxName || `Tax ${item.taxPercent || item.taxPercentage || 0}%`,
        isTaxInclusive: item.isTaxInclusive || false,
        hsnCode: item.hsnCode || "",
        staffId: item.staffId && item.staffId !== "admin" ? item.staffId : null,
      }));

      // For invoice updates, we must send BOTH services and products in the items array 
      // so they are all correctly saved in invoice.items on the backend.
      const combinedItemsForUpdate = [...serviceItemsForInvoice, ...items];

      const dominantDeptName = serviceItems[0]?.deptName || activeDept;
      const deptId = departments.find((d) => d.name === dominantDeptName)?._id;

      // Prepare staff commissions data
      const staffCommissionsData = [];
      const staffTotalsMap = new Map();

      // Calculate total per staff from cart
      cart.forEach((item) => {
        if (item.staffId && item.staffId !== "admin") {
          const basePrice = item.price * item.qty;
          const itemDisc = Number(item.discount) || 0;
          const subtotal = basePrice - itemDisc;
          let taxAmount = 0;
          if ((item.taxPercent || item.taxPercentage) > 0 && !item.isTaxInclusive) {
            taxAmount = (subtotal * (item.taxPercent || item.taxPercentage)) / 100;
          }
          const itemTotal = subtotal + taxAmount;

          if (!staffTotalsMap.has(item.staffId)) {
            staffTotalsMap.set(item.staffId, 0);
          }
          staffTotalsMap.set(item.staffId, staffTotalsMap.get(item.staffId) + itemTotal);
        }
      });

      // Build commission data array
      staffTotalsMap.forEach((staffTotal, staffId) => {
        if (staffCommissions[staffId]) {
          const type = commissionType[staffId] || 'percentage';
          const commValue = Number(staffCommissions[staffId]) || 0;
          let calculatedCommission = 0;

          if (type === 'amount') {
            calculatedCommission = commValue;
          } else {
            calculatedCommission = staffTotal * (commValue / 100);
          }

          staffCommissionsData.push({
            staffId: staffId,
            staffName: filteredStaff.find((s) => s._id === staffId)?.name || "",
            commissionType: type,
            commissionValue: commValue,
            commissionAmount: applyPrecision(calculatedCommission, shopSettings),
            salesAmount: applyPrecision(staffTotal, shopSettings),
          });
        }
      });

      const payload = {
        shopId: shop,
        branchId: shop,
        departmentId: deptId,
        services: serviceItemsPayload,
        items: items,
        date: invoiceDate || moment().format("YYYY-MM-DD"),
        slotTimes,
        customerId: selectedCustomer ? selectedCustomer._id : null,
        customerDetails: selectedCustomer
          ? {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            email: selectedCustomer.email,
          }
          : {
            name: newCustData.name || "LOCAL CUSTOMER",
            phone: newCustData.phone || "0000000000",
            email: newCustData.email || "",
          },
        paymentMethod: (() => {
          let methods = payments.filter(p => p.amount > 0).map(p => p.method);
          if (remainingAmount > 0) methods.push("DUE");
          if (remainingAmount < 0) methods.push("WALLET");
          return methods.length > 0 ? methods.join(", ") : (paymentMethod || "CASH");
        })(),
        payments: payments,
        discount: Number(discount) || 0,
        finalAmount: finalTotal,
        taxAmount: cartCalc.totalTax,
        isDirectInvoice: true,
        staffId:
          (isAdmin || isStaff) && selectedStaffId !== "admin" ? selectedStaffId : null,
        amount: cartCalc.subtotal,
        roundOffAmount: roundOffAmount,
        staffCommissions: staffCommissionsData.length > 0 ? staffCommissionsData : undefined,
        invoiceDate: (() => {
          if (!invoiceDate) return undefined;
          const todayStr = moment().format("YYYY-MM-DD");
          return invoiceDate === todayStr 
            ? moment().toISOString() 
            : moment(invoiceDate).endOf('day').toISOString();
        })(),
      };






      const executeCheckout = async (razorpayPaymentId = null) => {
        let finalPayload = { ...payload };
        if (razorpayPaymentId) {
          finalPayload.razorpayPaymentId = razorpayPaymentId;
        }

        let responseData = null;
        if (isEditing && editInvoiceId) {
          const res = await updateInvoiceMut({
            id: editInvoiceId,
            body: {
              ...finalPayload,
              items: combinedItemsForUpdate,
              services: serviceItemsPayload,
            },
          }).unwrap();
          responseData = res?.data || res;
        } else if (bookingId) {
          const res = await completeApptMut({
            id: bookingId,
            body: {
              paymentMethod: finalPayload.paymentMethod,
              payments,
              discount: Number(discount) || 0,
              taxAmount: finalPayload.taxAmount,
              finalAmount: finalTotal,
              staffId: finalPayload.staffId,
              invoiceDate: (() => {
                if (!invoiceDate) return moment().toISOString();
                const todayStr = moment().format("YYYY-MM-DD");
                return invoiceDate === todayStr 
                  ? moment().toISOString() 
                  : moment(invoiceDate).endOf('day').toISOString();
              })(),
              items,
              services: serviceItemsPayload,
              staffCommissions: staffCommissionsData.length > 0 ? staffCommissionsData : undefined,
              razorpayPaymentId,
            },
          }).unwrap();
          responseData = res?.data || res;
        } else {
          const res = await createApptMut(finalPayload).unwrap();
          responseData = res?.data || res;
        }
        return responseData;
      };



      const hasRazorpay = payments.some(p => String(p.method).toUpperCase() === "RAZORPAY");

      if (hasRazorpay && integrationStatusObj?.data?.isRazorpayEnabled) {
        // ... razorpay logic remains mostly the same, but we wait for executeCheckout
        const loadRazorpay = () => new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

        const scriptLoaded = await loadRazorpay();
        if (!scriptLoaded) {
          setLoading(false);
          return showSnack("Error", "Razorpay SDK failed to load", "error");
        }

        // Create Order
        const orderRes = await createRazorpayOrderMut({ amount: finalTotal }).unwrap();
        if (!orderRes.success) {
          setLoading(false);
          return showSnack("Error", "Failed to create Razorpay order", "error");
        }

        const { orderId, apiKey, amount, currency } = orderRes.data;

        const rzpOptions = {
          key: apiKey,
          amount: amount,
          currency: currency,
          name: shopSettings?.name || "Shop",
          description: "Invoice Payment",
          order_id: orderId,
          handler: async function (response) {
            try {
              setLoading(true);
              const responseData = await executeCheckout(response.razorpay_payment_id);
              handleCheckoutSuccess(responseData);
              refreshDataAfterCheckout(); // Refresh stock/meta after real backend sync
            } catch (err) {
              const msg = err?.data?.message || err?.message || "Checkout Failed after payment";
              showSnack("Error", msg, "error");
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: selectedCustomer?.name || newCustData.name || "",
            contact: selectedCustomer?.phone || newCustData.phone || "",
            email: selectedCustomer?.email || newCustData.email || "",
            method: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "upi_intent" : "upi_qr"
          },
          theme: {
            color: "#d97706" // Vijayajalakam brand orange
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };

        const rzp1 = new window.Razorpay(rzpOptions);
        rzp1.on("payment.failed", function (response) {
          showSnack("Error", response.error.description || "Payment failed", "error");
          setLoading(false);
        });
        rzp1.open();
        return; // Return and wait for handler
      }

      // Await actual API call instead of optimistic save to prevent mobile browsers blocking print dialog
      try {
        setLoading(true);
        const realData = await executeCheckout();
        
        handleCheckoutSuccess(realData);
        setLoading(false);

        // Refresh metadata and stock AFTER the backend has completed saving
        refreshDataAfterCheckout();
      } catch (err) {
        setLoading(false);
        const msg = err?.data?.message || err?.error?.data?.message || err?.message || "Checkout failed";
        showSnack("Checkout Error", msg, "error");
        console.error("Checkout failed:", err);
      }

      function refreshDataAfterCheckout() {
        // Refetch products to update stock (including variant stock)
        fetchProducts("").unwrap().then(prodList => {
          setProducts(prodList);
          if (metadataCache) metadataCache.products = prodList;
        }).catch(stockErr => {
          console.error("Could not refresh product stock.", stockErr);
        });

        // Refetch metadata for next invoice number and customer balances
        fetchMeta().unwrap().then(meta => {
          if (meta?.customers) {
            setCustomers(meta.customers);
            if (metadataCache) metadataCache.customers = meta.customers;
          }
          if (meta?.settings) {
            setShopSettings(meta.settings);
            if (metadataCache) metadataCache.settings = meta.settings;
          }
        }).catch(custErr => {
          console.error("Could not refresh metadata.", custErr);
        });
      }



      function handleCheckoutSuccess(responseData) {
        const invoiceObj = responseData?.invoice || responseData?.data?.invoice || responseData?.data || responseData;
        const invoiceNo =
          invoiceObj?.invoiceNumber ||
          responseData?.invoice?.invoiceNumber ||
          responseData?.invoiceNumber ||
          responseData?.data?.invoiceNumber ||
          (isEditing ? editInvoiceNumber : null) ||
          responseData?.appointmentNumber ||
          "N/A";

        const shopNameVal = selectedShopId
          ? branches.find((b) => b._id === selectedShopId)?.name
          : branches[0]?.name || user?.shopName || "Vijayajalakam";
        const selectedBranch = branches?.find((b) => b._id === selectedShopId);
        const fallbackShopLoc = user?.shop?.area ? `${user.shop.area}, ${user.shop.state}` : user?.shop?.address || "";
        const shopLocVal = selectedBranch
          ? (selectedBranch.mapAddress || selectedBranch.address || fallbackShopLoc)
          : fallbackShopLoc;
        const shopPhoneVal = selectedShopId
          ? branches.find((b) => b._id === selectedShopId)?.phone
          : user?.phone || "";

        // Build Google Maps URL from branch lat/lng or mapAddress
        let shopGoogleMapsUrl = "";
        if (selectedBranch?.latitude && selectedBranch?.longitude) {
          shopGoogleMapsUrl = `https://maps.google.com/?q=${selectedBranch.latitude},${selectedBranch.longitude}`;
        } else if (selectedBranch?.mapAddress) {
          shopGoogleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(selectedBranch.mapAddress)}`;
        }
        const sName =
          selectedStaffId === "admin"
            ? user?.name || "Owner"
            : staff.find((s) => s._id === selectedStaffId)?.name || "";

        const totalPaidNow = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        setSuccessData({
          amount: totalPaidNow > 0 ? totalPaidNow : (invoiceObj?.finalAmount || invoiceObj?.totalAmount || responseData?.finalAmount || finalTotal),
          invoiceNo,
          paymentMethod: payload.paymentMethod,
          paymentTime: invoiceDate
            ? moment()
                .set({
                  year: moment(invoiceDate).year(),
                  month: moment(invoiceDate).month(),
                  date: moment(invoiceDate).date(),
                })
                .toDate()
            : new Date(),
          receiptPayload: {
            appointmentId: responseData?.appointment?._id || bookingId,
            userId: selectedCustomer?._id,
            staffId: selectedStaffId,
            roundOffAmount,
            showRoundOffInReceipt:
              Boolean(shopSettings?.enableRoundOff) &&
              Math.abs(Number(roundOffAmount) || 0) > 0.001,
            items: cart.map((item) => ({
              product: item.itemType === "product" ? item._id : null,
              serviceId: item.itemType === "service" ? item._id : null,
              variantId:
                item.variantId && item.variantId !== "base"
                  ? item.variantId
                  : null,
              productName: item.name,
              quantity: item.qty,
              price: item.price,
              discount: Number(item.discount) || 0,
              amount: item.price * item.qty - (Number(item.discount) || 0),
              taxPercent:
                item.itemType === "service"
                  ? item.taxPercentage
                  : item.taxPercent,
              itemType: item.itemType,
              variantName: item.variantName || null,
              hsnCode: item.hsnCode || "",
              staffId: item.staffId,
              staffName: item.staffId === "admin" ? null : (filteredStaff?.find((s) => s._id === item.staffId)?.name || null),
            })),
            paymentMethod: payload.paymentMethod,
            payments: payments,
            subTotal: cartCalc.subtotal,
            finalTotal: finalTotal,
            taxAmount: cartCalc.totalTax,
            discount: Number(discount) || 0,
            customerName:
              selectedCustomer?.name ||
              (newCustData.name !== "LOCAL CUSTOMER" ? newCustData.name : ""),
            customerPhone:
              selectedCustomer?.phone ||
              (newCustData.phone !== "0000000000" ? newCustData.phone : ""),
            shopInfo: {
              name: shopNameVal,
              address: shopLocVal,
              phone: shopPhoneVal,
              gstin: user?.shop?.gstin || "",
              googleMapsUrl: shopGoogleMapsUrl,
            },
            staffName: sName,
            invoiceNumber: invoiceNo,
            invoiceDate: invoiceDate
              ? moment()
                  .set({
                    year: moment(invoiceDate).year(),
                    month: moment(invoiceDate).month(),
                    date: moment(invoiceDate).date(),
                  })
                  .toISOString()
              : new Date().toISOString(),
          },
        });

        try {
          successAudio.currentTime = 0; // Reset to start just in case
          successAudio.play().catch(e => console.log('Audio play failed:', e));
        } catch (err) {
          console.error("Audio playback error:", err);
        }

        // Clear the cart via Redux directly and immediately to reflect in UI
        reduxDispatch(reduxClearCart());
        setSelectedCustomer(null);
        reduxDispatch(reduxSetDiscount(""));
        reduxDispatch(reduxSetPayments([{ method: paymentMethods[0]?.name || "CASH", amount: "" }]));

        // Clear Edit Mode and Reset Date
        reduxDispatch(clearEditMode());
        setInvoiceDate(moment().format("YYYY-MM-DD"));

        // Remove all query parameters and hash to prevent reloading data on next render
        navigate(location.pathname, { replace: true });

        setShowSuccessPopup(true);

        // We no longer optimistically increment invoiceNextNumber here.
        // refreshDataAfterCheckout() fetches the latest exact next number from the backend.
      } // End of handleCheckoutSuccess
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.error?.data?.message ||
        err?.message ||
        "Checkout Failed";
      showSnack("Error", msg, "error");
      setLoading(false);
    }
  };


  //============================= CHECKOUT FUNCTION END

  // Shortcut: Enter to Save Invoice
  useKeyboardShortcut("Enter", () => {
    // Safety check: is checkout actually enabled?
    const isCheckoutDisabled =
      loading ||
      cart.length === 0 ||
      (remainingAmount !== 0 && !selectedCustomer) ||
      (!isAdmin && !isStaff && !hasPermission(isEditing ? "sales:invoices:edit" : "sales:invoices:add"));

    if (!isCheckoutDisabled) {
      handleCheckout();
    }
  }, {
    disabled:
      isCustModalOpen ||
      isCommissionModalOpen ||
      isBookingModalOpen ||
      showVariantModal
  });

  try {
    return (
      <div className="flex-1 min-h-0 h-full w-full flex flex-col md:flex-row gap-0 relative">
        {/* Snackbar */}
        <Snackbar
          title={snack.title}
          message={snack.message}
          type={snack.type}
          onClose={() => setSnack({ ...snack, message: "", title: "" })}
        />
        <PaymentSuccessPopup
          isOpen={showSuccessPopup}
          onClose={() => {
            setShowSuccessPopup(false);
            if (isEditing) {
              navigate(`/${shopSlug}/admin/reports/invoices`);
            } else if (location.state?.bookingId || location.state?.appointmentId) {
              let routePath = "staff"; // default
              if (user?.role === "SHOP_ADMIN") {
                routePath = "shop-admin";
              } else if (user?.role === "staff") {
                routePath = "staff";
              } else if (user?.role === "SUPER_ADMIN") {
                routePath = "super-admin";
              }
              navigate(`/${shopSlug}/${routePath}/bookings`);
            } else {
              navigate(location.pathname, { replace: true });
            }
          }}
          amount={successData?.amount}
          invoiceNo={successData?.invoiceNo}
          paymentMethod={successData?.paymentMethod}
          paymentTime={successData?.paymentTime}
          currencySymbol={currencySymbol}
          receiptPayload={successData?.receiptPayload}
          onShare={() => {
            if (navigator.share) {
              navigator
                .share({
                  title: "Invoice",
                  text: `Invoice ${successData?.invoiceNo} for ${currencySymbol}${successData?.amount}`,
                })
                .catch(console.error);
            } else {
              showSnack("Share", "Share not supported on this device", "warning");
            }
          }}
        />
        {/* LEFT COLUMN: Service/Product Selection */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-transparent h-full ${showMobileCart ? "hidden md:flex" : "flex"}`}
        >
          {/* Top Header */}
          <div className={`bg-white dark:bg-dark-surface p-3 shrink-0 space-y-2 ${viewMode === 'list' ? '' : 'border-b border-gray-100 dark:border-dark-border'}`}>
            {/* Search + Fav */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <SearchIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-dark-surface rounded-xl pl-9 pr-4 py-2 text-[12px] font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-500"
                />
              </div>

              <button
                onClick={() => setShowOnlyProductFavourites(!showOnlyProductFavourites)}
                className={`p-2 rounded-xl transition-all border ${showOnlyProductFavourites ? "bg-red-50 text-red-500 border-red-100 shadow-sm" : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-600 dark:text-gray-400"}`}
                title={
                  showOnlyProductFavourites
                    ? "Show all products"
                    : "Show favourite products"
                }
              >
                <Heart
                  size={16}
                  fill={showOnlyProductFavourites ? "currentColor" : "none"}
                />
              </button>

              {/* View Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowViewSettings(!showViewSettings)}
                  className={`p-2 rounded-xl transition-all border ${showViewSettings ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-600 dark:text-gray-400"}`}
                  title="View Settings"
                >
                  <SlidersHorizontal size={16} />
                </button>

                {showViewSettings && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowViewSettings(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-gray-100 dark:border-dark-border overflow-hidden z-50">
                      <div className="p-1">
                        <button
                          onClick={() => handleViewModeChange("grid")}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${viewMode === "grid" ? "bg-brand-primary/10 text-brand-primary font-bold" : "text-gray-600 hover:bg-gray-50 dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-card"}`}
                        >
                          <LayoutGrid size={16} /> Grid View
                        </button>
                        <button
                          onClick={() => handleViewModeChange("list")}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${viewMode === "list" ? "bg-brand-primary/10 text-brand-primary font-bold" : "text-gray-600 hover:bg-gray-50 dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-card"}`}
                        >
                          <List size={16} /> Card View
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile: Product Categories below search bar */}
            <div ref={midMobileScrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hide md:hidden">
              <button
                onClick={() => setActiveProdCat("ALL")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${activeProdCat === "ALL" ? "bg-brand-primary text-white border-brand-primary" : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-600 dark:text-gray-400"}`}
              >
                ALL
              </button>
              {productCategories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setActiveProdCat(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${activeProdCat === cat.name ? "bg-brand-primary text-white border-brand-primary" : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-600 dark:text-gray-400"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Scrollable Area */}
          <div 
            className={`flex-1 overflow-y-auto scrollbar-hide pb-36 md:pb-32 ${viewMode === 'list' ? 'px-0 py-0' : 'px-3 py-2'}`}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.target;
              if (scrollHeight - scrollTop <= clientHeight + 100) {
                setDisplayedItemsCount((prev) => prev + 20);
              }
            }}
          >
            {loading || isMetadataLoading ? (
              viewMode === "list" ? <InvoiceListSkeleton count={8} /> : <ServicesSkeleton count={12} />
            ) : filteredProducts.length > 0 ? (
              <div className={`${viewMode === 'list' ? 'flex flex-col bg-white dark:bg-dark-surface border-y border-gray-100 dark:border-dark-border mb-4' : 'grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 md:gap-4 pb-4'}`}>
                {filteredProducts.slice(0, displayedItemsCount).map((product) => {
                  const currentDeptId = departments?.find((d) => d.name === activeDept)?._id;
                  return (
                    <ProductCard
                      key={product._id}
                      product={product}
                      cart={cart}
                      offerInfo={getOfferInfo(product, product.sellingPrice, "product", currentDeptId)}
                      onAdd={stableAddProduct}
                      onUpdateQty={updateQty}
                      onRemove={removeFromCart}
                      onToggleFavourite={handleToggleProductFavourite}
                      selectedShopId={selectedShopId}
                      cardStyle={invoiceProductCardView}
                      viewMode={viewMode}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-50 py-16">
                <Package size={48} className="mb-4" />
                <p>No products found in inventory</p>
              </div>
            )}
          </div>

          {/* Desktop: Bottom Filter Card - Product Categories */}
          <div className="hidden md:block sticky bottom-0 left-0 right-0 z-30 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 py-2.5 max-lg:pb-5">
            <div ref={bottomDesktopRightScrollRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveProdCat("ALL")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${activeProdCat === "ALL" ? "bg-brand-primary text-white border-brand-primary shadow-sm" : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-700 dark:text-gray-300"}`}
              >
                ALL
              </button>
              {productCategories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setActiveProdCat(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${activeProdCat === cat.name ? "bg-brand-primary text-white border-brand-primary shadow-sm" : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-gray-700 dark:text-gray-300"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: Filter FAB */}
          <button
            onClick={() => setShowFilterPopup(true)}
            className={`md:hidden fixed z-[41] w-12 h-12 rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/30 flex items-center justify-center active:scale-95 transition-all ${showMobileCart ? "hidden" : ""} ${cart.length > 0 ? "bottom-[10rem]" : "bottom-20"} right-4`}
          >
            <SlidersHorizontal size={18} />
          </button>

          {/* Mobile: Filter Overlay Popup - Bottom Right Card */}
          {showFilterPopup && (
            <>
              <div
                className="md:hidden fixed inset-0 z-[45] bg-black/30"
                onClick={() => setShowFilterPopup(false)}
              />
              <div
                className={`md:hidden fixed z-[46] right-3 ${cart.length > 0 ? "bottom-[13.5rem]" : "bottom-[5.5rem]"} w-56 bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-gray-100 dark:border-dark-border p-3 space-y-3`}
              >
                {/* Product Categories */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Product Category
                  </span>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto scrollbar-hide">
                    <button
                      onClick={() => {
                        setActiveProdCat("ALL");
                        setShowFilterPopup(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeProdCat === "ALL" ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-50 dark:bg-dark-card text-gray-400"}`}
                    >
                      ALL
                    </button>
                    {productCategories.map((cat) => (
                      <button
                        key={cat._id}
                        onClick={() => {
                          setActiveProdCat(cat.name);
                          setShowFilterPopup(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeProdCat === cat.name ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-50 dark:bg-dark-card text-gray-400"}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Mobile Floating Cart Summary */}
          {!showMobileCart && cart.length > 0 && (
            <div className="md:hidden fixed bottom-16 left-0 w-full bg-brand-primary/95 backdrop-blur-sm text-white p-4 z-[40] flex items-center justify-between pointer-events-auto border-t border-brand-primary">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest leading-none mb-1">
                  {cart.reduce((a, b) => a + b.qty, 0)} item
                  {cart.reduce((a, b) => a + b.qty, 0) !== 1 && "s"}
                </span>
                <span className="text-xl font-black notranslate leading-none">
                  {currencySymbol}
                  {formatNumber(
                    cartCalc.subtotal + cartCalc.totalTax,
                    shopSettings,
                  )}
                </span>
              </div>
              <button
                onClick={() => navigate("#cart")}
                className="bg-white dark:bg-dark-surface text-brand-primary dark:text-blue-400 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white dark:bg-dark-surface/90 transition-colors"
              >
                View Cart
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Cart & Checkout */}
        <div
          className={`shrink-0 flex-col overflow-hidden bg-white dark:bg-dark-surface pb-1 max-lg:pb-2
          ${showMobileCart ? "fixed top-0 left-0 right-0 bottom-16 z-[40] w-full rounded-none border-none flex" : "hidden md:flex md:relative md:w-[420px] md:h-full md:border-l md:border-gray-200 dark:border-dark-border/50 dark:md:border-dark-border"}`}
        >
          {/* Mobile Back */}
          <div className="md:hidden p-4 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center pt-safe sticky top-0 z-10">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-bold text-[11px] uppercase tracking-wider hover:text-brand-primary"
            >
              <ArrowLeft size={16} /> Back to Items
            </button>
          </div>

          {/* Header & Selectors */}
          <div ref={headerRef} className="relative p-4 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border flex items-center gap-3">
            {(isAdmin || isStaff) && shopConfig?.showGlobalStaffSelection !== false && (
              <div className="flex gap-2 w-full max-w-[200px]">
                <div className="flex-1 min-w-0">
                    <CustomDropdown
                      variant="compact"
                      icon={Users}
                      value={selectedStaffId}
                      onChange={(e) => {
                        setSelectedStaffId(e.target.value);
                      }}
                      options={[
                        ...filteredStaff.map((s) => ({
                          value: s._id,
                          label: s.name,
                        })),
                      ]}
                      placeholder="Select Staff"
                    />
                  </div>
              </div>
            )}

            {/* Customer Selection */}
            <div className={`flex items-center gap-2 ${((isAdmin || isStaff) && (branches.length > 1 || isSuperAdmin) && shopConfig?.showGlobalStaffSelection !== false) ? "" : "flex-1 min-w-0"}`}>
              <div className="flex-1 min-w-0">
                {selectedCustomer ? (
                  <div className="bg-brand-primary/5 p-2 rounded-xl flex items-center justify-between border border-brand-primary/10">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-surface flex items-center justify-center text-brand-primary dark:text-blue-400 font-black text-xs shrink-0">
                        {selectedCustomer.name?.charAt(0) || "?"}
                      </div>
                      <div className="leading-tight truncate">
                        <p className="font-bold text-[11px] text-gray-800 dark:text-gray-200 truncate">
                          {selectedCustomer.name || "Unnamed Customer"}
                        </p>
                        <div className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center flex-wrap gap-x-2">
                          <span>{selectedCustomer.phone}</span>
                          {selectedCustomer.email && (
                            <span className="truncate max-w-[130px] lowercase" title={selectedCustomer.email}>
                              {selectedCustomer.email}
                            </span>
                          )}
                          {shopConfig?.loyaltySettings?.isActive && selectedCustomer.loyaltyPoints > 0 && selectedCustomer.name !== "LOCAL CUSTOMER" && (
                            <button
                              onClick={() => {
                                setPointsToRedeemInput(selectedCustomer.loyaltyPoints);
                                setShowRedeemModal(true);
                              }}
                              className="font-bold whitespace-nowrap text-brand-primary dark:text-blue-400 bg-brand-primary/10 hover:bg-brand-primary/20 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors border border-brand-primary/20"
                              title="Click to redeem points"
                            >
                              <Award size={10} />
                              {Number(selectedCustomer.loyaltyPoints).toLocaleString(undefined, { maximumFractionDigits: 2 })} Points
                            </button>
                          )}
                          
                          {/* NEW PROJECTED LOYALTY POINTS BADGE */}
                          {(() => {
                            if (!shopConfig?.loyaltySettings?.isActive || !selectedCustomer || selectedCustomer.name === "LOCAL CUSTOMER") return null;
                            const minSale = shopConfig.loyaltySettings.minimumSalesAmount || 0;
                            const amountPerPoint = shopConfig.loyaltySettings.amountPerPoint || 1;
                            if (minSale === 0 || amountPerPoint === 0) return null;
                            
                            const currentTotal = finalTotal;
                            
                            if (currentTotal >= minSale) {
                              const multiples = currentTotal / minSale;
                              let points = multiples * amountPerPoint;
                              
                              if (shopConfig.loyaltySettings.isRoundOff) {
                                points = Math.round(points);
                              } else {
                                points = Math.round(points * 100) / 100;
                              }
                              
                              if (points > 0) {
                                return (
                                  <div className="mt-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 w-fit opacity-90">
                                    <Award size={10} />
                                    Will earn {Number(points).toLocaleString(undefined, { maximumFractionDigits: 2 })} pts!
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1 hover:text-red-500 text-gray-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <CustomTextField
                        variant="compact"
                        placeholder="Find Buyer..."
                        icon={SearchIcon}
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerResults(true);
                        }}
                        onFocus={() => setShowCustomerResults(true)}
                      />
                      <button
                        onClick={() => setIsCustModalOpen(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 rounded-lg text-brand-primary dark:text-blue-400 transition-colors"
                        title="Add New Buyer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {showCustomerResults && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setShowCustomerResults(false)}
                        />
                        <div className="absolute top-full left-4 right-4 mt-1 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border z-50 max-h-48 overflow-y-auto shadow-xl">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((c) => (
                              <button
                                key={c._id}
                                onClick={() => handleCustomerSelect(c)}
                                className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card border-b border-gray-50 dark:border-dark-border last:border-none flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-card overflow-hidden shrink-0">
                                    {c.photo?.url ? (
                                      <img
                                        src={c.photo.url}
                                        alt={c.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary dark:text-blue-400 font-bold text-xs">
                                        {c.name?.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-900 dark:text-white text-[12px] truncate">
                                      {c.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span className="text-[9px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest opacity-80 whitespace-nowrap">
                                        {c.name === "LOCAL CUSTOMER" ? "Default" : (c.isWalkIn ? "Guest" : "Member")}
                                      </span>
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                        • {c.phone}
                                      </span>
                                      {c.email && (
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px] lowercase">
                                          • {c.email}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="shrink-0 flex items-center gap-2 text-right">
                                  {(shopConfig?.loyaltySettings?.isActive && c.loyaltyPoints > 0 && c.name !== "LOCAL CUSTOMER") && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-dark-border text-gray-900 dark:text-gray-100 rounded-md text-[10px] font-black tracking-widest">
                                      <Award size={10} className="text-brand-primary" />
                                      {Number(c.loyaltyPoints).toLocaleString(undefined, { maximumFractionDigits: 2 })} PTS
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-400 dark:text-gray-500 text-[10px]">
                              <button
                                onClick={() => setIsCustModalOpen(true)}
                                className="text-brand-primary dark:text-blue-400 font-bold"
                              >
                                Create "{customerSearch}"
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Miscellaneous Button (Commission + Shipping) */}
              {shopConfig?.showStaffCommission && (
                <button
                  onClick={() => {
                    setMiscActiveTab("commission");
                    setIsCommissionModalOpen(true);
                  }}
                  className="p-2 bg-gray-50 dark:bg-dark-card rounded-xl text-brand-primary dark:text-blue-400 hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 transition-colors relative"
                  title="Miscellaneous"
                >
                  <SlidersHorizontal size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Cart Header with Next Invoice Number */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-dark-card border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Cart Items
              </span>
              <button
                type="button"
                onClick={handleClearCart}
                className="px-2 py-0.5 text-[9px] font-black text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 rounded transition-colors uppercase tracking-wider"
              >
                New Invoice
              </button>
            </div>
            <div className="flex items-center gap-2">
              <CustomDatePicker compact={true} disableFuture={true} value={invoiceDate} onChange={setInvoiceDate} />
              {isEditing && editInvoiceNumber ? (
                <span className="h-[28px] flex items-center px-2.5 rounded-lg text-[10px] font-black text-brand-primary dark:text-blue-400 bg-brand-primary/10">
                  #{editInvoiceNumber}
                </span>
              ) : shopSettings?.invoiceNextNumber ? (
                <span className="h-[28px] flex items-center px-2.5 rounded-lg text-[10px] font-black text-brand-primary dark:text-blue-400 bg-brand-primary/10">
                  #{shopSettings.invoicePrefix || "INV/"}{String(shopSettings.invoiceNextNumber).padStart(shopSettings.invoiceLength || 5, "0")}{shopSettings.invoiceSuffix || ""}
                </span>
              ) : null}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide bg-white dark:bg-dark-surface">
            {cart.length > 0 ? (
              <div className="space-y-2">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.variantKey}
                    item={item}
                    onUpdateQty={updateQty}
                    onRemove={removeFromCart}
                    onUpdateDiscount={updateItemDiscount}
                    onUpdatePrice={updateItemPrice}
                    onUpdateStaff={updateItemStaff}
                    filteredStaff={filteredStaff}
                    user={user}
                    isAdmin={isAdmin}
                    isStaff={isStaff}
                    shopConfig={shopConfig}
                    shopSettings={shopSettings}
                    formatNumber={formatNumber}
                    applyPrecision={applyPrecision}
                    canEditPrice={canEditPrice}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2 opacity-50">
                <ShoppingCart size={24} />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Empty Cart
                </p>
              </div>
            )}
          </div>

          {/* Footer / Payment */}
          <div className="px-4 py-4 bg-gray-50/60 dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border mt-auto flex flex-col gap-4">
            <div className="space-y-2">
              <div className="overflow-visible space-y-2">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="w-[120px] sm:w-[150px] shrink-0">
                      {p.method === "WALLET" ? (
                        <div className="h-[34px] w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black text-[11px] px-3 rounded-lg border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between">
                          <span>WALLET</span>
                          <Wallet size={12} />
                        </div>
                      ) : (
                        <CustomDropdown
                          variant="compact"
                          value={p.method}
                          onChange={(e) =>
                            handleUpdatePayment(idx, "method", e.target.value)
                          }
                          options={paymentMethods.map((pm) => ({
                            value: pm.name,
                            label: pm.name,
                          }))}
                          placeholder="Method"
                        />
                      )}
                    </div>
                    <div className="flex-1 h-[34px] bg-white dark:bg-dark-surface rounded-lg px-3 border border-gray-200 dark:border-dark-border flex items-center focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold notranslate">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={String(p.method).toUpperCase() === "DUE" ? 0 : p.amount}
                        disabled={String(p.method).toUpperCase() === "DUE"}
                        onChange={(e) =>
                          handleUpdatePayment(idx, "amount", e.target.value)
                        }
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            handleUpdatePayment(idx, "amount", Math.round(val * 100) / 100);
                          }
                        }}
                        className={`w-full bg-transparent text-[11.5px] font-black outline-none text-right ${
                          String(p.method).toUpperCase() === "DUE" ? "text-gray-400 cursor-not-allowed" : "text-gray-800 dark:text-gray-200"
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {payments.length > 1 && (
                        <button
                          onClick={() => handleRemovePaymentRow(idx)}
                          className="h-[34px] w-[34px] bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {idx === payments.length - 1 && (
                        <button
                          onClick={handleAddPaymentRow}
                          className="h-[34px] px-3 bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/20 hover:border-brand-primary/30 text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shrink-0"
                        >
                          <Plus size={12} strokeWidth={2.5} />
                          <span>Split</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals - Always show when cart has items */}
            {cart.length > 0 && (
              <div className="flex flex-col gap-2">
              <div className={`grid gap-2 ${shopSettings?.enableRoundOff ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  <div className="flex items-center justify-between bg-white dark:bg-dark-surface px-3 py-1.5 rounded-lg border border-gray-100 dark:border-dark-border">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sub</span>
                    <span className="text-[11.5px] font-black text-gray-800 dark:text-gray-200 notranslate">
                      {currencySymbol}{formatNumber(cartCalc.subtotal, shopSettings)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Tax</span>
                    <span className="text-[11.5px] font-black text-emerald-600 dark:text-emerald-400 notranslate">
                      {cartCalc.totalTax > 0 ? `${cartCalc.hasInclusiveTax ? "" : "+"}${currencySymbol}${formatNumber(cartCalc.totalTax, shopSettings)}` : `${currencySymbol}0`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white dark:bg-dark-surface px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest shrink-0">Disc</span>
                    <div className="flex items-center justify-end w-full ml-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold notranslate mr-0.5">{currencySymbol}</span>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full min-w-[20px] max-w-[40px] bg-transparent outline-none font-black text-right text-[11.5px] text-gray-800 dark:text-gray-200"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {shopSettings?.enableRoundOff && (
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/30">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Round Off</span>
                      <span className="text-[11.5px] font-black text-blue-600 dark:text-blue-400 notranslate">
                        {Math.abs(roundOffAmount) > 0.001
                          ? `${roundOffAmount > 0 ? '+' : ''}${formatNumber(roundOffAmount, shopSettings)}`
                          : "0"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total Discount (Item Discount + Extra Discount) */}
                {(cartCalc.totalItemDiscount > 0 || (Number(discount) || 0) > 0) && (
                  <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-800/30 mt-2">
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Total Disc</span>
                    <span className="text-[11.5px] font-black text-rose-500 notranslate">
                      -{currencySymbol}{formatNumber(cartCalc.totalItemDiscount + (Number(discount) || 0), shopSettings)}
                    </span>
                  </div>
                )}



                {/* Wallet Usage Removed */}

                {remainingAmount > 0 && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                      Unpaid:{" "}
                      <span className="notranslate">
                        {currencySymbol}
                        {formatNumber(remainingAmount, shopSettings)}
                      </span>
                    </span>
                    {!selectedCustomer && (
                      <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">
                        *Select Customer
                      </span>
                    )}
                  </div>
                )}
                {remainingAmount < 0 && (
                  <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      {selectedCustomer?.name === "LOCAL CUSTOMER" ? "Change:" : "Overpaid:"}{" "}
                      <span className="notranslate">
                        {currencySymbol}
                        {formatNumber(Math.abs(remainingAmount), shopSettings)}
                      </span>
                    </span>
                    {!selectedCustomer && (
                      <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">
                        *Select Customer
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={
                loading ||
                cart.length === 0 ||
                (remainingAmount !== 0 && !selectedCustomer) ||
                (remainingAmount > 0 && selectedCustomer?.name === "LOCAL CUSTOMER") ||
                (!isAdmin && !isStaff && !hasPermission(isEditing ? "sales:invoices:edit" : "sales:invoices:add"))
              }
              title={
                !isAdmin && !isStaff && !hasPermission(isEditing ? "sales:invoices:edit" : "sales:invoices:add")
                  ? "You do not have permission to " + (isEditing ? "edit" : "create") + " invoices."
                  : ""
              }
              className={`w-full font-black py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-xs ${loading || cart.length === 0
                ? "bg-gray-200 dark:bg-dark-border text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : remainingAmount > 0
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : remainingAmount < 0
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-brand-primary text-white hover:bg-brand-secondary"
                }`}
            >
              {loading ? (
                <Clock size={16} />
              ) : remainingAmount < 0 ? (
                <Wallet size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <span>
                    {remainingAmount > 0
                      ? (selectedCustomer?.name === "LOCAL CUSTOMER" ? `FULL PAYMENT REQUIRED` : `DUE & ${isEditing ? 'UPDATE' : 'SAVE'} INVOICE`)
                      : remainingAmount < 0
                        ? (selectedCustomer?.name === "LOCAL CUSTOMER" ? `${isEditing ? 'UPDATE' : 'SAVE'} INVOICE` : `WALLET & ${isEditing ? 'UPDATE' : 'SAVE'} INVOICE`)
                        : `${isEditing ? 'UPDATE' : 'SAVE'} INVOICE`}
                  </span>
                  <span className="opacity-50 mx-1">•</span>
                  <span className="notranslate text-[15px] tracking-normal">
                    {currencySymbol}{formatNumber(finalTotal, shopSettings)}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Create Customer Modal */}
        <Modal
          isOpen={isCustModalOpen}
          onClose={() => setIsCustModalOpen(false)}
          title="Add New Buyer"
          maxWidth="max-w-md"
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCustModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-customer-form"
                className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary font-bold text-sm shadow-lg shadow-brand-primary/20 transition-colors"
              >
                Create Buyer
              </button>
            </div>
          }
        >
          <form id="create-customer-form" onSubmit={handleCreateCustomer} className="space-y-4 py-2">
            <CustomTextField
              ref={custNameRef}
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              icon={User}
              value={newCustData.name}
              onChange={(e) =>
                setNewCustData({ ...newCustData, name: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  custPhoneRef.current?.focus();
                }
              }}
              required
            />
            <CustomTextField
              ref={custPhoneRef}
              label="Phone Number"
              placeholder="9876543210"
              icon={Phone}
              value={newCustData.phone}
              onChange={(e) =>
                setNewCustData({ ...newCustData, phone: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  custEmailRef.current?.focus();
                }
              }}
              required
            />
            <CustomTextField
              ref={custEmailRef}
              label="Email (Optional)"
              placeholder="client@example.com"
              icon={Mail}
              value={newCustData.email}
              onChange={(e) =>
                setNewCustData({ ...newCustData, email: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateCustomer(e);
                }
              }}
            />
          </form>
        </Modal>

        {/* Miscellaneous Modal (Commission + Shipping) */}
        <Modal
          isOpen={isCommissionModalOpen}
          onClose={() => setIsCommissionModalOpen(false)}
          title="Miscellaneous"
          maxWidth="max-w-lg"
          footer={
            <div className="flex gap-3">
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-bold text-sm transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsCommissionModalOpen(false);
                  if (miscActiveTab === "commission") {
                    showSnack("Success", "Commission settings saved for this sale", "success");
                  } else {
                    showSnack("Success", "Shipping details saved", "success");
                  }
                }}
                className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary font-bold text-sm shadow-lg shadow-brand-primary/20 transition-colors uppercase tracking-widest"
              >
                Apply
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            {/* Tab Bar */}
            <div className="flex bg-gray-100 dark:bg-dark-card p-1 rounded-2xl border border-gray-200 dark:border-dark-border">
              <button
                onClick={() => setMiscActiveTab("commission")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${miscActiveTab === "commission"
                    ? "bg-white dark:bg-dark-surface text-brand-primary shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  }`}
              >
                <CreditCard size={13} />
                Miscellaneous
              </button>
              <button
                onClick={() => setMiscActiveTab("shipping")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${miscActiveTab === "shipping"
                    ? "bg-white dark:bg-dark-surface text-brand-primary shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  }`}
              >
                <Truck size={13} />
                Shipping
              </button>
            </div>

            {/* Commission Tab Content */}
            {miscActiveTab === "commission" && (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                      <CreditCard size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-purple-900 dark:text-purple-100 mb-1">
                        Custom Miscellaneous for This Sale Only
                      </h4>
                      <p className="text-xs text-purple-700 dark:text-purple-300">
                        Set specific miscellaneous amount (percentage or amount) for staff in this sale. This is for tracking purposes only and does not affect the sale amount.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Commission Summary */}
                {cartCalc.totalCommission > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Total Miscellaneous
                        </p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 notranslate">
                          {formatNumber(cartCalc.totalCommission, shopSettings)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Sale Amount
                        </p>
                        <p className="text-lg font-black text-gray-700 dark:text-gray-300 notranslate">
                          {formatNumber(cartCalc.subtotal + cartCalc.totalTax - cartCalc.totalItemDiscount, shopSettings)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Miscellaneous Inputs */}
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {cart.length > 0 ? (
                    <>
                      {/* Group by staff - Exclude admin/owner */}
                      {Array.from(new Set(cart.map(item => item.staffId).filter(id => id && id !== "admin"))).map((staffId) => {
                        const staffMember = filteredStaff.find(s => s._id === staffId);

                        if (!staffMember) return null;

                        const staffItems = cart.filter(item => item.staffId === staffId);
                        const staffTotal = staffItems.reduce((sum, item) => {
                          const lineTotal = item.price * item.qty;
                          const itemDisc = Number(item.discount) || 0;
                          return sum + (lineTotal - itemDisc);
                        }, 0);

                        const currentType = commissionType[staffId] || 'percentage';
                        const commValue = Number(staffCommissions[staffId]) || 0;
                        const calculatedCommission = currentType === 'amount'
                          ? commValue
                          : staffTotal * (commValue / 100);

                        return (
                          <div key={staffId} className="bg-gray-50 dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                                  <Users size={14} className="text-brand-primary dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                    {staffMember.name}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {staffItems.length} item{staffItems.length !== 1 ? 's' : ''} • {formatNumber(staffTotal, shopSettings)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Commission Type Toggle */}
                            <div className="flex gap-2 mb-3">
                              <button
                                onClick={() => setCommissionType(prev => ({ ...prev, [staffId]: 'percentage' }))}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${currentType === 'percentage'
                                    ? 'bg-brand-primary text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border'
                                  }`}
                              >
                                <Percent size={12} className="inline mr-1" />
                                Percentage
                              </button>
                              <button
                                onClick={() => setCommissionType(prev => ({ ...prev, [staffId]: 'amount' }))}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${currentType === 'amount'
                                    ? 'bg-brand-primary text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border'
                                  }`}
                              >
                                <CreditCard size={12} className="inline mr-1" />
                                Amount
                              </button>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Miscellaneous {currentType === 'percentage' ? 'Percentage' : 'Amount'}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max={currentType === 'percentage' ? "100" : staffTotal.toString()}
                                  step={currentType === 'percentage' ? "0.1" : "1"}
                                  value={staffCommissions[staffId] || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (currentType === 'amount' && Number(value) > staffTotal) {
                                      showSnack("Limit", "Commission cannot exceed staff total", "warning");
                                      return;
                                    }
                                    setStaffCommissions(prev => ({
                                      ...prev,
                                      [staffId]: value
                                    }));
                                  }}
                                  placeholder={currentType === 'percentage' ? "Enter %" : `Max ${formatNumber(staffTotal, shopSettings)}`}
                                  className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-4 py-2.5 pr-10 text-sm font-bold text-gray-700 dark:text-gray-300 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                />
                                {currentType === 'percentage' ? (
                                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                ) : (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500 notranslate">
                                    {currencySymbol}
                                  </span>
                                )}
                              </div>
                              {staffCommissions[staffId] && (
                                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg px-3 py-2">
                                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                    Miscellaneous Amount
                                  </span>
                                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
                                    {formatNumber(calculatedCommission, shopSettings)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Items List */}
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                Items
                              </p>
                              <div className="space-y-1">
                                {staffItems.map(item => (
                                  <div key={item.variantKey} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {item.name} {item.variantName && `(${item.variantName})`} x{item.qty}
                                    </span>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 notranslate">
                                      {formatNumber(applyPrecision((item.price * item.qty) - (Number(item.discount) || 0), shopSettings), shopSettings)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {Array.from(new Set(cart.map(item => item.staffId).filter(id => id && id !== "admin"))).length === 0 && (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                          <Users size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-bold">No staff assigned</p>
                          <p className="text-xs">Assign staff to items to set commissions</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <Users size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-bold">No items in cart</p>
                      <p className="text-xs">Add items to set staff commissions</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shipping Tab Content */}
            {miscActiveTab === "shipping" && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <Truck size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-blue-900 dark:text-blue-100 mb-1">
                        Shipping & Delivery Details
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Add shipping information to track delivery status. This will be attached to the invoice for reference.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <Package size={10} className="text-blue-500" />
                        Carrier
                      </label>
                      <input
                        type="text"
                        value={shippingCarrier}
                        onChange={(e) => setShippingCarrier(e.target.value)}
                        placeholder="e.g. FedEx, DHL"
                        className="w-full px-3 py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/30 outline-none transition-all placeholder:text-gray-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <ClipboardList size={10} className="text-blue-500" />
                        Tracking ID
                      </label>
                      <input
                        type="text"
                        value={shippingTrackingId}
                        onChange={(e) => setShippingTrackingId(e.target.value)}
                        placeholder="# Tracking No."
                        className="w-full px-3 py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/30 outline-none transition-all placeholder:text-gray-300"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-full">
                      <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <Calendar size={10} className="text-blue-500" />
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={shippingExpectedDate}
                        onChange={(e) => setShippingExpectedDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/30 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-full">
                      <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <MapPin size={10} className="text-blue-500" />
                        Shipping Notes
                      </label>
                      <textarea
                        value={shippingNotes}
                        onChange={(e) => setShippingNotes(e.target.value)}
                        placeholder="Any special delivery instructions..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/30 outline-none transition-all resize-none placeholder:text-gray-300"
                      />
                    </div>
                  </div>

                  {/* Shipping Summary */}
                  {(shippingCarrier || shippingTrackingId || shippingExpectedDate) && (
                    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border p-4 space-y-2">
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                        Shipping Preview
                      </p>
                      <div className="space-y-2">
                        {shippingCarrier && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Truck size={12} className="text-blue-500" />
                              Carrier
                            </span>
                            <span className="font-black text-gray-700 dark:text-gray-300">{shippingCarrier}</span>
                          </div>
                        )}
                        {shippingTrackingId && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <ClipboardList size={12} className="text-blue-500" />
                              Tracking ID
                            </span>
                            <span className="font-black text-brand-primary dark:text-blue-400">#{shippingTrackingId}</span>
                          </div>
                        )}
                        {shippingExpectedDate && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Calendar size={12} className="text-blue-500" />
                              Expected Delivery
                            </span>
                            <span className="font-black text-gray-700 dark:text-gray-300">{moment(shippingExpectedDate).format("MMM DD, YYYY")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Delivery Address */}
                {selectedCustomer && (
                  <div className="bg-gray-50 dark:bg-dark-card/50 rounded-xl border border-gray-100 dark:border-dark-border p-4">
                    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <HomeIcon size={10} />
                      Customer Address
                    </p>
                    <div className="flex items-start gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                      <MapPin size={14} className="text-brand-primary dark:text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-black text-gray-800 dark:text-gray-200 mb-0.5">{selectedCustomer.name}</p>
                        {selectedCustomer.phone && <p>{selectedCustomer.phone}</p>}
                        {(selectedCustomer.address || selectedCustomer.city) ? (
                          <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                            {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.postalCode].filter(Boolean).join(", ")}
                          </p>
                        ) : (
                          <p className="text-gray-400 dark:text-gray-500 italic mt-0.5">No address on file</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>

        {/* Booking Modal */}
        <Modal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          title={cart.some((i) => i.itemType === "service") ? "Book Appointment" : "Book Product Order"}
          size="md"
          position="right"
          footer={
            <div className="flex gap-3">
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-bold text-sm transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleBookAppointment}
                disabled={
                  loading ||
                  cart.length === 0
                }
                className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary font-bold text-sm shadow-lg shadow-brand-primary/20 transition-colors uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? "Booking..." : cart.some((i) => i.itemType === "service") ? "Book Appointment" : "Book Order"}
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            {/* Top Row: Customer & Date */}
            <div className="grid grid-cols-2 gap-4">
              {/* Customer Info */}
              <div className="relative h-full">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 block mb-1">
                Customer
              </label>
              <div className="relative">
                {selectedCustomer ? (
                  <div className="w-full flex items-center justify-between bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border px-4 py-2 h-[42px] rounded-xl transition-all duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate leading-none">
                          {selectedCustomer.name}
                        </p>
                        {selectedCustomer.phone && (
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate mt-0.5 leading-none">
                            {selectedCustomer.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors shrink-0"
                    >
                      <Trash2 size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <CustomTextField
                        placeholder="Find Buyer..."
                        icon={SearchIcon}
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerResults(true);
                        }}
                        onFocus={() => setShowCustomerResults(true)}
                      />
                      <button
                        onClick={() => setIsCustModalOpen(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 rounded-lg text-brand-primary dark:text-blue-400 transition-colors"
                        title="Add New Buyer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {showCustomerResults && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setShowCustomerResults(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border z-50 max-h-48 overflow-y-auto shadow-xl">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((c) => (
                              <button
                                key={c._id}
                                onClick={() => handleCustomerSelect(c)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card border-b border-gray-50 dark:border-dark-border last:border-none"
                              >
                                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                  {c.name}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-[9px] text-gray-400 dark:text-gray-500">
                                    {c.phone}
                                  </p>
                                  {(shopConfig?.loyaltySettings?.isActive && c.loyaltyPoints > 0 && c.name !== "LOCAL CUSTOMER") && (
                                    <span
                                      className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter bg-brand-primary/10 text-brand-primary flex items-center gap-0.5 ml-1"
                                    >
                                      <Award size={8} />
                                      {Number(c.loyaltyPoints).toLocaleString(undefined, { maximumFractionDigits: 2 })} PTS
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-400 dark:text-gray-500 text-[10px]">
                              <button
                                onClick={() => setIsCustModalOpen(true)}
                                className="text-brand-primary dark:text-blue-400 font-bold"
                              >
                                Create "{customerSearch}"
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Appointment Date */}
            <CustomDatePicker
              label={cart.some((i) => i.itemType === "service") ? "Appointment Date" : "Order Date"}
              value={bookingData.date}
              onChange={(val) =>
                setBookingData({ ...bookingData, date: val })
              }
            />
          </div>

          {/* Cart Items */}
            <div className="bg-gray-50 dark:bg-dark-card p-3 rounded-2xl border border-gray-100 dark:border-dark-border">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                Items in Cart
              </p>
              <div className="max-h-32 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                {cart.length > 0 ? (
                  cart.map((s) => (
                    <div
                      key={s.variantKey}
                      className="border-b border-gray-100 dark:border-dark-border last:border-0 pb-2 last:pb-0"
                    >
                      <div className="flex justify-between items-start text-xs mb-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${s.itemType === "service"
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
                              : "bg-purple-50 text-purple-500"
                            }`}>
                            {s.itemType === "service" ? "SVC" : "PRD"}
                          </span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 break-words">
                            {s.name}{s.variantName ? <span className="text-brand-primary dark:text-blue-400 ml-1">• {s.variantName}</span> : ""} x {s.qty}
                          </span>
                        </div>
                        <span className="text-brand-primary dark:text-blue-400 font-black ml-2 whitespace-nowrap notranslate">
                          {(() => {
                            const lineTotal = s.price * s.qty;
                            const taxPct = s.taxPercentage || s.taxPercent || 0;
                            const isInc = s.isTaxInclusive || false;
                            const lineTax = isInc ? 0 : (lineTotal * (taxPct / 100));
                            return `${formatNumber(lineTotal + lineTax, shopSettings)}`;
                          })()}
                        </span>
                      </div>

                      {/* Secondary Info: Tax and Stock */}
                      <div className="flex items-center gap-2 pl-[38px]">
                        {((s.taxPercentage || s.taxPercent || 0) > 0) && (
                          <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                            Tax {s.taxPercentage || s.taxPercent}%
                          </span>
                        )}
                        {s.itemType === "product" && s.currentStock !== undefined && (
                          <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter">
                            Stock: {s.currentStock - s.qty}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-red-500 font-bold uppercase text-center py-2">
                    Please add items to cart first
                  </p>
                )}
              </div>

              {/* Financial Summary inside Modal */}
              {cart.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-100 dark:border-dark-border space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="notranslate">{formatNumber(cartCalc.subtotal, shopSettings)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    <span>Tax Amount</span>
                    <span className="notranslate">{formatNumber(cartCalc.totalTax, shopSettings)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] font-black text-gray-900 dark:text-gray-100 pt-1">
                    <span>TOTAL PAYABLE</span>
                    <span className="text-brand-primary dark:text-blue-400 notranslate">{currencySymbol}{formatNumber(cartCalc.subtotal + (cartCalc.hasInclusiveTax ? 0 : cartCalc.totalTax), shopSettings)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              {/* Time slot picker — only visible when services are in cart */}
              {cart.some((i) => i.itemType === "service") && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Select Time Slot {slotLoading && "(Loading...)"}
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-1">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => {
                        const isSelected = bookingData.time === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() =>
                              setBookingData({ ...bookingData, time: slot })
                            }
                            className={`py-2 px-1 rounded-xl text-[10px] font-black transition-all border ${isSelected
                              ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20 scale-[1.02]"
                              : "bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-100 dark:border-dark-border hover:border-brand-primary/30"
                              }`}
                          >
                            {slot}
                          </button>
                        );
                      })
                    ) : !slotLoading ? (
                      <div className="col-span-4 py-4 text-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                        <p className="text-[10px] font-bold text-red-500 uppercase">
                          No slots available for this date
                        </p>
                      </div>
                    ) : (
                      Array(8)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="h-8 bg-gray-100 dark:bg-dark-border rounded-xl animate-pulse"
                          />
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Staff Assignment */}
            <div>
              <CustomDropdown
                label="Assign Staff"
                options={[
                  ...filteredStaff.map((s) => ({
                    label: s.name,
                    value: s._id,
                  })),
                ]}
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                icon={Users}
              />
            </div>
          </div>
        </Modal>

        {/* Redeem Loyalty Points Modal */}
        <Modal
          isOpen={showRedeemModal}
          onClose={() => setShowRedeemModal(false)}
          title="Redeem Loyalty Points"
          icon={Award}
          size="sm"
        >
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-4">
                <Gift size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white notranslate">
                {selectedCustomer?.loyaltyPoints || 0} Points Available
              </h3>
            </div>
            
            {(selectedCustomer?.loyaltyPoints || 0) < (shopConfig?.loyaltySettings?.minimumRedeemPoints || 0) ? (
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-100 text-xs font-bold text-center">
                Minimum {shopConfig?.loyaltySettings?.minimumRedeemPoints} points required to redeem.
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border p-4 rounded-2xl space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Points to Redeem</label>
                  <input
                    type="number"
                    min={shopConfig?.loyaltySettings?.minimumRedeemPoints || 0}
                    max={selectedCustomer?.loyaltyPoints || 0}
                    value={pointsToRedeemInput}
                    onChange={(e) => setPointsToRedeemInput(Number(e.target.value))}
                    className="w-full h-12 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-4 text-center font-bold text-lg mt-1"
                  />
                </div>
                
                <p className="text-sm text-center text-gray-600 dark:text-gray-300">
                  Value:{" "}
                  <span className="font-bold text-emerald-500 notranslate">
                    {currencySymbol}
                    {formatNumber((pointsToRedeemInput || 0) * (shopConfig?.loyaltySettings?.pointValueInCurrency || 0), shopSettings)}
                  </span>{" "}
                  (Added to Wallet)
                </p>
                <button
                  onClick={async () => {
                    if (pointsToRedeemInput < (shopConfig?.loyaltySettings?.minimumRedeemPoints || 0)) {
                      return showSnack("Error", `Minimum ${shopConfig?.loyaltySettings?.minimumRedeemPoints} points required`, "error");
                    }
                    if (pointsToRedeemInput > selectedCustomer.loyaltyPoints) {
                      return showSnack("Error", "Not enough points", "error");
                    }
                    try {
                      await redeemPointsMut({ customerId: selectedCustomer._id, pointsToRedeem: pointsToRedeemInput }).unwrap();
                      showSnack("Success", "Points redeemed to wallet successfully", "success");
                      
                      const addedCash = (pointsToRedeemInput || 0) * (shopConfig?.loyaltySettings?.pointValueInCurrency || 0);
                      
                      // Update local state instantly so UI reflects changes
                      setSelectedCustomer((prev) => ({
                        ...prev,
                        loyaltyPoints: Math.max(0, prev.loyaltyPoints - pointsToRedeemInput),
                        walletBalance: (prev.walletBalance || 0) + addedCash
                      }));
                      
                      // Also refresh customer list from meta
                      fetchMeta().unwrap().then(meta => {
                        if (meta?.customers) {
                          setCustomers(meta.customers);
                          if (metadataCache) metadataCache.customers = meta.customers;
                        }
                      });
                      
                      setShowRedeemModal(false);
                    } catch (err) {
                      showSnack("Error", err?.data?.message || err?.message || "Failed to redeem points", "error");
                    }
                  }}
                  disabled={isRedeemingPoints}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-secondary active:scale-95 disabled:opacity-50 mt-2"
                >
                  {isRedeemingPoints ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Redeem Now"
                  )}
                </button>
              </div>
            )}
          </div>
        </Modal>

        <VariantSelectionModal
          isOpen={showVariantModal}
          onClose={() => setShowVariantModal(false)}
          item={itemForVariants}
          activeDept={activeDept}
          departments={departments}
          selectedShopId={selectedShopId}
          cart={cart}
          getOfferInfo={getOfferInfo}
          duplicateItemAction={shopConfig?.duplicateItemAction || "unselect"}
          onSelect={(item, price, variantData) => {
            if (item.itemType === "service") {
              addServiceToCart(item, price, variantData);
            } else {
              addProductToCart(item, price, variantData);
            }
          }}
          onRemove={(item, variantIds) => {
            const cartItems = cart.filter(c =>
              c.itemType === item.itemType &&
              c._id === item._id &&
              c.variantId && c.variantId !== "base"
            );
            const toRemove = variantIds
              ? cartItems.filter(ci => variantIds.includes(ci.variantId))
              : cartItems;
            toRemove.forEach(ci => removeFromCart(ci.variantKey));
          }}
        />

        {/* Unfinished Cart Confirmation Modal */}
        <Modal
          isOpen={showUnfinishedCartModal}
          onClose={() => setShowUnfinishedCartModal(false)}
          title="Unfinished Invoice Found"
          icon={ShoppingCart}
          size="sm"
        >
          <div className="p-4 bg-white dark:bg-dark-surface rounded-b-2xl">
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
                <ShoppingCart size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Active Cart Detected</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  You have an unfinished invoice currently open in the cart. Do you want to continue with this invoice, or start a new one?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-dark-border mt-2">
              <button
                onClick={() => {
                  setShowUnfinishedCartModal(false);
                  confirmClearCart();
                  reduxDispatch(clearEditMode());
                  processedEditIdRef.current = null;
                  setPendingEditId(null);
                  hasCheckedCartRef.current = false;
                  setInvoiceDate(moment().format("YYYY-MM-DD"));
                  // Clean URL to remove ?edit= so fetchData doesn't re-load the old invoice
                  navigate(location.pathname, { replace: true });
                }}
                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-dark-card dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
              >
                New Invoice
              </button>
              <button
                onClick={() => {
                  setShowUnfinishedCartModal(false);
                  if (pendingEditId) {
                    processedEditIdRef.current = pendingEditId;
                    setPendingEditId(null);
                    navigate(location.pathname, { replace: true });
                  }
                }}
                className="flex-1 h-12 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
              >
                Continue Invoice
              </button>
            </div>
          </div>
        </Modal>

        {/* Clear Cart Confirmation Modal */}
        <ConfirmModal
          isOpen={showClearCartModal}
          onClose={() => setShowClearCartModal(false)}
          onConfirm={confirmClearCart}
          title="New Invoice"
          message="Are you sure you want to clear current data and start a new invoice?"
          confirmLabel="New Invoice"
          type="danger"
        />
      </div>
    );
  } catch (e) {
    console.error("UnifiedInvoiceEntry Render Error:", e);
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-red-500">
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p>{e.message}</p>
      </div>
    );
  }
};

export default UnifiedInvoiceEntry;
