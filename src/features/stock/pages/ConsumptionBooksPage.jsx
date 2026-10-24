import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  MinusCircle,
  Trash2,
  Package,
  DollarSign,
  Calendar,
  Info,
  Tag,
  Edit3,
  Plus,
  Loader2,
  Store,
} from "lucide-react";
import StatsGrid from "../../../components/shared/StatsGrid";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import Snackbar from "../../../components/shared/Snackbar";

const ConsumptionBooksPage = () => {
  const { user, currencySymbol, hasPermission } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canAdd = isAdmin || hasPermission("stock:consumption_entry:add");
  const canEdit = isAdmin || hasPermission("stock:consumption_entry:edit");
  const canDelete = isAdmin || hasPermission("stock:consumption_entry:delete");
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    product: "",
    variantId: "",
    variantName: "",
    quantity: 1,
    reason: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const openEdit = (entry) => {
    setForm({
      product: entry.product?._id || entry.product || "",
      variantId: entry.variantId || "",
      variantName: entry.variantName || "",
      quantity: entry.quantity || 1,
      reason: entry.reason || "",
      date: entry.date
        ? new Date(entry.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
    setEditingId(entry._id);
    setShowModal(true);
  };

  const CurrencyIcon = () => (
    <span className="text-sm font-bold text-gray-500 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors notranslate">
      {currencySymbol}
    </span>
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const [entRes, prodRes] = await Promise.all([
        api.get(`/consumptions?${params.toString()}`),
        api.get("/products"),
      ]);
      if (entRes.data.success) setEntries(entRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingId) {
        await api.put(`/consumptions/${editingId}`, form);
      } else {
        await api.post("/consumptions", form);
      }
      setShowModal(false);
      setForm({
        product: "",
        variantId: "",
        variantName: "",
        quantity: 1,
        reason: "",
        date: new Date().toISOString().split("T")[0],
      });
      setEditingId(null);
      fetchData();
    } catch (err) {
      showSnack(
        err.response?.data?.message || "Error recording consumption books",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (entry) => {
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await api.delete(`/consumptions/${entryToDelete._id}`);
      fetchData();
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
    } catch {
      showSnack("Error deleting", "error");
    }
  };

  const totalCost = entries.reduce((sum, e) => sum + (e.costAmount || 0), 0);
  const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);
  const filtered = entries.filter(
    (e) =>
      !searchTerm ||
      e.entryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.branchId?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedProduct = products.find((p) => p._id === form.product);
  const selectedVariant = selectedProduct?.variants?.find(
    (v) =>
      (v._id || v.variantId?._id || v.variantId).toString() === form.variantId,
  );

  const currentMaxStock = (() => {
    if (!selectedProduct) return 0;
    const dataSource =
      selectedProduct.useVariants && selectedVariant
        ? selectedVariant
        : selectedProduct;
    return dataSource.currentStock || 0;
  })();

  const estimatedCost = selectedVariant
    ? (selectedVariant.purchasePrice || selectedProduct.purchasePrice) *
      Number(form.quantity)
    : selectedProduct
      ? selectedProduct.purchasePrice * Number(form.quantity)
      : 0;

  const stats = [
    {
      label: "Total Consumptions",
      value: entries.length,
      icon: Package,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Items Consumed",
      value: totalQty,
      icon: MinusCircle,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Total Value",
      value: (
        <span className="notranslate">
          {currencySymbol}
          {totalCost.toLocaleString()}
        </span>
      ),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  const columns = [
    {
      header: "Entry #",
      render: (r) => (
        <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400">
          {r.entryNumber}
        </span>
      ),
    },
    {
      header: "Date",
      render: (r) => (
        <span className="text-sm font-medium">
          {new Date(r.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Product",
      render: (r) => (
        <div>
          <span className="text-sm font-bold block">
            {r.product?.name || r.productName || "N/A"}
          </span>
          {r.variantName && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              {r.variantName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Quantity",
      render: (r) => (
        <span className="text-sm font-black text-orange-600 dark:text-orange-400">{r.quantity}</span>
      ),
    },
    {
      header: "Cost Value",
      render: (r) => (
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 notranslate">
          {currencySymbol}
          {(r.costAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Reason given",
      render: (r) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">{r.reason || "—"}</span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (r) => (
        <div className="flex items-center gap-1.5 justify-end">
          {canEdit && (
            <button
              onClick={() => openEdit(r)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Edit Entry"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(r)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Delete Entry"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const footerContent = (
    <div className="flex gap-3 w-full">
      <button
        type="button"
        onClick={() => {
          setShowModal(false);
          setEditingId(null);
          setForm({
            product: "",
            variantId: "",
            variantName: "",
            branchId: "",
            quantity: 1,
            reason: "",
            date: new Date().toISOString().split("T")[0],
          });
        }}
        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={
          isSubmitting || (selectedProduct && form.quantity > currentMaxStock)
        }
        className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 text-sm cursor-pointer ${isSubmitting ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
      >
        {isSubmitting ? "Processing..." : "Record Consumption Books"}
      </button>
    </div>
  );

  return (
    <>
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <div className="space-y-3 md:space-y-6">
        {loading ? (
          <div className="space-y-3 md:space-y-6">
            <StatsSkeleton />
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : (
          <>
            <StatsGrid stats={stats} />

            <CustomTable
              columns={columns}
              data={filtered}
              loading={loading}
              searchQuery={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search consumption books..."
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
              onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
              headerActions={
                canAdd ? (
                  <button
                    onClick={() => openEdit({})}
                    className="h-9 px-4 flex items-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-primary-dark active:scale-95 text-[10px] uppercase tracking-[0.15em] shrink-0 shadow-sm"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Record Consumption Books</span>
                  </button>
                ) : null
              }
              emptyMessage="No consumption books recorded yet."
              mobileMapper={{
                leading: () => (
                  <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-400 border border-orange-100">
                    <MinusCircle size={22} />
                  </div>
                ),
                title: (r) => (
                  <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                    {r.product?.name || r.productName || "N/A"}
                    {r.variantName && (
                      <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                        ({r.variantName})
                      </span>
                    )}
                  </h4>
                ),
                subtitle: (r) => (
                  <div className="flex flex-col mt-0.5">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
                      {r.reason || "Manual Consumption"} •{" "}
                      {new Date(r.date).toLocaleDateString()}
                    </p>
                  </div>
                ),
                trailing: (r) => (
                  <div className="text-right">
                    <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                      Qty
                    </p>
                    <p className="text-[13px] font-black text-orange-600 dark:text-orange-400">
                      {r.quantity}
                    </p>
                  </div>
                ),
                actions: (r) => (
                  <div className="flex gap-2 pt-2">
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(r);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(r);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                ),
              }}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
          setForm({
            product: "",
            variantId: "",
            variantName: "",
            branchId: "",
            quantity: 1,
            reason: "",
            date: new Date().toISOString().split("T")[0],
          });
        }}
        title={editingId ? "Edit Consumption Books" : "New Consumption Books"}
        footer={footerContent}
        position="right"
        size="lg"
      >
        <div className="space-y-4">
          <CustomDropdown
            label="Product"
            icon={Package}
            value={form.product}
            onChange={(e) => {
              const prodId = e.target.value;
              setForm({
                ...form,
                product: prodId,
                variantId: "",
                variantName: "",
                quantity: 1,
              });
            }}
            options={products.map((p) => {
              const stockLabel = `(Stock: ${p.currentStock || 0} ${p.unit || 'Pcs'})`;
              return {
                value: p._id,
                label: `${p.name} ${stockLabel}`,
                searchLabel: p.name,
              };
            })}
            placeholder="Select Product..."
            required
            isSearchable
          />

          {selectedProduct?.useVariants && (
            <CustomDropdown
              label="Variant"
              icon={Tag}
              value={form.variantId}
              onChange={(e) => {
                const vId = e.target.value;
                const v = selectedProduct.variants.find(
                  (v) =>
                    (v._id || v.variantId?._id || v.variantId).toString() ===
                    vId,
                );
                setForm({
                  ...form,
                  variantId: vId,
                  variantName: v?.variantName || v?.variantId?.name || "",
                  quantity: 1,
                });
              }}
              options={selectedProduct.variants.map((v) => ({
                value: (v._id || v.variantId?._id || v.variantId).toString(),
                label: `${v.variantName || v.variantId?.name || "Unnamed"} (Stock: ${v.currentStock || 0})`,
                searchLabel: v.variantName || v.variantId?.name,
              }))}
              placeholder="Select Variant"
              required
            />
          )}

          {selectedProduct && !selectedProduct.useVariants && (
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 ml-1 uppercase tracking-widest">
              Available Stock: {currentMaxStock} {selectedProduct.unit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <CustomTextField
              label="Quantity *"
              icon={MinusCircle}
              type="number"
              value={form.quantity}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              required
              min="1"
              max={currentMaxStock}
              placeholder="0"
            />
            <CustomTextField
              label="Date"
              icon={Calendar}
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <CustomTextField
            label="Reason / Notes"
            icon={Info}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g. Used for staff training..."
          />

          {selectedProduct && form.quantity > 0 && (
            <div className="px-5 py-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase text-brand-primary dark:text-blue-400 tracking-widest">
                  Estimated Value
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                  {selectedProduct.name}{" "}
                  {selectedVariant ? `- ${selectedVariant.variantName}` : ""} @{" "}
                  {currencySymbol}
                  {selectedVariant
                    ? selectedVariant.purchasePrice ||
                      selectedProduct.purchasePrice
                    : selectedProduct.purchasePrice}
                </div>
              </div>
              <div className="text-xl font-black text-brand-primary dark:text-blue-400 notranslate">
                {currencySymbol}
                {estimatedCost.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Consumption Books"
        message="Are you sure you want to delete this record? Stock levels will be reversed automatically."
      />
    </>
  );
};

export { ConsumptionBooksPage as ConsumptionEntryPage };
export default ConsumptionBooksPage;
