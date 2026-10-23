/**
 * SalesInvoiceEntry — Redux Migration Guide
 * ──────────────────────────────────────────
 * Replace all cart/checkout useState calls with useInvoiceCart:
 *
 *   import { useInvoiceCart } from "../hooks/useInvoiceCart";
 *   const {
 *     cart, addToCart, removeFromCart, setCartItemQty,
 *     selectedCustomer, setSelectedCustomer,
 *     paymentMethod, setPaymentMethod,
 *     payments, setPayments,
 *     discount, setDiscount,
 *     selectedShopId, setSelectedShopId,
 *     variantModalOpen, itemForVariants, openVariantModal, closeVariantModal,
 *     showSuccessPopup, successData, showSuccess, hideSuccess,
 *     totals, resetInvoiceEntry,
 *   } = useInvoiceCart(salonConfig);
 *
 * Replace the createSalesInvoice axios call with:
 *   import { useCreateSalesInvoiceMutation } from "../../../store/api/invoiceEndpoints";
 *   const [createSalesInvoice, { isLoading }] = useCreateSalesInvoiceMutation();
 */
import { useState, useEffect, useMemo } from "react";
import moment from "moment";
import api from "../../../api/axiosInstance";
import PageHeader from "../../../components/shared/PageHeader";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
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
  ShoppingBag,
  Grid,
  List,
  X,
  CheckCircle2,
  Clock,
  Search as SearchIcon,
  Info,
  Store,
  Heart,
  Users,
  ChevronDown,
  Check,
  Package,
  Wallet,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../../components/shared/Modal";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentSuccessPopup from "../../../components/shared/PaymentSuccessPopup";

const successAudio = typeof Audio !== "undefined" ? new Audio("/audio/invoice.mp3") : null;
if (successAudio) {
  successAudio.preload = "auto";
}

const ProductCard = ({ product, cartQty, onAdd, currencySymbol }) => {
  const { formatDisplayNumber } = useCurrency();
  const hasVariants = product.useVariants && product.variants?.length > 0;

  const totalVariantStock = hasVariants
    ? product.variants.reduce((sum, v) => sum + (v.currentStock || 0), 0)
    : 0;

  const availableStock = hasVariants ? totalVariantStock : product.currentStock - cartQty;

  const taxPct = product.taxId?.percentage || product.taxPercent || 0;
  const isInclusive = product.isTaxInclusive || false;
  const basePrice = product.sellingPrice || 0;
  const taxAmt = taxPct > 0 ? (isInclusive ? basePrice - basePrice / (1 + taxPct / 100) : basePrice * (taxPct / 100)) : 0;
  const effectivePrice = isInclusive ? basePrice : basePrice + taxAmt;

  let priceRange = null;
  if (hasVariants) {
    const prices = product.variants.map((v) => v.sellingPrice || 0).filter((p) => p > 0);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      priceRange = minPrice === maxPrice 
        ? `${currencySymbol}${formatDisplayNumber(minPrice)}`
        : `${currencySymbol}${formatDisplayNumber(minPrice)} - ${currencySymbol}${formatDisplayNumber(maxPrice)}`;
    }
  }

  const isOutOfStock = hasVariants ? totalVariantStock <= 0 : availableStock <= 0;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`
        bg-white dark:bg-dark-surface rounded-2xl overflow-hidden flex flex-col h-full group border transition-all duration-300
        ${isOutOfStock 
          ? "opacity-60 cursor-not-allowed border-gray-100 dark:border-dark-border" 
          : "cursor-pointer border-gray-100 dark:border-dark-border hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:border-brand-primary/20"
        }
      `}
      onClick={() => !isOutOfStock && onAdd(product, product.sellingPrice)}
    >
      <div className="h-32 bg-gray-50 dark:bg-dark-card relative overflow-hidden flex items-center justify-center">
        {product.image && (product.image.url || typeof product.image === "string") ? (
          <img
            src={product.image.url || product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-dark-card transition-colors group-hover:bg-brand-primary/2">
            <Package size={32} strokeWidth={1.5} className="text-gray-200 dark:text-gray-700 transition-colors group-hover:text-brand-primary/20" />
          </div>
        )}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg">
              Out of Stock
            </span>
          </div>
        ) : hasVariants && (
          <div className="absolute top-2 right-2">
            <span className="bg-brand-primary text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
              {product.variants.length} Variants
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-[14px] mb-1.5 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">
          {product.name}
        </h4>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-lg border w-fit ${availableStock <= 5 ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100"}`}>
              {availableStock} Stock
            </span>
            {taxPct > 0 && !hasVariants && (
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 w-fit">
                {taxPct}% Tax
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="font-black text-[15px] text-brand-primary dark:text-blue-400 translate-y-0.5 notranslate">
              {hasVariants ? priceRange : `${currencySymbol}${formatDisplayNumber(effectivePrice)}`}
            </div>
            {!isInclusive && taxPct > 0 && !hasVariants && (
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">
                (+ tax)
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SalesInvoiceEntry = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, currencySymbol } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const isAdmin = true; // Temporary: Allow everyone to see all buttons/fields
  const [loading, setLoading] = useState(false);

  // Data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // UI State
  const [activeCat, setActiveCat] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const showMobileCart = location.hash === "#cart";

  // Cart & Checkout
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [payments, setPayments] = useState([{ method: "CASH", amount: "" }]);
  const [discount, setDiscount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(moment().format("YYYY-MM-DD")); // default today
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  // New Customer Modal
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [newCustData, setNewCustData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Success Popup State
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Shop Context
  const [selectedShopId, setSelectedShopId] = useState("");

  // Variant Selection
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState(null);

  const [snack, setSnack] = useState({ title: "", message: "", type: "success" });
  const showSnack = (title, message = "", type = "success") => 
    setSnack({ title, message, type });

  const catScrollRef = useHorizontalScroll();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, shopRes, custRes, paymentMethodsRes, catRes] =
          await Promise.all([
            api.get("/products").catch(() => ({ data: { success: false } })),
            api.get("/shops").catch(() => ({ data: { success: false } })),
            api
              .get("/admin/customers")
              .catch(() => ({ data: { success: false } })),
            api
              .get("/payment-methods")
              .catch(() => ({ data: { success: false } })),
            api
              .get("/product-categories")
              .catch(() => ({ data: { success: false } })),
          ]);

        if (prodRes.data?.success) setProducts(prodRes.data?.data || []);
        if (catRes.data?.success) setCategories(catRes.data?.data || []);

        if (shopRes.data?.success) {
          const fetchedShops = shopRes.data?.data || [];
          setShops(fetchedShops);
          const userBranchId = user?.branchId
            ? typeof user.branchId === "string"
              ? user.branchId
              : user.branchId._id
            : null;

          if (userBranchId) {
            setSelectedShopId(userBranchId);
          } else if (!isAdmin && user?.shop) {
            setSelectedShopId(
              typeof user.shop === "string" ? user.shop : user.shop._id,
            );
          } else if (fetchedShops.length === 1) {
            setSelectedShopId(fetchedShops[0]._id);
          }
        }

        if (custRes.data?.success) setCustomers(custRes.data?.data || []);
        if (paymentMethodsRes.data?.success) {
          const pms = paymentMethodsRes.data?.data || [];
          if (!pms.some(p => String(p.name).toUpperCase() === "DUE")) {
            pms.push({ _id: "system_due", name: "DUE", isActive: true, isDefault: true, isSystem: true });
          }
          setPaymentMethods(pms);
          if (pms.length > 0) {
            const firstMethod = pms[0].name;
            setPaymentMethod(firstMethod);
            setPayments((prev) => {
              if (
                prev.length === 1 &&
                (prev[0].method === "CASH" || !prev[0].method)
              ) {
                return [{ ...prev[0], method: firstMethod }];
              }
              return prev;
            });
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
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (
        searchQuery &&
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (activeCat !== "All" && product.category !== activeCat) {
        return false;
      }
      if (product.isSale === false) {
        return false;
      }
      return true;
    });
  }, [products, activeCat, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const lower = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.phone.includes(lower) ||
          (c.email && c.email.toLowerCase().includes(lower)),
      )
      .slice(0, 5);
  }, [customers, customerSearch]);

  // Simple Tax-exclusive calculation as per Product features
  const cartCalc = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    cart.forEach((item) => {
      const lineTotal = item.price * item.qty;
      const taxPct = item.taxPercent || 0;
      const itemTaxAmount = lineTotal * (taxPct / 100);

      subtotal += lineTotal;
      totalTax += itemTaxAmount;
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
    };
  }, [cart]);

  const cartTotal = cartCalc.subtotal + cartCalc.totalTax;
  const finalTotal = Math.max(0, cartTotal - (Number(discount) || 0));

  // --- Handlers ---
  const addToCart = (product, price) => {
    // For variant products, open variant selection modal
    if (
      product.useVariants &&
      product.variants &&
      product.variants.length > 0
    ) {
      setVariantProduct(product);
      setShowVariantModal(true);
      return;
    }
    setCart((prev) => {
      const variantKey = `prod-${product._id}-base`;
      const existing = prev.find((item) => item.variantKey === variantKey);
      if (existing) {
        if (existing.qty + 1 > product.currentStock) {
          showSnack(
            "Stock Limit",
            `Cannot add more than available stock (${product.currentStock}).`,
            "warning",
          );
          return prev;
        }
        showSnack(
          "Already in Cart", 
          `${product.name} quantity updated to ${existing.qty + 1}.`, 
          "info"
        );
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
          price: product.sellingPrice || price || 0,
          qty: 1,
          variantKey,
          variantId: "base",
          variantName: "",
          taxPercent: product.taxId?.percentage || product.taxPercent || 0,
          taxName: product.taxId?.name
            ? (product.taxId.name.includes("%")
                ? product.taxId.name
                : `${product.taxId.name} ${product.taxId.percentage}%`)
            : product.taxPercent
              ? `Tax ${product.taxPercent}%`
              : "",
          isTaxInclusive: product.isTaxInclusive || false,
        },
      ];
    });
  };

  const addVariantToCart = (product, variant) => {
    const vId = variant._id || variant.variantId?._id || variant.variantId;
    const variantKey = `prod-${product._id}-${vId}`;
    const vPrice = variant.sellingPrice || product.sellingPrice || 0;
    const vTaxPct =
      variant.taxId?.percentage ||
      variant.taxPercent ||
      product.taxId?.percentage ||
      product.taxPercent ||
      0;
    const vTaxName = variant.taxId?.name
      ? (variant.taxId.name.includes("%")
          ? variant.taxId.name
          : `${variant.taxId.name} ${variant.taxId.percentage}%`)
      : vTaxPct
        ? `Tax ${vTaxPct}%`
        : "";
    const vInclusive =
      variant.isTaxInclusive !== undefined
        ? variant.isTaxInclusive
        : product.isTaxInclusive || false;

    setCart((prev) => {
      const existing = prev.find((item) => item.variantKey === variantKey);
      if (existing) {
        if (existing.qty + 1 > (variant.currentStock || 0)) {
          showSnack(
            "Stock Limit",
            `Cannot add more than available stock (${variant.currentStock}).`,
            "warning",
          );
          return prev;
        }
        showSnack(
          "Already in Cart", 
          `${product.name} (${variant.variantName || variant.name}) quantity updated.`, 
          "info"
        );
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
          price: vPrice,
          qty: 1,
          variantKey,
          variantId: vId,
          variantName:
            variant.variantId?.name ||
            variant.variantName ||
            variant.name ||
            "Variant",
          currentStock: variant.currentStock || 0,
          taxPercent: vTaxPct,
          taxName: vTaxName,
          isTaxInclusive: vInclusive,
        },
      ];
    });
    setShowVariantModal(false);
    setVariantProduct(null);
  };

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
      const newPayments = [...prev];
      newPayments[index] = { ...newPayments[index], [field]: value };
      if (field === "method" && String(value).toUpperCase() === "DUE") {
        newPayments[index].amount = 0;
      }

      // AUTO-BALANCING LOGIC:
      if (field === "amount" && newPayments.length > 1) {
        const updatedVal = Number(value) || 0;

        if (newPayments.length === 2) {
          const otherIdx = index === 0 ? 1 : 0;
          const remaining = Math.max(0, finalTotal - updatedVal);
          newPayments[otherIdx] = {
            ...newPayments[otherIdx],
            amount: remaining || "",
          };
        } else {
          const targetIdx =
            index === newPayments.length - 1
              ? newPayments.length - 2
              : newPayments.length - 1;
          const totalOthers = newPayments.reduce((sum, p, i) => {
            if (i === targetIdx || i === index) return sum;
            return sum + (Number(p.amount) || 0);
          }, 0);
          const remaining = Math.max(0, finalTotal - totalOthers - updatedVal);
          newPayments[targetIdx] = {
            ...newPayments[targetIdx],
            amount: remaining || "",
          };
        }
      }
      return newPayments;
    });
  };

  const remainingAmount = useMemo(() => {
    const paid = payments.reduce((sum, p) => sum + (String(p.method).toUpperCase() === "DUE" ? 0 : (Number(p.amount) || 0)), 0);
    return finalTotal - paid;
  }, [payments, finalTotal]);

  const updateQty = (variantKey, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantKey === variantKey) {
            const newQty = item.qty + delta;
            if (newQty > item.currentStock) {
              showSnack(
                `Only ${item.currentStock} ${item.unit || "units"} available in stock.`,
                "warning",
              );
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean),
    );
  };

  const handleClearCart = () => {
    setShowClearCartModal(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setDiscount("");
    setPayments([{ method: paymentMethods[0]?.name || "CASH", amount: "" }]);
    setSelectedCustomer(null);
    setShowClearCartModal(false);
  };

  useEffect(() => {
    if (finalTotal >= 0) {
      setPayments((prev) => {
        if (!prev || prev.length === 0) {
          return [
            { method: paymentMethods[0]?.name || "CASH", amount: finalTotal },
          ];
        }

        if (prev.length === 1) {
          return [{ ...prev[0], amount: finalTotal }];
        }

        const currentTotalPaid = prev.reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0,
        );

        if (currentTotalPaid > finalTotal) {
          const newPayments = [...prev];
          let diff = currentTotalPaid - finalTotal;

          for (let i = newPayments.length - 1; i >= 0 && diff > 0; i--) {
            const amt = Number(newPayments[i].amount) || 0;
            if (amt > 0) {
              const reduceBy = Math.min(amt, diff);
              newPayments[i] = { ...newPayments[i], amount: Math.max(0, amt - reduceBy) };
              diff -= reduceBy;
            }
          }
          return newPayments;
        }

        return prev;
      });
    }
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

      const res = await api.post("/admin/customers", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        const newCustomer = res.data.data;
        setCustomers((prev) => [...prev, newCustomer]);
        setSelectedCustomer(newCustomer);
        setIsCustModalOpen(false);
        setNewCustData({ name: "", phone: "", email: "" });
        showSnack("Success", "Customer Created & Selected", "success");
      }
    } catch (err) {
      showSnack(
        err.response?.data?.message || "Failed to create customer",
        "error",
      );
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return showSnack("Selection", "Cart is empty.", "warning");
    if (shops.length > 1 && !selectedShopId)
      return showSnack("Selection", "Please select a shop.", "warning");

    // Validate Wallet Balance - No longer blocking, just ensuring customer is selected
    const walletPayment = payments.find((p) => p.method === "WALLET");
    if (walletPayment && Number(walletPayment.amount) > 0) {
      if (!selectedCustomer) {
        showSnack("Validation", "Customer must be selected for Wallet payment.", "warning");
        return;
      }
    }

    const shop = selectedShopId || (shops.length === 1 ? shops[0]._id : null);

    try {
      setLoading(true);
      const items = cart.map((item) => ({
        product: item._id,
        productName: item.variantName
          ? `${item.name} ${item.variantName}`
          : item.name,
        variantName: item.variantName || "",
        quantity: item.qty,
        price: item.price,
        taxPercent: item.taxPercent,
        taxName:
          item.taxName || (item.taxPercent ? `Tax ${item.taxPercent}%` : ""),
        isTaxInclusive: item.isTaxInclusive || false,
        taxAmount: item.price * item.qty * ((item.taxPercent || 0) / 100),
        amount: item.price * item.qty,
        hsnCode: item.hsnCode || "",
      }));

      const payload = {
        shopId: shop,
        branchId: shop,
        customer: selectedCustomer ? selectedCustomer._id : null,
        items: items,
        paidAmount:
          Number(
            payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
          ) || 0,
        paymentMethod:
          payments.length > 1 ? "Split" : payments[0]?.method || paymentMethod,
        payments: payments.map((p) => ({
          method: p.method,
          amount: Number(p.amount) || 0,
        })),
        date: invoiceDate || moment().format("YYYY-MM-DD"),
        invoiceDate: (() => {
          if (!invoiceDate) return undefined;
          const todayStr = moment().format("YYYY-MM-DD");
          return invoiceDate === todayStr 
            ? moment().toISOString() 
            : moment(invoiceDate).endOf('day').toISOString();
        })(),
        discount: Number(discount) || 0,
      };

      // Await actual API call instead of optimistic save to prevent mobile browsers blocking print dialog
      const res = await api.post("/sales/invoices", payload);
      const realData = res.data?.data;
      
      const responseData = {
        totalAmount: finalTotal,
        invoiceNumber: realData?.invoiceNumber || "N/A",
        roundOffAmount: realData?.roundOffAmount || 0,
      };

      handleCheckoutSuccess(responseData);
      setLoading(false);

      // Refresh Customer Data if Wallet was used or Due was created
      if (selectedCustomer) {
        try {
          const custRes = await api.get("/admin/customers");
          if (custRes.data?.success) {
            setCustomers(custRes.data.data);
          }
        } catch (errRefresh) {
          console.error("Could not refresh customer logic.", errRefresh);
        }
      }

      // Refetch products to update stock instantly
      try {
        const prodRes = await api.get("/products");
        if (prodRes.data?.success) setProducts(prodRes.data.data);
      } catch (errRefresh) {
        console.error("Could not refresh product logic.", errRefresh);
      }

      function handleCheckoutSuccess(responseData) {
        const shopNameVal = selectedShopId
          ? shops.find((b) => b._id === selectedShopId)?.name
          : shops[0]?.name || user?.salonName || "Salon";
        const selectedBranch = shops?.find((b) => b._id === selectedShopId);
        const fallbackShopLoc = user?.shop?.area ? `${user.shop.area}, ${user.shop.state}` : user?.shop?.address || "";
        const shopLocVal = selectedBranch
          ? (selectedBranch.mapAddress || selectedBranch.address || fallbackShopLoc)
          : fallbackShopLoc;
        const shopPhoneVal = selectedShopId
          ? shops.find((b) => b._id === selectedShopId)?.phone
          : user?.phone || "";

        // Build Google Maps URL from branch lat/lng or mapAddress
        let shopGoogleMapsUrl = "";
        if (selectedBranch?.latitude && selectedBranch?.longitude) {
          shopGoogleMapsUrl = `https://maps.google.com/?q=${selectedBranch.latitude},${selectedBranch.longitude}`;
        } else if (selectedBranch?.mapAddress) {
          shopGoogleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(selectedBranch.mapAddress)}`;
        }

        setSuccessData({
          amount: responseData?.totalAmount || finalTotal,
          invoiceNo: responseData?.invoiceNumber || "N/A",
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
            userId: selectedCustomer?._id,
            roundOffAmount: responseData?.roundOffAmount || 0,
            showRoundOffInReceipt:
              Boolean(user?.shop?.enableRoundOff) &&
              Math.abs(Number(responseData?.roundOffAmount) || 0) > 0.001,
            items: cart.map((item) => ({
              product: item._id,
              productName: item.name,
              quantity: item.qty,
              price: item.price,
              discount: 0,
              amount: item.price * item.qty,
              taxPercent: item.taxPercent,
              itemType: "product",
              variantName: item.variantName || null,
              hsnCode: item.hsnCode || "",
            })),
            paymentMethod: payload.paymentMethod,
            payments: payload.payments,
            subTotal: cartCalc.subtotal,
            finalTotal: responseData?.totalAmount || finalTotal,
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
              mapAddress: selectedBranch?.mapAddress || "",
              phone: shopPhoneVal,
              gstin: user?.shop?.gstin || "",
              googleMapsUrl: shopGoogleMapsUrl,
            },
            invoiceNumber: responseData?.invoiceNumber || "N/A",
            invoiceDate: invoiceDate
              ? moment()
                  .set({
                    year: moment(invoiceDate).year(),
                    month: moment(invoiceDate).month(),
                    date: moment(invoiceDate).date(),
                  })
                  .toISOString()
              : new Date().toISOString(),
          }
        });
        setShowSuccessPopup(true);

        try {
          if (successAudio) {
            successAudio.currentTime = 0;
            successAudio.play().catch(e => console.log('Audio play failed:', e));
          }
        } catch (err) {
          console.error("Audio playback error:", err);
        }

        setCart([]);
        setSelectedCustomer(null);
        setDiscount("");
        setPayments([{ method: paymentMethods[0]?.name || "CASH", amount: "" }]);
      }
    } catch (err) {
      showSnack("Error", err.response?.data?.message || "Checkout Failed", "error");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full flex flex-col md:flex-row gap-6 relative">
      <PaymentSuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        amount={successData?.amount}
        invoiceNo={successData?.invoiceNo}
        paymentMethod={successData?.paymentMethod}
        paymentTime={successData?.paymentTime}
        currencySymbol={currencySymbol}
        receiptPayload={successData?.receiptPayload}
      />
      <Snackbar
        title={snack.title}
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "", title: "" })}
      />

      {/* Variant Selection Modal */}
      <Modal
        isOpen={showVariantModal}
        onClose={() => {
          setShowVariantModal(false);
          setVariantProduct(null);
        }}
        title="Select Variant"
        maxWidth="max-w-md"
      >
        {variantProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-blue-400">
                <Package size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">
                  {variantProduct.name}
                </h4>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                  {variantProduct.variants?.length} variants available
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 max-h-[50vh] overflow-y-auto">
              {variantProduct.variants?.map((v) => {
                const vId = v._id || v.variantId?._id || v.variantId;
                const vPrice = v.sellingPrice || 0;
                const vStock = v.currentStock || 0;
                const vTaxPct = v.taxId?.percentage || v.taxPercent || 0;
                const vInclusive = v.isTaxInclusive || false;
                return (
                  <button
                    key={vId}
                    disabled={vStock <= 0}
                    onClick={() => addVariantToCart(variantProduct, v)}
                    className={`flex-1 min-w-35 flex flex-col items-start p-4 rounded-2xl border transition-all duration-200 active:scale-95 ${
                      vStock <= 0
                        ? "opacity-50 grayscale cursor-not-allowed bg-gray-50 dark:bg-dark-card border-gray-200 dark:border-dark-border"
                        : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border hover:border-brand-primary/30 hover:bg-brand-primary/2 cursor-pointer"
                    }`}
                  >
                    <span className="text-[13px] font-black uppercase tracking-tight text-gray-700 dark:text-gray-300">
                      {v.variantId?.name ||
                        v.variantName ||
                        v.name ||
                        "Variant"}
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-[16px] font-black text-gray-900 dark:text-white notranslate">
                        {currencySymbol}
                        {formatDisplayNumber(vPrice)}
                      </span>
                      {vTaxPct > 0 && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                          {vTaxPct}%{!vInclusive && " +tax"}
                        </span>
                      )}
                    </div>
                    <div
                      className={`mt-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        vStock <= 5
                          ? "bg-red-50 text-red-500 border-red-100"
                          : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100"
                      }`}
                    >
                      {vStock}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                setShowVariantModal(false);
                setVariantProduct(null);
              }}
              className="w-full py-3 rounded-xl bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 font-bold text-[12px] uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-dark-card transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </Modal>
      {/* LEFT COLUMN: Product Selection */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-transparent h-full ${showMobileCart ? "hidden md:flex" : "flex"}`}
      >
        {/* Header / Filters */}
        <div className="bg-white dark:bg-dark-surface rounded-3xl p-4 border border-gray-100 dark:border-dark-border mb-4 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-4">
            <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <ShoppingBag className="text-brand-primary dark:text-blue-400" /> Product Sales
            </h2>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <SearchIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search products by name or sku..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50/50 rounded-xl pl-9 pr-4 py-2 text-[12px] font-bold text-gray-700 dark:text-gray-300 border border-transparent focus:border-brand-primary/20 focus:bg-white dark:bg-dark-surface outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div ref={catScrollRef} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCat("All")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${activeCat === "All" ? "text-brand-primary bg-brand-primary/5" : "text-gray-400 hover:text-gray-600 dark:text-gray-400"}`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setActiveCat(cat.name)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${activeCat === cat.name ? "text-brand-primary bg-brand-primary/5" : "text-gray-400 hover:text-gray-600 dark:text-gray-400"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((c) => c._id === product._id);
                const cartQty = cartItem ? cartItem.qty : 0;
                return (
                  <ProductCard
                    key={product._id}
                    product={product}
                    cartQty={cartQty}
                    onAdd={addToCart}
                    currencySymbol={currencySymbol}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-60">
              <Package size={48} className="mb-4" />
              <p>No products found in inventory</p>
            </div>
          )}
        </div>

        {/* Mobile Floating Cart Summary */}
        {!showMobileCart && cart.length > 0 && (
          <div className="md:hidden fixed bottom-16 left-0 w-full bg-gray-900 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-4 z-40 flex items-center justify-between pointer-events-auto border-t border-gray-800">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">
                {cart.reduce((a, b) => a + b.qty, 0)} item
                {cart.reduce((a, b) => a + b.qty, 0) !== 1 && "s"}
              </span>
              <span className="text-xl font-black notranslate leading-none">
                {currencySymbol}
                {formatDisplayNumber(
                  cartCalc.subtotal + cartCalc.totalTax,
                )}
              </span>
            </div>
            <button
              onClick={() => navigate("#cart")}
              className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-secondary active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/30"
            >
              View Cart
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Cart & Checkout */}
      <div
        className={`shrink-0 flex-col overflow-hidden bg-white dark:bg-dark-surface 
          ${showMobileCart ? "fixed top-0 left-0 right-0 bottom-16 z-40 w-full rounded-none border-none flex" : "hidden md:flex md:relative md:w-105 md:h-full md:rounded-3xl md:border md:border-gray-100 dark:border-dark-border"}
        `}
      >
        {/* Mobile Back to Products */}
        <div className="md:hidden p-4 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center pt-safe sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-bold text-[11px] uppercase tracking-wider hover:text-brand-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Products
          </button>
        </div>

        <div className="p-4 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border flex flex-col gap-3">
          {/* Shop Selector */}
          {(isAdmin || (user?.role === "staff" ? false : shops.length > 1)) && (
            <div className="flex gap-2">
              {(shops.length > 1 || isAdmin || user?.role === "staff") && (
                <div className="flex-1">
                  <CustomDropdown
                    variant="compact"
                    icon={Store}
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    options={shops
                      .filter((shop) => {
                        if (user?.role === "staff") {
                          const userBranchId =
                            typeof user.branchId === "string"
                              ? user.branchId
                              : user.branchId?._id;
                          return shop._id === userBranchId;
                        }
                        return true;
                      })
                      .map((shop) => ({
                        value: shop._id,
                        label: shop.name,
                      }))}
                    placeholder="Select Branch"
                  />
                </div>
              )}
            </div>
          )}

          {/* Customer Selection */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              {selectedCustomer ? (
                <div className="bg-brand-primary/5 p-2 rounded-xl flex items-center justify-between border border-brand-primary/10">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-surface flex items-center justify-center text-brand-primary dark:text-blue-400 font-black text-xs shrink-0">
                      {selectedCustomer.name?.charAt(0) || "?"}
                    </div>
                    <div className="leading-tight truncate">
                      <p className="font-bold text-[11px] text-gray-800 dark:text-gray-100 truncate">
                        {selectedCustomer.name || "Unnamed Customer"}
                      </p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500">
                        {selectedCustomer.phone}
                        {(selectedCustomer.walletBalance || 0) !== 0 && (
                          <span
                            className={`ml-2 font-bold whitespace-nowrap ${selectedCustomer.walletBalance > 0 ? "text-emerald-500" : "text-rose-500"}`}
                          >
                            {selectedCustomer.walletBalance > 0
                              ? "Wallet:"
                              : "Due:"}{" "}
                            <span className="notranslate">
                              {currencySymbol}
                              {formatDisplayNumber(
                                Math.abs(selectedCustomer.walletBalance),
                              )}
                            </span>
                          </span>
                        )}
                      </p>
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
                <div className="relative">
                  <CustomTextField
                    variant="compact"
                    placeholder="Find Customer (Optional)..."
                    icon={SearchIcon}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerResults(true);
                    }}
                    onFocus={() => setShowCustomerResults(true)}
                  />
                  {showCustomerResults && customerSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border z-50 max-h-48 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <button
                            key={c._id}
                            onClick={() => handleCustomerSelect(c)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card border-b border-gray-50 last:border-none"
                          >
                            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                              {c.name}
                            </p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500">
                              {c.phone}
                            </p>
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
                  )}
                </div>
              )}
            </div>
            {!selectedCustomer && (
              <button
                onClick={() => setIsCustModalOpen(true)}
                className="p-2 bg-gray-50 dark:bg-dark-card rounded-xl text-brand-primary dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Cart Header with Date Picker */}
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
          <CustomDatePicker compact={true} value={invoiceDate} onChange={setInvoiceDate} />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-white dark:bg-dark-surface">
          {cart.length > 0 ? (
            <div className="space-y-2">
              {cart.map((item) => {
                const lineTotal = item.price * item.qty;
                const taxPct = item.taxPercent || 0;
                const lineTax = lineTotal * (taxPct / 100);
                const lineDisplay = lineTotal + lineTax;

                return (
                  <div
                    key={item.variantKey || item._id}
                    className="p-2 bg-gray-50 dark:bg-dark-card/50 rounded-xl border border-gray-100 dark:border-dark-border flex items-center gap-2 transition-all hover:border-brand-primary/20"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[10px] text-gray-700 dark:text-gray-300 truncate">
                        {item.name}
                        {item.variantName && (
                          <span className="text-brand-primary dark:text-blue-400 ml-1">
                            {item.variantName}
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                          {item.category}
                        </p>
                        {item.hsnCode && (
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                            (HSN: {item.hsnCode})
                          </p>
                        )}
                        {taxPct > 0 && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100">
                            Tax {taxPct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-dark-surface rounded-lg p-0.5 border border-gray-100 dark:border-dark-border">
                        <button
                          onClick={() =>
                            updateQty(item.variantKey || item._id, -1)
                          }
                          className="w-4 h-4 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500"
                        >
                          <Minus size={8} />
                        </button>
                        <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 min-w-[0.8rem] text-center">
                          {item.qty}
                        </span>
                        <button
                          onClick={() =>
                            updateQty(item.variantKey || item._id, 1)
                          }
                          className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:text-blue-400"
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                      <div className="text-right min-w-10">
                        <p className="text-gray-800 dark:text-gray-100 font-black text-[10px]">
                          <span className="notranslate">
                            {currencySymbol}
                            {formatDisplayNumber(lineDisplay)}
                          </span>
                        </p>
                        {lineTax > 0 && (
                          <p className="text-[8px] text-emerald-500 font-bold">
                            tax:{" "}
                            <span className="notranslate">
                              {currencySymbol}
                              {formatDisplayNumber(lineTax)}
                            </span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter((i) => i._id !== item._id),
                          )
                        }
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
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

        {/* Checkout Summary Footer */}
        <div className="px-4 py-4 bg-gray-50/60 dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border mt-auto flex flex-col gap-4">
          {/* Payment Actions */}
          <div className="space-y-2">
            <div className="overflow-visible space-y-2">
              {payments.map((p, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="w-30 sm:w-37.5 shrink-0">
                    <CustomDropdown
                      variant="compact"
                      value={p.method}
                      onChange={(e) =>
                        handleUpdatePayment(index, "method", e.target.value)
                      }
                      options={paymentMethods.map((m) => ({
                        value: m.name,
                        label: m.name,
                      }))}
                      placeholder="Method"
                    />
                  </div>
                  <div className="flex-1 h-8.5 bg-white dark:bg-dark-surface rounded-lg px-3 border border-gray-200 dark:border-dark-border flex items-center focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold notranslate">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      value={String(p.method).toUpperCase() === "DUE" ? 0 : p.amount}
                      disabled={String(p.method).toUpperCase() === "DUE"}
                      onChange={(e) =>
                        handleUpdatePayment(index, "amount", e.target.value)
                      }
                      className={`w-full bg-transparent text-[11.5px] font-black outline-none text-right ${
                        String(p.method).toUpperCase() === "DUE" ? "text-gray-400 cursor-not-allowed" : "text-gray-800 dark:text-gray-200"
                      }`}
                      placeholder="0"
                    />
                  </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {payments.length > 1 && (
                        <button
                          onClick={() => handleRemovePaymentRow(index)}
                          className="h-8.5 w-8.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {index === payments.length - 1 && (
                        <button
                          onClick={handleAddPaymentRow}
                          className="h-8.5 px-3 bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/20 hover:border-brand-primary/30 text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shrink-0"
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

          {/* Totals Summary Block */}
          <div className="bg-white dark:bg-dark-card/50 py-2 px-3 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase">
                Subtotal
              </span>
              <span className="font-black text-gray-700 dark:text-gray-300">
                <span className="notranslate">
                  {currencySymbol}
                  {formatDisplayNumber(cartCalc.subtotal)}
                </span>
              </span>
            </div>

            {cartCalc.totalTax > 0 && (
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Tax
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  <span className="notranslate">
                    +{currencySymbol}
                    {formatDisplayNumber(cartCalc.totalTax)}
                  </span>
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] mb-2">
              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase">
                Discount
              </span>
              <div className="flex items-center w-16 bg-white dark:bg-dark-surface rounded border border-gray-200 dark:border-dark-border px-1 py-0.5">
                <span className="text-[9px] text-gray-400 dark:text-gray-500 mr-1 notranslate">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full bg-transparent outline-none font-bold text-right text-[10px]"
                />
              </div>
            </div>

            {/* Wallet Usage Prompt */}
            {selectedCustomer &&
              (selectedCustomer.walletBalance || 0) > 0 &&
              finalTotal > 0 &&
              payments.every((p) => p.method !== "WALLET") && (
                <div className="mb-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-brand-primary dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Wallet size={12} /> Wallet Balance
                    </span>
                    <span className="text-[11px] font-black text-brand-primary dark:text-blue-400 notranslate">
                      {currencySymbol}
                      {formatDisplayNumber(selectedCustomer.walletBalance || 0)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const useAmount = Math.min(
                        finalTotal,
                        selectedCustomer.walletBalance || 0,
                      );
                      if (useAmount >= finalTotal) {
                        setPayments([{ method: "WALLET", amount: useAmount }]);
                      } else {
                        const existingWalletIdx = payments.findIndex(
                          (p) => p.method === "WALLET",
                        );
                        if (existingWalletIdx >= 0) {
                          handleUpdatePayment(
                            existingWalletIdx,
                            "amount",
                            useAmount,
                          );
                        } else {
                          if (
                            payments.length === 1 &&
                            (payments[0].amount === "" ||
                              Number(payments[0].amount) === 0)
                          ) {
                            setPayments([
                              { method: "WALLET", amount: useAmount },
                            ]);
                          } else {
                            setPayments([
                              ...payments,
                              { method: "WALLET", amount: useAmount },
                            ]);
                          }
                        }
                      }
                    }}
                    className="w-full py-1.5 bg-brand-primary hover:bg-brand-secondary text-white text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors shadow-sm"
                  >
                    Use Wallet to Pay
                  </button>
                </div>
              )}



            {/* Outstanding/Overpayment info area */}
            {remainingAmount > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                  Unpaid:{" "}
                  <span className="notranslate">
                    {currencySymbol}
                    {formatDisplayNumber(remainingAmount)}
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
              <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Overpaid:{" "}
                  <span className="notranslate">
                    {currencySymbol}
                    {formatDisplayNumber(Math.abs(remainingAmount))}
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

          {/* Unified Save Button */}
          <button
            onClick={handleCheckout}
            disabled={
              loading ||
              cart.length === 0 ||
              (remainingAmount !== 0 && !selectedCustomer)
            }
            className={`w-full font-black py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs
                            ${
                              loading || cart.length === 0
                                ? "bg-gray-200 dark:bg-dark-border text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                : remainingAmount > 0
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-[0.98]"
                                  : remainingAmount < 0
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 active:scale-[0.98]"
                                    : "bg-brand-primary text-white hover:bg-brand-secondary active:scale-[0.98] shadow-brand-primary/20"
                            }`}
          >
            {loading ? (
              <Clock className="animate-spin" size={16} />
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
                    ? "DUE & SAVE INVOICE"
                    : remainingAmount < 0
                      ? "WALLET & SAVE INVOICE"
                      : "SAVE INVOICE"}
                </span>
                <span className="opacity-50 mx-1">•</span>
                <span className="notranslate text-[15px] tracking-normal">
                  {currencySymbol}{formatDisplayNumber(finalTotal)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Create Customer Modal */}
      <Modal
        isOpen={isCustModalOpen}
        onClose={() => setIsCustModalOpen(false)}
        title="Quick Add Customer"
        size="sm"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <CustomTextField
            label="Full Name"
            icon={User}
            placeholder="e.g. John Doe"
            value={newCustData.name}
            onChange={(e) =>
              setNewCustData({ ...newCustData, name: e.target.value })
            }
            required
          />
          <CustomTextField
            label="Phone Number"
            icon={Phone}
            placeholder="e.g. 9876543210"
            value={newCustData.phone}
            onChange={(e) =>
              setNewCustData({ ...newCustData, phone: e.target.value })
            }
            required
          />
          <CustomTextField
            label="Email Address (Optional)"
            icon={Mail}
            placeholder="e.g. john@example.com"
            type="email"
            value={newCustData.email}
            onChange={(e) =>
              setNewCustData({ ...newCustData, email: e.target.value })
            }
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-secondary shadow-sm"
          >
            Save & Select Customer
          </button>
        </form>
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
};

export default SalesInvoiceEntry;
