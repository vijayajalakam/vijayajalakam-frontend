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
import { useGetShopsQuery, useGetTaxesQuery } from "../../../store/api/tenantEndpoints";
import {
  useGetProductCategoriesListQuery,
  useGetUnitsListQuery,
  useGetVariantsListQuery,
  useCreateProductCategoryMutation,
  useCreateUnitMutation,
  useCreateTaxMutation,
  useCreateVariantMutation
} from "../../../store/api/tenantCrudEndpoints";
import CustomTable from "../../../components/shared/CustomTable";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  Edit3, Trash2, Hash, Layers, Package, Info, Tag, DollarSign,
  FileText, Camera, Sparkles, Loader2, AlertTriangle, MinusCircle,
  Plus, RefreshCw, ListTree, Check, Store, UploadCloud, Heart,
  Shuffle, Settings2, Eye, EyeOff, DownloadCloud
} from "lucide-react";
import StatsGrid from "../../../components/shared/StatsGrid";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import ImageGenerationModal from "../../../components/shared/ImageGenerationModal";
import BulkImageProgressModal from "../../../components/shared/BulkImageProgressModal";
import CustomMultiSelect from "../../../components/shared/CustomMultiSelect";
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

  const canAddUnit = isAdmin || hasPermission("stock:products:unit_add");
  const canAddVariant = isAdmin || hasPermission("stock:products:variant_add");
  const canAddTax = isAdmin || hasPermission("stock:products:tax_add");

  const { data: shopsRaw } = useGetShopsQuery("");
  const { data: categoriesRaw, refetch: refetchCategories } = useGetProductCategoriesListQuery();
  const { data: unitsRaw, refetch: refetchUnits } = useGetUnitsListQuery();
  const { data: taxesRaw } = useGetTaxesQuery();
  const { data: variantsRaw } = useGetVariantsListQuery();

  const [products, setProducts] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("general");

  const [form, setForm] = useState({
    name: "", description: "", sku: "", category: "General", unit: "Pcs",
    purchasePrice: 0, sellingPrice: 0, taxPercent: 0, taxId: "",
    isTaxInclusive: false, hsnCode: "", currentStock: 0,
    isSale: true, useVariants: false, variants: [], branches: [],
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

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("product");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);
  const [isAddTaxOpen, setIsAddTaxOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState("GST");
  const [newTaxPercentage, setNewTaxPercentage] = useState("");
  const [isSubmittingTax, setIsSubmittingTax] = useState(false);
  const [taxTargetVariantId, setTaxTargetVariantId] = useState(null);
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageGenerationModalOpen, setIsImageGenerationModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetProductForImageGeneration, setTargetProductForImageGeneration] = useState(null);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  // RTK Mutations
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdatingProduct }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeletingProduct }] = useDeleteProductMutation();
  const [bulkDeleteProducts, { isLoading: isBulkDeletingProducts }] = useBulkDeleteProductsMutation();
  const [toggleStatus] = useToggleProductStatusMutation();
  const [toggleSaleStatus] = useToggleProductSaleStatusMutation();
  const [toggleFavourite] = useToggleProductFavouriteMutation();
  
  const [createCategory] = useCreateProductCategoryMutation();
  const [createUnit] = useCreateUnitMutation();
  const [createTax] = useCreateTaxMutation();
  const [createVariant] = useCreateVariantMutation();

  const showSnack = (message, type = "success") => setSnack({ message, type });

  const handleExportProducts = () => {
    const dataToExport = [];

    products.forEach(product => {
      const productName = product.name || "";
      const category = product.category?.name || (typeof product.category === 'string' ? product.category : "");
      const unit = product.unit?.name || (typeof product.unit === 'string' ? product.unit : "");
      const sku = product.sku || product.barcode || "";
      const hsnCode = product.hsnCode || "";
      const currentStock = product.currentStock || 0;

      const taxIdStr = typeof product.taxId === 'object' && product.taxId !== null ? product.taxId._id : product.taxId;
      const foundTax = taxes.find(t => t._id === taxIdStr);
      const baseTaxPercent = (typeof product.taxId === 'object' && product.taxId?.percentage) || foundTax?.percentage || product.taxPercent || 0;

      if (product.useVariants && product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          const variantName = variant.name || variant.variantId?.name || "-";
          const purchasePrice = variant.purchasePrice || 0;
          const sellingPrice = variant.sellingPrice || 0;
          
          const isInclusive = variant.isTaxInclusive !== undefined ? variant.isTaxInclusive : (product.isTaxInclusive || false);
          
          const vTaxIdStr = typeof variant.taxId === 'object' && variant.taxId !== null ? variant.taxId._id : variant.taxId;
          const foundVTax = taxes.find(t => t._id === vTaxIdStr);
          const taxPercent = (typeof variant.taxId === 'object' && variant.taxId?.percentage) || foundVTax?.percentage || variant.taxPercent || baseTaxPercent;

          let taxAmount = 0;
          let finalPrice = sellingPrice;
          
          if (taxPercent > 0) {
            if (isInclusive) {
              taxAmount = sellingPrice - (sellingPrice / (1 + taxPercent / 100));
            } else {
              taxAmount = sellingPrice * (taxPercent / 100);
              finalPrice = sellingPrice + taxAmount;
            }
          }

          dataToExport.push({
            "Product Name": productName,
            "Category": category,
            "Variant": variantName,
            "Unit": unit,
            "SKU/Barcode": sku,
            "HSN Code": hsnCode,
            "Purchase Price": purchasePrice.toFixed(2),
            "Selling Price": sellingPrice.toFixed(2),
            "Tax %": taxPercent || 0,
            "Tax Amount": taxAmount.toFixed(2),
            "Final Price": finalPrice.toFixed(2),
            "Opening Stock": variant.openingStock || variant.currentStock || currentStock
          });
        });
      } else {
        const purchasePrice = product.purchasePrice || 0;
        const sellingPrice = product.sellingPrice || 0;
        
        const isInclusive = product.isTaxInclusive || false;
        const taxPercent = baseTaxPercent;

        let taxAmount = 0;
        let finalPrice = sellingPrice;
        
        if (taxPercent > 0) {
          if (isInclusive) {
            taxAmount = sellingPrice - (sellingPrice / (1 + taxPercent / 100));
          } else {
            taxAmount = sellingPrice * (taxPercent / 100);
            finalPrice = sellingPrice + taxAmount;
          }
        }

        dataToExport.push({
          "Product Name": productName,
          "Category": category,
          "Variant": "-",
          "Unit": unit,
          "SKU/Barcode": sku,
          "HSN Code": hsnCode,
          "Purchase Price": purchasePrice.toFixed(2),
          "Selling Price": sellingPrice.toFixed(2),
          "Tax %": taxPercent || 0,
          "Tax Amount": taxAmount.toFixed(2),
          "Final Price": finalPrice.toFixed(2),
          "Opening Stock": currentStock
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport.length > 0 ? dataToExport : [{
      "Product Name": "",
      "Category": "",
      "Variant": "",
      "Unit": "",
      "SKU/Barcode": "",
      "HSN Code": "",
      "Purchase Price": "",
      "Selling Price": "",
      "Tax %": "",
      "Tax Amount": "",
      "Final Price": "",
      "Opening Stock": ""
    }]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "Products_Export.xlsx");
  };

  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const unitRef = useRef(null);
  const skuRef = useRef(null);
  const hsnRef = useRef(null);
  const purchasePriceRef = useRef(null);
  const sellingPriceRef = useRef(null);
  const taxPercentRef = useRef(null);
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
    if (categoriesRaw) setProductCategories(categoriesRaw.filter((c) => c.isActive));
  }, [categoriesRaw]);

  useEffect(() => {
    if (unitsRaw) setUnits(unitsRaw);
  }, [unitsRaw]);

  useEffect(() => {
    if (taxesRaw) {
      const activeTaxes = taxesRaw.filter((t) => t.isActive);
      setTaxes(activeTaxes);
      const tax12 = activeTaxes.find((t) => t.percentage === 12);
      if (tax12) {
        setForm((prev) => prev.taxId ? prev : { ...prev, taxId: tax12._id, taxPercent: 12 });
      }
    }
  }, [taxesRaw]);

  useEffect(() => {
    if (variantsRaw) setAvailableVariants(variantsRaw.filter((v) => v.isActive && v.type === "product"));
  }, [variantsRaw]);

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
    const tax12 = taxes.find((t) => t.percentage === 12);
    setForm({
      name: "", description: "", sku: "", category: "General", unit: "Pcs",
      purchasePrice: 0, sellingPrice: 0,
      taxPercent: tax12 ? 12 : 0,
      taxId: tax12 ? tax12._id : "",
      isTaxInclusive: false, hsnCode: "", currentStock: 0,
      isSale: true, useVariants: false, variants: [],
      branches: user?.role === "staff"
        ? [typeof user.branchId === "string" ? user.branchId : user.branchId?._id]
        : shops.map((s) => s._id),
    });
    setEditingId(null);
    setSelectedImage(null);
    setImagePreview(null);
    setActiveTab("general");
    // Refresh categories and units to ensure dropdowns are up to date
    refetchCategories(); refetchUnits();
  };

  const openEdit = (product) => {
    const productBranchIds = product.branches?.map((b) => b._id || b) || [];
    setForm({
      name: product.name || "", description: product.description || "", sku: product.sku || "",
      category: product.category || (productCategories.length > 0 ? productCategories[0].name : "General"), 
      unit: product.unit || (units.length > 0 ? units[0].name : "Pcs"),
      purchasePrice: product.purchasePrice || 0, sellingPrice: product.sellingPrice || 0,
      taxPercent: product.taxId?.percentage || product.taxPercent || 0,
      taxId: product.taxId?._id || product.taxId || "",
      isTaxInclusive: product.isTaxInclusive || false,
      hsnCode: product.hsnCode || "", currentStock: product.currentStock || 0,
      isSale: typeof product.isSale === "boolean" ? product.isSale : true,
      useVariants: product.variants && product.variants.length > 0,
      variants: product.variants || [],
      branches: user?.role === "staff"
        ? [typeof user.branchId === "string" ? user.branchId : user.branchId?._id]
        : !product._id ? (shops.length > 0 ? shops.map((s) => s._id) : [])
        : productBranchIds.length > 0 ? productBranchIds : (shops.length > 0 ? shops.map((s) => s._id) : []),
    });
    setEditingId(product._id);
    setImagePreview(product.image?.url || (typeof product.image === "string" ? product.image : null));
    setActiveTab("general");
    setShowModal(true);
  };

  const handleVariantFieldChange = (variantId, field, value) => {
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const idx = newVariants.findIndex((v) => v.variantId === variantId || v.variantId?._id === variantId);
      if (idx === -1) newVariants.push({ variantId, [field]: value });
      else newVariants[idx] = { ...newVariants[idx], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const getVariantField = (variantId, field) => {
    const v = form.variants.find((v) => v.variantId === variantId || v.variantId?._id === variantId);
    if (!v) return "";
    if (field === "taxId") return v.taxId?._id || v.taxId || "";
    return v[field];
  };

  const handleCommonAmountChange = (amount) => {
    setForm((prev) => ({ ...prev, purchasePrice: amount, sellingPrice: amount }));
  };

  const handleVariantCommonAmountChange = (variantId, amount) => {
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const idx = newVariants.findIndex((v) => v.variantId === variantId || v.variantId?._id === variantId);
      if (idx > -1) newVariants[idx] = { ...newVariants[idx], purchasePrice: amount, sellingPrice: amount };
      return { ...prev, variants: newVariants };
    });
  };

  const handleAddNewCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setIsSubmittingCategory(true);
      await createCategory({ name: newCategoryName, type: "product" }).unwrap();
      showSnack("Category created successfully", "success");
      setNewCategoryName("");
      setIsAddCategoryOpen(false);
    } catch (error) {
      showSnack(error.data?.message || "Failed to add category", "error");
    } finally { 
      setIsSubmittingCategory(false); 
    }
  };

  const handleAddNewUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    try {
      setIsSubmittingUnit(true);
      await createUnit({ name: newUnitName }).unwrap();
      showSnack("Unit created successfully", "success");
      setNewUnitName("");
      setIsAddUnitOpen(false);
    } catch (err) { showSnack(err.data?.message || "Failed", "error"); }
    finally { setIsSubmittingUnit(false); }
  };

  const handleAddNewTax = async (e) => {
    e.preventDefault();
    if (!newTaxName.trim() || newTaxPercentage === "") return;
    try {
      setIsSubmittingTax(true);
      const newTax = await createTax({ name: newTaxName, percentage: newTaxPercentage }).unwrap();
      showSnack("Tax created successfully", "success");
      setNewTaxName("GST"); setNewTaxPercentage("");
      setIsAddTaxOpen(false);
      if (taxTargetVariantId) {
        setForm((prev) => {
          const nv = [...prev.variants];
          const idx = nv.findIndex((sv) => sv.variantId === taxTargetVariantId || sv.variantId?._id === taxTargetVariantId);
          if (idx > -1) nv[idx] = { ...nv[idx], taxId: newTax._id, taxPercent: newTax.percentage };
          return { ...prev, variants: nv };
        });
      } else {
        setForm((prev) => ({ ...prev, taxId: newTax._id, taxPercent: newTax.percentage }));
      }
    } catch (err) { showSnack(err.data?.message || "Failed", "error"); }
    finally { setIsSubmittingTax(false); setTaxTargetVariantId(null); }
  };

  const handleAddNewVariant = async (e) => {
    e.preventDefault();
    if (!newVariantName.trim()) return;
    try {
      setIsSubmittingVariant(true);
      const nv = await createVariant({ name: newVariantName, type: "product" }).unwrap();
      setIsAddVariantOpen(false); setNewVariantName("");
      setForm((prev) => ({
        ...prev,
        variants: [...prev.variants, { variantId: nv._id, purchasePrice: "", sellingPrice: "", taxId: "", taxPercent: "", isTaxInclusive: false, openingStock: "" }],
      }));
      showSnack("Variant created successfully", "success");
    } catch (err) { showSnack(err.data?.message || "Failed", "error"); }
    finally { setIsSubmittingVariant(false); }
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
        if (key === "variants") formData.append(key, JSON.stringify(form.useVariants ? form.variants : []));
        else if (key === "branches") formData.append(key, JSON.stringify(branchesToSave));
        else if (key === "useVariants") formData.append(key, form.useVariants === true);
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
    } catch (err) { showSnack(err.data?.message || "Failed to save product", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFileSize(file);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        e.target.value = ""; // Reset the input
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
        const fd = new FormData(); fd.append("image", file);      try {
        await updateProduct({ id: targetProductForImageGeneration._id, body: fd }).unwrap();
        showSnack("Image successfully saved to the product", "success");
      } catch (err) {
        showSnack("Failed to save the image to the product", "error");
      }
      setTargetProductForImageGeneration(null);
      } else { setSelectedImage(file); setImagePreview(imageUrl); }
    } catch (err) { console.error(err); showSnack("Failed to update image.", "error"); }
    finally { setIsGenerating(false); setIsImageGenerationModalOpen(false); }
  };

  const confirmDelete = (product) => { setProductToDelete(product); setIsDeleteModalOpen(true); };

  const handleToggleStatus = async (product) => {
    try { await toggleStatus(product._id).unwrap(); }
    catch (err) { showSnack("Failed to update status", "error"); }
  };

  const handleToggleShowToUser = async (product) => {
    try { await updateProduct({ id: product._id, body: { showToUser: !product.showToUser } }).unwrap(); }
    catch (err) { showSnack("Failed to update visibility", "error"); }
  };

  const handleToggleSaleStatus = async (product) => {
    try { await toggleSaleStatus(product._id).unwrap(); }
    catch (err) { showSnack("Failed to update sale status", "error"); }
  };

  const handleToggleFavourite = async (product) => {
    try { await toggleFavourite(product._id).unwrap(); }
    catch (err) { showSnack("Failed to update favourite", "error"); }
  };

  const handleDelete = async () => {
    try { await deleteProduct(productToDelete._id).unwrap(); setIsDeleteModalOpen(false); setProductToDelete(null); }
    catch (err) { showSnack("Failed to delete product", "error"); }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      await bulkDeleteProducts(selectedIds).unwrap();
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      showSnack(`Successfully deleted ${selectedIds.length} products`, "success");
    } catch (err) { showSnack("Failed to delete selected products", "error"); }
    finally { setIsBulkDeleting(false); }
  };

  const openBulkGenerateImages = () => {
    const items = products.filter((p) => selectedIds.includes(p._id) && (!p.image || (!p.image.url && typeof p.image !== "string"))).map((p) => ({ _id: p._id, name: p.name }));
    if (items.length === 0) { showSnack("All selected products already have images.", "info"); return; }
    setItemsToGenerate(items); setShowBulkImageModal(true);
  };

  const filtered = products.filter((p) => {
    const matchesSearch = !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || p.category?.toLowerCase().includes(searchTerm.toLowerCase());
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
              <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-dark-border"></span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{r.category}</span>
            </div>
            {r.useVariants && r.variants?.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-100/50">
                        {r.variants.length} Variants
                    </span>
                </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      render: (r) => (
         <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${r.useVariants ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
            {r.useVariants ? 'Variations' : 'Standard'}
         </span>
      )
    },
    {
      header: "Base Cost",
      render: (r) => {
         if (r.useVariants && r.variants?.length > 0) {
             const prices = r.variants.map(v => v.purchasePrice || 0);
             const min = Math.min(...prices);
             const max = Math.max(...prices);
             return (
                 <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 notranslate">
                       {min !== max ? `${currencySymbol}${formatDisplayNumber(min)} - ${currencySymbol}${formatDisplayNumber(max)}` : `${currencySymbol}${formatDisplayNumber(min)}`}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Variant Range</span>
                 </div>
             );
         }
         return (
             <div className="flex flex-col">
                <span className="text-xs font-black text-gray-700 dark:text-gray-300 notranslate">{currencySymbol}{formatDisplayNumber(r.purchasePrice || 0)}</span>
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Pricing</span>
             </div>
         );
      }
    },
    {
      header: "Base Selling",
      render: (r) => {
         if (r.useVariants && r.variants?.length > 0) {
             const getEffective = (v) => {
                 const vTaxPct = v.taxId?.percentage ?? v.taxPercent ?? 0;
                 const vInclusive = v.isTaxInclusive || false;
                 const vPrice = v.sellingPrice || 0;
                 const vTaxAmt = vTaxPct > 0 ? (vInclusive ? vPrice - vPrice / (1 + vTaxPct / 100) : vPrice * (vTaxPct / 100)) : 0;
                 return vInclusive ? vPrice : vPrice + vTaxAmt;
             };
             const prices = r.variants.map(v => getEffective(v));
             const min = Math.min(...prices);
             const max = Math.max(...prices);
             return (
                 <div className="flex flex-col">
                    <span className="text-xs font-black text-brand-primary dark:text-blue-400 notranslate">
                       {min !== max ? `${currencySymbol}${formatDisplayNumber(min)} - ${currencySymbol}${formatDisplayNumber(max)}` : `${currencySymbol}${formatDisplayNumber(min)}`}
                    </span>
                    <span className="text-[9px] font-bold text-brand-primary dark:text-blue-400/50 uppercase tracking-widest mt-0.5">Variant Range</span>
                 </div>
             );
         }

         const baseTaxPct = r.taxId?.percentage ?? r.taxPercent ?? 0;
         const baseInclusive = r.isTaxInclusive || false;
         const basePrice = r.sellingPrice || 0;
         const baseTaxAmt = baseTaxPct > 0 ? (baseInclusive ? basePrice - basePrice / (1 + baseTaxPct / 100) : basePrice * (baseTaxPct / 100)) : 0;
         const baseEffective = baseInclusive ? basePrice : basePrice + baseTaxAmt;
         return (
            <div className="flex flex-col">
                <span className="text-xs font-black text-brand-primary dark:text-blue-400 notranslate">{currencySymbol}{formatDisplayNumber(baseEffective)}</span>
                {baseTaxPct > 0 && <span className="text-[9px] font-bold text-emerald-500 notranslate">{baseInclusive ? `INCL. TAX` : `+TAX`}</span>}
            </div>
         );
      }
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

  // Helper to resolve tax percentage from taxId (populated or raw ID) with taxes array fallback
  const resolveTaxPercent = (taxIdField, taxPercentField) => {
    if (taxIdField) {
      if (typeof taxIdField === 'object' && taxIdField.percentage !== undefined) {
        return taxIdField.percentage;
      }
      // taxId might be just an ID string or object without percentage populated
      const taxObjId = typeof taxIdField === 'object' ? taxIdField._id : taxIdField;
      const foundTax = taxes.find(t => t._id === taxObjId);
      if (foundTax) return foundTax.percentage;
    }
    return taxPercentField || 0;
  };

  const renderExpandedContent = (r) => {
    const taxPct = resolveTaxPercent(r.taxId, r.taxPercent);
    const isInclusive = r.isTaxInclusive || false;
    const sellingPrice = r.sellingPrice || 0;
    const taxablePrice = isInclusive ? sellingPrice / (1 + taxPct / 100) : sellingPrice;
    const taxAmount = isInclusive ? sellingPrice - taxablePrice : sellingPrice * (taxPct / 100);
    const finalPrice = isInclusive ? sellingPrice : sellingPrice + taxAmount;

    return (
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

        {!r.useVariants || !r.variants || r.variants.length === 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="p-4 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1 block">Total System Stock</span>
                  <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{r.currentStock || 0} <span className="text-[10px] font-bold text-gray-500 uppercase">{r.unit}</span></div>
               </div>
               
               <div className="p-4 bg-blue-50 dark:bg-blue-900/20/30 rounded-2xl border border-blue-100/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 block">Applied Tax</span>
                  <div className="text-sm font-black text-blue-900">
                     {taxPct}% {isInclusive ? '(Inclusive)' : '(Exclusive)'}
                  </div>
                  {(r.taxId?.name || r.taxName) && <span className="text-[10px] font-bold text-blue-600 block mt-1">{r.taxId?.name || r.taxName}</span>}
                  
                  <div className="mt-3 pt-3 border-t border-blue-100/50 space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tighter">Taxable Price:</span>
                      <span className="text-gray-700 dark:text-gray-300 font-black notranslate">{currencySymbol}{formatDisplayNumber(taxablePrice)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tighter">Tax Amount:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black notranslate">+{currencySymbol}{formatDisplayNumber(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] pt-1.5 mt-1 border-t border-blue-100/30">
                      <span className="text-brand-primary dark:text-blue-400 font-bold uppercase tracking-tighter">Final Price:</span>
                      <span className="text-brand-primary dark:text-blue-400 font-black notranslate">{currencySymbol}{formatDisplayNumber(finalPrice)}</span>
                    </div>
                  </div>
                </div>
            </div>
         ) : (
           <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x items-start">
               {r.variants.map((v, vIdx) => {
                  const vName = v.variantId?.name || availableVariants.find((av) => av._id === (v.variantId?._id || v.variantId))?.name || "Unnamed Variant";
                  const vTaxPct = resolveTaxPercent(v.taxId, v.taxPercent);
                  const vInclusive = v.isTaxInclusive || false;
                  const vPrice = v.sellingPrice || 0;
                  
                  const vTaxable = vInclusive ? vPrice / (1 + vTaxPct / 100) : vPrice;
                  const vTaxAmt = vInclusive ? vPrice - vTaxable : vPrice * (vTaxPct / 100);
                  const vEffective = vInclusive ? vPrice : vPrice + vTaxAmt;

                  return (
                      <div key={vIdx} className="shrink-0 w-[280px] snap-center bg-white dark:bg-dark-surface rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
                          <div className="px-5 py-4 bg-gradient-to-br from-indigo-50/80 to-purple-50/40 border-b border-gray-100 dark:border-dark-border/60 flex items-start justify-between">
                             <div className="flex flex-col">
                                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-0.5">Details</span>
                                 <h4 className="text-[14px] font-black text-gray-900 dark:text-white leading-none">{vName}</h4>
                             </div>
                             <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-surface shadow-sm flex items-center justify-center border border-indigo-100 text-indigo-500 font-black text-xs">
                                #{vIdx+1}
                             </div>
                          </div>
                          
                          <div className="p-5 flex flex-col gap-4">
                              <div className="flex items-end justify-between">
                                  <div className="flex flex-col border-l-2 border-indigo-200 pl-2">
                                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Stock</span>
                                      <span className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{v.currentStock || 0} <span className="text-[10px] text-gray-500 font-bold uppercase">{r.unit}</span></span>
                                  </div>
                                  <div className="flex flex-col text-right">
                                      <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest">Opening Stock</span>
                                      <span className="text-[11px] font-black text-gray-600 dark:text-gray-400">{v.openingStock || 0}</span>
                                  </div>
                              </div>

                              <div className="w-full h-px bg-gray-100 dark:bg-dark-card/80 my-0.5" />

                              <div className="grid grid-cols-1 gap-3">
                                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border/60">
                                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Purchase Value</span>
                                      <span className="text-[12px] font-black text-gray-700 dark:text-gray-300 notranslate leading-none">{currencySymbol}{formatDisplayNumber(v.purchasePrice || 0)}</span>
                                  </div>
                                  
                                  <div className="flex flex-col p-4 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-black text-brand-primary dark:text-blue-400 uppercase tracking-widest">Selling Breakdown</span>
                                        <span className="text-[7.5px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-sm">{vTaxPct > 0 ? (vInclusive ? 'Incl. Tax' : '+Tax') : 'No Tax'}</span>
                                      </div>
                                      
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tighter">Taxable:</span>
                                          <span className="text-gray-700 dark:text-gray-300 font-black notranslate">{currencySymbol}{formatDisplayNumber(vTaxable)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tighter">Tax ({vTaxPct}%):</span>
                                          <span className="text-emerald-600 dark:text-emerald-400 font-black notranslate">+{currencySymbol}{formatDisplayNumber(vTaxAmt)}</span>
                                        </div>
                                        <div className="flex justify-between text-[12px] pt-1.5 mt-1 border-t border-brand-primary/10">
                                          <span className="text-brand-primary dark:text-blue-400 font-bold uppercase tracking-tighter">Selling Price:</span>
                                          <span className="text-brand-primary dark:text-blue-400 font-black notranslate">{currencySymbol}{formatDisplayNumber(vEffective)}</span>
                                        </div>
                                      </div>
                                  </div>
                              </div>

                           </div>
                       </div>
                  );
               })}
           </div>
        )}
      </div>
    );
  };

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
    if (user?.role === "staff") { const bs = p.branchStock?.find((b) => (b.branchId?._id || b.branchId) === uBranchId); stock = bs ? bs.currentStock : 0; }
    return stock > 0 && stock < 5;
  }).length;
  const outOfStockItems = products.filter((p) => {
    let stock = p.currentStock || 0;
    if (user?.role === "staff") { const bs = p.branchStock?.find((b) => (b.branchId?._id || b.branchId) === uBranchId); stock = bs ? bs.currentStock : 0; }
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
              subtitle: (r) => <p className={`text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5 ${!r.isActive ? "opacity-50" : ""}`}>{r.category}{r.sku && ` • ${r.sku}`}</p>,
              trailing: (r) => (
                <div className={`text-right ${!r.isActive ? "opacity-50" : ""}`}>
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">Stock</p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white">
                    {(() => {
                      if (user?.role !== "staff") return r.currentStock;
                      const bs = r.branchStock?.find((b) => (b.branchId?._id || b.branchId) === uBranchId);
                      return bs ? bs.currentStock : 0;
                    })()} {r.unit}
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

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-dark-border">
          <button type="button" onClick={() => setActiveTab("general")}
            className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "general" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}>
            <Settings2 size={15} />
            <span>General</span>
            {activeTab === "general" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />}
          </button>
          {form.useVariants && (
            <button type="button" onClick={() => setActiveTab("variants")}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "variants" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}>
              <Shuffle size={15} />
              <span>Variants</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "variants" ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-100 dark:bg-dark-card text-gray-500"}`}>{form.variants.length}</span>
              {activeTab === "variants" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />}
            </button>
          )}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* ── GENERAL TAB ── */}
          {activeTab === "general" && (
            <div className="space-y-4">

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
                    onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => handleKeyDown(e, categoryRef)} required placeholder="e.g. Shampoo 250ml" />
                  
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
                <CustomDropdown ref={categoryRef}
                  label={<span className="inline-flex items-center gap-1.5"><span>Category <span className="text-red-400">*</span></span>{<button type="button" onClick={() => setIsAddCategoryOpen(true)} className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"><Plus size={12} strokeWidth={3} /></button>}</span>}
                  icon={Layers} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} onKeyDown={(e) => handleKeyDown(e, unitRef)}
                  options={productCategories.map((c) => ({ value: c.name, label: c.name }))} placeholder="Select Category" isSearchable />
                <CustomDropdown ref={unitRef}
                  label={<span className="inline-flex items-center gap-1.5"><span>Unit <span className="text-red-400">*</span></span>{canAddUnit && <button type="button" onClick={() => setIsAddUnitOpen(true)} className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"><Plus size={12} strokeWidth={3} /></button>}</span>}
                  icon={FileText} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} onKeyDown={(e) => handleKeyDown(e, skuRef)}
                  options={units.map((u) => ({ value: u.name, label: u.name }))} placeholder="Select Unit" isSearchable />
                <CustomTextField ref={skuRef} label="SKU / Barcode" icon={Hash} type="text" value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })} onKeyDown={(e) => handleKeyDown(e, hsnRef)} placeholder="e.g. SHP-001" />
                <CustomTextField ref={hsnRef} label="HSN Code" icon={Tag} type="text" value={form.hsnCode}
                  onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} onKeyDown={(e) => handleKeyDown(e, purchasePriceRef)} placeholder="e.g. 3305" />

              </div>

              {/* Enable Variants toggle */}
              {availableVariants.length > 0 && (
                <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-card px-4 py-3 rounded-2xl border border-gray-100 dark:border-dark-border">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.useVariants ? "bg-brand-primary border-brand-primary shadow-lg shadow-brand-primary/20 scale-105" : "border-gray-300 dark:border-dark-border hover:border-brand-primary/50"}`}>
                      <input type="checkbox" className="hidden" checked={form.useVariants}
                        onChange={(e) => { const en = e.target.checked; setForm({ ...form, useVariants: en }); if (en) setActiveTab("variants"); else setActiveTab("general"); }} />
                      {form.useVariants && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Enable Variants</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Create variations like Normal, Medium, Premium</span>
                    </div>
                  </label>
                  {form.useVariants && (
                    <button type="button" onClick={() => setActiveTab("variants")} className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/10 px-3 py-1.5 rounded-lg hover:bg-brand-primary hover:text-white transition-all">
                      <Shuffle size={12} />Manage →
                    </button>
                  )}
                </div>
              )}

              {/* Pricing — only when variants OFF */}
              {!form.useVariants && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20/60 px-4 py-3 rounded-2xl border border-blue-100">
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">Quick Amount</h4>
                      <p className="text-xs text-blue-600 font-medium">Set same price for purchase &amp; selling</p>
                    </div>
                    <div className="w-32">
                      <CustomTextField type="number" placeholder="0" onChange={(e) => handleCommonAmountChange(e.target.value)} className="bg-white dark:bg-dark-surface" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomTextField ref={purchasePriceRef} label="Purchase Price" icon={CurrencyIcon} type="number" value={form.purchasePrice}
                      onChange={(e) => setForm({ ...form, purchasePrice: e.target.value === "" ? "" : Number(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, sellingPriceRef)} required min="0" step="0.01" />
                    <CustomTextField ref={sellingPriceRef} label="Selling Price" icon={CurrencyIcon} type="number" value={form.sellingPrice}
                      onChange={(e) => setForm({ ...form, sellingPrice: e.target.value === "" ? "" : Number(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, taxPercentRef)} required min="0" step="0.01" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomDropdown ref={taxPercentRef}
                      label={<span className="inline-flex items-center gap-1.5"><span>Tax Settings</span>{canAddTax && <button type="button" onClick={() => { setTaxTargetVariantId(null); setIsAddTaxOpen(true); }} className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"><Plus size={12} strokeWidth={3} /></button>}</span>}
                      icon={Info} value={form.taxId}
                      onChange={(e) => { const val = e.target.value; const tax = taxes.find((t) => t._id === val); setForm({ ...form, taxId: val, taxPercent: tax ? tax.percentage : 0 }); }}
                      onKeyDown={(e) => handleKeyDown(e, currentStockRef)}
                      options={[{ value: "", label: "No Tax Application" }, ...taxes.map((t) => ({ value: t._id, label: t.name.includes(String(t.percentage)) ? t.name : `${t.name} (${t.percentage}%)` }))]}
                      placeholder="Select Tax" isSearchable />
                    <div className="flex items-center">
                      <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card cursor-pointer transition-colors border border-gray-100 dark:border-dark-border/50 w-full">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${form.isTaxInclusive ? "bg-brand-primary border-brand-primary" : "border-gray-300 dark:border-dark-border"}`}>
                          <input type="checkbox" checked={form.isTaxInclusive} onChange={(e) => setForm({ ...form, isTaxInclusive: e.target.checked })} className="hidden" />
                          {form.isTaxInclusive && <Check size={14} className="text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tax Inclusive</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Price includes tax amount</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomTextField ref={currentStockRef} label="Opening Stock" icon={Package} type="number" value={form.currentStock}
                      onChange={(e) => setForm({ ...form, currentStock: e.target.value === "" ? "" : Number(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, "submit")} required min="0" />
                  </div>
                </div>
              )}

              {/* Sale toggle */}
              <div className="flex items-center gap-2 px-1 py-1">
                <input type="checkbox" id="isSale" checked={form.isSale} onChange={(e) => setForm({ ...form, isSale: e.target.checked })} className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-brand-primary dark:text-blue-400 focus:ring-brand-primary cursor-pointer" />
                <label htmlFor="isSale" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Available for Sale (Show in Invoice Screen)</label>
              </div>
            </div>
          )}

          {/* ── VARIANTS TAB ── */}
          {activeTab === "variants" && form.useVariants && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Product Variants</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Select and configure each variant</p>
                </div>
                {canAddVariant && (
                  <button type="button" onClick={() => setIsAddVariantOpen(true)} className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/10 px-3 py-1.5 rounded-lg hover:bg-brand-primary hover:text-white transition-all">
                    <Plus size={12} strokeWidth={3} />New Variant
                  </button>
                )}
              </div>

              {availableVariants.map((v) => {
                const isSelected = form.variants.some((sv) => sv.variantId === v._id || sv.variantId?._id === v._id);
                return (
                  <div key={v._id} className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isSelected ? "border-brand-primary shadow-md shadow-brand-primary/10" : "border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-card/50"}`}>
                    <div
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? "bg-brand-primary/5" : "bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-card"}`}
                      onClick={() => {
                        if (isSelected) setForm((prev) => ({ ...prev, variants: prev.variants.filter((sv) => sv.variantId !== v._id && sv.variantId?._id !== v._id) }));
                        else setForm((prev) => ({ ...prev, variants: [...prev.variants, { variantId: v._id, purchasePrice: "", sellingPrice: "", taxId: "", taxPercent: "", isTaxInclusive: false, openingStock: "" }] }));
                      }}
                    >
                      <span className={`text-sm font-bold flex items-center gap-2.5 ${isSelected ? "text-brand-primary dark:text-blue-400" : "text-gray-500"}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? "bg-brand-primary border-brand-primary" : "bg-white dark:bg-dark-surface border-gray-300 dark:border-dark-border"}`}>
                          {isSelected && <Check size={11} className="text-white" strokeWidth={4} />}
                        </div>
                        <ListTree size={14} className={isSelected ? "text-brand-primary" : "text-gray-400 dark:text-gray-500"} />
                        {v.name}
                      </span>
                      {isSelected && <span className="text-[10px] font-black text-brand-primary dark:text-blue-400 bg-brand-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>}
                    </div>

                    {isSelected && (
                      <div className="p-4 bg-white dark:bg-dark-surface border-t border-brand-primary/10 space-y-3">
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20/60 px-3 py-2.5 rounded-xl border border-blue-100">
                          <div>
                            <p className="text-xs font-bold text-blue-900">Quick Amount</p>
                            <p className="text-[10px] text-blue-600/80 font-medium">Set same price for purchase &amp; selling</p>
                          </div>
                          <div className="w-24">
                            <input type="number" placeholder="0" onChange={(e) => handleVariantCommonAmountChange(v._id, e.target.value)} className="w-full text-xs font-bold text-gray-900 dark:text-white bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded-xl flex flex-col gap-1 border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white dark:bg-dark-surface transition-all">
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Purchase Price</span>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-gray-500 text-xs font-bold notranslate">{currencySymbol}</span>
                              <input type="number" placeholder="0" value={getVariantField(v._id, "purchasePrice")} onChange={(e) => handleVariantFieldChange(v._id, "purchasePrice", e.target.value)} className="w-full text-xs font-bold text-gray-900 dark:text-white bg-transparent outline-none" />
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl flex flex-col gap-1 border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white dark:bg-dark-surface transition-all">
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Selling Price</span>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-gray-500 text-xs font-bold notranslate">{currencySymbol}</span>
                              <input type="number" placeholder="0" value={getVariantField(v._id, "sellingPrice")} onChange={(e) => handleVariantFieldChange(v._id, "sellingPrice", e.target.value)} className="w-full text-xs font-bold text-gray-900 dark:text-white bg-transparent outline-none" />
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl flex flex-col gap-1.5 border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white dark:bg-dark-surface transition-all">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tax</span>
                              {canAddTax && (
                                <button type="button" onClick={() => { setTaxTargetVariantId(v._id); setIsAddTaxOpen(true); }} className="flex items-center justify-center w-4 h-4 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all">
                                  <Plus size={10} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                            <CustomDropdown
                              value={getVariantField(v._id, "taxId")}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleVariantFieldChange(v._id, "taxId", val);
                                const tax = taxes.find((t) => t._id === val);
                                handleVariantFieldChange(v._id, "taxPercent", tax ? tax.percentage : 0);
                              }}
                              options={[
                                { value: "", label: "No Tax" },
                                ...taxes.map((t) => ({ value: t._id, label: `${t.name} (${t.percentage}%)` }))
                              ]}
                              variant="compact"
                              buttonClassName="w-full text-xs font-bold text-gray-900 dark:text-white bg-transparent outline-none flex items-center justify-between border-none p-0 h-auto cursor-pointer"
                            />
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl flex flex-col gap-1 border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white dark:bg-dark-surface transition-all">
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Opening Stock</span>
                            <input type="number" placeholder="0" value={getVariantField(v._id, "openingStock")} onChange={(e) => handleVariantFieldChange(v._id, "openingStock", e.target.value)} className="w-full text-xs font-bold text-gray-900 dark:text-white bg-transparent outline-none" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer px-1">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${getVariantField(v._id, "isTaxInclusive") ? "bg-brand-primary border-brand-primary" : "border-gray-300 dark:border-dark-border"}`}>
                            <input type="checkbox" className="hidden" checked={getVariantField(v._id, "isTaxInclusive") || false} onChange={(e) => handleVariantFieldChange(v._id, "isTaxInclusive", e.target.checked)} />
                            {getVariantField(v._id, "isTaxInclusive") && <Check size={10} className="text-white" strokeWidth={4} />}
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Tax Inclusive (price includes tax)</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              {availableVariants.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                  <Shuffle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No variants available</p>
                  <p className="text-xs mt-1">Create a variant using the button above</p>
                </div>
              )}
            </div>
          )}
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
      <UploadProductsModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUploadSuccess={() => { refetchProducts(); refetchCategories(); refetchUnits(); }} showSnack={showSnack} />

      {/* ─── ADD CATEGORY ─── */}
      <Modal isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} title="Add Category" maxWidth="max-w-md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setIsAddCategoryOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors">Cancel</button><button onClick={handleAddNewCategory} disabled={isSubmittingCategory} className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingCategory ? "bg-gray-400 cursor-not-allowed" : "bg-brand-primary hover:bg-brand-secondary"}`}>{isSubmittingCategory ? "Saving..." : "Create"}</button></div>}>
        <form onSubmit={handleAddNewCategory} className="py-4 space-y-4">
          <CustomTextField label="Category Name" placeholder="e.g. Hair Care, Skin Care" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required autoFocus />
        </form>
      </Modal>

      {/* ─── ADD UNIT ─── */}
      <Modal isOpen={isAddUnitOpen} onClose={() => setIsAddUnitOpen(false)} title="Add Unit" maxWidth="max-w-md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setIsAddUnitOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors">Cancel</button><button onClick={handleAddNewUnit} disabled={isSubmittingUnit} className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingUnit ? "bg-gray-400 cursor-not-allowed" : "bg-brand-primary hover:bg-brand-secondary"}`}>{isSubmittingUnit ? "Saving..." : "Create"}</button></div>}>
        <form onSubmit={handleAddNewUnit} className="py-4 space-y-4">
          <CustomTextField label="Unit Name" placeholder="e.g. Pcs, Kg, Litre" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} required autoFocus />
        </form>
      </Modal>

      {/* ─── ADD TAX ─── */}
      <Modal isOpen={isAddTaxOpen} onClose={() => setIsAddTaxOpen(false)} title="Add Tax" maxWidth="max-w-md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setIsAddTaxOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors">Cancel</button><button onClick={handleAddNewTax} disabled={isSubmittingTax} className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingTax ? "bg-gray-400 cursor-not-allowed" : "bg-brand-primary hover:bg-brand-secondary"}`}>{isSubmittingTax ? "Saving..." : "Create"}</button></div>}>
        <form onSubmit={handleAddNewTax} className="py-4 space-y-4">
          <CustomTextField label="Tax Name" placeholder="e.g. GST, VAT" value={newTaxName} onChange={(e) => setNewTaxName(e.target.value)} required autoFocus />
          <CustomTextField label="Tax Percentage" placeholder="e.g. 18" type="number" value={newTaxPercentage} onChange={(e) => setNewTaxPercentage(e.target.value)} required min="0" max="100" />
        </form>
      </Modal>

      {/* ─── ADD VARIANT ─── */}
      <Modal isOpen={isAddVariantOpen} onClose={() => setIsAddVariantOpen(false)} title="Add Variant" maxWidth="max-w-md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setIsAddVariantOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors">Cancel</button><button onClick={handleAddNewVariant} disabled={isSubmittingVariant} className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingVariant ? "bg-gray-400 cursor-not-allowed" : "bg-brand-primary hover:bg-brand-secondary"}`}>{isSubmittingVariant ? "Saving..." : "Create"}</button></div>}>
        <form onSubmit={handleAddNewVariant} className="py-4 space-y-4">
          <CustomTextField label="Variant Name" placeholder="e.g. Normal, Medium, Premium" value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)} required autoFocus />
        </form>
      </Modal>
    </>
  );
};

export default ProductMasterPage;
