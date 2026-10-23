import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStockFilters } from "../../../hooks/useStockFilters";
import { useStockSelection } from "../../../hooks/useStockSelection";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useBulkDeleteProductsMutation,
  useToggleProductStatusMutation,
  useToggleProductFavouriteMutation,
} from "../../../store/api/stockEndpoints";
import {
  useGetProductCategoriesListQuery,
  useGetUnitsListQuery,
} from "../../../store/api/tenantCrudEndpoints";
import CustomTable from "../../../components/shared/CustomTable";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import StatsGrid from "../../../components/shared/StatsGrid";
import Snackbar from "../../../components/shared/Snackbar";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import {
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Filter,
  Package,
  DollarSign,
  Layers,
  Heart,
  Star,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";

/**
 * ProductMasterPageRedux - Optimized with Redux
 * 
 * Features:
 * - RTK Query for data fetching with automatic caching
 * - Centralized state management
 * - Optimistic updates
 * - Automatic refetching on mutations
 * - Memoized computations
 * - Reduced re-renders
 */
const ProductMasterPageRedux = () => {
  const { currencySymbol, hasPermission, isAdmin } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  
  // Permissions
  const canAdd = isAdmin || hasPermission("stock:products:add");
  const canEdit = isAdmin || hasPermission("stock:products:edit");
  const canDelete = isAdmin || hasPermission("stock:products:delete");
  const canChangeStatus = isAdmin || hasPermission("stock:products:status");

  // Redux hooks
  const { filters, pagination, queryParams, updateFilters, updateSearch, updatePagination, resetFilters } =
    useStockFilters("products");
  const { selectedCount, toggleSelection, clearSelection, selectAll, isSelected, isAllSelected } =
    useStockSelection("products");

  // RTK Query hooks
  const { data, isLoading, isFetching, refetch } = useGetProductsQuery(queryParams);
  const { data: categories = [] } = useGetProductCategoriesListQuery();
  const { data: units = [] } = useGetUnitsListQuery();

  // Mutations
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [bulkDeleteProducts, { isLoading: isBulkDeleting }] = useBulkDeleteProductsMutation();
  const [toggleStatus] = useToggleProductStatusMutation();
  const [toggleFavourite] = useToggleProductFavouriteMutation();

  // Local UI state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const [localSelectedIds, setLocalSelectedIds] = useState([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "General",
    unit: "Pcs",
    purchasePrice: 0,
    sellingPrice: 0,
    taxPercent: 0,
    taxId: "",
    isTaxInclusive: false,
    hsnCode: "",
    currentStock: 0,
    isSale: true,
    useVariants: false,
    variants: [],
    branches: [],
  });

  // Memoized data
  const products = useMemo(() => data?.products || [], [data?.products]);
  const stats = useMemo(() => data?.stats || {}, [data?.stats]);
  const paginationData = useMemo(() => data?.pagination || {}, [data?.pagination]);

  // Memoized stats for display
  const statsCards = useMemo(
    () => [
      {
        title: "Total Products",
        value: stats.totalProducts || 0,
        icon: Package,
        color: "blue",
      },
      {
        title: "Total Stock Value",
        value: `${currencySymbol}${formatDisplayNumber(stats.totalStockValue || 0)}`,
        icon: DollarSign,
        color: "green",
      },
      {
        title: "Active Products",
        value: stats.activeProducts || 0,
        icon: Layers,
        color: "purple",
      },
      {
        title: "Low Stock Items",
        value: stats.lowStockCount || 0,
        icon: Package,
        color: "red",
      },
    ],
    [stats, currencySymbol, formatDisplayNumber]
  );

  // Handlers
  const handleToggleStatus = useCallback(
    async (id, isActive) => {
      try {
        await toggleStatus({ id, isActive }).unwrap();
        setSnack({ message: "Status updated successfully", type: "success" });
      } catch (error) {
        setSnack({
          message: error?.data?.message || "Failed to update status",
          type: "error",
        });
      }
    },
    [toggleStatus]
  );

  const handleToggleFavourite = useCallback(
    async (id) => {
      try {
        await toggleFavourite(id).unwrap();
        setSnack({ message: "Favourite updated successfully", type: "success" });
      } catch (error) {
        setSnack({
          message: error?.data?.message || "Failed to update favourite",
          type: "error",
        });
      }
    },
    [toggleFavourite]
  );

  const handleEdit = useCallback((product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      taxPercent: product.taxPercent || 0,
      taxId: product.taxId || "",
      isTaxInclusive: product.isTaxInclusive || false,
      hsnCode: product.hsnCode || "",
      currentStock: product.currentStock,
      isSale: product.isSale,
      useVariants: product.useVariants || false,
      variants: product.variants || [],
      branches: product.branches || [],
    });
    setShowModal(true);
  }, []);

  const handleDeleteClick = useCallback((product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  }, []);

  // Memoized table columns
  const columns = useMemo(
    () => [
      {
        key: "select",
        label: (
          <input
            type="checkbox"
            checked={isAllSelected(products.map((p) => p._id))}
            onChange={(e) => {
              if (e.target.checked) {
                selectAll(products.map((p) => p._id));
              } else {
                clearSelection();
              }
            }}
            className="rounded border-gray-300 dark:border-dark-border"
          />
        ),
        render: (product) => (
          <input
            type="checkbox"
            checked={isSelected(product._id)}
            onChange={() => toggleSelection(product._id)}
            className="rounded border-gray-300 dark:border-dark-border"
          />
        ),
      },
      {
        key: "favourite",
        label: "★",
        render: (product) => (
          <button
            onClick={() => handleToggleFavourite(product._id)}
            className={`transition-colors ${
              product.isFavourite
                ? "text-red-500"
                : "text-gray-300 hover:text-red-400"
            }`}
            title={
              product.isFavourite
                ? "Remove from favourites"
                : "Add to favourites"
            }
          >
            <Heart
              size={18}
              fill={product.isFavourite ? "currentColor" : "none"}
            />
          </button>
        ),
      },
      { key: "name", label: "Product Name", sortable: true },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      {
        key: "currentStock",
        label: "Stock",
        render: (product) => (
          <span
            className={
              product.currentStock < 10
                ? "text-red-600 font-semibold"
                : "text-gray-900 dark:text-white"
            }
          >
            {product.currentStock} {product.unit}
          </span>
        ),
      },
      {
        key: "purchasePrice",
        label: "Purchase Price",
        render: (product) =>
          `${currencySymbol}${formatDisplayNumber(product.purchasePrice)}`,
      },
      {
        key: "sellingPrice",
        label: "Selling Price",
        render: (product) =>
          `${currencySymbol}${formatDisplayNumber(product.sellingPrice)}`,
      },
      {
        key: "status",
        label: "Status",
        render: (product) => (
          <button
            onClick={() => handleToggleStatus(product._id, !product.isActive)}
            disabled={!canChangeStatus}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              product.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            } ${canChangeStatus ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"}`}
          >
            {product.isActive ? "Active" : "Inactive"}
          </button>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (product) => (
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => handleEdit(product)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Edit3 size={18} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDeleteClick(product)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [
      products,
      isAllSelected,
      isSelected,
      selectAll,
      clearSelection,
      toggleSelection,
      handleToggleFavourite,
      handleToggleStatus,
      handleEdit,
      handleDeleteClick,
      canEdit,
      canDelete,
      canChangeStatus,
      currencySymbol,
      formatDisplayNumber,
    ]
  );

  // Handlers

  const handleDelete = useCallback(async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete._id).unwrap();
      setSnack({ message: "Product deleted successfully", type: "success" });
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    } catch (error) {
      setSnack({
        message: error?.data?.message || "Failed to delete product",
        type: "error",
      });
    }
  }, [productToDelete, deleteProduct]);

  const handleBulkDelete = useCallback(async () => {
    try {
      await bulkDeleteProducts(localSelectedIds).unwrap();
      setSnack({
        message: `${localSelectedIds.length} products deleted successfully`,
        type: "success",
      });
      setLocalSelectedIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      setSnack({
        message: error?.data?.message || "Failed to delete products",
        type: "error",
      });
    }
  }, [localSelectedIds, bulkDeleteProducts]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        if (editingId) {
          await updateProduct({ id: editingId, body: form }).unwrap();
          setSnack({ message: "Product updated successfully", type: "success" });
        } else {
          await createProduct(form).unwrap();
          setSnack({ message: "Product created successfully", type: "success" });
        }
        setShowModal(false);
        setEditingId(null);
        setForm({
          name: "",
          sku: "",
          category: "General",
          unit: "Pcs",
          purchasePrice: 0,
          sellingPrice: 0,
          taxPercent: 0,
          taxId: "",
          isTaxInclusive: false,
          hsnCode: "",
          currentStock: 0,
          isSale: true,
          useVariants: false,
          variants: [],
          branches: [],
        });
      } catch (error) {
        setSnack({
          message: error?.data?.message || "Failed to save product",
          type: "error",
        });
      }
    },
    [editingId, form, createProduct, updateProduct]
  );

  const handleSearchChange = useCallback(
    (e) => {
      updateSearch(e.target.value);
    },
    [updateSearch]
  );

  const handlePageChange = useCallback(
    (newPage) => {
      updatePagination({ page: newPage });
    },
    [updatePagination]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Master</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your product inventory</p>
        </div>
        <div className="flex gap-3">
          {selectedCount > 0 && canDelete && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete ({selectedCount})
            </button>
          )}
          <button
            onClick={refetch}
            disabled={isFetching}
            className="px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border flex items-center gap-2"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          {canAdd && (
            <button
              onClick={() => {
                setEditingId(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <StatsSkeleton count={4} />
      ) : (
        <StatsGrid stats={statsCards} />
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CustomTextField
            label="Search"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search products..."
          />
          <CustomDropdown
            label="Category"
            value={filters.category}
            onChange={(e) => updateFilters({ category: e.target.value })}
            options={[
              { value: "", label: "All Categories" },
              ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
            ]}
          />
          <CustomDropdown
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <button
            onClick={resetFilters}
            className="self-end px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={8} />
      ) : (
        <CustomTable
          data={products}
          columns={columns}
          pagination={{
            currentPage: pagination.page,
            totalPages: paginationData?.totalPages || 1,
            onPageChange: handlePageChange,
          }}
          showSelection={true}
          selectedIds={localSelectedIds}
          onSelectionChange={setLocalSelectedIds}
          bulkActions={
            localSelectedIds.length > 0 && canDelete && (
              <button
                onClick={() => {
                  setShowBulkDeleteConfirm(true);
                }}
                className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 size={14} />
                Delete Selected ({localSelectedIds.length})
              </button>
            )
          }
        />
      )}

      {/* Modals */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
        }}
        title={editingId ? "Edit Product" : "Add Product"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomTextField
            label="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <CustomTextField
            label="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <CustomDropdown
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={categories.map((cat) => ({
                value: cat.name,
                label: cat.name,
              }))}
            />
            <CustomDropdown
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              options={units.map((unit) => ({
                value: unit.name,
                label: unit.name,
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CustomTextField
              label="Purchase Price"
              type="number"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm({ ...form, purchasePrice: parseFloat(e.target.value) })
              }
              required
            />
            <CustomTextField
              label="Selling Price"
              type="number"
              value={form.sellingPrice}
              onChange={(e) =>
                setForm({ ...form, sellingPrice: parseFloat(e.target.value) })
              }
              required
            />
          </div>
          <CustomTextField
            label="Current Stock"
            type="number"
            value={form.currentStock}
            onChange={(e) =>
              setForm({ ...form, currentStock: parseInt(e.target.value) })
            }
          />
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingId(null);
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating || isUpdating ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"?`}
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Products"
        message={`Are you sure you want to delete ${selectedCount} products?`}
        isLoading={isBulkDeleting}
      />

      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ message: "", type: "success" })}
      />
    </div>
  );
};

export default ProductMasterPageRedux;
