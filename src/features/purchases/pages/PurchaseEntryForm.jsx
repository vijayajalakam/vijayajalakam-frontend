import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../../api/axiosInstance";
import {
  ArrowLeft,
  Save,
  Receipt,
  Trash2,
  ClipboardList,
  CreditCard,
  Plus,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Users,
  MapPin,
  Package,
  Layers,
} from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { applyPrecision, applyRoundOff } from "../../../utils/precisionHelper";
import InlineSearchSelect from "../../../components/shared/InlineSearchSelect";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomMultiSelect from "../../../components/shared/CustomMultiSelect";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import Snackbar from "../../../components/shared/Snackbar";

const emptyRow = {
  product: "",
  variantId: "",
  variantName: "",
  unit: "",
  quantity: "",
  price: "",
  taxId: "",
  _key: Date.now(),
};

const PurchaseEntryForm = () => {
  const {
    user,
    defaultInvoicePaymentMethod,
    decimalPrecision,
    enableRoundOff,
    roundOffValue,
    roundOffBenefit,
  } = useAuth();
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const salonSettings = useMemo(
    () => ({
      decimalPrecision:
        decimalPrecision !== undefined ? decimalPrecision : 2,
      enableRoundOff: Boolean(enableRoundOff),
      roundOffValue: roundOffValue || 1,
      roundOffBenefit: roundOffBenefit || "customer",
    }),
    [decimalPrecision, enableRoundOff, roundOffValue, roundOffBenefit],
  );
  const navigate = useNavigate();
  const { id, shopSlug } = useParams();
  const location = useLocation();
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [units, setUnits] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gstNumber: "",
    contactPerson: "",
    branches: [],
  });

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    purchasePrice: "",
    sellingPrice: "",
    category: "General",
    unit: "Pcs",
    taxId: "",
    isTaxInclusive: false,
  });

  const resetNewProductForm = (searchVal = "") => {
    setNewProduct({
      name: searchVal || "",
      purchasePrice: "",
      sellingPrice: "",
      category: "General",
      unit: units.length > 0 ? units[0].name : "Pcs",
      taxId: "",
      isTaxInclusive: false,
    });
  };

  const selectProductInForm = (newProd) => {
    const items = [...form.items];
    let targetIndex = items.findIndex((item) => !item.product);
    if (targetIndex === -1) {
      items.push({ ...emptyRow, _key: Date.now() });
      targetIndex = items.length - 1;
    }

    items[targetIndex].product = newProd._id;
    items[targetIndex].variantId = "";
    items[targetIndex].variantName = "";
    items[targetIndex].price = newProd.purchasePrice || 0;
    items[targetIndex].taxId = newProd.taxId?._id || newProd.taxId || "";
    
    const unitMatch = units.find((u) => u._id === newProd.unit || u.name === newProd.unit);
    items[targetIndex].unit = unitMatch ? unitMatch._id : (newProd.unit?._id || newProd.unit || "");
    items[targetIndex].quantity = 1;

    if (targetIndex === items.length - 1) {
      items.push({ ...emptyRow, _key: Date.now() + 1 });
    }

    setForm((prev) => ({ ...prev, items }));
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) return showSnack("Product name is required", "error");
    try {
      setIsSubmittingProduct(true);
      const selectedTaxObj = taxes.find((t) => t._id === newProduct.taxId);
      const branchIds = form.branch ? [form.branch] : branches.map((b) => b._id);
      
      const payload = {
        name: newProduct.name,
        purchasePrice: Number(newProduct.purchasePrice) || 0,
        sellingPrice: Number(newProduct.sellingPrice) || 0,
        category: newProduct.category || "General",
        unit: newProduct.unit || "Pcs",
        taxId: newProduct.taxId || undefined,
        taxPercent: selectedTaxObj ? selectedTaxObj.percentage : 0,
        isTaxInclusive: newProduct.isTaxInclusive,
        branches: branchIds,
        isActive: true,
      };

      const res = await api.post("/products", payload);
      if (res.data.success) {
        showSnack("Product created successfully", "success");
        const addedProduct = res.data.data;
        setProducts((prev) => [...prev, addedProduct]);
        selectProductInForm(addedProduct);
        setIsAddProductOpen(false);
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to create product", "error");
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const [form, setForm] = useState({
    branch: "",
    supplier: "",
    date: new Date().toISOString().split("T")[0],
    paidAmount: "",
    paymentMethod: "CASH",
    freightCharge: 0,
    notes: "",
    items: [{ ...emptyRow }],
    taxDisabled: false,
    isTaxInclusive: false,
    isPaidAmountManuallyEdited: false,
  });

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [branchRes, supRes, prodRes, pmRes, taxRes, unitRes] =
        await Promise.all([
          api.get("/shops"),
          api.get("/suppliers"),
          api.get("/products"),
          api.get("/payment-methods"),
          api.get("/taxes"),
          api.get("/units"),
        ]);
      if (branchRes.data.success) {
        const shopsData = branchRes.data.data || [];
        setBranches(shopsData);

        // Pre-select branch for staff
        if (user?.role === "staff") {
          const uBranchId =
            typeof user.branchId === "string"
              ? user.branchId
              : user.branchId?._id;
          if (uBranchId) {
            setForm((prev) => ({ ...prev, branch: uBranchId }));
          }
        }
      }
      if (supRes.data.success) setSuppliers(supRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (pmRes.data.success)
        setPaymentMethods(pmRes.data.data?.filter((pm) => pm.isActive) || []);
      if (taxRes.data.success) {
        const activeTaxes = taxRes.data.data?.filter((t) => t.isActive) || [];
        setTaxes(activeTaxes);
        const tax12 = activeTaxes.find((t) => t.percentage === 12);
        if (tax12) {
          setNewProduct((prev) => {
            if (prev.taxId) return prev;
            return {
              ...prev,
              taxId: tax12._id,
            };
          });
        }
      }
      if (unitRes.data.success) setUnits(unitRes.data.data);

      if (isEdit) {
        const invRes = await api.get(`/purchases/invoices/${id}`);
        if (invRes.data.success) {
          const inv = invRes.data.data;
          setForm({
            branch: inv.branchId?._id || inv.branchId || inv.branch || "",
            supplier: inv.supplier?._id || inv.supplier || "",
            date: inv.date
              ? new Date(inv.date).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            paidAmount: inv.paidAmount || "",
            paymentMethod: inv.paymentMethod || "CASH",
            freightCharge: inv.freightCharge || 0,
            notes: inv.notes || "",
            items: [
              ...inv.items.map((i, idx) => ({
                product: i.product?._id || i.product || "",
                unit: i.unit?._id || i.unit || "",
                quantity: i.quantity || 1,
                price: i.price || 0,
                taxId: i.taxId?._id || i.taxId || "",
                _key: Date.now() + idx,
              })),
              { ...emptyRow, _key: Date.now() + 999 },
            ],
            taxDisabled: inv.taxDisabled || false,
            isTaxInclusive: inv.items[0]?.isTaxInclusive || false,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isEdit || !paymentMethods.length || !defaultInvoicePaymentMethod) return;
    
    const def = String(defaultInvoicePaymentMethod).trim();
    const match = paymentMethods.find(
      (pm) => String(pm.name || "").toUpperCase() === def.toUpperCase(),
    );
    
    if (!match) return;

    setForm((prev) => {
      // Only set default if it hasn't been changed from the initial "CASH" default
      // OR if the user hasn't interacted with it yet.
      // But we must be careful not to keep overriding it.
      if (prev.paymentMethod !== "CASH") return prev;
      return { ...prev, paymentMethod: match.name };
    });
  }, [isEdit, paymentMethods, defaultInvoicePaymentMethod]);

  // Fetch pending POs when supplier changes
  useEffect(() => {
    const supplierId = form.supplier || "local";
    api
      .get(`/purchases/orders/by-supplier/${supplierId}`)
      .then((res) => {
        if (res.data.success) setPendingOrders(res.data.data);
      })
      .catch(() => setPendingOrders([]));
  }, [form.supplier]);

  // Fetch filtered suppliers when branch changes
  useEffect(() => {
    const fetchFilteredSuppliers = async () => {
      try {
        const query = form.branch ? `?branchId=${form.branch}` : "";
        const res = await api.get(`/suppliers${query}`);
        if (res.data.success) {
          setSuppliers(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch filtered suppliers:", err);
      }
    };
    fetchFilteredSuppliers();
  }, [form.branch]);

  const importPO = useCallback((order) => {
    setSelectedPO(order);
    const poItems = order.items.map((i, idx) => ({
      product: i.product?._id || i.product || "",
      unit: i.unit?._id || i.unit || "",
      quantity: i.quantity || 1,
      price: i.price || 0,
      taxId: i.taxId?._id || i.taxId || "",
      _key: Date.now() + idx,
    }));
    poItems.push({ ...emptyRow, _key: Date.now() + 999 });
    setForm((prev) => ({
      ...prev,
      items: poItems,
      purchaseOrderId: order._id,
    }));
  }, []);

  // Handle incoming PO from navigation state
  useEffect(() => {
    if (location.state?.fromPO && !isEdit && !loading) {
      const po = location.state.fromPO;
      // If the products/branches are already loaded, we can import
      // But we need to make sure the form fields like supplier/branch are set
      setForm((prev) => ({
        ...prev,
        branch: po.branchId?._id || po.branchId || "",
        supplier: po.supplier?._id || po.supplier || "",
      }));
      importPO(po);
      // Clear state so it doesn't re-trigger on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isEdit, loading, importPO]);

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    if (field === "product") {
      // In our flattened list, value might be `productId:variantId`
      const [pid, vid] = value.split(":");
      items[index].product = pid;
      items[index].variantId = vid || "";

      const prod = products.find((p) => p._id === pid);
      if (prod) {
        if (vid) {
          const variant = prod.variants?.find(
            (v) => (v._id || v.variantId?._id || v.variantId) === vid,
          );
          items[index].price =
            variant?.purchasePrice || prod.purchasePrice || 0;
          items[index].variantName =
            variant?.variantId?.name || variant?.name || "";
        } else {
          items[index].price = prod.purchasePrice || 0;
          items[index].variantName = "";
        }
        items[index].taxId = prod.tax?._id || prod.tax || "";
        const unitMatch = units.find(u => u._id === prod.unit || u.name === prod.unit);
        items[index].unit = unitMatch ? unitMatch.name : (prod.unit?.name || prod.unit || "");
        
        // Default quantity to 1 if not already set
        if (!items[index].quantity || items[index].quantity === 0) {
          items[index].quantity = 1;
        }
      }
      // Auto-add new row if this is the last row and product was selected
      if (index === items.length - 1 && value) {
        items.push({ ...emptyRow, _key: Date.now() });
      }
    } else {
      items[index][field] = value;
    }
    setForm({ ...form, items });
  };

  const removeItem = (index) => {
    const items = form.items.filter((_, i) => i !== index);
    if (items.length === 0) items.push({ ...emptyRow, _key: Date.now() });
    setForm({ ...form, items });
  };

  // Only count rows that have a product selected
  const validItems = form.items.filter((i) => i.product);
  
  const subtotal = validItems.reduce((s, i) => {
    const qty = Number(i.quantity) || 0;
    const price = Number(i.price) || 0;
    const tax = taxes.find((t) => t._id === i.taxId || t.name === i.taxId);
    const percent = form.taxDisabled ? 0 : (tax ? tax.percentage : 0);
    
    if (form.isTaxInclusive) {
      const lineGrand = qty * price;
      const lineBase = lineGrand / (1 + percent / 100);
      return s + lineBase;
    }
    return s + qty * price;
  }, 0);

  const totalTax = validItems.reduce((s, i) => {
    if (form.taxDisabled) return s;
    const qty = Number(i.quantity) || 0;
    const price = Number(i.price) || 0;
    const tax = taxes.find((t) => t._id === i.taxId || t.name === i.taxId);
    const percent = tax ? tax.percentage : 0;
    
    if (form.isTaxInclusive) {
      const lineGrand = qty * price;
      const lineBase = lineGrand / (1 + percent / 100);
      return s + (lineGrand - lineBase);
    }
    const lineBase = qty * price;
    return s + (lineBase * percent) / 100;
  }, 0);
  const preRoundGrand = applyPrecision(
    subtotal + totalTax + (Number(form.freightCharge) || 0),
    salonSettings,
  );
  const { finalAmount: roundedGrandTotal } = applyRoundOff(
    preRoundGrand,
    salonSettings,
  );
  const displayGrandTotal = roundedGrandTotal;
  const dueBalance = displayGrandTotal - (Number(form.paidAmount) || 0);

  useEffect(() => {
    // Auto-update paid amount if it hasn't been manually edited
    if (!isEdit && !form.isPaidAmountManuallyEdited) {
      setForm((prev) => ({ ...prev, paidAmount: displayGrandTotal }));
    }
  }, [displayGrandTotal, isEdit, form.isPaidAmountManuallyEdited]);

  const handleSubmit = async () => {
    if (!form.branch) return showSnack("Please select a branch", "warning");
    if (validItems.length === 0)
      return showSnack("Please add at least one product", "warning");
    try {
      setIsSubmitting(true);
      const payload = {
        branchId: form.branch,
        supplier: form.supplier || undefined,
        date: form.date,
        paidAmount: Number(form.paidAmount) || 0,
        paymentMethod: form.paymentMethod || "CASH",
        freightCharge: Number(form.freightCharge) || 0,
        notes: form.notes,
        items: validItems.map((i) => {
          const tax = taxes.find(
            (t) => t._id === i.taxId || t.name === i.taxId,
          );
          const percent = form.taxDisabled ? 0 : (tax ? tax.percentage : 0);
          const product = products.find((p) => p._id === i.product);
          return {
            product: i.product,
            productName: product?.name || "",
            variantId: i.variantId || undefined,
            variantName: i.variantName || undefined,
            unit: (() => {
              if (!i.unit) return undefined;
              const uMatch = units.find((u) => u.name === i.unit || u._id === i.unit);
              return uMatch ? uMatch._id : undefined;
            })(),
            quantity: Number(i.quantity) || 1,
            price: Number(i.price) || 0,
            taxId: form.taxDisabled ? undefined : (i.taxId || undefined),
            taxPercent: percent,
            isTaxInclusive: form.isTaxInclusive,
          };
        }),
        purchaseOrderId: form.purchaseOrderId || undefined,
      };
      if (isEdit) {
        await api.put(`/purchases/invoices/${id}`, payload);
      } else {
        await api.post("/purchases/invoices", payload);
      }
      navigate(getPath("/admin/stock/purchase-invoice"));
    } catch (err) {
      showSnack(err.response?.data?.message || "Error saving invoice", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name) return showSnack("Supplier name is required", "error");
    try {
      setIsSubmittingSupplier(true);
      const res = await api.post("/suppliers", newSupplier);
      if (res.data.success) {
        showSnack("Supplier created successfully", "success");
        const addedSupplier = res.data.data;
        setSuppliers([...suppliers, addedSupplier]);
        setForm({ ...form, supplier: addedSupplier._id, purchaseOrderId: undefined });
        setIsAddSupplierOpen(false);
        setNewSupplier({
          name: "", email: "", phone: "", address: "", gstNumber: "",
          contactPerson: "", branches: []
        });
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to create supplier", "error");
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  // ── Helpers for product options (shared between desktop table and mobile cards) ──
  const getProductOptions = () =>
    products
      .filter(
        (p) =>
          !form.branch ||
          !p.branches ||
          p.branches.length === 0 ||
          p.branches.some((b) => (b._id || b) === form.branch),
      )
      .flatMap((p) => {
        if (p.useVariants && p.variants?.length > 0) {
          return p.variants.map((v) => ({
            value: `${p._id}:${v._id || v.variantId?._id || v.variantId}`,
            label: `${p.name} - ${v.variantId?.name || v.name || "Variant"}`,
          }));
        }
        return { value: p._id, label: p.name };
      });

  const getFilteredProductOptions = () => {
    // User wants to allow same item multiple times, so we don't filter out selected items anymore.
    return getProductOptions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-bg font-sans">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* ── HEADER — fixed top ── */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(getPath("/admin/stock/purchase-invoice"))}
            className="p-1.5 hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card rounded-xl transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {isEdit ? "Edit Purchase Entry" : "New Purchase Entry"}
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider truncate">
              {form.supplier
                ? suppliers.find((s) => s._id === form.supplier)?.name
                : "LOCAL PURCHASE"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(getPath("/admin/stock/purchase-invoice"))}
            className="px-3 md:px-5 py-2 bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-xs md:text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-3 md:px-6 py-2 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-xs md:text-sm cursor-pointer flex items-center gap-1.5 ${isSubmitting ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
          >
            <Save size={14} />
            <span className="hidden sm:inline">{isSubmitting ? "Saving..." : isEdit ? "Update" : "Save Purchase"}</span>
            <span className="sm:hidden">{isSubmitting ? "..." : "Save"}</span>
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto">

      {/* ── FORM FIELDS — responsive single row on desktop ── */}
      <div className="px-4 md:px-6 py-3 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">

        {/* Mobile: 2-col grid | Desktop: single flex row */}
        <div className="grid grid-cols-2 md:flex md:flex-row gap-2">

          {/* Branch */}
          <div className={`col-span-1 md:w-44 md:shrink-0 ${user?.role === "staff" && branches.length <= 1 ? "hidden" : ""}`}>
            <div className="flex items-center h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">
                Branch <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center">
              <InlineSearchSelect
                value={form.branch}
                onChange={(val) => setForm({ ...form, branch: val })}
                options={branches
                  .filter((b) => {
                    if (user?.role !== "staff") return true;
                    const uBranchId = typeof user.branchId === "string" ? user.branchId : user.branchId?._id;
                    return b._id === uBranchId;
                  })
                  .map((b) => ({ value: b._id, label: (b.mapAddress || b.address) ? `${b.name} - ${b.mapAddress || b.address}` : b.name }))}
                placeholder="Select Branch"
                className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="col-span-1 md:w-44 md:shrink-0">
            <div className="flex items-center gap-1.5 h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Supplier</label>
              <button
                type="button"
                onClick={() => { setNewSupplier({ ...newSupplier, branches: form.branch ? [form.branch] : [] }); setIsAddSupplierOpen(true); }}
                className="flex items-center justify-center w-4 h-4 rounded bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shrink-0"
                title="Add New Supplier"
              >
                <Plus size={10} strokeWidth={3} />
              </button>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center">
              <InlineSearchSelect
                value={form.supplier}
                onChange={(val) => setForm({ ...form, supplier: val, purchaseOrderId: undefined })}
                options={suppliers
                  .filter((s) => {
                    if (user?.role !== "staff") return true;
                    const uBranchId = typeof user.branchId === "string" ? user.branchId : user.branchId?._id;
                    return !s.branches || s.branches.length === 0 || s.branches.some((b) => (b._id || b) === uBranchId);
                  })
                  .map((s) => ({ value: s._id, label: s.name }))}
                placeholder="LOCAL PURCHASE"
                className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Date */}
          <div className="col-span-1 md:w-36 md:shrink-0">
            <div className="flex items-center h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Date</label>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full h-full bg-transparent text-sm font-medium outline-none text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Freight */}
          <div className="col-span-1 md:w-24 md:shrink-0">
            <div className="flex items-center h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Freight</label>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center">
              <input
                type="number"
                value={form.freightCharge}
                onChange={(e) => setForm({ ...form, freightCharge: e.target.value })}
                placeholder="0"
                className="w-full h-full bg-transparent text-sm font-medium outline-none text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Paid Amount */}
          <div className="col-span-1 md:w-32 md:shrink-0">
            <div className="flex items-center justify-between h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none notranslate">Paid ({currencySymbol})</label>
              <button
                onClick={() => setForm((prev) => ({ ...prev, paidAmount: displayGrandTotal, isPaidAmountManuallyEdited: true }))}
                className="text-[9px] font-black text-brand-primary dark:text-blue-400 hover:text-brand-secondary uppercase tracking-tight cursor-pointer leading-none"
              >
                Full
              </button>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center gap-1">
              <span className="text-gray-400 dark:text-gray-500 text-sm font-medium notranslate shrink-0">{currencySymbol}</span>
              <input
                type="number"
                value={form.paidAmount}
                onChange={(e) => setForm({ ...form, paidAmount: e.target.value, isPaidAmountManuallyEdited: true })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full h-full bg-transparent text-sm font-bold outline-none text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div className="col-span-1 md:w-36 md:shrink-0">
            <div className="flex items-center h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Payment</label>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center">
              <InlineSearchSelect
                value={form.paymentMethod}
                onChange={(val) => setForm({ ...form, paymentMethod: val })}
                options={paymentMethods.map((pm) => ({ value: pm.name, label: pm.name }))}
                placeholder="Method"
                className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Notes — full width on mobile, flex-1 on desktop */}
          <div className="col-span-2 md:flex-1">
            <div className="flex items-center h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Notes</label>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center">
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Remarks..."
                className="w-full bg-transparent text-sm font-medium outline-none text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Tax Toggle */}
          <div className="col-span-1 md:w-auto md:shrink-0 flex items-center gap-4">
            <div>
              <div className="flex items-center h-5 mb-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Apply Tax</label>
              </div>
              <div className="h-9 flex items-center gap-2 px-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={!form.taxDisabled}
                    onChange={() => setForm(prev => ({ ...prev, taxDisabled: !prev.taxDisabled }))}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-dark-card peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                  <span className="ms-2 text-xs font-bold text-gray-700 dark:text-gray-300">{form.taxDisabled ? "OFF" : "ON"}</span>
                </label>
              </div>
            </div>

            {!form.taxDisabled && (
              <div>
                <div className="flex items-center h-5 mb-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Tax Mode</label>
                </div>
                <div className="h-9 flex items-center">
                  <select
                    value={form.isTaxInclusive ? "inclusive" : "exclusive"}
                    onChange={(e) => setForm(prev => ({ ...prev, isTaxInclusive: e.target.value === "inclusive" }))}
                    className="bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary/40 transition-all cursor-pointer h-8"
                  >
                    <option value="exclusive">Exclusive (+ Tax)</option>
                    <option value="inclusive">Inclusive (Inc. Tax)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PENDING PURCHASE ORDERS ── */}
      {pendingOrders.length > 0 && !isEdit && (
        <div className="bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30 px-4 md:px-6 py-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={14} className="text-amber-600" />
            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
              Pending Purchase Orders
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {pendingOrders.map((po) => (
              <button
                key={po._id}
                onClick={() => importPO(po)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedPO?._id === po._id
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white dark:bg-dark-card text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                }`}
              >
                <span className="font-mono">{po.orderNumber}</span>
                <span className="ml-1.5 notranslate">{currencySymbol}{formatDisplayNumber(po.totalAmount)}</span>
                <span className="ml-1.5 text-[10px] opacity-70">{new Date(po.date).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ITEMS — Desktop Table / Mobile Cards ── */}
      <div className="bg-white dark:bg-dark-bg">

        {/* ── DESKTOP TABLE (md+) ── */}
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white dark:bg-dark-surface z-10">
            <tr className="border-b border-gray-100 dark:border-dark-border">
              <th className="text-left px-6 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-10">#</th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span>Product Item</span>
                  <button
                    type="button"
                    onClick={() => {
                      resetNewProductForm();
                      setIsAddProductOpen(true);
                    }}
                    className="flex items-center justify-center w-4 h-4 rounded bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all cursor-pointer shrink-0"
                    title="Add New Product"
                  >
                    <Plus size={10} strokeWidth={3} />
                  </button>
                </div>
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-36">Unit</th>
              <th className="text-center px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-24">Qty</th>
              <th className="text-right px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-28">Unit Price</th>
              {!form.taxDisabled && <th className="text-left px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-40">Tax Rate</th>}
              <th className="text-right px-6 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-32">Line Total</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
            {form.items.map((item, i) => {
              const qty = Number(item.quantity) || 0;
              const price = Number(item.price) || 0;
              const tax = taxes.find((t) => t._id === item.taxId || t.name === item.taxId);
              const percent = form.taxDisabled ? 0 : (tax ? tax.percentage : 0);
              
              let lineTotal, lineTax, lineGrand;
              if (form.isTaxInclusive) {
                 lineGrand = qty * price;
                 lineTotal = lineGrand / (1 + percent / 100);
                 lineTax = lineGrand - lineTotal;
              } else {
                 lineTotal = qty * price;
                 lineTax = (lineTotal * percent) / 100;
                 lineGrand = lineTotal + lineTax;
              }
              const isLast = i === form.items.length - 1;
              const hasProduct = Boolean(item.product);
              return (
                <tr key={item._key} className={`group transition-colors ${hasProduct ? "hover:bg-blue-50/40 dark:hover:bg-brand-primary/5" : "bg-gray-50/30 dark:bg-dark-card/20"}`}>
                  <td className="px-6 py-2 text-xs font-medium text-gray-400 dark:text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <InlineSearchSelect
                      id={`product-${i}`}
                      value={item.variantId ? `${item.product}:${item.variantId}` : item.product}
                      onChange={(val) => { updateItem(i, "product", val); if (val) setTimeout(() => document.getElementById(`unit-${i}`)?.focus(), 50); }}
                      options={getFilteredProductOptions()}
                      placeholder={isLast && !hasProduct ? "Type or select a product..." : "Select product"}
                      className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm outline-none transition-all cursor-pointer dark:text-gray-200"
                      dropdownWidth="400px"
                      noResultsActionLabel="Add New Product"
                      onNoResultsAction={(searchVal) => {
                        resetNewProductForm(searchVal);
                        setIsAddProductOpen(true);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <InlineSearchSelect
                      id={`unit-${i}`}
                      value={item.unit}
                      onChange={(val) => { updateItem(i, "unit", val); setTimeout(() => document.getElementById(`qty-${i}`)?.focus(), 50); }}
                      options={units.map((u) => ({ value: u.name, label: u.name }))}
                      placeholder="Unit"
                      className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm outline-none transition-all cursor-pointer dark:text-gray-200"
                      disabled={!hasProduct}
                      dropdownWidth="200px"
                      searchable={false}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      id={`qty-${i}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById(`price-${i}`)?.focus(); } }}
                      placeholder="0"
                      min="1"
                      className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm text-center outline-none transition-all dark:text-gray-200"
                      disabled={!hasProduct}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      id={`price-${i}`}
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(i, "price", e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById(`tax-${i}`)?.focus(); } }}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm text-right outline-none transition-all dark:text-gray-200"
                      disabled={!hasProduct}
                    />
                  </td>
                  {!form.taxDisabled && (
                    <td className="px-3 py-2">
                      <InlineSearchSelect
                        id={`tax-${i}`}
                        value={item.taxId}
                        onChange={(val) => { updateItem(i, "taxId", val); setTimeout(() => document.getElementById(`product-${i + 1}`)?.focus(), 50); }}
                        options={[
                          { value: "", label: "0%" },
                          ...taxes.map((t) => ({ value: t._id, label: t.name.includes(String(t.percentage)) ? t.name : `${t.name} (${t.percentage}%)` }))
                        ]}
                        placeholder="0%"
                        className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm outline-none transition-all cursor-pointer dark:text-gray-200"
                        disabled={!hasProduct}
                        dropdownWidth="200px"
                      />
                    </td>
                  )}
                  <td className="px-6 py-2 text-right">
                    {hasProduct && (
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(lineGrand)}</div>
                        {lineTax > 0 && <div className="text-[10px] text-gray-400 dark:text-gray-500 notranslate">{currencySymbol}{formatDisplayNumber(lineTotal)} + {currencySymbol}{formatDisplayNumber(lineTax)} Tax</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {hasProduct && (
                      <button onClick={() => removeItem(i)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="Remove row">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {/* ── MOBILE CARDS (< md) ── */}
        <div className="md:hidden flex flex-col gap-3 p-4 pb-6">
          {form.items.map((item, i) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const tax = taxes.find((t) => t._id === item.taxId || t.name === item.taxId);
            const percent = form.taxDisabled ? 0 : (tax ? tax.percentage : 0);
            
            let lineTotal, lineTax, lineGrand;
            if (form.isTaxInclusive) {
               lineGrand = qty * price;
               lineTotal = lineGrand / (1 + percent / 100);
               lineTax = lineGrand - lineTotal;
            } else {
               lineTotal = qty * price;
               lineTax = (lineTotal * percent) / 100;
               lineGrand = lineTotal + lineTax;
            }
            const isLast = i === form.items.length - 1;
            const hasProduct = Boolean(item.product);

            return (
              <div
                key={item._key}
                className={`rounded-2xl border transition-all ${
                  hasProduct
                    ? "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border shadow-sm"
                    : "bg-gray-50/60 dark:bg-dark-card/40 border-dashed border-gray-200 dark:border-dark-border"
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-black text-brand-primary dark:text-blue-400">{i + 1}</span>
                    </div>
                    {hasProduct && (
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[180px]">
                        {getProductOptions().find((o) => o.value === (item.variantId ? `${item.product}:${item.variantId}` : item.product))?.label || "Product"}
                      </span>
                    )}
                    {!hasProduct && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">New item</span>
                    )}
                  </div>
                  {hasProduct && (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-black text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(lineGrand)}</div>
                        {lineTax > 0 && <div className="text-[9px] text-gray-400 dark:text-gray-500 notranslate">+{currencySymbol}{formatDisplayNumber(lineTax)} tax</div>}
                      </div>
                      <button onClick={() => removeItem(i)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Product Select */}
                <div className="px-4 pb-3">
                  <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all mb-3">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5 w-full">
                      <label className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block">Product</label>
                      <button
                        type="button"
                        onClick={() => {
                          resetNewProductForm();
                          setIsAddProductOpen(true);
                        }}
                        className="flex items-center justify-center w-4 h-4 rounded bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all cursor-pointer shrink-0"
                        title="Add New Product"
                      >
                        <Plus size={10} strokeWidth={3} />
                      </button>
                    </div>
                    <InlineSearchSelect
                      id={`m-product-${i}`}
                      value={item.variantId ? `${item.product}:${item.variantId}` : item.product}
                      onChange={(val) => updateItem(i, "product", val)}
                      options={getFilteredProductOptions()}
                      placeholder={isLast && !hasProduct ? "Tap to select product..." : "Select product"}
                      className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200"
                      dropdownWidth="320px"
                      noResultsActionLabel="Add New Product"
                      onNoResultsAction={(searchVal) => {
                        resetNewProductForm(searchVal);
                        setIsAddProductOpen(true);
                      }}
                    />
                  </div>

                  {/* Row 2: Unit + Qty + Price */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                      <label className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block mb-0.5">Unit</label>
                      <InlineSearchSelect
                        id={`m-unit-${i}`}
                        value={item.unit}
                        onChange={(val) => updateItem(i, "unit", val)}
                        options={units.map((u) => ({ value: u.name, label: u.name }))}
                        placeholder="—"
                        className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200"
                        disabled={!hasProduct}
                        dropdownWidth="180px"
                        searchable={false}
                      />
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                      <label className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block mb-0.5">Qty</label>
                      <input
                        id={`m-qty-${i}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", e.target.value)}
                        placeholder="0"
                        min="1"
                        className="w-full bg-transparent text-sm font-bold outline-none text-gray-700 dark:text-gray-200"
                        disabled={!hasProduct}
                      />
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                      <label className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block mb-0.5">Price</label>
                      <input
                        id={`m-price-${i}`}
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(i, "price", e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full bg-transparent text-sm font-bold outline-none text-gray-700 dark:text-gray-200"
                        disabled={!hasProduct}
                      />
                    </div>
                  </div>

                  {!form.taxDisabled && (
                    <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                      <label className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block mb-0.5">Tax Rate</label>
                      <InlineSearchSelect
                        id={`m-tax-${i}`}
                        value={item.taxId}
                        onChange={(val) => updateItem(i, "taxId", val)}
                        options={[
                          { value: "", label: "0%" },
                          ...taxes.map((t) => ({ value: t._id, label: t.name.includes(String(t.percentage)) ? t.name : `${t.name} (${t.percentage}%)` }))
                        ]}
                        placeholder="0%"
                        className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200"
                        disabled={!hasProduct}
                        dropdownWidth="260px"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Item Button */}
          <button
            onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyRow, _key: Date.now() }] }))}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-brand-primary/20 text-brand-primary dark:text-blue-400 font-bold text-sm hover:bg-brand-primary/5 transition-all active:scale-95"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      </div>{/* ── END SCROLLABLE BODY ── */}

      {/* ── TOTALS FOOTER — fixed at bottom ── */}
      <div className="shrink-0 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface pb-16 md:pb-0">
        {/* Desktop Footer */}
        <div className="hidden md:flex items-center justify-between px-4 md:px-6 py-3 gap-3 overflow-x-auto scrollbar-hide">
          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Items</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{validItems.length}</span>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Subtotal</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 notranslate">{currencySymbol}{formatDisplayNumber(subtotal)}</span>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Tax</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 notranslate">{currencySymbol}{formatDisplayNumber(totalTax)}</span>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Freight</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 notranslate">{currencySymbol}{formatDisplayNumber(Number(form.freightCharge) || 0)}</span>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Grand Total</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(displayGrandTotal)}</span>
            </div>
          </div>
          {/* Due Balance */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Due Balance</span>
            <span className={`text-base font-black notranslate ${dueBalance > 0 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>
              {currencySymbol}{formatDisplayNumber(dueBalance)}
            </span>
          </div>
        </div>

        {/* Mobile Footer Card */}
        <div className="md:hidden">
          <div className="bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border">
            <div className="flex items-center justify-between px-3 py-3 gap-2.5 overflow-x-auto scrollbar-hide">
              {/* Items */}
              <div className="bg-gray-50 dark:bg-dark-surface rounded-xl px-3.5 py-2.5 text-center shrink-0">
                <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1.5">Items</div>
                <div className="text-sm font-black text-gray-900 dark:text-white">{validItems.length}</div>
              </div>
              
              {/* Subtotal */}
              <div className="bg-gray-50 dark:bg-dark-surface rounded-xl px-3.5 py-2.5 text-center shrink-0">
                <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1.5">Subtotal</div>
                <div className="text-sm font-black text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(subtotal)}</div>
              </div>
              
              {/* Tax */}
              <div className="bg-gray-50 dark:bg-dark-surface rounded-xl px-3.5 py-2.5 text-center shrink-0">
                <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1.5">Tax</div>
                <div className="text-sm font-black text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(totalTax)}</div>
              </div>
              
              {/* Freight */}
              <div className="bg-gray-50 dark:bg-dark-surface rounded-xl px-3.5 py-2.5 text-center shrink-0">
                <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1.5">Freight</div>
                <div className="text-sm font-black text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(Number(form.freightCharge) || 0)}</div>
              </div>
              
              {/* Grand Total - Highlighted */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-3.5 py-2.5 text-center shrink-0">
                <div className="text-[9px] font-bold uppercase text-green-600 dark:text-green-400 tracking-wider mb-1.5">Grand Total</div>
                <div className="text-sm font-black text-green-700 dark:text-green-300 notranslate">{currencySymbol}{formatDisplayNumber(displayGrandTotal)}</div>
              </div>
            </div>
            
            {/* Due Balance - Second Row if needed */}
            {dueBalance !== 0 && (
              <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-dark-border">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Due Balance</span>
                  <span className={`text-base font-black notranslate ${dueBalance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {currencySymbol}{formatDisplayNumber(dueBalance)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        title="Add New Supplier"
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsAddSupplierOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSupplier}
              disabled={isSubmittingSupplier}
              className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 text-sm cursor-pointer ${isSubmittingSupplier ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
            >
              {isSubmittingSupplier ? "Processing..." : "Add Supplier"}
            </button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <CustomMultiSelect
                label="Assign Branches"
                icon={Building2}
                placeholder="Select Branches"
                value={newSupplier.branches}
                onChange={(e) =>
                  setNewSupplier({ ...newSupplier, branches: e.target.value })
                }
                options={branches
                  .filter((b) => {
                    if (user?.role !== "staff") return true;
                    const uBranchId =
                      typeof user.branchId === "string"
                        ? user.branchId
                        : user.branchId?._id;
                    return b._id === uBranchId;
                  })
                  .map((b) => ({
                    value: b._id,
                    label: (b.mapAddress || b.address) ? `${b.name} - ${b.mapAddress || b.address}` : b.name,
                  }))}
                isSearchable={user?.role !== "staff"}
                showSelectAll={user?.role !== "staff"}
              />
            </div>
            <CustomTextField
              label="Company / Supplier Name"
              icon={Briefcase}
              placeholder="Acme Corp"
              value={newSupplier.name}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Phone Number"
              icon={Phone}
              placeholder="+91 00000 00000"
              value={newSupplier.phone}
              onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
            />
            <CustomTextField
              label="Email Address"
              icon={Mail}
              placeholder="supplier@example.com"
              value={newSupplier.email}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Contact Person"
              icon={Users}
              placeholder="John Doe"
              value={newSupplier.contactPerson}
              onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
            />
            <CustomTextField
              label="GST Number"
              icon={Receipt}
              placeholder="22AAAAA0000A1Z5"
              value={newSupplier.gstNumber}
              onChange={(e) => setNewSupplier({ ...newSupplier, gstNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Opening Balance"
              icon={() => <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{currencySymbol}</span>}
              type="number"
              min="0"
              step="0.01"
              value={newSupplier.openingBalance}
              onChange={(e) => setNewSupplier({ ...newSupplier, openingBalance: e.target.value })}
            />
            <CustomTextField
              label="Credit Limit"
              icon={CreditCard}
              type="number"
              min="0"
              step="0.01"
              placeholder="0 = No limit"
              value={newSupplier.creditLimit}
              onChange={(e) => setNewSupplier({ ...newSupplier, creditLimit: e.target.value })}
            />
          </div>

          <CustomTextField
            label="Full Address (Optional)"
            icon={MapPin}
            placeholder="123 Industrial Park, Sector 4..."
            value={newSupplier.address}
            onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
          />
        </form>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add New Product"
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsAddProductOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProduct}
              disabled={isSubmittingProduct}
              className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 text-sm cursor-pointer ${isSubmittingProduct ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
            >
              {isSubmittingProduct ? "Processing..." : "Add Product"}
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateProduct(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Product Name"
              icon={Package}
              placeholder="Enter product name"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
              required
            />
            <CustomTextField
              label="Category"
              icon={Layers}
              placeholder="e.g. Hair, Skin, General"
              value={newProduct.category}
              onChange={(e) =>
                setNewProduct({ ...newProduct, category: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Purchase Price"
              icon={() => <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{currencySymbol}</span>}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={newProduct.purchasePrice}
              onChange={(e) =>
                setNewProduct({ ...newProduct, purchasePrice: e.target.value })
              }
            />
            <CustomTextField
              label="Selling Price"
              icon={() => <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{currencySymbol}</span>}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={newProduct.sellingPrice}
              onChange={(e) =>
                setNewProduct({ ...newProduct, sellingPrice: e.target.value })
              }
            />
          </div>

          <div className={`grid grid-cols-1 ${newProduct.taxId ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
            <CustomDropdown
              label="Unit"
              value={newProduct.unit}
              onChange={(e) =>
                setNewProduct({ ...newProduct, unit: e.target.value })
              }
              options={units.length > 0 ? units.map((u) => ({ value: u.name, label: u.name })) : [{ value: "Pcs", label: "Pcs" }]}
            />
            <CustomDropdown
              label="Tax Rate (Optional)"
              value={newProduct.taxId}
              onChange={(e) =>
                setNewProduct({ ...newProduct, taxId: e.target.value })
              }
              options={[
                { value: "", label: "0%" },
                ...taxes.map((t) => ({ value: t._id, label: t.name.includes(String(t.percentage)) ? t.name : `${t.name} (${t.percentage}%)` }))
              ]}
              placeholder="Select tax"
            />
            {newProduct.taxId && (
              <CustomDropdown
                label="Tax Mode"
                value={newProduct.isTaxInclusive ? "inclusive" : "exclusive"}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, isTaxInclusive: e.target.value === "inclusive" })
                }
                options={[
                  { value: "exclusive", label: "Exclusive" },
                  { value: "inclusive", label: "Inclusive" }
                ]}
              />
            )}
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default PurchaseEntryForm;
