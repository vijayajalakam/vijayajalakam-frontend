import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import {
  RefreshCw,
  Save,
  Package,
  Layers,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  TableSkeleton,
} from "../../../components/shared/Skeleton";
import StatsGrid from "../../../components/shared/StatsGrid";
import Snackbar from "../../../components/shared/Snackbar";

const AdjustBooksPage = () => {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canAdd = isAdmin || hasPermission("stock:stock_adjustment:add");

  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [adjustments, setAdjustments] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, branchRes] = await Promise.all([
        api.get("/products"),
        api.get("/shops"),
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (branchRes.data.success) setBranches(branchRes.data.data);
    } catch (err) {
      console.error(err);
      showSnack("Error fetching products", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (user?.branchId) {
      const bId = typeof user.branchId === "string" ? user.branchId : user.branchId._id;
      setSelectedBranch(bId);
    } else if (branches.length > 0) {
      setSelectedBranch(branches[0]._id);
    }
  }, [user, branches]);

  const handleAdjustmentChange = (id, field, value) => {
    setAdjustments(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { type: 'add', quantity: 0 }),
        [field]: value
      }
    }));
  };

  // Build the unique key for a product/variant row
  // For variants: use the variant subdocument _id (v._id) which is what the backend matches against
  const getRowKey = (product, variant) => {
    if (variant) {
      // Use subdocument _id first (this is how MongoDB stores variants array items)
      const vId = variant._id || variant.variantId?._id || variant.variantId || 'null';
      return `${product._id}_${vId}`;
    }
    return `${product._id}_null`;
  };

  const handleSave = async () => {
    const activeAdjustments = Object.entries(adjustments)
      .filter(([, data]) => Number(data.quantity) > 0 || (data.type === 'set' && data.quantity !== undefined && data.quantity !== ''))
      .map(([id, data]) => {
        // Split only on first underscore - ObjectIDs are 24 hex chars so this is safe
        const sepIndex = id.indexOf('_');
        const productId = id.substring(0, sepIndex);
        const variantId = id.substring(sepIndex + 1);
        return {
          productId,
          variantId: variantId !== 'null' ? variantId : null,
          type: data.type,
          quantity: Number(data.quantity)
        };
      });

    if (activeAdjustments.length === 0) {
      showSnack("No adjustments to save", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/stock-adjustments", {
        adjustments: activeAdjustments,
        branchId: selectedBranch,
        reason: "Bulk Quick Adjustment"
      });
      
      // Show summary with stock changes
      const count = res.data?.count || activeAdjustments.length;
      showSnack(`Successfully adjusted ${count} item(s). Stock updated!`);
      setAdjustments({});
      
      // Re-fetch products to show updated stock
      await fetchData();
    } catch (err) {
      showSnack(err.response?.data?.message || "Error saving adjustments", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get the variant display name reliably
  const getVariantName = (variant) => {
    if (!variant) return "";
    if (variant.variantId?.name) return variant.variantId.name;
    if (variant.variantName) return variant.variantName;
    if (typeof variant.variantId === "string") return variant.variantId;
    return "Variant";
  };

  // Helper to get branch stock for a data source
  const getBranchStock = useCallback((dataSource) => {
    if (!selectedBranch || !dataSource?.branchStock) return 0;
    const bStock = dataSource.branchStock.find(b =>
      String(b.branchId?._id || b.branchId) === String(selectedBranch)
    );
    return bStock ? bStock.currentStock : 0;
  }, [selectedBranch]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Flatten products so each variant gets its own row
  const flatProducts = useMemo(() => {
    const rows = [];
    filteredProducts.forEach(p => {
      if (p.useVariants && p.variants?.length > 0) {
        p.variants.forEach(v => {
          rows.push({
            ...p,
            variant: v,
            isVariant: true,
            _rowId: getRowKey(p, v),
          });
        });
      } else {
        rows.push({
          ...p,
          variant: null,
          isVariant: false,
          _rowId: getRowKey(p, null),
        });
      }
    });
    return rows;
  }, [filteredProducts]);

  // Stats
  const stats = useMemo(() => {
    const totalItems = flatProducts.length;
    const pendingCount = Object.entries(adjustments).filter(
      ([, d]) => Number(d.quantity) > 0 || d.type === 'set'
    ).length;
    const zeroStock = flatProducts.filter(r => {
      const stock = getBranchStock(r.variant || r);
      return stock <= 0;
    }).length;
    const variantCount = flatProducts.filter(r => r.isVariant).length;

    return [
      { label: "Total Items", value: totalItems, icon: Package, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
      { label: "Variants", value: variantCount, icon: Layers, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400" },
      { label: "Zero Stock", value: zeroStock, icon: AlertTriangle, color: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" },
      { label: "Pending Adj.", value: pendingCount, icon: ClipboardCheck, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
    ];
  }, [flatProducts, adjustments, getBranchStock]);

  // Shared adjustment render helper (used in both desktop columns and mobile expanded section)
  const renderAdjustmentControls = (r) => {
    const id = r._rowId;
    const adj = adjustments[id] || { type: 'add', quantity: 0 };
    const dataSource = r.variant || r;
    const currentStock = getBranchStock(dataSource);

    let previewStock = currentStock;
    const q = Number(adj.quantity) || 0;
    if (q > 0 || (adj.type === 'set' && adj.quantity !== '' && adj.quantity !== undefined)) {
      if (adj.type === 'add') previewStock = currentStock + q;
      else if (adj.type === 'remove') previewStock = Math.max(0, currentStock - q);
      else if (adj.type === 'set') previewStock = q;
    }

    const hasChange = q > 0 || (adj.type === 'set' && q !== currentStock && adj.quantity !== '' && adj.quantity !== undefined);
    const isIncrease = previewStock > currentStock;
    const isDecrease = previewStock < currentStock;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-[110px]">
          <CustomDropdown
            value={adj.type}
            onChange={(e) => handleAdjustmentChange(id, 'type', e.target.value)}
            options={[
              { value: 'add', label: 'Add (+)' },
              { value: 'remove', label: 'Remove (−)' },
              { value: 'set', label: 'Set (=)' }
            ]}
            variant="compact"
            buttonClassName="w-full flex items-center justify-between h-9 px-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all dark:text-white"
          />
        </div>
        <input
          type="number"
          min="0"
          value={adj.quantity || ''}
          onChange={(e) => handleAdjustmentChange(id, 'quantity', e.target.value)}
          placeholder="Qty"
          className="w-20 h-9 px-3 bg-white dark:bg-dark-surface border-2 border-gray-100 dark:border-dark-border rounded-lg text-sm font-black focus:border-brand-primary outline-none transition-all dark:text-white"
        />
        {hasChange && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${
            isIncrease ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' :
            isDecrease ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' :
            'bg-gray-50 dark:bg-dark-surface text-gray-500 dark:text-gray-400'
          }`}>
            {isIncrease ? <TrendingUp size={12} /> : isDecrease ? <TrendingDown size={12} /> : null}
            {currentStock} → {previewStock}
          </div>
        )}
      </div>
    );
  };

  // Mobile mapper — clean single-image card with adjustment in expanded section
  const mobileMapper = {
    leading: (r) => (
      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-surface flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-dark-border overflow-hidden shrink-0">
        {r.image?.url ? (
          <img src={r.image.url} alt={r.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={22} />
        )}
      </div>
    ),
    title: (r) => {
      const variantName = r.variant ? getVariantName(r.variant) : null;
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-gray-900 dark:text-white text-[14px] leading-tight truncate">
            {r.name}
          </span>
          {variantName && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded border border-indigo-100 dark:border-indigo-900/40">
              <Layers size={9} />
              {variantName}
            </span>
          )}
        </div>
      );
    },
    subtitle: (r) => (
      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {r.sku || "NO-SKU"} • {r.category}
        </span>
        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
          r.isVariant
            ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400"
            : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
        }`}>
          {r.isVariant ? "Variant" : "Standard"}
        </span>
      </div>
    ),
    trailing: (r) => {
      const dataSource = r.variant || r;
      const stock = getBranchStock(dataSource);
      const totalStock = dataSource.currentStock || 0;
      const adj = adjustments[r._rowId];
      const hasPending = adj && (Number(adj.quantity) > 0 || (adj.type === 'set' && adj.quantity !== '' && adj.quantity !== undefined));
      return (
        <div className="text-right shrink-0">
          <div className={`text-[15px] font-black leading-none ${stock <= 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
            {stock}
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 ml-0.5 uppercase">{r.unit}</span>
          </div>
          <div className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-0.5">
            Total: {totalStock}
          </div>
          {hasPending && (
            <div className="mt-1 w-2 h-2 rounded-full bg-amber-400 ml-auto" title="Pending adjustment" />
          )}
        </div>
      );
    },
    actions: (r) => (
      <div className="space-y-2">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Adjust Stock</p>
        {renderAdjustmentControls(r)}
      </div>
    ),
  };

  const columns = [
    {
      header: "Product / Variant",
      render: (r) => {
        const variantName = r.variant ? getVariantName(r.variant) : null;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-surface flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-dark-border overflow-hidden shrink-0">
              {r.image?.url ? (
                <img src={r.image.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package size={20} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                {r.name}
              </div>
              {variantName && (
                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded border border-indigo-100 dark:border-indigo-900/40">
                  <Layers size={10} />
                  {variantName}
                </span>
              )}
              <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wider">
                {r.sku || "NO-SKU"} • {r.category}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Type",
      render: (r) => (
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
          r.isVariant
            ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40"
            : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40"
        }`}>
          {r.isVariant ? "Variant" : "Standard"}
        </span>
      ),
    },
    {
      header: "Current Stock",
      render: (r) => {
        const dataSource = r.variant || r;
        const stock = getBranchStock(dataSource);
        const totalStock = dataSource.currentStock || 0;
        return (
          <div className="flex flex-col">
            <span className={`text-sm font-black ${stock <= 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
              {stock} <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{r.unit}</span>
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">
              Branch • Total: {totalStock}
            </span>
          </div>
        );
      }
    },
    {
      header: "Adjustment",
      render: (r) => renderAdjustmentControls(r),
    }
  ];

  const pendingAdjustmentCount = Object.entries(adjustments).filter(
    ([, d]) => Number(d.quantity) > 0 || (d.type === 'set' && d.quantity !== '' && d.quantity !== undefined)
  ).length;

  return (
    <>
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      <div className="space-y-3 md:space-y-6">
        {/* Stats */}
        <StatsGrid stats={stats} loading={loading} />

        {loading ? (
          <TableSkeleton rows={10} cols={4} />
        ) : (
          <CustomTable
            columns={columns}
            data={flatProducts}
            mobileMapper={mobileMapper}
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by name, SKU, or variant..."
            emptyMessage="No products found matching your search."
            extraFilters={
              <div className="flex items-center gap-2">
                <div className="w-48 md:w-56 shrink-0">
                  <CustomDropdown
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    options={branches.map(b => ({
                      value: b._id,
                      label: b.name,
                      description: b.mapAddress ? ` ${b.mapAddress}` : undefined
                    }))}
                    variant="compact"
                    buttonClassName="h-9 px-3 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary/30 transition-all cursor-pointer w-full flex items-center justify-between"
                  />
                </div>
                <button
                  onClick={fetchData}
                  className="h-9 w-9 flex items-center justify-center bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-400 hover:text-brand-primary dark:text-blue-400 rounded-xl transition-all active:scale-95"
                  title="Refresh"
                >
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            }
            headerActions={
              canAdd ? (
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || pendingAdjustmentCount === 0}
                  className={`flex items-center gap-2 px-5 h-9 rounded-xl text-white font-bold transition-all active:scale-95 text-xs shrink-0 ${
                    isSubmitting || pendingAdjustmentCount === 0
                      ? 'bg-gray-400 grayscale cursor-not-allowed'
                      : 'bg-brand-primary hover:bg-brand-secondary cursor-pointer shadow-sm shadow-brand-primary/20'
                  }`}
                >
                  <Save size={14} />
                  <span>
                    {isSubmitting
                      ? "Saving..."
                      : pendingAdjustmentCount > 0
                      ? `Save ${pendingAdjustmentCount} Changes`
                      : "Save Changes"
                    }
                  </span>
                </button>
              ) : null
            }
          />
        )}
      </div>
    </>
  );
};

export { AdjustBooksPage as StockAdjustmentPage };
export default AdjustBooksPage;
