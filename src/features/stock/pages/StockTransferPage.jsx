import React, { useState, useEffect } from "react";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  ArrowRightLeft,
  Trash2,
  Package,
  Calendar,
  Info,
  Tag,
  Edit3,
  Plus,
  Store,
  ArrowRight,
} from "lucide-react";
import StatsGrid from "../../../components/shared/StatsGrid";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import Snackbar from "../../../components/shared/Snackbar";

const StockTransferPage = () => {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canAdd = isAdmin || hasPermission("stock:stock_transfer:add");
  const canEdit = isAdmin || hasPermission("stock:stock_transfer:edit");
  const canDelete = isAdmin || hasPermission("stock:stock_transfer:delete");
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    product: "",
    variantId: "",
    variantName: "",
    fromBranchId: "",
    toBranchId: "",
    quantity: 1,
    narration: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState(null);

  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const [trfRes, prodRes, branchRes] = await Promise.all([
        api.get(`/stock-transfers?${params.toString()}`),
        api.get("/products"),
        api.get("/shops"),
      ]);
      if (trfRes.data.success) setTransfers(trfRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (branchRes.data.success) setBranches(branchRes.data.data);
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set default branch from user profile
  useEffect(() => {
    if (user?.branchId && !form.fromBranchId && branches.length > 0) {
      const bId =
        typeof user.branchId === "string" ? user.branchId : user.branchId._id;
      setForm((prev) => ({ ...prev, fromBranchId: bId }));
    }
  }, [user, branches, form.fromBranchId]);

  const openEdit = (transfer) => {
    setForm({
      product: transfer.product?._id || transfer.product || "",
      variantId: transfer.variantId || "",
      variantName: transfer.variantName || "",
      fromBranchId: transfer.fromBranchId?._id || transfer.fromBranchId || "",
      toBranchId: transfer.toBranchId?._id || transfer.toBranchId || "",
      quantity: transfer.quantity || 1,
      narration: transfer.narration || "",
      date: transfer.date
        ? new Date(transfer.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
    setEditingId(transfer._id);
    setShowModal(true);
  };

  const confirmDelete = (transfer) => {
    setTransferToDelete(transfer);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!transferToDelete) return;
    try {
      await api.delete(`/stock-transfers/${transferToDelete._id}`);
      showSnack("Stock transfer deleted and stock reversed");
      fetchData();
      setIsDeleteModalOpen(false);
      setTransferToDelete(null);
    } catch {
      showSnack("Error deleting transfer", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.product ||
      !form.fromBranchId ||
      !form.toBranchId ||
      !form.quantity
    ) {
      return showSnack("Please fill all required fields", "error");
    }
    if (form.fromBranchId === form.toBranchId) {
      return showSnack(
        "Source and destination branches cannot be the same",
        "error",
      );
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await api.put(`/stock-transfers/${editingId}`, form);
        showSnack("Stock transfer updated successfully");
      } else {
        await api.post("/stock-transfers", form);
        showSnack("Stock transfer recorded successfully");
      }
      setShowModal(false);
      setForm({
        product: "",
        variantId: "",
        variantName: "",
        fromBranchId: form.fromBranchId, // Keep current branch
        toBranchId: "",
        quantity: 1,
        narration: "",
        date: new Date().toISOString().split("T")[0],
      });
      setEditingId(null);
      fetchData();
    } catch (_err) {
      showSnack(
        _err.response?.data?.message || "Error saving stock transfer",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = transfers.filter(
    (e) =>
      !searchTerm ||
      e.transferNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.fromBranchId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.toBranchId?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedProduct = products.find((p) => p._id === form.product);
  const selectedVariant = selectedProduct?.variants?.find(
    (v) =>
      (v._id || v.variantId?._id || v.variantId || v.variantId).toString() ===
      form.variantId,
  );

  const currentMaxStock = (() => {
    if (!selectedProduct) return 0;
    const dataSource =
      selectedProduct.useVariants && selectedVariant
        ? selectedVariant
        : selectedProduct;
    if (!form.fromBranchId || !dataSource.branchStock)
      return dataSource.currentStock || 0;
    const bStock = dataSource.branchStock.find(
      (b) =>
        String(b.branchId?._id || b.branchId) === String(form.fromBranchId),
    );
    return bStock ? bStock.currentStock : 0;
  })();

  const stats = [
    {
      label: "Total Transfers",
      value: transfers.length,
      icon: ArrowRightLeft,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Qty Transferred",
      value: transfers.reduce((sum, e) => sum + e.quantity, 0),
      icon: Package,
      color: "bg-brand-primary/5 text-brand-primary",
    },
  ];

  const columns = [
    {
      header: "Transfer #",
      render: (r) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {r.transferNumber}
        </span>
      ),
    },
    {
      header: "Date",
      render: (r) => (
        <span className="text-sm">{new Date(r.date).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Product",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
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
      header: "From",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {r.fromBranchId?.name || "N/A"}
          </span>
          {(r.fromBranchId?.mapAddress) && (
            <span className="text-[11px] text-gray-500 max-w-[150px] truncate" title={r.fromBranchId.mapAddress}>
               {r.fromBranchId.mapAddress}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "To",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {r.toBranchId?.name || "N/A"}
          </span>
          {(r.toBranchId?.mapAddress) && (
            <span className="text-[11px] text-gray-500 max-w-[150px] truncate" title={r.toBranchId.mapAddress}>
               {r.toBranchId.mapAddress}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Quantity",
      render: (r) => <span className="text-sm font-bold">{r.quantity}</span>,
    },
    {
      header: "Narration",
      render: (r) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 italic max-w-xs truncate">
          {r.narration || "—"}
        </span>
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
              title="Edit Transfer"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(r)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Delete Transfer"
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
        }}
        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={
          isSubmitting ||
          (selectedProduct && form.quantity > currentMaxStock) ||
          !form.toBranchId
        }
        className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 text-sm cursor-pointer ${isSubmitting ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
      >
        {isSubmitting
          ? "Processing..."
          : editingId
            ? "Update Transfer"
            : "Confirm Transfer"}
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
              searchPlaceholder="Search transfers..."
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
              onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
              headerActions={
                canAdd ? (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setForm({
                        product: "",
                        variantId: "",
                        variantName: "",
                        fromBranchId: user?.branchId?._id || user?.branchId || "",
                        toBranchId: "",
                        quantity: 1,
                        narration: "",
                        date: new Date().toISOString().split("T")[0],
                      });
                      setShowModal(true);
                    }}
                    className="h-9 px-4 flex items-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-primary-dark active:scale-95 text-[10px] uppercase tracking-[0.15em] shrink-0 shadow-sm"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">New Transfer</span>
                  </button>
                ) : null
              }
              emptyMessage="No stock transfers yet."
              mobileMapper={{
                leading: () => (
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100">
                    <ArrowRightLeft size={22} />
                  </div>
                ),
                title: (r) => (
                  <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                    {r.product?.name || r.productName || "N/A"}
                  </h4>
                ),
                subtitle: (r) => (
                  <div className="flex flex-col mt-0.5">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      {r.fromBranchId?.name}
                      {(r.fromBranchId?.mapAddress) &&
                        ` (${r.fromBranchId.mapAddress})`}{" "}
                      <ArrowRight size={10} /> {r.toBranchId?.name}
                      {(r.toBranchId?.mapAddress) && ` (${r.toBranchId.mapAddress})`}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(r.date).toLocaleDateString()}
                    </span>
                  </div>
                ),
                trailing: (r) => (
                  <div className="text-right">
                    <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                      Qty
                    </p>
                    <p className="text-[14px] font-black text-brand-primary dark:text-blue-400">
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
        }}
        title={editingId ? "Edit Stock Transfer" : "New Stock Transfer"}
        footer={footerContent}
        position="right"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomDropdown
              label="Source Branch"
              icon={Store}
              value={form.fromBranchId}
              onChange={(e) =>
                setForm({
                  ...form,
                  fromBranchId: e.target.value,
                  quantity: 1,
                  toBranchId: "",
                })
              }
              options={branches.map((b) => ({
                value: b._id,
                label: b.name,
                description: b.mapAddress ? ` ${b.mapAddress}` : undefined,
                searchLabel: b.name,
              }))}
              placeholder="Select Source"
              required
            />

            <CustomDropdown
              label="Destination Branch"
              icon={Store}
              value={form.toBranchId}
              onChange={(e) => setForm({ ...form, toBranchId: e.target.value })}
              options={branches
                .filter((b) => b._id !== form.fromBranchId)
                .map((b) => ({
                  value: b._id,
                  label: b.name,
                  description: b.mapAddress ? ` ${b.mapAddress}` : undefined,
                  searchLabel: b.name,
                }))}
              placeholder="Select Target"
              required
            />
          </div>

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
              let stockLabel = "(Select Source First)";
              if (form.fromBranchId) {
                if (p.useVariants) {
                  stockLabel = "(Variants Available)";
                } else {
                  const bStock = p.branchStock?.find(
                    (b) =>
                      String(b.branchId?._id || b.branchId) ===
                      String(form.fromBranchId),
                  );
                  stockLabel = `(Stock: ${bStock ? bStock.currentStock : 0})`;
                }
              }
              return {
                value: p._id,
                label: `${p.name} ${stockLabel}`,
                searchLabel: p.name,
              };
            })}
            placeholder="Select Product"
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
                    (
                      v._id ||
                      v.variantId?._id ||
                      v.variantId ||
                      v.variantId
                    ).toString() === vId,
                );
                setForm({
                  ...form,
                  variantId: vId,
                  variantName: v?.variantName || v?.variantId?.name || "",
                  quantity: 1,
                });
              }}
              options={selectedProduct.variants.map((v) => ({
                value: (
                  v._id ||
                  v.variantId?._id ||
                  v.variantId ||
                  v.variantId
                ).toString(),
                label: `${v.variantName || v.variantId?.name || "Unnamed"}${
                  form.fromBranchId
                    ? ` (Stock: ${(() => {
                        const bStock = v.branchStock?.find(
                          (b) =>
                            String(b.branchId?._id || b.branchId) ===
                            String(form.fromBranchId),
                        );
                        return bStock ? bStock.currentStock : 0;
                      })()})`
                    : ""
                }`,
                searchLabel: v.variantName || v.variantId?.name,
              }))}
              placeholder="Select Variant"
              required
            />
          )}

          {selectedProduct && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20/50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase text-blue-500 tracking-widest">
                  Current Stock at Source
                </div>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {currentMaxStock} {selectedProduct.unit || "Pcs"}
                </div>
              </div>
              <ArrowRightLeft className="text-blue-300" size={20} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <CustomTextField
              label="Quantity *"
              icon={ArrowRightLeft}
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
              error={
                form.quantity > currentMaxStock
                  ? "Insufficient stock at source"
                  : null
              }
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
            label="Narration / Remarks"
            icon={Info}
            value={form.narration}
            onChange={(e) => setForm({ ...form, narration: e.target.value })}
            placeholder="e.g. Branch replenishment..."
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Stock Transfer"
        message="Are you sure you want to delete this transfer? Stock levels will be reversed automatically in both branches."
      />
    </>
  );
};

export default StockTransferPage;
