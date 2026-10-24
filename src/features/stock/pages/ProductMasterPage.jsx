import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useBulkDeleteProductsMutation,
  useToggleProductStatusMutation,
  useToggleProductSaleStatusMutation,
  useToggleProductFavouriteMutation
} from "../../../store/api/stockEndpoints";
import { useGetShopsQuery } from "../../../store/api/tenantEndpoints";
import CustomTable from "../../../components/shared/CustomTable";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  Edit3, Trash2, Hash, Package, DollarSign,
  Camera, Sparkles, Loader2, AlertTriangle, MinusCircle,
  Plus, UploadCloud, Heart, Tag, DownloadCloud
} from "lucide-react";
import StatsGrid from "../../../components/shared/StatsGrid";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import ImageGenerationModal from "../../../components/shared/ImageGenerationModal";
import BulkImageProgressModal from "../../../components/shared/BulkImageProgressModal";
import UploadProductsModal from "../../../components/shared/UploadProductsModal";
import { TableSkeleton } from "../../../components/shared/Skeleton";
import Snackbar from "../../../components/shared/Snackbar";
import { validateFileSize, getFileSizeHint } from "../../../utils/fileUploadUtils";
import * as XLSX from "xlsx";

const ProductMasterPage = () => {
  const { user, currencySymbol, hasPermission, isAdmin } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const canAdd = isAdmin || hasPermission("stock:products:add");
  const canEdit = isAdmin || hasPermission("stock:products:edit");
  const canDelete = isAdmin || hasPermission("stock:products:delete");
  const canChangeStatus = isAdmin || hasPermission("stock:products:status");
  const canChangeSale = isAdmin || hasPermission("stock:products:sale_status");
  const canGenerateImage = isAdmin || hasPermission("stock:products:image");

  const { data: shopsRaw } = useGetShopsQuery("");

  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    hsnCode: "",
    purchasePrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    isSale: true,
    branches: [],
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkImageModal, setShowBulkImageModal] = useState(false);
  const [itemsToGenerate, setItemsToGenerate] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedBranch] = useState(
    user?.role === "staff" && user?.branchId
      ? typeof user.branchId === "string" ? user.branchId : user.branchId._id
      : ""
  );

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageGenerationModalOpen, setIsImageGenerationModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetProductForImageGeneration, setTargetProductForImageGeneration] = useState(null);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  // RTK Mutations
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [bulkDeleteProducts] = useBulkDeleteProductsMutation();
  const [toggleStatus] = useToggleProductStatusMutation();
  const [toggleSaleStatus] = useToggleProductSaleStatusMutation();
  const [toggleFavourite] = useToggleProductFavouriteMutation();

  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleExportProducts = () => {
    const dataToExport = products.map((product) => {
      const purchasePrice = product.purchasePrice || 0;
      const sellingPrice = product.sellingPrice || 0;
      return {
        "Product Name": product.name || "",
        "SKU/Barcode": product.sku || product.barcode || "",
        "HSN Code": product.hsnCode || "",
        "Purchase Price": purchasePrice.toFixed(2),
        "Selling Price": sellingPrice.toFixed(2),
        "Opening Stock": product.currentStock || 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport.length > 0 ? dataToExport : [{
      "Product Name": "",
      "SKU/Barcode": "",
      "HSN Code": "",
      "Purchase Price": "",
      "Selling Price": "",
      "Opening Stock": ""
    }]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "Products_Export.xlsx");
  };

  const nameRef = useRef(null);
  const skuRef = useRef(null);
  const hsnRef = useRef(null);
  const purchasePriceRef = useRef(null);
  const sellingPriceRef = useRef(null);
  const currentStockRef = useRef(null);

  useEffect(() => {
    if (showModal) setTimeout(() => nameRef.current?.focus(), 150);
  }, [showModal]);

  const handleKeyDown = (e, nextRef) => {
    if (e.key === "Enter") {
      if (e.target.tagName === "TEXTAREA") return;
      e.preventDefault();
      if (nextRef === "submit") handleSubmit(e);
      else if (nextRef?.current) {
        nextRef.current.focus();
        if (nextRef.current.open) nextRef.current.open();
      }
    }
  };

  const CurrencyIcon = () => (
    <span className="text-sm font-bold text-gray-500 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors notranslate">
      {currencySymbol}
    </span>
  );

  // Query Params for Products
  const queryParams = React.useMemo(() => {
    const params = new URLSearchParams();
    if (user?.role === "staff") {
      const id = typeof user.branchId === "string" ? user.branchId : user.branchId?._id;
      if (id) params.append("branchId", id);
    }
    return params.toString();
  }, [user]);

  const { data: productsRaw, isLoading: loadingProducts, refetch: refetchProducts } = useGetProductsQuery(queryParams);

  useEffect(() => {
    if (productsRaw) setProducts(productsRaw);
    setLoading(loadingProducts);
  }, [productsRaw, loadingProducts]);

  useEffect(() => {
    if (shopsRaw && shopsRaw.length > 0) {
      setShops(shopsRaw);
      setForm((prev) => {
        if (!editingId && (!prev.branches || prev.branches.length === 0)) {
          if (user?.role === "staff") {
            const id = typeof user.branchId === "string" ? user.branchId : user.branchId?._id;
            if (id) return { ...prev, branches: [id] };
          }
          return { ...prev, branches: shopsRaw.map((s) => s._id) };
        }
        return prev;
      });
    }
  }, [shopsRaw, editingId, user]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      sku: "",
      hsnCode: "",
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      isSale: true,
      branches: user?.role === "staff"
        ? [typeof user.branchId === "string" ? user.branchId : user.branchId?._id]
        : shops.map((s) => s._id),
    });
    setEditingId(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const openEdit = (product) => {
    const productBranchIds = product.branches?.map((b) => b._id || b) || [];
    setForm({
      name: product.name || "",
      description: product.description || "",
      sku: product.sku || "",
      purchasePrice: product.purchasePrice || 0,
      sellingPrice: product.sellingPrice || 0,
      hsnCode: product.hsnCode || "",
      currentStock: product.currentStock || 0,
      isSale: typeof product.isSale === "boolean" ? product.isSale : true,
      branches: user?.role === "staff"
        ? [typeof user.branchId === "string" ? user.branchId : user.branchId?._id]
        : !product._id ? (shops.length > 0 ? shops.map((s) => s._id) : [])
        : productBranchIds.length > 0 ? productBranchIds : (shops.length > 0 ? shops.map((s) => s._id) : []),
    });
    setEditingId(product._id);
    setImagePreview(product.image?.url || (typeof product.image === "string" ? product.image : null));
    setShowModal(true);
  };

  const handleCommonAmountChange = (amount) => {
    setForm((prev) => ({ ...prev, purchasePrice: Number(amount) || 0, sellingPrice: Number(amount) || 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const defaultBranchId = shops.length > 0 ? shops[0]._id : (user?.branchId?._id || user?.branchId || null);
      const branchesToSave = (form.branches && form.branches.length > 0) ? form.branches : (defaultBranchId ? [defaultBranchId] : []);
      const formData = new FormData();
      Object.keys(form).forEach((key) => {
        if (key === "branches") formData.append(key, JSON.stringify(branchesToSave));
        else formData.append(key, form[key]);
      });
      if (selectedImage) formData.append("image", selectedImage);
      if (editingId) {
        await updateProduct({ id: editingId, body: formData }).unwrap();
      } else {
        await createProduct(formData).unwrap();
      }
      setShowModal(false);
      resetForm();
      showSnack(editingId ? "Product updated successfully!" : "Product added successfully!", "success");
    } catch (err) {
      showSnack(err.data?.message || "Failed to save product", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFileSize(file);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        e.target.value = "";
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageGenerationSelect = async (imageUrl) => {
    try {
      setIsGenerating(true);
      const name = targetProductForImageGeneration ? targetProductForImageGeneration.name : form.name;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (targetProductForImageGeneration) {
        const fd = new FormData();
        fd.append("image", file);
        try {
          await updateProduct({ id: targetProductForImageGeneration._id, body: fd }).unwrap();
          showSnack("Image successfully saved to the product", "success");
        } catch (err) {
          showSnack("Failed to save the image to the product", "error");
        }
        setTargetProductForImageGeneration(null);
      } else {
        setSelectedImage(file);
        setImagePreview(imageUrl);
      }
    } catch (err) {
      console.error(err);
      showSnack("Failed to update image.", "error");
    } finally {
      setIsGenerating(false);
      setIsImageGenerationModalOpen(false);
    }
  };

  const confirmDelete = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = async (product) => {
    try {
      await toggleStatus(product._id).unwrap();
    } catch (err) {
      showSnack("Failed to update status", "error");
    }
  };

  const handleToggleShowToUser = async (product) => {
    try {
      await updateProduct({ id: product._id, body: { showToUser: !product.showToUser } }).unwrap();
    } catch (err) {
      showSnack("Failed to update visibility", "error");
    }
  };

  const handleToggleSaleStatus = async (product) => {
    try {
      await toggleSaleStatus(product._id).unwrap();
    } catch (err) {
      showSnack("Failed to update sale status", "error");
    }
  };

  const handleToggleFavourite = async (product) => {
    try {
      await toggleFavourite(product._id).unwrap();
    } catch (err) {
      showSnack("Failed to update favourite", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(productToDelete._id).unwrap();
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      showSnack("Product deleted successfully", "success");
    } catch (err) {
      showSnack("Failed to delete product", "error");
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      await bulkDeleteProducts(selectedIds).unwrap();
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      showSnack(`Successfully deleted ${selectedIds.length} products`, "success");
    } catch (err) {
      showSnack("Failed to delete selected products", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const openBulkGenerateImages = () => {
    const items = products
      .filter((p) => selectedIds.includes(p._id) && (!p.image || (!p.image.url && typeof p.image !== "string")))
      .map((p) => ({ _id: p._id, name: p.name }));
    if (items.length === 0) {
      showSnack("All selected products already have images.", "info");
      return;
    }
    setItemsToGenerate(items);
    setShowBulkImageModal(true);
  };

  const filtered = products.filter((p) => {
    const matchesSearch = !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = !selectedBranch || p.branches?.some((b) => (b._id || b) === selectedBranch);
    return matchesSearch && matchesBranch;
  });

  const columns = [
    {
      header: "Product Profile",
      render: (r) => (
        <div className={`flex items-center gap-3 ${!r.isActive ? "opacity-50 grayscale" : ""}`}>
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border/50 shadow-inner overflow-hidden flex-shrink-0 flex items-center justify-center">
            {r.image && (r.image.url || typeof r.image === "string")
              ? <img src={r.image.url || r.image} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
              : <Package size={20} className="text-gray-300" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className={`text-[13px] font-black text-gray-900 dark:text-white ${!r.isActive ? "line-through" : ""}`}>{r.name}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{r.sku || "NO-SKU"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Cost Price",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-gray-700 dark:text-gray-300 notranslate">{currencySymbol}{formatDisplayNumber(r.purchasePrice || 0)}</span>
          <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Cost</span>
        </div>
      )
    },
    {
      header: "Selling Price",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-brand-primary dark:text-blue-400 notranslate">{currencySymbol}{formatDisplayNumber(r.sellingPrice || 0)}</span>
          <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Price</span>
        </div>
      )
    },
    {
      header: "Stock",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-gray-900 dark:text-white">{r.currentStock || 0}</span>
          <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Units</span>
        </div>
      )
    },
    {
      header: "Status", align: "center",
      render: (r) => (
        <div className="flex flex-col items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); if (canChangeStatus) handleToggleStatus(r); }} disabled={!canChangeStatus} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${r.isActive ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-gray-200 dark:bg-gray-600"} ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : ""}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${r.isActive ? "translate-x-4" : "translate-x-1"}`} />
          </button>
          <span className="text-[8px] font-black tracking-widest uppercase text-gray-400 dark:text-gray-500">{r.isActive ? 'Active' : 'Hidden'}</span>
        </div>
      )
    },
    ...(canEdit || canDelete ? [{
      header: "Actions", align: "right",
      render: (r) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button onClick={(e) => { e.stopPropagation(); handleToggleFavourite(r); }} className={`p-2 rounded-lg transition-colors ${r.isFavourite ? "bg-red-50 text-red-500" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-red-400"}`} title={r.isFavourite ? "Remove from favourites" : "Add to favourites"}>
            <Heart size={16} fill={r.isFavourite ? "currentColor" : "none"} />
          </button>
          <div className="w-px h-5 bg-gray-100 dark:bg-dark-card mx-1" />
          {canGenerateImage && (
            <button onClick={(e) => { e.stopPropagation(); setTargetProductForImageGeneration(r); setIsImageGenerationModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-blue-50 rounded-lg transition-all active:scale-95 flex items-center justify-center bg-gray-50 dark:bg-dark-card" title="Auto Generate Image">
              <Sparkles size={14} />
            </button>
          )}
          {canEdit && (
            <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95 bg-gray-50 dark:bg-dark-card" title="Edit Product">
              <Edit3 size={14} />
            </button>
          )}
          {canDelete && (
            <button onClick={(e) => { e.stopPropagation(); confirmDelete(r); }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95 bg-gray-50 dark:bg-dark-card" title="Delete Product">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }] : [])
  ];

  const renderExpandedContent = (r) => (
    <div className="flex flex-col gap-6 w-full animate-fade-in pl-12 md:pl-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-dark-border/80 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-blue-400 shrink-0">
            <Package size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Inventory Intelligence</span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Stock distribution and pricing breakdown</span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 self-start flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border/80">
            <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Show To User</span>
            <button onClick={(e) => { e.stopPropagation(); if (canChangeStatus) handleToggleShowToUser(r); }} disabled={!canChangeStatus} className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${r.showToUser !== false ? "bg-emerald-500" : "bg-gray-300"} ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${r.showToUser !== false ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border/80">
            <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Available For Sale (Invoice)</span>
            <button onClick={(e) => { e.stopPropagation(); if (canChangeSale) handleToggleSaleStatus(r); }} disabled={!canChangeSale} className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${r.isSale ? "bg-emerald-500" : "bg-gray-300"} ${!canChangeSale ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${r.isSale ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1 block">Total System Stock</span>
          <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{r.currentStock || 0} Units</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1 block">Purchase Cost</span>
          <div className="text-lg font-black text-gray-700 dark:text-gray-300 leading-none notranslate">{currencySymbol}{formatDisplayNumber(r.purchasePrice || 0)}</div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100/50">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary dark:text-blue-400 mb-1 block">Selling Price</span>
          <div className="text-lg font-black text-brand-primary dark:text-blue-400 leading-none notranslate">{currencySymbol}{formatDisplayNumber(r.sellingPrice || 0)}</div>
        </div>
      </div>
    </div>
  );

  const uBranchId = typeof user?.branchId === "string" ? user?.branchId : user?.branchId?._id;
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => {
    let stock = p.currentStock || 0;
    if (user?.role === "staff") {
      const bs = p.branchStock?.find((b) => (b.branchId?._id || b.branchId) === uBranchId);
      stock = bs ? bs.currentStock : 0;
    }
    return sum + stock * (p.purchasePrice || 0);
  }, 0);
  const lowStockItems = products.filter((p) => {
    let stock = p.currentStock || 0;
    if (user?.role === "staff") {
      const bs = p.branchStock?.find((b) => (b.branchId?._id || b.branchId) === uBranchId);
      stock = bs ? bs.currentStock : 0;
    }
    return stock > 0 && stock < 5;
  }).length;
  const outOfStockItems = products.filter((p) => {
    let stock = p.currentStock || 0;
    if (user?.role === "staff") {
      const bs = p.branchStock?.find((b) => (b.branchId?._id || b.branchId) === uBranchId);
      stock = bs ? bs.currentStock : 0;
    }
    return stock <= 0;
  }).length;

  const stats = [
    { label: "Total Products", value: totalProducts, icon: Package, color: "bg-blue-50 text-blue-600" },
    { label: "Stock Value", value: <span className="notranslate">{currencySymbol}{totalStockValue.toLocaleString()}</span>, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
    { label: "Low Stock", value: lowStockItems, icon: AlertTriangle, color: "bg-amber-50 text-amber-600" },
    { label: "Out of Stock", value: outOfStockItems, icon: MinusCircle, color: "bg-red-50 text-red-600" },
  ];

  const footerContent = (
    <div className="flex gap-3 w-full">
      <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm">Cancel</button>
      <button onClick={handleSubmit} disabled={isSubmitting} className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-sm cursor-pointer ${isSubmitting ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}>
        {isSubmitting ? "Processing..." : editingId ? "Update Product" : "Add Product"}
      </button>
    </div>
  );

  return (
    <>
      <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ ...snack, message: "" })} />
      <div className="space-y-3 md:space-y-6">
        <StatsGrid stats={stats} loading={loading} />
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <CustomTable
            columns={columns}
            data={filtered}
            loading={loading}
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search products..."
            headerActions={
              <div className="flex items-center gap-2">
                {canAdd && (
                  <button onClick={() => setIsUploadModalOpen(true)} className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center md:gap-2 bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 hover:bg-brand-primary/10 hover:text-brand-primary font-bold rounded-xl transition-all active:scale-95 text-xs shrink-0">
                    <UploadCloud size={16} /><span className="hidden md:inline">Upload</span>
                  </button>
                )}
                {canAdd && (
                  <button onClick={handleExportProducts} className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center md:gap-2 bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 hover:bg-brand-primary/10 hover:text-brand-primary font-bold rounded-xl transition-all active:scale-95 text-xs shrink-0">
                    <DownloadCloud size={16} /><span className="hidden md:inline">Export</span>
                  </button>
                )}
                {canAdd && (
                  <button onClick={() => openEdit({})} className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center md:gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-secondary active:scale-95 text-xs shrink-0 shadow-sm">
                    <Plus size={14} /><span className="hidden md:inline">Add Product</span>
                  </button>
                )}
              </div>
            }
            showSelection={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkActions={
              <>
                {canGenerateImage && (
                  <button
                    onClick={openBulkGenerateImages}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    <span>Gen Images</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBulkDeleteConfirm(true);
                    }}
                    disabled={isBulkDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isBulkDeleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    <span>Delete</span>
                  </button>
                )}
              </>
            }
            emptyMessage="No products yet. Add your first product!"
            expandable={true}
            expandedContent={renderExpandedContent}
            mobileMapper={{
              leading: (r) => (
                <div className={`w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card flex items-center justify-center border border-gray-100 dark:border-dark-border overflow-hidden ${!r.isActive ? "opacity-50" : ""}`}>
                  {r.image && (r.image.url || typeof r.image === "string") ? <img src={r.image.url || r.image} alt={r.name} className="w-full h-full object-cover" /> : <Package size={22} className="text-gray-300" />}
                </div>
              ),
              title: (r) => <h4 className={`font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight ${!r.isActive ? "line-through opacity-50" : ""}`}>{r.name}</h4>,
              subtitle: (r) => <p className={`text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5 ${!r.isActive ? "opacity-50" : ""}`}>{r.sku || ""}</p>,
              trailing: (r) => (
                <div className={`text-right ${!r.isActive ? "opacity-50" : ""}`}>
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">Stock</p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white">
                    {(() => {
                      if (user?.role !== "staff") return r.currentStock;
                      const bs = r.branchStock?.find((b) => (b.branchId?._id || b.branchId) === uBranchId);
                      return bs ? bs.currentStock : 0;
                    })()}
                  </p>
                </div>
              ),
              actions: (r) => (
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Invoice Visibility</span>
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">{r.isSale ? "Available for Sale" : "Hidden"}</span>
                    </div>
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); handleToggleSaleStatus(r); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${r.isSale ? "bg-emerald-500" : "bg-gray-300"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${r.isSale ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(r); }} className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 border ${r.isActive ? "bg-brand-primary text-white border-brand-primary" : "bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 border-gray-200 dark:border-dark-border"}`}>
                        {r.isActive ? "Active" : "Inactive"}
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95">
                        <Edit3 size={14} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {canGenerateImage && (
                      <button onClick={(e) => { e.stopPropagation(); setTargetProductForImageGeneration(r); setIsImageGenerationModalOpen(true); }} className="flex-1 flex items-center justify-center gap-2 h-10 bg-blue-50 dark:bg-blue-900/20 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 border border-blue-100">
                        <Sparkles size={14} /> AI Image
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={(e) => { e.stopPropagation(); confirmDelete(r); }} className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100">
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ),
            }}
          />
        )}
      </div>

      {/* ─── ADD / EDIT PRODUCT SIDESHEET ─── */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingId ? "Edit Product" : "Add Product"} position="right" footer={footerContent} size="lg">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Photo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">Product Photo</label>
              {canGenerateImage && (
                <button type="button" disabled={!form.name} onClick={() => setIsImageGenerationModalOpen(true)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${form.name ? "text-brand-primary dark:text-blue-400 hover:text-brand-secondary cursor-pointer" : "text-gray-300 cursor-not-allowed"}`}>
                  <Sparkles size={12} />Auto Generate
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-dark-card border-2 border-dashed border-gray-200 dark:border-dark-border overflow-hidden flex items-center justify-center shadow-inner">
                {isGenerating ? (
                  <Loader2 size={24} className="text-brand-primary dark:text-blue-400 animate-spin" />
                ) : imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold ml-1 uppercase tracking-tight">{getFileSizeHint()}</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-4">
              <CustomTextField ref={nameRef} label="Product Name" icon={Package} type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => handleKeyDown(e, skuRef)} required placeholder="e.g. Shampoo 250ml" />
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest pl-1 block">Description</label>
                <textarea
                  placeholder="e.g. A nourishing shampoo for dry and damaged hair..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-gray-400 disabled:opacity-50 min-h-[80px] resize-y"
                />
              </div>
            </div>

            <CustomTextField ref={skuRef} label="SKU / Barcode" icon={Hash} type="text" value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })} onKeyDown={(e) => handleKeyDown(e, hsnRef)} placeholder="e.g. SHP-001" />
            <CustomTextField ref={hsnRef} label="HSN Code" icon={Tag} type="text" value={form.hsnCode}
              onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} onKeyDown={(e) => handleKeyDown(e, purchasePriceRef)} placeholder="e.g. 3305" />
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <div>
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Quick Amount</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Set same price for purchase &amp; selling</p>
              </div>
              <div className="w-32">
                <CustomTextField type="number" placeholder="0" onChange={(e) => handleCommonAmountChange(e.target.value)} className="bg-white dark:bg-dark-surface" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomTextField ref={purchasePriceRef} label="Purchase Price" icon={CurrencyIcon} type="number" value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value === "" ? "" : Number(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, sellingPriceRef)} required min="0" step="0.01" />
              <CustomTextField ref={sellingPriceRef} label="Selling Price" icon={CurrencyIcon} type="number" value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value === "" ? "" : Number(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, currentStockRef)} required min="0" step="0.01" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomTextField ref={currentStockRef} label="Opening Stock" icon={Package} type="number" value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: e.target.value === "" ? "" : Number(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, "submit")} required min="0" />
            </div>
          </div>

          {/* Sale toggle */}
          <div className="flex items-center gap-2 px-1 py-1">
            <input type="checkbox" id="isSale" checked={form.isSale} onChange={(e) => setForm({ ...form, isSale: e.target.checked })} className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-brand-primary dark:text-blue-400 focus:ring-brand-primary cursor-pointer" />
            <label htmlFor="isSale" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Available for Sale (Show in Invoice Screen)</label>
          </div>
        </form>
      </Modal>

      {/* ─── CONFIRM DELETE ─── */}
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete} title="Delete Product" message={`Are you sure you want to delete "${productToDelete?.name}"? This cannot be undone.`} confirmLabel="Delete Product" type="danger" />

      {/* ─── IMAGE GENERATION ─── */}
      <ImageGenerationModal isOpen={isImageGenerationModalOpen} onClose={() => { setIsImageGenerationModalOpen(false); setTargetProductForImageGeneration(null); }} onSelect={handleImageGenerationSelect} searchQuery={targetProductForImageGeneration ? targetProductForImageGeneration.name : form.name} />

      {/* ─── BULK DELETE CONFIRM ─── */}
      <ConfirmModal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} onConfirm={handleBulkDelete} title="Delete Selected Products" message={`Delete ${selectedIds.length} products? This cannot be undone.`} confirmLabel={`Delete ${selectedIds.length} Items`} type="danger" />

      {/* ─── BULK IMAGE MODAL ─── */}
      <BulkImageProgressModal isOpen={showBulkImageModal} onClose={() => { setShowBulkImageModal(false); setSelectedIds([]); }} items={itemsToGenerate} onComplete={refetchProducts} type="product" />

      {/* ─── UPLOAD PRODUCTS ─── */}
      <UploadProductsModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUploadSuccess={() => refetchProducts()} showSnack={showSnack} />
    </>
  );
};

export default ProductMasterPage;
