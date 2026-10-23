import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Minus,
  Check,
  Package,
  Eye,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkle,
  Phone,
  MapPin,
  Clock,
  Layers,
  ChevronRight
} from "lucide-react";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { useTheme } from "../../../components/shared/ThemeContext";
import {
  addToUserCart,
  setCartOpen,
  selectUserCartCount
} from "../../../store/slices/userAppSlice";
import Snackbar from "../../../components/shared/Snackbar";

const UserHome = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { salonConfig, currencySymbol, user } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const { theme, setTheme } = useTheme();
  const cartCount = useSelector(selectUserCartCount);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured"); // 'featured' | 'price-asc' | 'price-desc' | 'name'
  const [inStockOnly, setInStockOnly] = useState(false);

  // Quick View Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [addedAnimationId, setAddedAnimationId] = useState(null);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  const showSnack = (message, type = "success") => setSnack({ message, type });

  const salonName = salonConfig?.salonName || "Saloon";
  const salonPhone = salonConfig?.phone || "+91 99999 99999";
  const salonAddress = salonConfig?.address && salonConfig.address !== "N/A"
    ? salonConfig.address
    : [salonConfig?.area, salonConfig?.state, salonConfig?.country].filter(Boolean).join(", ") || "Main Salon Center";

  // Fetch Products added by Admin
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/products");
        if (isMounted && res.data?.success) {
          setProducts(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        if (isMounted) {
          showSnack("Could not load products. Please try again.", "error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Distinct Categories
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        cats.add(p.category.trim());
      }
    });
    return ["all", ...Array.from(cats)];
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter(
        (p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    // In-stock only filter
    if (inStockOnly) {
      list = list.filter((p) => (p.currentStock || 0) > 0);
    }

    // Sorting
    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => (a.sellingPrice || 0) - (b.sellingPrice || 0));
        break;
      case "price-desc":
        list.sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0));
        break;
      case "name":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "featured":
      default:
        // Prioritize in-stock and favorites
        list.sort((a, b) => (b.isFavourite ? 1 : 0) - (a.isFavourite ? 1 : 0));
        break;
    }

    return list;
  }, [products, selectedCategory, searchQuery, inStockOnly, sortBy]);

  // Handle Add To Cart
  const handleAddToCart = (product, quantity = 1, variant = null) => {
    const hasVariants = product.useVariants && product.variants?.length > 0;
    const activeVariant = variant || (hasVariants ? product.variants[0] : null);

    const price = activeVariant?.price !== undefined
      ? Number(activeVariant.price)
      : Number(product.sellingPrice || 0);

    const stock = activeVariant?.currentStock !== undefined
      ? activeVariant.currentStock
      : (product.currentStock || 0);

    if (stock <= 0) {
      showSnack("Sorry, this item is out of stock", "error");
      return;
    }

    dispatch(
      addToUserCart({
        _id: product._id,
        name: product.name,
        price,
        sellingPrice: price,
        image: product.image?.url || product.image,
        itemType: "product",
        qty: quantity,
        taxPercent: product.taxPercent || 0,
        isTaxInclusive: product.isTaxInclusive || false,
        variantId: activeVariant?._id || activeVariant?.variantId?._id || null,
        variantName: activeVariant?.name || activeVariant?.variantName || null,
      })
    );

    // Visual feedback
    setAddedAnimationId(product._id);
    setTimeout(() => setAddedAnimationId(null), 1200);

    showSnack(`Added ${product.name} to cart!`, "success");
  };

  // Open Quick View Modal
  const handleOpenQuickView = (product) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    if (product.useVariants && product.variants?.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  };

  const handleCloseQuickView = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  return (
    <div className="min-h-screen bg-[#fafafc] dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      {/* ── TOP HEADER / NAVIGATION BAR ── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#12131a]/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Salon Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-lg tracking-wider shadow-sm">
              {salonName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-extrabold text-lg leading-tight tracking-tight text-gray-900 dark:text-white">
                {salonName}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Official Store
              </div>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, SKU, or category..."
              className="w-full pl-10 pr-9 py-2 rounded-full bg-gray-100 dark:bg-gray-800/60 border border-transparent focus:border-gray-300 dark:focus:border-gray-700 text-sm outline-none transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Toggle Dark Mode"
              aria-label="Toggle Dark Mode"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => dispatch(setCartOpen(true))}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-sm"
              aria-label="Open Shopping Cart"
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">Bag</span>
              {cartCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black leading-none min-w-4 text-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Admin Portal Shortcut if Admin */}
            {user && (user.role === "admin" || user.role === "SHOP_ADMIN" || user.role === "staff") && (
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="hidden lg:flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Admin Panel <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-9 py-2 rounded-full bg-gray-100 dark:bg-gray-800/80 text-sm outline-none placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO PROMOTIONAL BANNER ── */}
      <section className="bg-gradient-to-br from-gray-900 via-neutral-900 to-black text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest backdrop-blur-md">
              <Sparkles size={14} className="text-yellow-400" />
              100% Genuine Salon Products
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Exclusive Salon Collection
            </h1>
            <p className="text-gray-300 text-sm sm:text-base font-normal leading-relaxed">
              Discover authentic, professional-grade haircare, skincare, and styling products added directly by our salon specialists.
            </p>
          </div>

          {/* Quick Features */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3">
              <ShieldCheck size={22} className="text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Verified Quality</div>
                <div className="text-[10px] text-gray-400">Salon Recommended</div>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3">
              <Truck size={22} className="text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Fast Delivery</div>
                <div className="text-[10px] text-gray-400">Pickup & Shipping</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY PILLS BAR ── */}
      <section className="bg-white dark:bg-[#12131a] border-b border-gray-100 dark:border-gray-800 sticky top-18 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                  isActive
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-xs scale-102"
                    : "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {cat === "all" ? "All Products" : cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── CATALOG CONTROLS & FILTER STRIP ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Layers size={15} />
          Showing {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"}
          {selectedCategory !== "all" && (
            <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-[10px] text-gray-800 dark:text-gray-200 lowercase font-medium">
              in {selectedCategory}
            </span>
          )}
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* In Stock Only Checkbox */}
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-gray-600 dark:text-gray-300 select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700 text-black focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            In Stock Only
          </label>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 outline-none cursor-pointer text-gray-700 dark:text-gray-200"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── PRODUCTS GRID ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs animate-pulse space-y-4"
              >
                <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white dark:bg-[#12131a] rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-xs my-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <Package size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {products.length === 0 ? "No Products in Catalog" : "No Matching Products Found"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                {products.length === 0
                  ? "Products added by the admin in the Stock / Products Manager will appear here automatically."
                  : "Try clearing your search query or choosing a different category."}
              </p>
            </div>
            {products.length === 0 ? (
              user && (user.role === "admin" || user.role === "SHOP_ADMIN") && (
                <button
                  onClick={() => navigate("/admin/stock")}
                  className="px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all"
                >
                  Go to Stock Manager
                </button>
              )
            ) : (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setInStockOnly(false);
                }}
                className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const hasVariants = product.useVariants && product.variants?.length > 0;
              const price = hasVariants
                ? (product.variants[0]?.price || product.sellingPrice || 0)
                : (product.sellingPrice || 0);

              const totalStock = hasVariants
                ? product.variants.reduce((acc, v) => acc + (v.currentStock || 0), 0)
                : (product.currentStock || 0);

              const isOutOfStock = totalStock <= 0;
              const imageUrl = product.image?.url || product.image;
              const isAdded = addedAnimationId === product._id;

              return (
                <div
                  key={product._id}
                  className="group bg-white dark:bg-[#12131a] rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Top Image Container */}
                  <div className="relative aspect-square bg-gray-50 dark:bg-gray-800/40 overflow-hidden cursor-pointer flex items-center justify-center" onClick={() => handleOpenQuickView(product)}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-2">
                        <Package size={40} strokeWidth={1.2} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {product.category || "Product"}
                        </span>
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                      {isOutOfStock ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500 text-white shadow-xs">
                          Sold Out
                        </span>
                      ) : totalStock <= 5 ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                          In Stock
                        </span>
                      )}
                    </div>

                    {/* Quick View Button Hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQuickView(product);
                      }}
                      className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                      title="Quick View"
                    >
                      <Eye size={16} />
                    </button>
                  </div>

                  {/* Product Details Section */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Category */}
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">
                        {product.category || "General"}
                      </span>

                      {/* Title */}
                      <h3
                        onClick={() => handleOpenQuickView(product)}
                        className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1 hover:text-black dark:hover:text-gray-300 cursor-pointer"
                        title={product.name}
                      >
                        {product.name}
                      </h3>

                      {/* Description Snippet */}
                      {product.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 font-light leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Pricing and Action */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white notranslate leading-none">
                          {currencySymbol}
                          {formatDisplayNumber(price)}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium mt-0.5">
                          {product.isTaxInclusive ? "Tax included" : "+ Tax"}
                        </div>
                      </div>

                      {/* Add Button */}
                      <button
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(product)}
                        className={`px-3.5 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                          isOutOfStock
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                            : isAdded
                            ? "bg-emerald-600 text-white scale-95"
                            : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95 shadow-xs"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={14} /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={14} strokeWidth={2.5} /> Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── QUICK VIEW / DETAILS MODAL ── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="bg-white dark:bg-[#12131a] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Product Details
              </span>
              <button
                onClick={handleCloseQuickView}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                {/* Product Image */}
                <div className="aspect-square bg-gray-50 dark:bg-gray-800/40 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-800">
                  {selectedProduct.image?.url || selectedProduct.image ? (
                    <img
                      src={selectedProduct.image.url || selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={50} strokeWidth={1.2} className="text-gray-300 dark:text-gray-600" />
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {selectedProduct.category || "General"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-2 leading-tight">
                      {selectedProduct.name}
                    </h2>
                    {selectedProduct.sku && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        SKU: {selectedProduct.sku}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-0.5">
                    <div className="text-2xl font-black text-gray-900 dark:text-white notranslate">
                      {currencySymbol}
                      {formatDisplayNumber(
                        selectedVariant?.price !== undefined
                          ? selectedVariant.price
                          : selectedProduct.sellingPrice || 0
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      {selectedProduct.isTaxInclusive ? "Price includes all taxes" : "Taxes calculated at checkout"}
                    </div>
                  </div>

                  {/* Stock Availability */}
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        (selectedVariant?.currentStock ?? selectedProduct.currentStock) > 0
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span>
                      {(selectedVariant?.currentStock ?? selectedProduct.currentStock) > 0
                        ? `Available: ${selectedVariant?.currentStock ?? selectedProduct.currentStock} in stock`
                        : "Currently Out of Stock"}
                    </span>
                  </div>

                  {/* Variants Selector if exists */}
                  {selectedProduct.useVariants && selectedProduct.variants?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                        Select Variant:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants.map((v, i) => {
                          const isSelected = selectedVariant?._id === v._id;
                          return (
                            <button
                              key={v._id || i}
                              onClick={() => setSelectedVariant(v)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                isSelected
                                  ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                              }`}
                            >
                              {v.name || v.variantName || `Variant ${i + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                      Quantity:
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                        <button
                          onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                          className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-4 text-xs font-black min-w-8 text-center">
                          {modalQuantity}
                        </span>
                        <button
                          onClick={() => setModalQuantity((q) => q + 1)}
                          className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Description */}
              {selectedProduct.description && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Product Description
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-light whitespace-pre-line">
                    {selectedProduct.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={handleCloseQuickView}
                className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                disabled={(selectedVariant?.currentStock ?? selectedProduct.currentStock) <= 0}
                onClick={() => {
                  handleAddToCart(selectedProduct, modalQuantity, selectedVariant);
                  handleCloseQuickView();
                }}
                className="px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2"
              >
                <ShoppingBag size={15} /> Add {modalQuantity} to Bag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-white dark:bg-[#12131a] border-t border-gray-100 dark:border-gray-800 mt-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <div className="font-extrabold text-base text-gray-900 dark:text-white">
              {salonName} Store
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-center md:justify-start gap-4">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-gray-400" /> {salonAddress}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={13} className="text-gray-400" /> {salonPhone}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} {salonName}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Notification Toast */}
      {snack.message && (
        <Snackbar
          message={snack.message}
          type={snack.type}
          onClose={() => setSnack({ message: "", type: "success" })}
        />
      )}
    </div>
  );
};

export default UserHome;
