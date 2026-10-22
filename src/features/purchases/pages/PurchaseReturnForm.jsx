import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axiosInstance";
import { ArrowLeft, Save, Trash2, Plus, Building2, Briefcase, Phone, Mail, Users, MapPin, CreditCard, Receipt } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import InlineSearchSelect from "../../../components/shared/InlineSearchSelect";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomMultiSelect from "../../../components/shared/CustomMultiSelect";
import Snackbar from "../../../components/shared/Snackbar";

const PurchaseReturnForm = () => {
  const { user } = useAuth();
  const { currencySymbol, formatDisplayNumber } = useCurrency();
  const navigate = useNavigate();
  const { id, shopSlug } = useParams();
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [units, setUnits] = useState([]);
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
    openingBalance: 0,
    creditLimit: 0,
    branches: [],
  });

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

  const [form, setForm] = useState({
    branch: "",
    supplier: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
    freightCharge: 0,
    items: [{ ...emptyRow }],
  });

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [branchRes, supRes, prodRes, taxRes, unitRes] = await Promise.all([
        api.get("/shops"),
        api.get("/suppliers"),
        api.get("/products"),
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
      if (taxRes.data.success)
        setTaxes(taxRes.data.data?.filter((t) => t.isActive) || []);
      if (unitRes.data.success) setUnits(unitRes.data.data);

      if (isEdit) {
        const retRes = await api.get(`/purchases/returns/${id}`);
        if (retRes.data.success) {
          const ret = retRes.data.data;
          setForm({
            branch: ret.branchId?._id || ret.branchId || ret.branch || "",
            supplier: ret.supplier?._id || ret.supplier || "",
            date: ret.date
              ? new Date(ret.date).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            reason: ret.reason || "",
            freightCharge: ret.freightCharge || 0,
            items: [
              ...ret.items.map((i, idx) => ({
                product: i.product?._id || i.product || "",
                variantId: i.variantId?._id || i.variantId || "",
                variantName: i.variantName || "",
                unit: i.unit?._id || i.unit || "",
                quantity: i.quantity || 1,
                price: i.price || 0,
                taxId: i.taxId?._id || i.taxId || "",
                _key: Date.now() + idx,
              })),
              { ...emptyRow, _key: Date.now() + 999 },
            ],
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    if (field === "product") {
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
        // Resolve unit: prod.unit can be an _id string, a name string, or an object {_id, name}
        const prodUnitId = prod.unit?._id || (typeof prod.unit === "string" ? prod.unit : "");
        const prodUnitName = prod.unit?.name || (typeof prod.unit === "string" ? prod.unit : "");
        const unitMatch = units.find(
          (u) => u._id === prodUnitId || u.name === prodUnitName || u._id === prodUnitName
        );
        items[index].unit = unitMatch ? unitMatch._id : prodUnitId;
      }
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

  const validItems = form.items.filter((i) => i.product);
  const subtotal = validItems.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0),
    0,
  );
  const totalTax = validItems.reduce((s, i) => {
    const line = (Number(i.quantity) || 0) * (Number(i.price) || 0);
    const tax = taxes.find((t) => t._id === i.taxId || t.name === i.taxId);
    const percent = tax ? tax.percentage : 0;
    return s + (line * Number(percent)) / 100;
  }, 0);
  const grandTotal =
    subtotal + totalTax + (Number(form.freightCharge) || 0);

  const handleSubmit = async () => {
    if (!form.branch) return showSnack("Please select a branch", "warning");
    if (validItems.length === 0)
      return showSnack("Please add at least one product", "warning");
    if (!form.supplier)
      return showSnack("Please select a supplier for return", "warning");
    try {
      setIsSubmitting(true);
      const payload = {
        branchId: form.branch,
        supplier: form.supplier,
        date: form.date,
        reason: form.reason,
        freightCharge: Number(form.freightCharge) || 0,
        items: validItems.map((i) => {
          const tax = taxes.find(
            (t) => t._id === i.taxId || t.name === i.taxId,
          );
          const percent = tax ? tax.percentage : 0;
          const product = products.find((p) => p._id === i.product);
          return {
            product: i.product,
            productName: product?.name || "",
            variantId: i.variantId || undefined,
            variantName: i.variantName || undefined,
            unit: i.unit || undefined,
            quantity: Number(i.quantity) || 1,
            price: Number(i.price) || 0,
            taxId: i.taxId || undefined,
            taxPercent: percent,
          };
        }),
      };
      if (isEdit) {
        await api.put(`/purchases/returns/${id}`, payload);
      } else {
        await api.post("/purchases/returns", payload);
      }
      navigate(getPath("/admin/stock/purchase-return"));
    } catch (err) {
      showSnack(err.response?.data?.message || "Error saving return", "error");
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
        setForm({ ...form, supplier: addedSupplier._id });
        setIsAddSupplierOpen(false);
        setNewSupplier({
          name: "", email: "", phone: "", address: "", gstNumber: "",
          contactPerson: "", openingBalance: 0, creditLimit: 0, branches: []
        });
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to create supplier", "error");
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Product option helpers ──
  const getProductOptions = () =>
    products
      .filter((p) => !form.branch || !p.branches || p.branches.length === 0 || p.branches.some((b) => (b._id || b) === form.branch))
      .flatMap((p) => {
        if (p.useVariants && p.variants?.length > 0) {
          return p.variants.map((v) => ({
            value: `${p._id}:${v._id || v.variantId?._id || v.variantId}`,
            label: `${p.name} - ${v.variantId?.name || v.name || "Variant"}`,
          }));
        }
        return { value: p._id, label: p.name };
      });

  const getFilteredProductOptions = (item) => {
    return getProductOptions().filter((opt) => {
      const currentVal = item.variantId ? `${item.product}:${item.variantId}` : item.product;
      if (opt.value === currentVal) return true;
      return !form.items.some((it) => {
        if (!it.product) return false;
        const itVal = it.variantId ? `${it.product}:${it.variantId}` : it.product;
        return itVal === opt.value;
      });
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-bg font-sans">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* ── HEADER ── */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(getPath("/admin/stock/purchase-return"))}
            className="p-1.5 hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-card rounded-xl transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {isEdit ? "Edit Purchase Return" : "New Purchase Return"}
            </h1>
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
              Return items to supplier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(getPath("/admin/stock/purchase-return"))}
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
            <span className="hidden sm:inline">{isSubmitting ? "Saving..." : isEdit ? "Update" : "Save Return"}</span>
            <span className="sm:hidden">{isSubmitting ? "..." : "Save"}</span>
          </button>
        </div>
      </div>
      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto">

      {/* ── FORM FIELDS ── */}
      <div className="px-4 md:px-6 py-3 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface">
        {/* Mobile: 2-col grid | Desktop: single flex row */}
        <div className="grid grid-cols-2 md:flex md:flex-row gap-2">

          {/* Branch */}
          <div className={`col-span-1 md:w-48 md:shrink-0 ${user?.role === "staff" && branches.length <= 1 ? "hidden" : ""}`}>
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
          <div className="col-span-1 md:w-48 md:shrink-0">
            <div className="flex items-center gap-1.5 h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Supplier <span className="text-red-500">*</span></label>
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
                onChange={(val) => setForm({ ...form, supplier: val })}
                options={suppliers
                  .filter((s) => {
                    if (user?.role !== "staff") return true;
                    const uBranchId = typeof user.branchId === "string" ? user.branchId : user.branchId?._id;
                    return !s.branches || s.branches.length === 0 || s.branches.some((b) => (b._id || b) === uBranchId);
                  })
                  .map((s) => ({ value: s._id, label: s.name }))}
                placeholder="Select Supplier"
                className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Return Date */}
          <div className="col-span-1 md:w-36 md:shrink-0">
            <div className="flex items-center h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Return Date</label>
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

          {/* Reason — full width on mobile, flex-1 on desktop */}
          <div className="col-span-2 md:flex-1">
            <div className="flex items-center h-5 mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider leading-none">Reason for Return</label>
            </div>
            <div className="h-9 bg-gray-50 dark:bg-dark-card rounded-xl px-3 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all flex items-center">
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="E.g., Defective items, wrong delivery..."
                className="w-full h-full bg-transparent text-sm font-medium outline-none text-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

        </div>
      </div>


      {/* ITEMS TABLE + MOBILE CARDS */}
      <div className="bg-white dark:bg-dark-bg">
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white dark:bg-dark-surface z-10">
            <tr className="border-b border-gray-100 dark:border-dark-border">
              <th className="text-left px-6 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-10">#</th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Product Item</th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-36">Unit</th>
              <th className="text-center px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-24">Return Qty</th>
              <th className="text-right px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-28">Unit Price</th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-40">Tax Rate</th>
              <th className="text-right px-6 py-3 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider w-32">Line Total</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
            {form.items.map((item, i) => {
              const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
              const tax = taxes.find((t) => t._id === item.taxId || t.name === item.taxId);
              const percent = tax ? tax.percentage : 0;
              const lineTax = (lineTotal * Number(percent)) / 100;
              const lineGrand = lineTotal + lineTax;
              const isLast = i === form.items.length - 1;
              const hasProduct = Boolean(item.product);
              return (
                <tr key={item._key} className={`group transition-colors ${hasProduct ? "hover:bg-blue-50/40 dark:hover:bg-brand-primary/5" : "bg-gray-50/30 dark:bg-dark-card/20"}`}>
                  <td className="px-6 py-2 text-xs font-medium text-gray-400 dark:text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <InlineSearchSelect id={`product-${i}`} value={item.variantId ? `${item.product}:${item.variantId}` : item.product} onChange={(val) => { updateItem(i, "product", val); if (val) setTimeout(() => document.getElementById(`unit-${i}`)?.focus(), 50); }} options={getFilteredProductOptions(item)} placeholder={isLast && !hasProduct ? "Type or select a product..." : "Select product"} className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm outline-none transition-all cursor-pointer dark:text-gray-200" dropdownWidth="400px" />
                  </td>
                  <td className="px-3 py-2">
                    <InlineSearchSelect id={`unit-${i}`} value={item.unit} onChange={(val) => { updateItem(i, "unit", val); setTimeout(() => document.getElementById(`qty-${i}`)?.focus(), 50); }} options={units.map((u) => ({ value: u._id, label: u.name }))} placeholder="Unit" className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm outline-none transition-all cursor-pointer dark:text-gray-200" disabled={!hasProduct} dropdownWidth="200px" />
                  </td>
                  <td className="px-3 py-2">
                    <input id={`qty-${i}`} type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById(`price-${i}`)?.focus(); } }} placeholder="0" min="1" className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm text-center outline-none transition-all dark:text-gray-200" disabled={!hasProduct} />
                  </td>
                  <td className="px-3 py-2">
                    <input id={`price-${i}`} type="number" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById(`tax-${i}`)?.focus(); } }} placeholder="0.00" min="0" step="0.01" className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm text-right outline-none transition-all dark:text-gray-200" disabled={!hasProduct} />
                  </td>
                  <td className="px-3 py-2">
                    <InlineSearchSelect id={`tax-${i}`} value={item.taxId} onChange={(val) => { updateItem(i, "taxId", val); setTimeout(() => document.getElementById(`product-${i + 1}`)?.focus(), 50); }} options={taxes.map((t) => ({ value: t._id, label: t.name.includes(String(t.percentage)) ? t.name : `${t.name} (${t.percentage}%)` }))} placeholder="Tax" className="w-full py-2 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:border-dark-border focus:border-brand-primary text-sm outline-none transition-all cursor-pointer dark:text-gray-200" disabled={!hasProduct} dropdownWidth="200px" />
                  </td>
                  <td className="px-6 py-2 text-right">
                    {hasProduct && (
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(lineGrand)}</div>
                        {lineTax > 0 && <div className="text-[10px] text-gray-400 dark:text-gray-500 notranslate">{currencySymbol}{formatDisplayNumber(lineTotal)} + {currencySymbol}{formatDisplayNumber(lineTax)} Tax</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {hasProduct && <button onClick={() => removeItem(i)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="md:hidden flex flex-col gap-3 p-4 pb-6">
          {form.items.map((item, i) => {
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            const tax = taxes.find((t) => t._id === item.taxId || t.name === item.taxId);
            const percent = tax ? tax.percentage : 0;
            const lineTax = (lineTotal * Number(percent)) / 100;
            const lineGrand = lineTotal + lineTax;
            const isLast = i === form.items.length - 1;
            const hasProduct = Boolean(item.product);
            return (
              <div key={item._key} className={`rounded-2xl border transition-all ${hasProduct ? "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border shadow-sm" : "bg-gray-50/60 dark:bg-dark-card/40 border-dashed border-gray-200 dark:border-dark-border"}`}>
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-brand-primary/10 flex items-center justify-center"><span className="text-[10px] font-black text-brand-primary dark:text-blue-400">{i + 1}</span></div>
                    {hasProduct ? <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{getProductOptions().find((o) => o.value === (item.variantId ? `${item.product}:${item.variantId}` : item.product))?.label || "Product"}</span> : <span className="text-xs text-gray-400 font-medium">New item</span>}
                  </div>
                  {hasProduct && (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-black text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(lineGrand)}</div>
                        {lineTax > 0 && <div className="text-[9px] text-gray-400 dark:text-gray-500 notranslate">+{currencySymbol}{formatDisplayNumber(lineTax)} tax</div>}
                      </div>
                      <button onClick={() => removeItem(i)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
                <div className="px-4 pb-3 space-y-2">
                  <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                    <InlineSearchSelect value={item.variantId ? `${item.product}:${item.variantId}` : item.product} onChange={(val) => updateItem(i, "product", val)} options={getFilteredProductOptions(item)} placeholder={isLast && !hasProduct ? "Type or select a product..." : "Select product"} className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200" dropdownWidth="300px" />
                  </div>
                  {hasProduct && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                        <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">Unit</div>
                        <InlineSearchSelect value={item.unit} onChange={(val) => updateItem(i, "unit", val)} options={units.map((u) => ({ value: u._id, label: u.name }))} placeholder="Unit" className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200" dropdownWidth="180px" />
                      </div>
                      <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                        <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">Return Qty</div>
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} placeholder="0" min="1" className="w-full bg-transparent text-sm font-medium outline-none text-gray-700 dark:text-gray-200" />
                      </div>
                      <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                        <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">Unit Price</div>
                        <input type="number" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} placeholder="0.00" min="0" step="0.01" className="w-full bg-transparent text-sm font-medium outline-none text-gray-700 dark:text-gray-200" />
                      </div>
                      <div className="bg-gray-50 dark:bg-dark-card rounded-xl px-3 py-2 border border-gray-100 dark:border-dark-border focus-within:border-brand-primary/40 transition-all">
                        <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">Tax Rate</div>
                        <InlineSearchSelect value={item.taxId} onChange={(val) => updateItem(i, "taxId", val)} options={taxes.map((t) => ({ value: t._id, label: t.name.includes(String(t.percentage)) ? t.name : `${t.name} (${t.percentage}%)` }))} placeholder="Tax" className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-200" dropdownWidth="180px" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </div>{/* END SCROLLABLE BODY */}

      {/* TOTALS FOOTER */}
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
          </div>
          {/* Total Return Value */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Return</span>
            <span className="text-base font-black text-gray-900 dark:text-white notranslate">{currencySymbol}{formatDisplayNumber(grandTotal)}</span>
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
              
              {/* Total Return - Highlighted in Red */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3.5 py-2.5 text-center shrink-0">
                <div className="text-[9px] font-bold uppercase text-red-600 dark:text-red-400 tracking-wider mb-1.5">Total Return</div>
                <div className="text-sm font-black text-red-700 dark:text-red-300 notranslate">{currencySymbol}{formatDisplayNumber(grandTotal)}</div>
              </div>
            </div>
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

    </div>
  );
};

export default PurchaseReturnForm;
