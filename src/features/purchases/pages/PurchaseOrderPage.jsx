import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import StatsGrid from "../../../components/shared/StatsGrid";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  ClipboardList,
  DollarSign,
  Trash2,
  Edit3,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import Snackbar from "../../../components/shared/Snackbar";

const PurchaseOrderPage = () => {
  const { currencySymbol, user, hasPermission } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canAdd = isAdmin || hasPermission("stock:purchase_orders:add");
  const canEdit = isAdmin || hasPermission("stock:purchase_orders:edit");
  const canDelete = isAdmin || hasPermission("stock:purchase_orders:delete");
  const canConvert = isAdmin || hasPermission("stock:purchase_orders:convert");

  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/purchases/orders?${params.toString()}`);
      if (res.data.success) setOrders(res.data.data);
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelete = (order) => {
    setOrderToDelete(order);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/purchases/orders/${orderToDelete._id}`);
      fetchData();
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch {
      showSnack("Error deleting order", "error");
    }
  };

  const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
  const pendingOrders = orders.filter(
    (o) => o.status === "confirmed" || o.status === "draft",
  );
  const convertedOrders = orders.filter((o) => o.status === "converted");

  const filtered = orders.filter((o) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(s) ||
      o.supplier?.name?.toLowerCase().includes(s)
    );
  });

  const stats = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: ClipboardList,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Value",
      value: (
        <span className="notranslate">
          {currencySymbol}
          {totalAmount.toLocaleString()}
        </span>
      ),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pending",
      value: pendingOrders.length,
      icon: ClipboardList,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Converted",
      value: convertedOrders.length,
      icon: ClipboardList,
      color: "bg-green-50 text-green-600",
    },
  ];

  const statusColors = {
    draft: "bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400",
    confirmed: "bg-blue-50 text-blue-700",
    converted: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  };

  const columns = [
    {
      header: "Order #",
      render: (r) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{r.orderNumber}</span>
      ),
    },
    {
      header: "Date",
      render: (r) => (
        <span className="text-sm">{new Date(r.date).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Supplier",
      render: (r) => (
        <span className="text-sm font-medium">
          {r.supplier?.name || "LOCAL PURCHASE"}
        </span>
      ),
    },
    {
      header: "Items",
      render: (r) => (
        <span className="text-sm">{r.items?.length || 0} items</span>
      ),
    },
    {
      header: "Amount",
      render: (r) => (
        <span className="text-sm font-bold notranslate">
          {currencySymbol}
          {r.totalAmount}
        </span>
      ),
    },
    {
      header: "Status",
      render: (r) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColors[r.status] || statusColors.draft}`}
        >
          {r.status}
        </span>
      ),
    },
    ...(canConvert || canEdit || canDelete ? [{
      header: "Action",
      align: "right",
      render: (r) => (
        <div className="flex items-center gap-1.5 justify-end">
          {r.status !== "converted" && canConvert && (
            <button
              onClick={() =>
                navigate(getPath("/admin/stock/purchase-invoice/new"), {
                  state: { fromPO: r },
                })
              }
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:bg-emerald-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Convert to Purchase"
            >
              <ShoppingCart size={16} />
            </button>
          )}
          {canEdit && (
            <button
              onClick={() =>
                navigate(getPath(`/admin/stock/purchase-order/edit/${r._id}`))
              }
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Edit Order"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(r)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Delete Order"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-3 md:space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <StatsGrid stats={stats} />
      <CustomTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search orders..."
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
          onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
          headerActions={
            canAdd ? (
              <button
                onClick={() =>
                  navigate(getPath("/admin/stock/purchase-order/new"))
                }
                className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-secondary active:scale-95 text-xs shrink-0 shadow-sm"
              >
                <Plus size={14} />
                <span className="hidden md:inline">New Order</span>
              </button>
            ) : null
          }
          emptyMessage="No purchase orders yet."
          mobileMapper={{
            leading: () => (
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400 border border-indigo-100">
                <ClipboardList size={22} />
              </div>
            ),
            title: (row) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                {row.orderNumber}
              </h4>
            ),
            subtitle: (row) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {row.supplier?.name || "Local Purchase"} •{" "}
                {new Date(row.date).toLocaleDateString()}
              </p>
            ),
            trailing: (row) => (
              <div className="text-right">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  Value
                </p>
                <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate">
                  {currencySymbol}
                  {row.totalAmount.toLocaleString()}
                </p>
              </div>
            ),
            actions: (row) => (
              <div className="flex gap-2 pt-2">
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        getPath(`/admin/stock/purchase-order/edit/${row._id}`),
                      );
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(row);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm border border-red-100"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            ),
          }}
        />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Purchase Order"
        message="Are you sure you want to delete this purchase order?"
      />
    </div>
  );
};

export default PurchaseOrderPage;
